// ==========================================
// FILE: src/types/chatOS.ts
// ==========================================

export type ThemeMode = 'dark' | 'light' | 'system' | 'midnight';

export type ChatCategory = 'general' | 'marketplace' | 'negotiation' | 'product_qa' | 'assistant';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system' | 'tool';
  content: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'streaming' | 'error';
  reactions?: string[];
  versionHistory?: string[];
  reasoningSummary?: string;
  metadata?: {
    toolExecuted?: boolean;
    quickOffers?: Array<{ label: string; price: number; formatted: string }>;
    activeProduct?: any;
    negotiationEngineOutput?: any;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  category: ChatCategory;
  folderId?: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  activeProduct?: any;
  negotiationState?: {
    sellerPrice: number;
    buyerOffer: number;
    aiRecommendation: number;
    probabilityOfAcceptance: number;
    status: 'active' | 'countered' | 'accepted' | 'rejected' | 'finalized';
    timeline: Array<{ round: number; actor: string; amount: number; time: string }>;
  };
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  isOpen: boolean;
}

export interface UserPreferences {
  theme: ThemeMode;
  fontSize: 'sm' | 'base' | 'lg';
  soundEnabled: boolean;
  autoScroll: boolean;
  model: string;
  negotiationStyle: 'aggressive' | 'balanced' | 'cooperative';
}