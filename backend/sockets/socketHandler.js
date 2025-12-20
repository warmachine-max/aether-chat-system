import { saveMessageToBucket } from '../controllers/chatController.js';
import User from '../models/User.js';

export const setupSocketEvents = (io) => {
    // A Map to keep track of userId -> socketId
    const onlineUsers = new Map(); 

    io.on('connection', (socket) => {
        console.log(`📡 Signal Established: ${socket.id}`);

        // 1. User goes Online
        socket.on('user_online', async (userId) => {
            if (!userId) return;
            
            socket.userId = userId;
            onlineUsers.set(userId, socket.id); 

            await User.findByIdAndUpdate(userId, { "status.isOnline": true });
            
            // Sync online list to all users
            io.emit('online_users_list', Array.from(onlineUsers.keys()));
            socket.broadcast.emit('user_status_change', { userId, isOnline: true });
        });

        // 2. Joining a Chat Room
        socket.on('join_chat', (chatId) => {
            socket.join(chatId);
            console.log(`🔒 User joined room: ${chatId}`);
        });

        // 3. Handling Real-Time Messages & Instant Sidebar Jump
        socket.on('send_message', async (data) => {
            const { chatId, senderId, recipientId, text } = data;
            const timestamp = new Date();

            const messagePayload = {
                chatId,
                senderId,
                text,
                timestamp,
                updatedAt: timestamp // This tells the sidebar where to sort
            };

            // ACTION A: Update the active chat window (if open)
            io.to(chatId).emit('receive_message', messagePayload);

            // ACTION B: Force Sidebar Jump for the recipient 
            // This works even if the recipient is looking at a different chat
            const recipientSocketId = onlineUsers.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('sidebar_update', messagePayload);
            }

            // PERSIST to Database
            try {
                await saveMessageToBucket(chatId, senderId, text);
            } catch (err) {
                console.error("❌ Persistence Error:", err);
            }
        });

        // 4. Disconnect Logic
        socket.on('disconnect', async () => {
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
                
                await User.findByIdAndUpdate(socket.userId, { 
                    "status.isOnline": false, 
                    "status.lastSeen": new Date() 
                });

                io.emit('online_users_list', Array.from(onlineUsers.keys()));
                io.emit('user_status_change', { userId: socket.userId, isOnline: false });
            }
            console.log('👋 Signal Terminated');
        });
    });
};