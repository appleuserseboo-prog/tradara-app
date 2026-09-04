// ==========================================
// FILE: src/routes/dashboardSessions.ts
// ==========================================
import { Router, Request, Response } from 'express';
import { prisma } from '../services/negotiationPersistenceService';

export const dashboardSessionsRouter = Router();

/**
 * GET /api/dashboard/sessions
 * Retrieves all negotiation sessions for the seller dashboard,
 * populated with item details and latest message history from MongoDB.
 */
dashboardSessionsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.aiNegotiationSession.findMany({
      include: {
        item: {
          select: {
            stockName: true,
            price: true,
            currency: true,
            category: true,
            images: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Format sessions for dashboard consumption
    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      productId: s.itemId,
      productName: s.item?.stockName || 'Unknown Product',
      listPrice: s.item?.price || 0,
      currency: s.item?.currency || 'NGN',
      buyerHandle: s.buyerSession,
      currentOffer: s.currentOffer ?? 0,
      agreedPrice: s.agreedPrice,
      status: s.status.toUpperCase(),
      rounds: s.roundCount,
      lastMessage: s.messages[0]?.message || 'No messages yet',
      lastUpdated: s.updatedAt,
      createdAt: s.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: formattedSessions.length,
      data: formattedSessions,
    });
  } catch (error: any) {
    console.error('[Dashboard Sessions Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard negotiation sessions.',
      details: error.message || error,
    });
  }
});

/**
 * GET /api/dashboard/sessions/:sessionId
 * Retrieves full conversation history and details for a specific session.
 */
dashboardSessionsRouter.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const rawSessionId = req.params.sessionId;
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID provided.',
      });
    }

    const session = await prisma.aiNegotiationSession.findUnique({
      where: { id: sessionId },
      include: {
        item: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: `Negotiation session with ID ${sessionId} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    console.error('[Dashboard Session Detail Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch session details.',
      details: error.message || error,
    });
  }
});

/**
 * GET /api/dashboard/analytics/metrics
 * Computes high-level negotiation analytics and conversion metrics from MongoDB.
 */
dashboardSessionsRouter.get('/analytics/metrics', async (req: Request, res: Response) => {
  try {
    const totalSessions = await prisma.aiNegotiationSession.count();
    const activeSessions = await prisma.aiNegotiationSession.count({
      where: { status: 'active' },
    });
    const acceptedSessions = await prisma.aiNegotiationSession.count({
      where: { status: 'accepted' },
    });
    const rejectedSessions = await prisma.aiNegotiationSession.count({
      where: { status: 'rejected' },
    });

    const conversionRate = totalSessions > 0 ? (acceptedSessions / totalSessions) * 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalNegotiations: totalSessions,
        activeCount: activeSessions,
        successfulDeals: acceptedSessions,
        rejectedCount: rejectedSessions,
        conversionRatePercentage: parseFloat(conversionRate.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error('[Dashboard Analytics Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to compute dashboard analytics.',
      details: error.message || error,
    });
  }
});

export default dashboardSessionsRouter;