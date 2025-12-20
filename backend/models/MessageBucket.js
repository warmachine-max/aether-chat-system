import mongoose from 'mongoose';

const messageBucketSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  
  // ADD THIS: This identifies whose history this bucket belongs to.
  // This is the key to making "Delete for Me" work later!
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 

  page: { type: Number, default: 1 }, 
  messages: [
    {
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

// UPDATE THE INDEX: 
// We now search by Conversation + Owner + Page
messageBucketSchema.index({ conversationId: 1, ownerId: 1, page: -1 });

export default mongoose.model('MessageBucket', messageBucketSchema);