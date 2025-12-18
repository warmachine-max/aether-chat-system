import mongoose from 'mongoose';

const messageBucketSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  page: { type: Number, default: 1 }, // Page 1 = newest 50
  messages: [
    {
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

// Compound index to find the chat and newest page instantly
messageBucketSchema.index({ conversationId: 1, page: -1 });

export default mongoose.model('MessageBucket', messageBucketSchema);