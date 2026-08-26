import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AiSalesService } from '../services/aiSalesService';

export const upsertProductAiConfig = async (req: Request, res: Response) => {
  try {
    const itemIdParam = req.params.itemId;
    const itemId = Array.isArray(itemIdParam) ? itemIdParam[0] : itemIdParam;
    const configData = req.body;

    const existingItem = await (prisma as any).item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const aiConfig = await (prisma as any).productAiConfig.upsert({
      where: { itemId },
      update: {
        ...configData,
      },
      create: {
        itemId,
        ...configData,
      },
    });

    return res.status(200).json({ success: true, aiConfig });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update AI configuration' });
  }
};

export const getProductAiConfig = async (req: Request, res: Response) => {
  try {
    const itemIdParam = req.params.itemId;
    const itemId = Array.isArray(itemIdParam) ? itemIdParam[0] : itemIdParam;

    const aiConfig = await (prisma as any).productAiConfig.findUnique({
      where: { itemId },
    });

    if (!aiConfig) {
      return res.status(404).json({ error: 'AI Configuration not found for this item' });
    }

    return res.status(200).json({ success: true, aiConfig });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch AI configuration' });
  }
};

export const handleChatMessage = async (req: Request, res: Response) => {
  try {
    const { itemId, buyerSession, buyerId, message, offeredPrice, quantity } = req.body;

    if (!itemId || !buyerSession || !message) {
      return res.status(400).json({ error: 'itemId, buyerSession, and message are required fields.' });
    }

    const result = await AiSalesService.processMessage({
      itemId,
      buyerSession,
      buyerId,
      message,
      offeredPrice: offeredPrice ? Number(offeredPrice) : undefined,
      quantity: quantity ? Number(quantity) : 1,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error processing AI chat message' });
  }
};

export const getNegotiationHistory = async (req: Request, res: Response) => {
  try {
    const itemIdParam = req.query.itemId;
    const buyerSessionParam = req.query.buyerSession;

    if (!itemIdParam || !buyerSessionParam) {
      return res.status(400).json({ error: 'itemId and buyerSession are required.' });
    }

    const itemId = Array.isArray(itemIdParam) ? String(itemIdParam[0]) : String(itemIdParam);
    const buyerSession = Array.isArray(buyerSessionParam) ? String(buyerSessionParam[0]) : String(buyerSessionParam);

    const session = await (prisma as any).aiNegotiationSession.findFirst({
      where: {
        itemId,
        buyerSession,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return res.status(200).json({ success: true, session });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error fetching negotiation history' });
  }
};
