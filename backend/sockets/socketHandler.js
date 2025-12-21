import { saveMessageToBucket } from '../controllers/chatController.js'; 
import User from '../models/User.js';

export const setupSocketEvents = (io) => {
    const onlineUsers = new Map(); 

    io.on('connection', (socket) => {
        console.log(`📡 Signal Established: ${socket.id}`);

        // 1. User Presence & Status
        socket.on('user_online', async (userId) => {
            if (!userId) return;
            socket.userId = userId;
            onlineUsers.set(userId, socket.id); 

            await User.findByIdAndUpdate(userId, { "status.isOnline": true });
            
            // Broadcast the new online list to everyone
            io.emit('online_users_list', Array.from(onlineUsers.keys()));
            socket.broadcast.emit('user_status_change', { userId, isOnline: true });
        });

        // 2. Chat Room Management
        socket.on('join_chat', (chatId) => {
            socket.join(chatId.toString());
            console.log(`👤 User joined room: ${chatId}`);
        });

        socket.on('leave_chat', (chatId) => {
            socket.leave(chatId.toString());
            console.log(`👤 User left room: ${chatId}`);
        });

        // 3. Real-time Messaging (Dual-Bucket Sync)
        socket.on('send_message', async (data) => {
            const { chatId, senderId, recipientId, text, _id: tempId } = data;

            try {
                // Save to the Dual-Bucket database
                const savedMsg = await saveMessageToBucket(chatId, senderId, text);

                const messagePayload = {
                    ...data,
                    _id: savedMsg._id, 
                    timestamp: savedMsg.timestamp
                };

                // A. Update the Chat Window for the Recipient (if they are in the room)
                socket.to(chatId.toString()).emit('receive_message', messagePayload);

                // B. Acknowledge back to Sender (Replaces temp UI state with real DB data)
                socket.emit('message_ack', { 
                    tempId: tempId, 
                    realId: savedMsg._id 
                });

                // C. Update Sidebar for BOTH (Triggers the reorder and unread badge logic)
                // To Recipient:
                const recipientSocketId = onlineUsers.get(recipientId);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('sidebar_update', messagePayload);
                }
                
                // To Sender (Moves the chat to the top of their own sidebar):
                socket.emit('sidebar_update', messagePayload);

            } catch (err) {
                console.error("❌ Socket Transmission Error:", err);
                socket.emit('error', { message: "Signal failed to save" });
            }
        });

        // 4. Live Typing Indicator
        socket.on('typing', ({ chatId, typing }) => {
            socket.to(chatId.toString()).emit('typing_status', { chatId, typing });
        });

        // 5. Deletion Sync (Global Unsend)
        socket.on('delete_message', ({ chatId, messageId }) => {
            // Tells the other user's ChatWindow and Sidebar to remove the message
            socket.to(chatId.toString()).emit('message_deleted', { messageId });
        });

        // 6. Disconnection & Cleanup
        socket.on('disconnect', async () => {
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
                
                await User.findByIdAndUpdate(socket.userId, { 
                    "status.isOnline": false, 
                    "status.lastSeen": new Date() 
                });

                io.emit('online_users_list', Array.from(onlineUsers.keys()));
                io.emit('user_status_change', { userId: socket.userId, isOnline: false });
                console.log(`🔌 Signal Lost: ${socket.userId}`);
            }
        });
    });
};