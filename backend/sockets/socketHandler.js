import { saveMessageToBucket } from '../controllers/chatController.js';
import User from '../models/User.js';

export const setupSocketEvents = (io) => {
    const onlineUsers = new Map(); 

    io.on('connection', (socket) => {
        console.log(`📡 Signal Established: ${socket.id}`);

        // 1. User Presence
        socket.on('user_online', async (userId) => {
            if (!userId) return;
            socket.userId = userId;
            onlineUsers.set(userId, socket.id); 

            await User.findByIdAndUpdate(userId, { "status.isOnline": true });
            io.emit('online_users_list', Array.from(onlineUsers.keys()));
            socket.broadcast.emit('user_status_change', { userId, isOnline: true });
        });

        // 2. Chat Rooms
        socket.on('join_chat', (chatId) => {
            socket.join(chatId);
            console.log(`🔒 Room: ${chatId}`);
        });

        socket.on('leave_chat', (chatId) => {
            socket.leave(chatId);
        });

        // 3. Messages (FIXED Double Message Issue)
        socket.on('send_message', async (data) => {
            const { chatId, senderId, recipientId, text, timestamp } = data;

            const messagePayload = {
                ...data,
                timestamp: timestamp || new Date(), // Use frontend timestamp if available
            };

            // ✅ FIX: Use socket.to(chatId).emit to send to OTHERS only
            // This prevents the sender from receiving their own message again
            socket.to(chatId).emit('receive_message', messagePayload);

            // Notify sidebar for recipient (if they aren't in the room)
            const recipientSocketId = onlineUsers.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('sidebar_update', messagePayload);
            }

            try {
                await saveMessageToBucket(chatId, senderId, text);
            } catch (err) {
                console.error("❌ Persistence Error:", err);
            }
        });

        // 4. Typing Status
        socket.on('typing', ({ chatId, typing }) => {
            socket.to(chatId).emit('typing_status', { chatId, typing });
        });

        // 5. Message Deletion (NEW)
        socket.on('delete_message', ({ chatId, messageId }) => {
            // Broadcast to the other user in the room to remove the UI element
            socket.to(chatId).emit('message_deleted', { messageId });
        });

        // 6. Disconnect
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