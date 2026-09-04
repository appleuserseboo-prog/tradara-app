// ==========================================
// FILE: backend/src/middleware/authMiddleware.ts
// ==========================================

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../ai/tools/types';

/**
 * Normalizes decoded JWT payloads or fallbacks into a valid AuthenticatedUser object.
 */
const buildUserContext = (decoded: any) => {
  return {
    id: decoded?.id || decoded?.userId || 'usr_guest_anonymous',
    role: decoded?.role || 'GUEST',
    storeId: decoded?.storeId || undefined,
    permissions: decoded?.permissions || (decoded?.role === 'ADMIN' ? ['ALL'] : ['READ_ONLY']),
    email: decoded?.email,
    name: decoded?.name,
  };
};

/**
 * Strict authentication middleware that blocks unauthenticated requests.
 */
export const authMiddleware = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET || 'legendary_secret_key_2026'
    );

    req.user = buildUserContext(decoded);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Flexible AI authentication middleware that attaches user security context when available,
 * defaulting gracefully to guest privileges if unauthenticated.
 */
export const authenticateUser = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(
        token,
        process.env.JWT_SECRET || 'legendary_secret_key_2026'
      );

      req.user = buildUserContext(decoded);
    } else {
      req.user = {
        id: 'usr_guest_anonymous',
        role: 'GUEST',
        permissions: ['READ_ONLY'],
      };
    }
  } catch (_error) {
    req.user = {
      id: 'usr_guest_anonymous',
      role: 'GUEST',
      permissions: ['READ_ONLY'],
    };
  }

  next();
};