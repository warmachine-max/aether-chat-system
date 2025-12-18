import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: {
    text: String,
    senderId: mongoose.Schema.Types.ObjectId,
    timestamp: { type: Date, default: Date.now }
  }
}, { timestamps: true });

// Index for lightning fast sidebar loading
conversationSchema.index({ participants: 1 });

export default mongoose.model('Conversation', conversationSchema);