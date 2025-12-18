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

// Socket Handler Import
import  {setupSocketEvents}  from './sockets/socketHandler.js';

// Configuration
dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);

/**
 * 1. Unified CORS Configuration
 * Essential for the Vercel-to-Render "withCredentials" flow.
 */
const corsOptions = {
    origin: "http://localhost:5173", // Replace with your Vercel URL in production
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
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
    pingTimeout: 60000, // Closes connection after 60s of inactivity to save resources
});

/**
 * 3. Socket Event Handling
 * Modularized logic to keep server.js clean.
 */
setupSocketEvents(io);

/**
 * 4. API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);

// Health Check
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
    🗄️  Database: Connected
    ---------------------------------------------
    `);
});