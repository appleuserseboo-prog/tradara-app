// ==========================================
// FILE: src/services/negotiationPersistenceService.ts
// ==========================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SaveOfferRoundInput {
  sessionId?: string;
  itemId: string;
  buyerSession: string;
  buyerOffer: number;
  buyerMessage: string;
  aiAction: 'ACCEPT' | 'REJECT' | 'COUNTER';
  aiCounterAmount: number;
  aiReasoning: string;
  aiBuyerMessage: string;
  currentRound: number;
}

/**
 * Persists an incoming offer and the resulting AI decision using your existing
 * AiNegotiationSession and AiChatMessage models in MongoDB via Prisma.
 */
export async function saveNegotiationRound(input: SaveOfferRoundInput) {
  const {
    sessionId,
    itemId,
    buyerSession,
    buyerOffer,
    buyerMessage,
    aiAction,
    aiCounterAmount,
    aiReasoning,
    aiBuyerMessage,
    currentRound,
  } = input;

  const sessionStatus =
    aiAction === 'ACCEPT'
      ? 'accepted'
      : aiAction === 'REJECT'
      ? 'rejected'
      : 'active';

  // 1. Find or create the AiNegotiationSession record
  let session;
  if (sessionId && sessionId.length === 24) {
    session = await prisma.aiNegotiationSession.upsert({
      where: { id: sessionId },
      create: {
        itemId,
        buyerSession,
        currentOffer: aiCounterAmount,
        status: sessionStatus,
        roundCount: currentRound,
        agreedPrice: aiAction === 'ACCEPT' ? aiCounterAmount : null,
      },
      update: {
        currentOffer: aiCounterAmount,
        status: sessionStatus,
        roundCount: currentRound,
        agreedPrice: aiAction === 'ACCEPT' ? aiCounterAmount : undefined,
      },
    });
  } else {
    session = await prisma.aiNegotiationSession.findFirst({
      where: { buyerSession, itemId, status: 'active' },
    });

    if (session) {
      session = await prisma.aiNegotiationSession.update({
        where: { id: session.id },
        data: {
          currentOffer: aiCounterAmount,
          status: sessionStatus,
          roundCount: currentRound,
          agreedPrice: aiAction === 'ACCEPT' ? aiCounterAmount : undefined,
        },
      });
    } else {
      session = await prisma.aiNegotiationSession.create({
        data: {
          itemId,
          buyerSession,
          currentOffer: aiCounterAmount,
          status: sessionStatus,
          roundCount: currentRound,
          agreedPrice: aiAction === 'ACCEPT' ? aiCounterAmount : null,
        },
      });
    }
  }

  // 2. Log buyer message and AI response into AiChatMessage
  const buyerMsgRecord = await prisma.aiChatMessage.create({
    data: {
      sessionId: session.id,
      sender: 'buyer',
      message: buyerMessage,
      offerMade: buyerOffer,
    },
  });

  const aiMsgRecord = await prisma.aiChatMessage.create({
    data: {
      sessionId: session.id,
      sender: 'ai',
      message: `${aiBuyerMessage}\n[Reasoning: ${aiReasoning}]`,
      offerMade: aiCounterAmount,
    },
  });

  return { session, messages: [buyerMsgRecord, aiMsgRecord] };
}

/**
 * Retrieves past conversation history for a given session formatted for AI context injection.
 */
export async function getSessionHistory(sessionId: string) {
  return await prisma.aiChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
}

export { prisma };