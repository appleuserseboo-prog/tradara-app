// ==========================================
// FILE: backend/src/ai/agent/intentRouter.ts
// TRADARA AI — Intelligent Intent Router
// ==========================================

import {
  TradaraAgentType,
  TradaraIntent,
  AgentContext,
} from './types';

export interface IntentRoute {
  intent: TradaraIntent;
  agent: TradaraAgentType;
  confidence: number;
  requiresTools: boolean;
  requiresPlanning: boolean;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function routeIntent(
  message: string,
  context: AgentContext = {}
): IntentRoute {
  const text = normalize(message);

  /*
   * Explicit active product context has priority for product-specific
   * questions, but does not force every question into negotiation.
   */
  const hasProductContext = Boolean(
    context.product?.itemId ||
    context.product?.name ||
    context.product?.price
  );

  if (
    hasAny(text, [
      'buy',
      'find me',
      'show me',
      'looking for',
      'where can i get',
      'under ₦',
      'under naira',
      'product',
      'products',
      'item',
      'items',
      'shoe',
      'shoes',
      'shirt',
      'dress',
      'phone',
      'laptop',
    ])
  ) {
    return {
      intent: 'marketplace_search',
      agent: 'marketplace',
      confidence: 0.92,
      requiresTools: true,
      requiresPlanning: false,
    };
  }

  if (
    hasAny(text, [
      'compare',
      'difference between these products',
      'which product',
      'compare products',
      'better product',
      'alternative to',
    ])
  ) {
    return {
      intent: 'product_comparison',
      agent: 'marketplace',
      confidence: 0.94,
      requiresTools: true,
      requiresPlanning: true,
    };
  }

  if (
    hasAny(text, [
      'negotiate',
      'last price',
      'lowest price',
      'discount',
      'can you reduce',
      'reduce the price',
      'offer',
      'my offer',
    ]) ||
    hasProductContext && hasAny(text, ['price', 'cost', 'how much'])
  ) {
    return {
      intent: 'negotiation',
      agent: 'marketplace',
      confidence: 0.95,
      requiresTools: true,
      requiresPlanning: false,
    };
  }

  if (
    hasAny(text, [
      'research',
      'research this',
      'investigate',
      'analyze competitors',
      'competitor',
      'market research',
      'find information about',
      'what does the internet say',
    ])
  ) {
    return {
      intent: 'research',
      agent: 'research',
      confidence: 0.94,
      requiresTools: true,
      requiresPlanning: true,
    };
  }

  if (
    /^https?:\/\//i.test(text) ||
    hasAny(text, [
      'open this link',
      'open this website',
      'visit this website',
      'read this webpage',
      'access this link',
      'look at this url',
    ])
  ) {
    return {
      intent: 'web_access',
      agent: 'research',
      confidence: 0.96,
      requiresTools: true,
      requiresPlanning: true,
    };
  }

  if (
    hasAny(text, [
      'image',
      'picture',
      'photo',
      'screenshot',
      'what is in this image',
      'identify this',
      'recognize this',
      'look at this',
      'analyze this image',
    ]) &&
    context.attachments?.some(
      (attachment) => attachment.type === 'image'
    )
  ) {
    return {
      intent: 'image_analysis',
      agent: 'vision',
      confidence: 0.98,
      requiresTools: false,
      requiresPlanning: false,
    };
  }

  if (
    hasAny(text, [
      'video',
      'watch this',
      'analyze this video',
      'what happens in this video',
      'summarize this video',
    ]) &&
    context.attachments?.some(
      (attachment) => attachment.type === 'video'
    )
  ) {
    return {
      intent: 'video_analysis',
      agent: 'media',
      confidence: 0.98,
      requiresTools: false,
      requiresPlanning: true,
    };
  }

  if (
    hasAny(text, [
      'code',
      'javascript',
      'typescript',
      'react',
      'next.js',
      'nextjs',
      'node.js',
      'nodejs',
      'express',
      'mongodb',
      'prisma',
      'api',
      'debug',
      'bug',
      'error in my code',
      'write a function',
      'build a website',
      'build an application',
    ])
  ) {
    return {
      intent: 'coding',
      agent: 'developer',
      confidence: 0.96,
      requiresTools: true,
      requiresPlanning: true,
    };
  }

  if (
    hasAny(text, [
      'marketing campaign',
      'advertisement',
      'advertising',
      'caption',
      'social media post',
      'product description',
      'marketing strategy',
      'promo',
      'promotion',
    ])
  ) {
    return {
      intent: 'content_creation',
      agent: 'marketing',
      confidence: 0.93,
      requiresTools: true,
      requiresPlanning: true,
    };
  }

  if (
    hasAny(text, [
      'business plan',
      'business analysis',
      'revenue',
      'profit',
      'sales analysis',
      'financial analysis',
      'business strategy',
    ])
  ) {
    return {
      intent: 'business_analysis',
      agent: 'finance',
      confidence: 0.88,
      requiresTools: true,
      requiresPlanning: true,
    };
  }

  if (
    hasAny(text, [
      'create',
      'generate',
      'make me',
      'write',
      'design',
      'prepare',
      'produce',
    ])
  ) {
    return {
      intent: 'content_creation',
      agent: 'content',
      confidence: 0.82,
      requiresTools: false,
      requiresPlanning: true,
    };
  }

  if (
    hasAny(text, [
      'plan',
      'how do i',
      'how can i',
      'strategy',
      'steps',
      'roadmap',
      'help me solve',
    ])
  ) {
    return {
      intent: 'planning',
      agent: 'planning',
      confidence: 0.84,
      requiresTools: false,
      requiresPlanning: true,
    };
  }

  return {
    intent: 'general_question',
    agent: 'general',
    confidence: 0.72,
    requiresTools: false,
    requiresPlanning: false,
  };
}