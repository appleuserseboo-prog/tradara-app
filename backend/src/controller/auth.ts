import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db'; 
import { sendAuthEmail } from '../utils/mailer';

const JWT_SECRET = process.env.JWT_SECRET || 'legendary_secret_key_2026';

// 1. REGISTER
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "Account already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword }
    });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: "Registration Failure" });
  }
};

// 2. LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: "Login Failure" });
  }
};

// 3. FORGOT PASSWORD (Updated with HTML Link Logic)
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Create a temporary token for resetting (expires in 1 hour)
    const resetToken = jwt.sign({ id: user.id, purpose: 'password_reset' }, JWT_SECRET, { expiresIn: '1h' });
    
    // Create the frontend link
// Replace localhost with your Vercel URL
const resetLink = `https://tradara-app.vercel.app/reset-password?token=${resetToken}`;
    // Define the HTML content for the professional look
    // Inside your forgotPassword controller in auth.ts
const emailHtml = `
  <div style="font-family: sans-serif; padding: 20px;">
    <h2>Reset Password</h2>
    <p>Click the button below to reset your password.</p>
    <a href="${resetLink}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
      Reset Password
    </a>
  </div>
`;

// FIX: Remove the fourth argument (true)
await sendAuthEmail(email, "Reset Your Legendary Engine Password", emailHtml);
    res.status(200).json({ message: "Reset link sent to your email!" });
  } catch (error) {
    console.error("Email processing error:", error);
    res.status(500).json({ message: "Email Failure" });
  }
};

// 4. RESET PASSWORD (Token Verification)
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    // Verify the token
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'password_reset') throw new Error("Invalid token");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({ 
      where: { id: decoded.id }, 
      data: { password: hashedPassword } 
    });

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired reset link" });
  }
};

// 5. GET ME (DASHBOARD)
export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { items: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed" });
  }
};

// 6. UPDATE PROFILE
export const updateProfile = async (req: any, res: Response) => {
  try {
    const { name, email } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email }
    });
    res.json({ id: updatedUser.id, name: updatedUser.name, email: updatedUser.email });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};