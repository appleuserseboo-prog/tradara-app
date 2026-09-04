import { Router } from 'express';
import authRoutes from './authRoutes';
import itemRoutes from './itemRoutes';
import aiRoutes from './aiRoutes';

const router = Router();

// Keep-alive health check route for Render pinging / keep-warm cron jobs
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TRADARA Backend',
  });
});

// Routes are prefixed here
router.use('/auth', authRoutes);
router.use('/items', itemRoutes);
router.use('/ai', aiRoutes);

export default router;