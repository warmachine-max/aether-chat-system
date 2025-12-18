import express from 'express';
import { 
  accessConversation, 
  getMessages, 
  getConversations ,
  searchUsers
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get list of all my chats (Sidebar)
router.get('/', protect, getConversations);

// Open or Create a chat with a specific user
router.post('/access', protect, accessConversation);

// Load message history for a specific chat
router.get('/:chatId', protect, getMessages);

router.get('/users', protect, searchUsers);


export default router;