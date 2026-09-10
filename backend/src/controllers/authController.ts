// ==========================================
// FILE: backend/src/controllers/authController.ts
// ==========================================

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'tradara_secret_key_legendary';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'tradara_refresh_secret_key';

export const handleRefreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ success: false, error: 'Refresh token is required.' });
      return;
    }

    // Verify refresh token
    const decoded: any = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    }).catch(() => null) || await (prisma as any).customer?.findUnique({
      where: { id: decoded.userId },
    }).catch(() => null);

    if (!user) {
      res.status(403).json({ success: false, error: 'Invalid refresh session. Please log in again.' });
      return;
    }

    // Generate fresh token pair
    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (error: any) {
    console.error('[Auth Refresh Error]:', error);
    res.status(403).json({ success: false, error: 'Session expired. Please log in again.' });
  }
};