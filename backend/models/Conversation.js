import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: {
    text: String,
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  },
  // ADD THIS FIELD: 
  // This stores counts for each participant individually
  // Format: { "user_id_1": 5, "user_id_2": 0 }
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

conversationSchema.index({ participants: 1 });

export default mongoose.model('Conversation', conversationSchema);