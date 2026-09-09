// ==========================================
// FILE: backend/src/controllers/chatSessionController.ts
// ==========================================

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Controller managing persistent chat sessions and message histories for authenticated users.
 */
export const getUserChatSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized user.' });
      return;
    }

    const sessionDelegate = (prisma as any).chatSession || (prisma as any).aiChatSession;
    if (!sessionDelegate) {
      res.status(500).json({ success: false, error: 'Chat session model is not defined in Prisma client.' });
      return;
    }

    const sessions = await sessionDelegate.findMany({
      where: { userId },
      include: {
        item: {
          select: { id: true, stockName: true, price: true, currency: true, images: true, city: true, area: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, role: true, content: true, createdAt: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.status(200).json({ success: true, data: sessions });
  } catch (error: any) {
    console.error('[GetUserChatSessions Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve chat sessions.' });
  }
};

export const createChatSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { title, itemId } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized user.' });
      return;
    }

    const sessionDelegate = (prisma as any).chatSession || (prisma as any).aiChatSession;
    if (!sessionDelegate) {
      res.status(500).json({ success: false, error: 'Chat session model is not defined in Prisma client.' });
      return;
    }

    const session = await sessionDelegate.create({
      data: {
        title: title || 'New Chat',
        userId,
        itemId: itemId || null,
      },
      include: {
        item: true,
        messages: true,
      },
    });

    res.status(201).json({ success: true, data: session });
  } catch (error: any) {
    console.error('[CreateChatSession Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to create chat session.' });
  }
};

export const renameChatSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.params;
    const { title } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized user.' });
      return;
    }

    const sessionDelegate = (prisma as any).chatSession || (prisma as any).aiChatSession;
    if (!sessionDelegate) {
      res.status(500).json({ success: false, error: 'Chat session model is not defined in Prisma client.' });
      return;
    }

    const updated = await sessionDelegate.updateMany({
      where: { id: sessionId, userId },
      data: { title },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[RenameChatSession Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to rename chat session.' });
  }
};

export const deleteChatSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized user.' });
      return;
    }

    const sessionDelegate = (prisma as any).chatSession || (prisma as any).aiChatSession;
    if (!sessionDelegate) {
      res.status(500).json({ success: false, error: 'Chat session model is not defined in Prisma client.' });
      return;
    }

    await sessionDelegate.deleteMany({
      where: { id: sessionId, userId },
    });

    res.status(200).json({ success: true, message: 'Chat session deleted successfully.' });
  } catch (error: any) {
    console.error('[DeleteChatSession Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to delete chat session.' });
  }
};