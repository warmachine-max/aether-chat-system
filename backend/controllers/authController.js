import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const generateToken = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

export const signup = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    // Status is set to true because they are logging in immediately after signup
    const user = await User.create({
      username,
      email,
      password,
      status: { isOnline: true, lastSeen: new Date() }
    });

    const token = generateToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      _id: user._id,
      username: user.username, // Using 'username' to match your Login logic
      email: user.email,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // We update the status to Online during login
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { "status.isOnline": true, "status.lastSeen": new Date() } },
      { new: true }
    );

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = generateToken(user);

      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: token,
      });
    } else {
      return res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // IMPORTANT: Update database to show user is offline
    // You'll get the ID from your auth middleware (req.user.id)
    if (req.body.userId) {
      await User.findByIdAndUpdate(req.body.userId, {
        $set: { "status.isOnline": false, "status.lastSeen": new Date() }
      });
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: "None"
    });

    return res.status(200).json({ success: true, message: "Logged out" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// controllers/authController.js

export const getAllUsers = async (req, res) => {
  try {
    // Get search term from query params: /api/auth/users?search=alex
    const keyword = req.query.search
      ? {
          $or: [
            { username: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } },
          ],
        }
      : {};

    // Find users matching keyword, but EXCLUDE the current logged-in user
    const users = await User.find(keyword)
      .find({ _id: { $ne: req.user._id } })
      .select("username email status");

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Search failed" });
  }
};