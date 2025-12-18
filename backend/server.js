import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser'; 
import connectDB from "./config/db.js";

// Route Imports
import authRoutes from './routes/authRoutes.js';
import chatRoutes from "./routes/chatRoutes.js";
import userRoutes from './routes/userRoutes.js';

// Socket Handler Import
import { setupSocketEvents } from './sockets/socketHandler.js';

// Configuration
dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);

/**
 * 1. Unified CORS Configuration
 * Essential for the Vercel-to-Render "withCredentials" flow.
 * Uses FRONTEND_URL from environment variables for production.
 */
const corsOptions = {
    origin: process.env.FRONTEND_URL || "http://localhost:5173", 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

/**
 * 2. Socket.io Initialization
 * Shares the same CORS policy as the Express app.
 */
const io = new Server(httpServer, { 
    cors: corsOptions,
    pingTimeout: 60000, 
    connectTimeout: 30000,
});

/**
 * 3. Socket Event Handling
 */
setupSocketEvents(io);

/**
 * 4. API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);

// Health Check (Very important for Render monitoring)
app.get('/', (req, res) => {
    res.send('🚀 Aether Backend Operational and Secure');
});

/**
 * 5. Server Initialization
 */
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`
    ---------------------------------------------
    🚀 Server: http://localhost:${PORT}
    📡 Sockets: Operational
    🌍 Allowed Origin: ${process.env.FRONTEND_URL || "http://localhost:5173"}
    ---------------------------------------------
    `);
});