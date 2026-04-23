import { Router } from 'express';
import { 
  register, 
  login, 
  updateProfile, 
  forgotPassword, 
  resetPassword, 
  getMe 
} from '../controller/auth';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// AUTH ROUTES
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// USER PROFILE ROUTES
router.get('/me', authMiddleware, getMe); 
router.patch('/profile', authMiddleware, updateProfile);

// LOGOUT
router.post('/logout', authMiddleware, (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
});

export default router;