import express from 'express';
import { updateProfile, updatePassword } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js'; // Your auth guard

const router = express.Router();

router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);

export default router;