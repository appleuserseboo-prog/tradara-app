// ==========================================
// FILE: src/store/useChatStore.ts
// ==========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatSession, ChatMessage, Folder, UserPreferences, ChatCategory } from '../types/chatOS';

interface ChatOSState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  folders: Folder[];
  searchQuery: string;
  isRightPanelOpen: boolean;
  activeRightPanelTab: 'product' | 'negotiation' | 'insights' | 'seller';
  preferences: UserPreferences;
  
  // Actions
  setActiveSession: (id: string | null) => void;
  createSession: (category?: ChatCategory, initialProduct?: any) => string;
  updateSessionTitle: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
  togglePinSession: (id: string) => void;
  toggleFavoriteSession: (id: string) => void;
  toggleArchiveSession: (id: string) => void;
  addMessageToActiveSession: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastMessageContent: (content: string, metadata?: Record<string, any>) => void;
  setSearchQuery: (query: string) => void;
  toggleRightPanel: (open?: boolean) => void;
  setRightPanelTab: (tab: 'product' | 'negotiation' | 'insights' | 'seller') => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}

export const useChatStore = create<ChatOSState>()(
  persist(
    (set) => ({
      sessions: [
        {
          id: 'session-demo-1',
          title: 'MacBook Pro M3 Max Negotiation',
          category: 'negotiation' as ChatCategory,
          isPinned: true,
          isFavorite: true,
          isArchived: false,
          createdAt: Date.now() - 3600000,
          updatedAt: Date.now(),
          messages: [
            {
              id: 'm-1',
              role: 'user',
              content: 'Can we get this MacBook Pro down to ₦1,200,000?',
              timestamp: Date.now() - 3500000,
              status: 'sent'
            },
            {
              id: 'm-2',
              role: 'model',
              content: 'The seller listed this at ₦1,450,000. Based on market analytics in Ogbomoso, our AI negotiation engine recommends a counter-offer of ₦1,320,000 to maintain an 88% acceptance probability.',
              timestamp: Date.now() - 3490000,
              status: 'sent',
              metadata: {
                quickOffers: [
                  { label: '₦1.32M (Recommended)', price: 1320000, formatted: '₦1,320,000' },
                  { label: '₦1.25M Aggressive', price: 1250000, formatted: '₦1,250,000' }
                ]
              }
            }
          ],
          activeProduct: {
            id: 'prod-1',
            name: 'Apple MacBook Pro 16" M3 Max',
            listPrice: 1450000,
            minPrice: 1250000,
            currency: '₦',
            city: 'Ogbomoso',
            images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8']
          },
          negotiationState: {
            sellerPrice: 1450000,
            buyerOffer: 1200000,
            aiRecommendation: 1320000,
            probabilityOfAcceptance: 88,
            status: 'active',
            timeline: [
              { round: 1, actor: 'Buyer', amount: 1200000, time: '10:15 AM' },
              { round: 2, actor: 'AI Agent', amount: 1320000, time: '10:16 AM' }
            ]
          }
        }
      ],
      activeSessionId: 'session-demo-1',
      folders: [
        { id: 'f-1', name: 'Active Deals', color: 'bg-emerald-500', isOpen: true },
        { id: 'f-2', name: 'Tech & Hardware', color: 'bg-blue-500', isOpen: true }
      ],
      searchQuery: '',
      isRightPanelOpen: true,
      activeRightPanelTab: 'negotiation',
      preferences: {
        theme: 'dark',
        fontSize: 'base',
        soundEnabled: true,
        autoScroll: true,
        model: 'gemini-3.7-flash',
        negotiationStyle: 'balanced'
      },

      setActiveSession: (id: string | null) => set({ activeSessionId: id }),
      
      createSession: (category: ChatCategory = 'general', initialProduct: any = null) => {
        const newId = `session-${Date.now()}`;
        const newSession: ChatSession = {
          id: newId,
          title: initialProduct ? `Negotiate: ${initialProduct.name}` : 'New AI Conversation',
          category,
          isPinned: false,
          isFavorite: false,
          isArchived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          activeProduct: initialProduct,
          negotiationState: initialProduct ? {
            sellerPrice: initialProduct.listPrice || 100000,
            buyerOffer: Math.round((initialProduct.listPrice || 100000) * 0.85),
            aiRecommendation: Math.round((initialProduct.listPrice || 100000) * 0.90),
            probabilityOfAcceptance: 92,
            status: 'active',
            timeline: []
          } : undefined
        };
        set((state: ChatOSState) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: newId,
          isRightPanelOpen: !!initialProduct
        }));
        return newId;
      },

      updateSessionTitle: (id: string, title: string) => set((state: ChatOSState) => ({
        sessions: state.sessions.map((s: ChatSession) => s.id === id ? { ...s, title, updatedAt: Date.now() } : s)
      })),

      deleteSession: (id: string) => set((state: ChatOSState) => {
        const remaining = state.sessions.filter((s: ChatSession) => s.id !== id);
        return {
          sessions: remaining,
          activeSessionId: state.activeSessionId === id ? (remaining[0]?.id || null) : state.activeSessionId
        };
      }),

      togglePinSession: (id: string) => set((state: ChatOSState) => ({
        sessions: state.sessions.map((s: ChatSession) => s.id === id ? { ...s, isPinned: !s.isPinned } : s)
      })),

      toggleFavoriteSession: (id: string) => set((state: ChatOSState) => ({
        sessions: state.sessions.map((s: ChatSession) => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s)
      })),

      toggleArchiveSession: (id: string) => set((state: ChatOSState) => ({
        sessions: state.sessions.map((s: ChatSession) => s.id === id ? { ...s, isArchived: !s.isArchived } : s)
      })),

      addMessageToActiveSession: (msgData: Omit<ChatMessage, 'id' | 'timestamp'>) => set((state: ChatOSState) => {
        const activeId = state.activeSessionId;
        if (!activeId) return state;
        
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: Date.now(),
          ...msgData
        };

        return {
          sessions: state.sessions.map((s: ChatSession) => {
            if (s.id !== activeId) return s;
            const updatedMessages = [...s.messages, newMessage];
            let title = s.title;
            if (s.messages.length === 0 && msgData.role === 'user') {
              title = msgData.content.length > 32 ? msgData.content.substring(0, 32) + '...' : msgData.content;
            }
            return {
              ...s,
              title,
              messages: updatedMessages,
              updatedAt: Date.now()
            };
          })
        };
      }),

      updateLastMessageContent: (content: string, metadata?: Record<string, any>) => set((state: ChatOSState) => {
        const activeId = state.activeSessionId;
        if (!activeId) return state;

        return {
          sessions: state.sessions.map((s: ChatSession) => {
            if (s.id !== activeId || s.messages.length === 0) return s;
            const msgs = [...s.messages];
            const lastMsg = { ...msgs[msgs.length - 1] };
            lastMsg.content = content;
            if (metadata) lastMsg.metadata = { ...lastMsg.metadata, ...metadata };
            lastMsg.status = 'sent';
            msgs[msgs.length - 1] = lastMsg;
            return { ...s, messages: msgs, updatedAt: Date.now() };
          })
        };
      }),

      setSearchQuery: (query: string) => set({ searchQuery: query }),
      toggleRightPanel: (open?: boolean) => set((state: ChatOSState) => ({ isRightPanelOpen: open !== undefined ? open : !state.isRightPanelOpen })),
      setRightPanelTab: (tab: 'product' | 'negotiation' | 'insights' | 'seller') => set({ activeRightPanelTab: tab }),
      updatePreferences: (prefs: Partial<UserPreferences>) => set((state: ChatOSState) => ({ preferences: { ...state.preferences, ...prefs } }))
    }),
    { name: 'tradara-chat-os-store' }
  )
);