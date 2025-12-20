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
            socket.join(chatId.toString());
        });

        socket.on('leave_chat', (chatId) => {
            socket.leave(chatId.toString());
        });

        // 3. Messages (Now using the Controller Logic)
        socket.on('send_message', async (data) => {
            const { chatId, senderId, recipientId, text, _id: tempId } = data;

            try {
                // This function handles finding OR creating buckets for BOTH users
                const savedMsg = await saveMessageToBucket(chatId, senderId, text);

                const messagePayload = {
                    ...data,
                    _id: savedMsg._id, // Real MongoDB ID
                    timestamp: savedMsg.timestamp
                };

                // Broadcast to others in the room
                socket.to(chatId.toString()).emit('receive_message', messagePayload);

                // Send REAL ID back to sender to fix their Trash Can/Delete button
                socket.emit('message_ack', { 
                    tempId: tempId, 
                    realId: savedMsg._id 
                });

                // Update Sidebar for recipient
                const recipientSocketId = onlineUsers.get(recipientId);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('sidebar_update', messagePayload);
                }

            } catch (err) {
                console.error("❌ Socket Error:", err);
                socket.emit('error', { message: "Failed to save message" });
            }
        });

        // 4. Typing
        socket.on('typing', ({ chatId, typing }) => {
            socket.to(chatId.toString()).emit('typing_status', { chatId, typing });
        });

        // 5. Deletion Sync
        socket.on('delete_message', ({ chatId, messageId }) => {
            socket.broadcast.to(chatId.toString()).emit('message_deleted', { messageId });
        });

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
        });
    });
};