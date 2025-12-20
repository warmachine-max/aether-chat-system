import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: {
    text: String,
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, { 
  timestamps: true // <--- CRITICAL: This creates the 'updatedAt' field 
});                // the Sidebar uses to sort the list.

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 }); // Optional: Speeds up sidebar loading

export default mongoose.model('Conversation', conversationSchema);