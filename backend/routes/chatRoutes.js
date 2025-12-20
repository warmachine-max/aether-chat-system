import express from 'express';
import { 
  accessConversation, 
  getMessages, 
  getConversations,
  searchUsers
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Static/Specific Routes first
router.get('/', protect, getConversations);
router.get('/users/search', protect, searchUsers); // Added /search to be explicit

// 2. Resource Access
router.post('/access', protect, accessConversation);

// 3. Dynamic Parameters last
router.get('/:chatId', protect, getMessages);

export default router;