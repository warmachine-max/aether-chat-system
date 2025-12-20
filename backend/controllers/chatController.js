import Conversation from "../models/Conversation.js";
import MessageBucket from "../models/MessageBucket.js";
import User from "../models/User.js";

/**
 * @desc    Access or Create a 1-on-1 Conversation
 */
export const accessConversation = async (req, res) => {
  const { recipientId } = req.body;
  const senderId = req.user._id.toString();

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
      // Logic: If one user previously deleted the chat, add them back
      const participantsStr = chat.participants.map(p => p._id.toString());
      if (!participantsStr.includes(senderId)) {
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
 * @desc    Get all conversations for the Sidebar
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
      // Ensure unreadCount exists as a Map or Object
      const countMap = chat.unreadCount instanceof Map ? Object.fromEntries(chat.unreadCount) : chat.unreadCount;
      chatObj.unreadCount = countMap ? (countMap[userId] || 0) : 0;
      return chatObj;
    });

    res.status(200).json(formattedChats);
  } catch (error) {
    res.status(500).json({ message: "Could not load sidebar" });
  }
};

/**
 * @desc    Fetch message history (Owner-Specific)
 */
export const getMessages = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  try {
    // Reset unread count for this user
    await Conversation.findByIdAndUpdate(chatId, {
      $set: { [`unreadCount.${userId.toString()}`]: 0 }
    });

    // Get all messages from all buckets for this user to ensure complete history
    const buckets = await MessageBucket.find({ 
      conversationId: chatId, 
      ownerId: userId 
    })
    .sort({ page: 1 }) // Get pages in order
    .lean();

    if (!buckets.length) return res.status(200).json([]);

    // Flatten all messages from all buckets into one array
    const allMessages = buckets.reduce((acc, bucket) => [...acc, ...bucket.messages], []);

    res.status(200).json(allMessages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
};

/**
 * @desc    Save message to DUAL-BUCKETS
 */
export const saveMessageToBucket = async (chatId, senderId, text) => {
  try {
    const chat = await Conversation.findById(chatId);
    if (!chat) throw new Error("Conversation not found");

    const participants = chat.participants.map(p => p.toString()); 
    const timestamp = new Date();
    const messageData = { senderId, text, timestamp };

    const savePromises = participants.map(async (ownerId) => {
      // Find the latest bucket for this owner that isn't full (limit 50)
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
    
    // Find sender's bucket to return the message with its generated ID
    const senderBucket = savedBuckets.find(b => b.ownerId.toString() === senderId.toString());
    const savedMsg = senderBucket.messages[senderBucket.messages.length - 1];

    const recipientId = participants.find(p => p !== senderId.toString());

    if (recipientId) {
      await Conversation.findByIdAndUpdate(chatId, {
        lastMessage: savedMsg,
        updatedAt: timestamp,
        $inc: { [`unreadCount.${recipientId}`]: 1 }
      });
    }

    return savedMsg; 
  } catch (error) {
    console.error("Save Message Error:", error);
    throw error;
  }
};

/**
 * @desc    Delete a message (Unsend vs Delete For Me)
 */
export const deleteMessage = async (req, res) => {
  const { chatId, messageId } = req.params;
  const userId = req.user._id.toString();

  try {
    // 1. Locate the message in the REQUESTER'S bucket
    const bucket = await MessageBucket.findOne({
      conversationId: chatId,
      ownerId: userId,
      "messages._id": messageId
    });

    if (!bucket) return res.status(404).json({ message: "Message not found" });

    const message = bucket.messages.id(messageId);
    const isSender = message.senderId.toString() === userId;

    if (isSender) {
      // --- UNSEND LOGIC ---
      // To unsend across different buckets, we match by content/timestamp 
      // because MongoDB might have given them different sub-document IDs
      await MessageBucket.updateMany(
        { conversationId: chatId },
        { 
          $pull: { 
            messages: { 
              senderId: message.senderId, 
              timestamp: message.timestamp,
              text: message.text 
            } 
          } 
        }
      );
      return res.status(200).json({ action: "unsend" });
    } else {
      // --- DELETE FOR ME LOGIC ---
      await MessageBucket.updateOne(
        { conversationId: chatId, ownerId: userId },
        { $pull: { messages: { _id: messageId } } }
      );
      return res.status(200).json({ action: "deleteForMe" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to delete" });
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
 * @desc    Delete Chat (Sidebar + Wipe)
 */
export const deleteChat = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  try {
    await MessageBucket.deleteMany({ conversationId: chatId, ownerId: userId });
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
    res.status(500).json({ message: "Error searching" });
  }
};