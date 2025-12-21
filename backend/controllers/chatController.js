import Conversation from "../models/Conversation.js";
import MessageBucket from "../models/MessageBucket.js";
import User from "../models/User.js";
import { getIO } from "../sockets/socketHandler.js"; // Ensure this path is correct

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
    }).populate("participants", "username email status");

    if (!chat) {
      chat = await Conversation.create({
        participants: [senderId, recipientId],
        unreadCount: {}, 
        updatedAt: new Date() 
      });
      chat = await chat.populate("participants", "username email status");
    } else {
      const participantsStr = chat.participants.map(p => p._id.toString());
      if (!participantsStr.includes(senderId)) {
        await Conversation.findByIdAndUpdate(chat._id, {
          $push: { participants: senderId }
        });
        chat = await Conversation.findById(chat._id).populate("participants", "username email status");
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
    // Reset unread count for this user upon entering chat
    await Conversation.findByIdAndUpdate(chatId, {
      $set: { [`unreadCount.${userId.toString()}`]: 0 }
    });

    const buckets = await MessageBucket.find({ 
      conversationId: chatId, 
      ownerId: userId 
    })
    .sort({ page: 1 })
    .lean();

    if (!buckets.length) return res.status(200).json([]);
    const allMessages = buckets.reduce((acc, bucket) => [...acc, ...bucket.messages], []);

    res.status(200).json(allMessages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
};

/**
 * @desc    Save message to DUAL-BUCKETS and Trigger Sidebar Update
 */
export const saveMessageToBucket = async (chatId, senderId, text) => {
  try {
    const chat = await Conversation.findById(chatId);
    if (!chat) throw new Error("Conversation not found");

    const participants = chat.participants.map(p => p.toString()); 
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
    const senderBucket = savedBuckets.find(b => b.ownerId.toString() === senderId.toString());
    const savedMsg = senderBucket.messages[senderBucket.messages.length - 1];

    // Update Conversation metadata
    const recipientIds = participants.filter(p => p !== senderId.toString());
    const updateQuery = {
      lastMessage: savedMsg,
      updatedAt: timestamp
    };

    // Increment unread for all other participants
    recipientIds.forEach(rid => {
      updateQuery[`$inc`] = { ...updateQuery[`$inc`], [`unreadCount.${rid}`]: 1 };
    });

    await Conversation.findByIdAndUpdate(chatId, updateQuery);

    // LIVE UPDATE: Notify all participants to move this chat to the top
    const io = getIO();
    io.to(chatId).emit('sidebar_update', {
      chatId,
      senderId,
      text,
      _id: savedMsg._id,
      timestamp
    });

    return savedMsg; 
  } catch (error) {
    console.error("Save Message Error:", error);
    throw error;
  }
};

/**
 * @desc    Delete message with Live Sync
 */
export const deleteMessage = async (req, res) => {
  const { chatId, messageId } = req.params;
  const userId = req.user._id.toString();
  const io = getIO();

  try {
    const bucket = await MessageBucket.findOne({
      conversationId: chatId,
      ownerId: userId,
      "messages._id": messageId
    });

    if (!bucket) return res.status(404).json({ message: "Message not found" });

    const message = bucket.messages.id(messageId);
    const isSender = message.senderId.toString() === userId;

    if (isSender) {
      // UNSEND: Remove from ALL buckets
      await MessageBucket.updateMany(
        { conversationId: chatId },
        { $pull: { messages: { 
          senderId: message.senderId, 
          timestamp: message.timestamp 
        } } }
      );

      // Tell all clients to remove this message from the UI
      io.to(chatId).emit('message_deleted', { messageId, chatId });

      // Update Sidebar Preview if it was the last message
      const chat = await Conversation.findById(chatId);
      if (chat.lastMessage?.timestamp?.getTime() === message.timestamp.getTime()) {
        await Conversation.findByIdAndUpdate(chatId, {
          "lastMessage.text": "Signal withdrawn"
        });
        
        // Push "Signal withdrawn" to sidebar preview
        io.to(chatId).emit('sidebar_update', {
          chatId,
          text: "Signal withdrawn",
          timestamp: new Date()
        });
      }

      return res.status(200).json({ action: "unsend" });
    } else {
      // DELETE FOR ME: Remove only from requester's bucket
      await MessageBucket.updateOne(
        { conversationId: chatId, ownerId: userId },
        { $pull: { messages: { _id: messageId } } }
      );
      return res.status(200).json({ action: "delete" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to delete" });
  }
};

/**
 * @desc    Delete Conversation (Remove from Sidebar + Wipe)
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