import { saveMessageToBucket } from '../controllers/chatController.js';
import User from '../models/User.js';

export const setupSocketEvents = (io) => {
    io.on('connection', (socket) => {
        console.log(`📡 Signal Established: ${socket.id}`);

        // 1. User goes Online
        socket.on('user_online', async (userId) => {
            socket.userId = userId; // Attach userId to the socket object
            await User.findByIdAndUpdate(userId, { "status.isOnline": true });
            
            // Tell everyone else this user is online
            socket.broadcast.emit('user_status_change', { userId, isOnline: true });
        });

        // 2. Joining a Chat Room (chatId)
        socket.on('join_chat', (chatId) => {
            socket.join(chatId);
            console.log(`🔒 User joined room: ${chatId}`);
        });

        // 3. Handling Real-Time Messages
        socket.on('send_message', async (data) => {
            const { chatId, senderId, text } = data;

            // FIRST: Emit to everyone in the room instantly (including sender)
            // This makes the UI feel lightning fast
            io.to(chatId).emit('receive_message', {
                chatId,
                senderId,
                text,
                timestamp: new Date()
            });

            // SECOND: Save to MongoDB in the background (Bucket Pattern)
            // This uses the "Very Important" logic we wrote in the controller
            try {
                await saveMessageToBucket(chatId, senderId, text);
            } catch (err) {
                console.error("Failed to persist message:", err);
            }
        });

        // 4. Disconnect Logic
        socket.on('disconnect', async () => {
            if (socket.userId) {
                await User.findByIdAndUpdate(socket.userId, { 
                    "status.isOnline": false, 
                    "status.lastSeen": new Date() 
                });
                // Broadcast that user is now offline
                io.emit('user_status_change', { userId: socket.userId, isOnline: false });
            }
            console.log('👋 Signal Terminated');
        });
    });
};