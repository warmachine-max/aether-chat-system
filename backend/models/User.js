import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    index: true // Optimized for searching users in the search bar
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    index: true // Optimized for login performance
  },
  password: { 
    type: String, 
    required: true 
  },
  avatar: { 
    type: String, 
    default: "" 
  },
  // Real-time status fields for the "Attractive UI"
  status: {
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now }
  }
}, { timestamps: true });

// Password Hashing Logic (Kept exactly as you had it)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next(); 
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;