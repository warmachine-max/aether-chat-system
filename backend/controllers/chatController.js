import Conversation from "../models/Conversation.js";
import MessageBucket from "../models/MessageBucket.js";
import User from "../models/User.js";

/**
 * @desc    Access or Create a 1-on-1 Conversation
 */
export const accessConversation = async (req, res) => {
  const { recipientId } = req.body;
  const senderId = req.user._id;

  if (!recipientId) return res.status(400).json({ message: "Recipient ID required" });

  try {
    let chat = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] }
    })
    .populate("participants", "username email status")
    .sort({ updatedAt: -1 });

    if (!chat) {
      chat = await Conversation.create({
        participants: [senderId, recipientId],
        unreadCount: {}, 
        updatedAt: new Date() 
      });
      chat = await chat.populate("participants", "username email status");
    } else {
      // Logic: If one user previously deleted the chat, add them back to participants
      if (!chat.participants.some(p => p._id.toString() === senderId.toString())) {
        chat.participants.push(senderId);
        await chat.save();
      }
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error("Access Conversation Error:", error);
    res.status(500).json({ message: "Server error accessing chat" });
  }
};

/**
 * @desc    Get all conversations for the Sidebar (Live-sort ready)
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const chats = await Conversation.find({
      participants: { $in: [req.user._id] }
    })
    .populate("participants", "username email status")
    .sort({ updatedAt: -1 });

    const formattedChats = chats.map(chat => {
      const chatObj = chat.toObject();
      chatObj.unreadCount = chat.unreadCount ? (chat.unreadCount.get(userId) || 0) : 0;
      return chatObj;
    });

    res.status(200).json(formattedChats);
  } catch (error) {
    res.status(500).json({ message: "Could not load sidebar" });
  }
};

/**
 * @desc    Fetch message history (Owner-Specific) & RESET unread count
 */
export const getMessages = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  try {
    await Conversation.findByIdAndUpdate(chatId, {
      $set: { [`unreadCount.${userId.toString()}`]: 0 }
    });

    const latestBucket = await MessageBucket.findOne({ 
      conversationId: chatId, 
      ownerId: userId 
    })
    .sort({ page: -1 })
    .lean();

    if (!latestBucket) return res.status(200).json([]);

    res.status(200).json(latestBucket.messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
};

/**
 * @desc    Save message to DUAL-BUCKETS (History Privacy Logic)
 */
export const saveMessageToBucket = async (chatId, senderId, text) => {
  try {
    const chat = await Conversation.findById(chatId);
    if (!chat) throw new Error("Conversation not found");

    const participants = chat.participants; 
    const timestamp = new Date();
    const messageData = { senderId, text, timestamp };

    const savePromises = participants.map(async (ownerId) => {
      let bucket = await MessageBucket.findOneAndUpdate(
        { 
          conversationId: chatId, 
          ownerId: ownerId, 
          "messages.49": { $exists: false } 
        },
        { $push: { messages: messageData } },
        { sort: { page: -1 }, new: true }
      );

      if (!bucket) {
        const lastBucket = await MessageBucket.findOne({ 
          conversationId: chatId, 
          ownerId: ownerId 
        }).sort({ page: -1 });
        
        const newPageNumber = lastBucket ? lastBucket.page + 1 : 1;
        bucket = await MessageBucket.create({
          conversationId: chatId,
          ownerId: ownerId,
          page: newPageNumber,
          messages: [messageData]
        });
      }
      return bucket;
    });

    const savedBuckets = await Promise.all(savePromises);
    const savedMsg = savedBuckets[0].messages[savedBuckets[0].messages.length - 1];

    const recipientId = participants.find(p => p.toString() !== senderId.toString());

    if (recipientId) {
      await Conversation.findByIdAndUpdate(chatId, {
        lastMessage: savedMsg,
        updatedAt: timestamp,
        $inc: { [`unreadCount.${recipientId.toString()}`]: 1 }
      });
    }

    return savedMsg; // Return the message with its new MongoDB _id
  } catch (error) {
    console.error("Save Message Error:", error);
    throw error;
  }
};

/**
 * @desc    Delete a specific message for EVERYONE (Unsend)
 */
export const deleteMessage = async (req, res) => {
  const { chatId, messageId } = req.params;
  const userId = req.user._id;

  try {
    // 1. Pull the message from ALL participant buckets
    // Logic: Only succeeds if the requester is the original sender
    const result = await MessageBucket.updateMany(
      { conversationId: chatId },
      { $pull: { messages: { _id: messageId, senderId: userId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(403).json({ message: "Could not delete: Message not found or unauthorized" });
    }

    res.status(200).json({ message: "Message unsent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete message" });
  }
};

/**
 * @desc    Clear entire history for ONE user
 */
export const clearHistory = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  try {
    await MessageBucket.deleteMany({ conversationId: chatId, ownerId: userId });
    res.status(200).json({ message: "History cleared locally" });
  } catch (error) {
    res.status(500).json({ message: "Error clearing history" });
  }
};

/**
 * @desc    Delete Chat (Remove from Sidebar + Wipe local history)
 */
export const deleteChat = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  try {
    // 1. Wipe private history
    await MessageBucket.deleteMany({ conversationId: chatId, ownerId: userId });

    // 2. Remove user from conversation participants
    await Conversation.findByIdAndUpdate(chatId, {
      $pull: { participants: userId }
    });

    res.status(200).json({ message: "Conversation removed" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete chat" });
  }
};

/**
 * @desc    Search Users
 */
export const searchUsers = async (req, res) => {
  const { query } = req.query;
  const loggedInUserId = req.user._id;

  try {
    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
          ],
        },
        { _id: { $ne: loggedInUserId } },
      ],
    }).select("username email status");

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error searching for users" });
  }
};