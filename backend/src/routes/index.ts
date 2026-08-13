import { Router } from 'express';
import authRoutes from './authRoutes';
import itemRoutes from './itemRoutes';
import aiRoutes from './aiRoutes';

const router = Router();

// Routes are prefixed here
router.use('/auth', authRoutes);
router.use('/items', itemRoutes);
router.use('/ai', aiRoutes);

export default router;