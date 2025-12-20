import { MessageBucket } from '../models/MessageBucket.js'; // Adjust path to your model
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
            socket.join(chatId.toString()); // Ensure string for room names
            console.log(`🔒 Room Joined: ${chatId}`);
        });

        socket.on('leave_chat', (chatId) => {
            socket.leave(chatId.toString());
        });

        // 3. Messages (Optimized for Sync Deletion)
        socket.on('send_message', async (data) => {
            const { chatId, senderId, recipientId, text, _id: tempId } = data;

            try {
                // A. Save to Database First
                // This logic mirrors your saveMessageToBucket controller
                const buckets = await MessageBucket.find({ conversationId: chatId });
                
                let savedMsg = null;

                // We save the message to ALL participant buckets
                const savePromises = buckets.map(async (bucket) => {
                    bucket.messages.push({ senderId, text, timestamp: new Date() });
                    const updatedBucket = await bucket.save();
                    // Capture the last message added (the one with the new MongoDB _id)
                    savedMsg = updatedBucket.messages[updatedBucket.messages.length - 1];
                });

                await Promise.all(savePromises);

                // B. Prepare Payload with REAL ID
                const messagePayload = {
                    ...data,
                    _id: savedMsg._id, // The real MongoDB ID
                    timestamp: savedMsg.timestamp
                };

                // C. Broadcast to the recipient room
                socket.to(chatId.toString()).emit('receive_message', messagePayload);

                // D. IMPORTANT: Ack back to sender to replace their Temp ID with Real ID
                socket.emit('message_ack', { 
                    tempId: tempId, 
                    realId: savedMsg._id 
                });

                // E. Sidebar update for recipient (if not in room)
                const recipientSocketId = onlineUsers.get(recipientId);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('sidebar_update', messagePayload);
                }

            } catch (err) {
                console.error("❌ Persistence/Socket Error:", err);
                socket.emit('error', { message: "Failed to send message" });
            }
        });

        // 4. Typing Status
        socket.on('typing', ({ chatId, typing }) => {
            socket.to(chatId.toString()).emit('typing_status', { chatId, typing });
        });

        // 5. Message Deletion (Fixed Sync)
        socket.on('delete_message', ({ chatId, messageId }) => {
            // This broadcasts the delete command to the other user's ChatWindow.jsx
            // Because of the 'message_ack' above, both users now have the same messageId
            socket.to(chatId.toString()).emit('message_deleted', { messageId });
            console.log(`🗑️ Message Deleted in Room ${chatId}: ${messageId}`);
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