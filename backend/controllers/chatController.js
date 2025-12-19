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
    // We sort by updatedAt here just in case multiple sessions exist
    let chat = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] }
    })
    .populate("participants", "username email status")
    .sort({ updatedAt: -1 });

    if (!chat) {
      chat = await Conversation.create({
        participants: [senderId, recipientId],
        unreadCount: {}, 
        updatedAt: new Date() // Initialize timestamp
      });
      chat = await chat.populate("participants", "username email status");
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
    .sort({ updatedAt: -1 }); // CRITICAL: This ensures newest chats stay at the top

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
 * @desc    Fetch message history & RESET unread count
 */
export const getMessages = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id.toString();

  try {
    // Atomic reset of unread count
    await Conversation.findByIdAndUpdate(chatId, {
      $set: { [`unreadCount.${userId}`]: 0 }
    });

    const latestBucket = await MessageBucket.findOne({ conversationId: chatId })
      .sort({ page: -1 })
      .lean();

    if (!latestBucket) return res.status(200).json([]);

    res.status(200).json(latestBucket.messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
};

/**
 * @desc    Logic to save a message & INCREMENT recipient unread count
 */
export const saveMessageToBucket = async (chatId, senderId, text) => {
  try {
    // 1. Efficiently find or update the bucket using the "Bucket Pattern"
    let bucket = await MessageBucket.findOneAndUpdate(
      { 
        conversationId: chatId, 
        "messages.49": { $exists: false } // Checks if bucket is NOT full
      },
      { 
        $push: { 
          messages: { senderId, text, timestamp: new Date() } 
        } 
      },
      { sort: { page: -1 }, new: true }
    );

    // 2. If no available space, create a new bucket page
    if (!bucket) {
      const lastBucket = await MessageBucket.findOne({ conversationId: chatId }).sort({ page: -1 });
      const newPageNumber = lastBucket ? lastBucket.page + 1 : 1;

      bucket = await MessageBucket.create({
        conversationId: chatId,
        page: newPageNumber,
        messages: [{ senderId, text, timestamp: new Date() }]
      });
    }

    // 3. UPDATE CONVERSATION METADATA (Reordering & Unread logic)
    const chat = await Conversation.findById(chatId);
    if (chat) {
      const recipientId = chat.participants.find(p => p.toString() !== senderId.toString());

      if (recipientId) {
        await Conversation.findByIdAndUpdate(chatId, {
          lastMessage: { text, senderId, timestamp: new Date() },
          // FIX: Manually updating updatedAt triggers the sort order for the sidebar
          updatedAt: new Date(), 
          $inc: { [`unreadCount.${recipientId.toString()}`]: 1 }
        });
      }
    }

    return bucket;
  } catch (error) {
    console.error("Bucket Save Error Details:", error);
    throw error;
  }
};

/**
 * @desc    Search Users logic
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