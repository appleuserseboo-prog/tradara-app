// ==========================================
// FILE: backend/src/ai/agent/intentRouter.ts
// TRADARA AI — Intelligent Intent Router
// ==========================================

import {
  TradaraAgentType,
  TradaraIntent,
  AgentContext,
} from './types';

// ==========================================
// Intent Route
// ==========================================

export interface IntentRoute {
  intent: TradaraIntent;
  agent: TradaraAgentType;
  confidence: number;
  requiresTools: boolean;
  requiresPlanning: boolean;
}

// ==========================================
// Text Normalization
// ==========================================

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ==========================================
// Matching Helpers
// ==========================================

function hasAny(
  text: string,
  terms: string[]
): boolean {
  return terms.some((term) =>
    text.includes(term)
  );
}

function hasWord(
  text: string,
  word: string
): boolean {
  const escaped = word.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  return new RegExp(
    `\\b${escaped}\\b`,
    'i'
  ).test(text);
}

function hasAnyWord(
  text: string,
  words: string[]
): boolean {
  return words.some((word) =>
    hasWord(text, word)
  );
}

function hasUrl(text: string): boolean {
  return /^https?:\/\//i.test(text);
}

function hasAttachment(
  context: AgentContext,
  type: string
): boolean {
  return Boolean(
    context.attachments?.some(
      (attachment) =>
        attachment.type === type
    )
  );
}

function hasAnyAttachment(
  context: AgentContext,
  types: string[]
): boolean {
  return Boolean(
    context.attachments?.some(
      (attachment) =>
        types.includes(
          attachment.type
        )
    )
  );
}

// ==========================================
// Context Signals
// ==========================================

function hasProductContext(
  context: AgentContext
): boolean {
  return Boolean(
    context.product?.itemId ||
    context.product?.name ||
    context.product?.price
  );
}

function hasProjectContext(
  context: AgentContext
): boolean {
  return Boolean(
    context.project?.projectId ||
    context.project?.name ||
    context.project?.description
  );
}

// ==========================================
// Intent Route Builders
// ==========================================

function marketplaceSearchRoute(
  confidence = 0.92
): IntentRoute {
  return {
    intent: 'marketplace_search',
    agent: 'marketplace',
    confidence,
    requiresTools: true,
    requiresPlanning: false,
  };
}

function comparisonRoute(
  confidence = 0.95
): IntentRoute {
  return {
    intent: 'product_comparison',
    agent: 'marketplace',
    confidence,
    requiresTools: true,
    requiresPlanning: true,
  };
}

function negotiationRoute(
  confidence = 0.95
): IntentRoute {
  return {
    intent: 'negotiation',
    agent: 'marketplace',
    confidence,
    requiresTools: true,
    requiresPlanning: false,
  };
}

function researchRoute(
  confidence = 0.94
): IntentRoute {
  return {
    intent: 'research',
    agent: 'research',
    confidence,
    requiresTools: true,
    requiresPlanning: true,
  };
}

function webAccessRoute(
  confidence = 0.96
): IntentRoute {
  return {
    intent: 'web_access',
    agent: 'research',
    confidence,
    requiresTools: true,
    requiresPlanning: true,
  };
}

function imageAnalysisRoute(
  confidence = 0.98
): IntentRoute {
  return {
    intent: 'image_analysis',
    agent: 'vision',
    confidence,
    requiresTools: false,
    requiresPlanning: false,
  };
}

function videoAnalysisRoute(
  confidence = 0.98
): IntentRoute {
  return {
    intent: 'video_analysis',
    agent: 'media',
    confidence,
    requiresTools: false,
    requiresPlanning: true,
  };
}

function codingRoute(
  confidence = 0.96
): IntentRoute {
  return {
    intent: 'coding',
    agent: 'developer',
    confidence,
    requiresTools: true,
    requiresPlanning: true,
  };
}

function marketingRoute(
  confidence = 0.93
): IntentRoute {
  return {
    intent: 'content_creation',
    agent: 'marketing',
    confidence,
    requiresTools: true,
    requiresPlanning: true,
  };
}

function businessRoute(
  confidence = 0.9
): IntentRoute {
  return {
    intent: 'business_analysis',
    agent: 'finance',
    confidence,
    requiresTools: true,
    requiresPlanning: true,
  };
}

function contentCreationRoute(
  confidence = 0.84
): IntentRoute {
  return {
    intent: 'content_creation',
    agent: 'content',
    confidence,
    requiresTools: false,
    requiresPlanning: true,
  };
}

function planningRoute(
  confidence = 0.84
): IntentRoute {
  return {
    intent: 'planning',
    agent: 'planning',
    confidence,
    requiresTools: false,
    requiresPlanning: true,
  };
}

function generalRoute(
  confidence = 0.72
): IntentRoute {
  return {
    intent: 'general_question',
    agent: 'general',
    confidence,
    requiresTools: false,
    requiresPlanning: false,
  };
}

// ==========================================
// Intelligent Intent Router
// ==========================================

export function routeIntent(
  message: string,
  context: AgentContext = {}
): IntentRoute {
  const text = normalize(
    typeof message === 'string'
      ? message
      : ''
  );

  if (!text) {
    return generalRoute(0.5);
  }

  const productContext =
    hasProductContext(context);

  const projectContext =
    hasProjectContext(context);

  const imageAttached =
    hasAttachment(
      context,
      'image'
    );

  const videoAttached =
    hasAttachment(
      context,
      'video'
    );

  const documentAttached =
    hasAnyAttachment(
      context,
      [
        'document',
        'pdf',
        'file',
      ]
    );

  // ========================================
  // 1. WEB URL / DIRECT WEB ACCESS
  // ========================================
  //
  // A direct URL is a stronger signal than
  // generic research or content language.
  //
  // Example:
  //
  // "https://example.com"
  // "open this website"
  // "read this webpage"
  //
  // ========================================

  if (
    hasUrl(text) ||
    hasAny(text, [
      'open this link',
      'open this website',
      'visit this website',
      'read this webpage',
      'read this website',
      'access this link',
      'look at this url',
      'check this url',
      'browse this website',
      'go to this website',
    ])
  ) {
    return webAccessRoute();
  }

  // ========================================
  // 2. IMAGE ANALYSIS
  // ========================================
  //
  // Attachment presence is a strong signal.
  // This prevents "what is this?" with an
  // attached image from becoming a general
  // question.
  //
  // ========================================

  if (
    imageAttached &&
    (
      hasAny(text, [
        'image',
        'picture',
        'photo',
        'screenshot',
        'what is this',
        'what is in this',
        'identify this',
        'recognize this',
        'look at this',
        'analyze this',
        'describe this',
        'what do you see',
        'read this image',
        'extract text',
        'ocr',
      ]) ||
      text.length < 80
    )
  ) {
    return imageAnalysisRoute();
  }

  // ========================================
  // 3. VIDEO ANALYSIS
  // ========================================

  if (
    videoAttached &&
    (
      hasAny(text, [
        'video',
        'watch this',
        'analyze this video',
        'what happens in this video',
        'summarize this video',
        'describe this video',
        'review this video',
        'what is happening',
        'extract information from this video',
      ]) ||
      text.length < 80
    )
  ) {
    return videoAnalysisRoute();
  }

  // ========================================
  // 4. DOCUMENT / FILE ANALYSIS
  // ========================================
  //
  // Do not force document questions into
  // general content creation merely because
  // the user says "summarize", "analyze",
  // or "read".
  //
  // ========================================

  if (
    documentAttached &&
    hasAny(text, [
      'summarize',
      'summary',
      'summarise',
      'analyze',
      'analyse',
      'read this',
      'review this',
      'explain this',
      'extract',
      'what does this file say',
      'what is in this file',
      'from this document',
      'from this pdf',
      'this document',
      'this file',
      'this pdf',
    ])
  ) {
    return contentCreationRoute(
      0.9
    );
  }

  // ========================================
  // 5. PRODUCT COMPARISON
  // ========================================
  //
  // IMPORTANT:
  //
  // This MUST come before generic marketplace
  // search.
  //
  // "compare these products"
  // "which phone is better"
  // "what is the difference between these"
  //
  // must never be swallowed by the generic
  // "product/products/phone" marketplace
  // matcher.
  //
  // ========================================

  if (
    hasAny(text, [
      'compare',
      'comparison',
      'compare these',
      'compare these products',
      'compare products',
      'compare the products',
      'compare these items',
      'compare the items',
      'difference between',
      'differences between',
      'what is the difference',
      'which product is better',
      'which one is better',
      'which is better',
      'which should i choose',
      'which should i buy',
      'which one should i buy',
      'better product',
      'better option',
      'best alternative',
      'alternative to',
      'alternatives to',
    ])
  ) {
    return comparisonRoute();
  }

  // ========================================
  // 6. NEGOTIATION
  // ========================================
  //
  // Product-context price questions are
  // negotiation-related, but only when an
  // active product exists.
  //
  // This prevents ordinary questions such as
  // "how much does university cost?" from
  // being interpreted as marketplace
  // negotiation.
  //
  // ========================================

  if (
    hasAny(text, [
      'negotiate',
      'negotiation',
      'last price',
      'final price',
      'lowest price',
      'best price',
      'discount',
      'discounted price',
      'can you reduce',
      'can you lower',
      'reduce the price',
      'lower the price',
      'reduce price',
      'lower price',
      'make it cheaper',
      'cheaper price',
      'price reduction',
      'my offer',
      'my final offer',
      'i offer',
      'i can pay',
      'would you take',
      'will you take',
      'can you do',
      'how low can you go',
      'how much can you reduce',
    ]) ||
    (
      productContext &&
      hasAny(text, [
        'price',
        'cost',
        'how much',
        'expensive',
        'cheap',
      ])
    )
  ) {
    return negotiationRoute();
  }

  // ========================================
  // 7. MARKETPLACE SEARCH / SHOPPING
  // ========================================
  //
  // Generic product discovery comes AFTER
  // comparison and negotiation.
  //
  // ========================================

  if (
    hasAny(text, [
      'buy',
      'find me',
      'find a',
      'find an',
      'show me',
      'show me some',
      'looking for',
      'i am looking for',
      'where can i get',
      'where can i buy',
      'where to buy',
      'shop for',
      'shopping for',
      'search for',
      'search products',
      'find products',
      'find products for me',
      'recommend a product',
      'recommend products',
      'recommend something',
      'product',
      'products',
      'item',
      'items',
      'shoe',
      'shoes',
      'shirt',
      'shirts',
      'dress',
      'dresses',
      'phone',
      'phones',
      'laptop',
      'laptops',
      'computer',
      'computers',
      'bag',
      'bags',
      'watch',
      'watches',
      'perfume',
      'perfumes',
      'scarf',
      'scarves',
      'abaya',
      'jewelry',
      'jewellery',
      'accessories',
    ])
  ) {
    return marketplaceSearchRoute();
  }

  // ========================================
  // 8. RESEARCH
  // ========================================

  if (
    hasAny(text, [
      'research',
      'research this',
      'research about',
      'research on',
      'investigate',
      'investigate this',
      'investigation',
      'analyze competitors',
      'analyse competitors',
      'competitor',
      'competitors',
      'competitor analysis',
      'market research',
      'market trends',
      'industry research',
      'find information about',
      'find information on',
      'what does the internet say',
      'search the internet',
      'search online',
      'look online',
      'look it up',
      'verify this',
      'fact check this',
      'fact-check this',
      'check whether this is true',
      'find reliable sources',
      'find sources',
      'cite sources',
    ])
  ) {
    return researchRoute();
  }

  // ========================================
  // 9. CODING / SOFTWARE DEVELOPMENT
  // ========================================
  //
  // Code-related requests should be routed
  // before generic "create/write/build"
  // content creation.
  //
  // ========================================

  if (
    hasAny(text, [
      'code',
      'coding',
      'programming',
      'developer',
      'development',
      'javascript',
      'typescript',
      'react',
      'react native',
      'next.js',
      'nextjs',
      'node.js',
      'nodejs',
      'express',
      'nestjs',
      'mongo',
      'mongodb',
      'mongoose',
      'prisma',
      'postgres',
      'postgresql',
      'sql',
      'api',
      'rest api',
      'graphql',
      'backend',
      'frontend',
      'full stack',
      'full-stack',
      'database',
      'middleware',
      'authentication',
      'authorization',
      'endpoint',
      'route',
      'routes',
      'server',
      'deployment',
      'deploy',
      'github',
      'git',
      'debug',
      'debugging',
      'bug',
      'error in my code',
      'fix my code',
      'fix this code',
      'why is my code',
      'why does this code',
      'write a function',
      'write code',
      'generate code',
      'refactor',
      'refactoring',
      'optimize my code',
      'optimize this code',
      'test this code',
      'unit test',
      'build a website',
      'build an application',
      'build an app',
      'build a backend',
      'build a frontend',
      'create an api',
      'create a website',
      'create an application',
      'software architecture',
      'architecture review',
    ])
  ) {
    return codingRoute();
  }

  // ========================================
  // 10. MARKETING
  // ========================================

  if (
    hasAny(text, [
      'marketing campaign',
      'marketing plan',
      'marketing strategy',
      'advertisement',
      'advertising',
      'ad copy',
      'ad campaign',
      'caption',
      'social media post',
      'social media content',
      'instagram post',
      'facebook post',
      'tiktok caption',
      'tiktok post',
      'product description',
      'product copy',
      'sales copy',
      'promo',
      'promotion',
      'promotional',
      'promote my business',
      'brand strategy',
      'branding',
      'campaign',
      'sales campaign',
      'customer acquisition',
      'customer retention',
    ])
  ) {
    return marketingRoute();
  }

  // ========================================
  // 11. BUSINESS / FINANCIAL ANALYSIS
  // ========================================

  if (
    hasAny(text, [
      'business plan',
      'business analysis',
      'business model',
      'business strategy',
      'business idea',
      'revenue',
      'profit',
      'profits',
      'loss',
      'losses',
      'sales analysis',
      'sales performance',
      'financial analysis',
      'financial plan',
      'financial projection',
      'cash flow',
      'expenses',
      'expense analysis',
      'pricing strategy',
      'unit economics',
      'break even',
      'break-even',
      'investment analysis',
      'market opportunity',
      'business growth',
      'grow my business',
      'increase sales',
      'increase revenue',
      'reduce business costs',
      'business metrics',
      'kpi',
      'kpis',
    ])
  ) {
    return businessRoute();
  }

  // ========================================
  // 12. CONTENT CREATION
  // ========================================
  //
  // Generic creation requests are handled
  // after specialist routes.
  //
  // ========================================

  if (
    hasAny(text, [
      'create',
      'generate',
      'make me',
      'write',
      'design',
      'prepare',
      'produce',
      'draft',
      'compose',
      'rewrite',
      'rephrase',
      'edit this',
      'polish this',
      'improve this',
      'shorten this',
      'expand this',
      'turn this into',
      'create a document',
      'create a report',
      'create a proposal',
      'create a presentation',
      'create an invoice',
      'create a catalogue',
      'create a catalog',
    ])
  ) {
    return contentCreationRoute();
  }

  // ========================================
  // 13. PLANNING / PROBLEM SOLVING
  // ========================================

  if (
    hasAny(text, [
      'plan',
      'planning',
      'how do i',
      'how can i',
      'how should i',
      'what should i do',
      'strategy',
      'steps',
      'step by step',
      'roadmap',
      'workflow',
      'action plan',
      'implementation plan',
      'help me solve',
      'solve this',
      'solve the problem',
      'figure this out',
      'organize this',
      'organise this',
      'break this down',
      'break it down',
      'what is the best way to',
      'best way to',
      'approach this',
      'approach to',
    ])
  ) {
    return planningRoute();
  }

  // ========================================
  // 14. PRODUCT-CONTEXT QUESTIONS
  // ========================================
  //
  // An active product context should not
  // automatically mean negotiation.
  //
  // Examples:
  //
  // "what material is this?"
  // "tell me more about it"
  // "is this available?"
  //
  // Keep the request available to the
  // marketplace agent without incorrectly
  // labelling it as price negotiation.
  //
  // ========================================

  if (
    productContext &&
    hasAny(text, [
      'tell me about it',
      'tell me more',
      'more information',
      'more details',
      'details about this',
      'describe this product',
      'what is this product',
      'is this available',
      'available',
      'in stock',
      'stock',
      'size',
      'sizes',
      'colour',
      'color',
      'material',
      'brand',
      'seller',
      'delivery',
      'shipping',
      'location',
      'where is it',
    ])
  ) {
    return marketplaceSearchRoute(
      0.9
    );
  }

  // ========================================
  // 15. PROJECT-CONTEXT QUESTIONS
  // ========================================
  //
  // When the user is already working inside
  // a software project, short development
  // follow-ups can still be routed to the
  // developer agent even if the message itself
  // contains weak coding keywords.
  //
  // ========================================

  if (
    projectContext &&
    hasAny(text, [
      'this project',
      'this app',
      'this application',
      'this website',
      'this backend',
      'this frontend',
      'this component',
      'this file',
      'this code',
      'continue',
      'continue from here',
      'fix this',
      'update this',
      'modify this',
      'change this',
      'improve this',
      'add this',
      'remove this',
    ])
  ) {
    return codingRoute(
      0.9
    );
  }

  // ========================================
  // 16. SHORT FOLLOW-UP / GENERAL QUESTION
  // ========================================
  //
  // Do NOT invent an intent merely because
  // the message is short.
  //
  // "hello"
  // "thanks"
  // "okay"
  // "yes"
  // "why?"
  //
  // should remain general unless stronger
  // context exists.
  //
  // ========================================

  return generalRoute();
}