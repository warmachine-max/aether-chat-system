import express from 'express';
import { 
  accessConversation, 
  getMessages, 
  getConversations,
  searchUsers,
  deleteMessage, // New
  clearHistory,  // New
  deleteChat     // New
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- 1. Static & Search Routes ---
router.get('/', protect, getConversations);
router.get('/users/search', protect, searchUsers);

// --- 2. Action Routes ---
router.post('/access', protect, accessConversation);

// --- 3. Deletion Routes ---
// Delete a specific message (Unsend for everyone)
router.delete('/:chatId/message/:messageId', protect, deleteMessage);

// Clear history for the requester only (Dual-bucket wipe)
router.delete('/:chatId/clear', protect, clearHistory);

// Remove the chat from the sidebar entirely
router.delete('/:chatId', protect, deleteChat);

// --- 4. History Fetching (Dynamic ID last) ---
router.get('/:chatId', protect, getMessages);

export default router;