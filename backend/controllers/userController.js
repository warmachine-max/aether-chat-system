import User from "../models/User.js";
import bcrypt from "bcryptjs";

/**
 * @desc    Update User Profile (Username/Email)
 * @route   PUT /api/users/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (username) user.username = username;
    if (email) user.email = email;

    const updatedUser = await user.save();
    
    // Return user without password
    const { password, ...userData } = updatedUser._doc;
    res.status(200).json(userData);
  } catch (error) {
    res.status(500).json({ message: "Error updating profile" });
  }
};

/**
 * @desc    Update Password (Security Tab)
 * @route   PUT /api/users/password
 */
export const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating password" });
  }
};