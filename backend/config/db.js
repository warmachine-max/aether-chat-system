import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log("⏳ Attempting to connect to MongoDB...");
    const conn = await mongoose.connect(process.env.MONGO_URL);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // This helps diagnose if it's an auth issue vs a network issue
    if (error.message.includes('ETIMEOUT')) {
        console.log("👉 Tip: Check your IP Whitelist in Atlas and your Firewall.");
    }
    process.exit(1);
  }
};

export default connectDB;