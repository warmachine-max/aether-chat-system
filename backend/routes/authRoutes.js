import express from 'express';
import { signup, login, logout, getAllUsers } from '../controllers/authController.js';
import { protect } from "../middleWare/authMiddleware.js"; // Uncomment this

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);

// NEW: Search route (must be protected)
router.get('/users', protect, getAllUsers);

export default router;