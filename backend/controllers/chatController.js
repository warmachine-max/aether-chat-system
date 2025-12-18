import Conversation from "../models/Conversation.js";
import MessageBucket from "../models/MessageBucket.js";
import User from "../models/User.js";

/**
 * @desc    Access or Create a 1-on-1 Conversation
 * @route   POST /api/chats/access
 */
export const accessConversation = async (req, res) => {
  const { recipientId } = req.body;
  const senderId = req.user._id;

  if (!recipientId) return res.status(400).json({ message: "Recipient ID required" });

  try {
    // 1. Look for an existing chat between these two users
    let chat = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] }
    }).populate("participants", "username email status");

    // 2. If it doesn't exist, create the metadata
    if (!chat) {
      chat = await Conversation.create({
        participants: [senderId, recipientId],
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
 * @route   GET /api/chats
 */
export const getConversations = async (req, res) => {
  try {
    const chats = await Conversation.find({
      participants: { $in: [req.user._id] }
    })
    .populate("participants", "username email status")
    .sort({ updatedAt: -1 }); // Newest active chats at the top

    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ message: "Could not load sidebar" });
  }
};

/**
 * @desc    Fetch message history using the Bucket Pattern
 * @route   GET /api/chats/:chatId
 */
export const getMessages = async (req, res) => {
  const { chatId } = req.params;

  try {
    // Find the latest bucket (page) for this conversation
    const latestBucket = await MessageBucket.findOne({ conversationId: chatId })
      .sort({ page: -1 })
      .lean();

    if (!latestBucket) return res.status(200).json([]);

    // Return the messages array from the most recent bucket
    res.status(200).json(latestBucket.messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
};

/**
 * @desc    Logic to save a message into a bucket (Used by Sockets)
 * @fixed   Replaced invalid $size syntax with index-existence check
 */
export const saveMessageToBucket = async (chatId, senderId, text) => {
  try {
    // 1. Try to find the latest bucket that is NOT full (less than 50 messages)
    // "messages.49" refers to the 50th item. If it doesn't exist, the bucket is not full.
    let bucket = await MessageBucket.findOneAndUpdate(
      { 
        conversationId: chatId, 
        "messages.49": { $exists: false } 
      },
      { 
        $push: { 
          messages: { 
            senderId, 
            text, 
            timestamp: new Date() 
          } 
        } 
      },
      { sort: { page: -1 }, new: true }
    );

    // 2. If no bucket is available (all full or none exist), create a new page
    if (!bucket) {
      const lastBucket = await MessageBucket.findOne({ conversationId: chatId }).sort({ page: -1 });
      const newPageNumber = lastBucket ? lastBucket.page + 1 : 1;

      bucket = await MessageBucket.create({
        conversationId: chatId,
        page: newPageNumber,
        messages: [{ senderId, text, timestamp: new Date() }]
      });
    }

    // 3. Update the Conversation metadata for the sidebar preview
    // This allows the sidebar to show the "last message" instantly
    await Conversation.findByIdAndUpdate(chatId, {
      lastMessage: { 
        text, 
        senderId, 
        timestamp: new Date() 
      }
    });

    return bucket;
  } catch (error) {
    console.error("Bucket Save Error Details:", error);
    throw error; // Throwing error so SocketHandler can catch it if needed
  }
};

export const searchUsers = async (req, res) => {
  const { query } = req.query; // Get the search term from the URL
  const loggedInUserId = req.user._id;

  try {
    // Find users whose username or email matches the search query
    // $options: "i" makes it case-insensitive
    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
          ],
        },
        { _id: { $ne: loggedInUserId } }, // Don't show yourself in search results
      ],
    }).select("username email status"); // Only return necessary fields

    res.status(200).json(users);
  } catch (error) {
    console.error("Search Users Error:", error);
    res.status(500).json({ message: "Error searching for users" });
  }
};