import { Router } from 'express';
import authRoutes from './authRoutes';
import itemRoutes from './itemRoutes';

const router = Router();

// Routes are prefixed here
router.use('/auth', authRoutes);
router.use('/items', itemRoutes);

export default router;