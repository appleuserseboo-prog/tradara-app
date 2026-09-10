// ==========================================
// FILE: src/components/chatOS/TradaraOSLayout.tsx
// ==========================================

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Plus, Search, Pin, Trash2, 
  Sparkles, Send, Paperclip, 
  PanelRight, Settings, RefreshCw, 
  CheckCircle2, Zap
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import type { ChatSession, ChatMessage } from '../../types/chatOS';

export const TradaraOSLayout: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    setActiveSession,
    createSession,
    deleteSession,
    togglePinSession,
    addMessageToActiveSession,
    updateLastMessageContent,
    isRightPanelOpen,
    toggleRightPanel,
    activeRightPanelTab,
    setRightPanelTab,
    searchQuery,
    setSearchQuery
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession: ChatSession | undefined = sessions.find((s: ChatSession) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isGenerating) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    if (!activeSessionId) {
      createSession('general');
    }

    addMessageToActiveSession({
      role: 'user',
      content: userText,
      status: 'sent'
    });

    setIsGenerating(true);

    addMessageToActiveSession({
      role: 'model',
      content: '',
      status: 'streaming'
    });

    setTimeout(async () => {
      let simulatedReply = `I've analyzed your request regarding "${userText}". As TRADARA's marketplace intelligence engine, I am cross-referencing global buyer demand and regional inventory in Nigeria.`;
      
      if (activeSession?.activeProduct) {
        const listPrice = activeSession.activeProduct.listPrice || 100000;
        simulatedReply = `For **${activeSession.activeProduct.name}** (Listed at ₦${listPrice.toLocaleString()}), our negotiation engine calculates an optimal counter-offer of ₦${Math.round(listPrice * 0.9).toLocaleString()} with a 91% seller acceptance probability.`;
      }

      let currentChunk = '';
      for (let i = 0; i < simulatedReply.length; i += 3) {
        currentChunk += simulatedReply.substring(i, i + 3);
        updateLastMessageContent(currentChunk, {
          toolExecuted: true,
          quickOffers: [
            { label: 'Accept Deal', price: 1320000, formatted: '₦1,320,000' },
            { label: 'Counter ₦1.28M', price: 1280000, formatted: '₦1,280,000' }
          ]
        });
        await new Promise((r) => setTimeout(r, 12));
      }
      setIsGenerating(false);
    }, 400);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0c] text-slate-100 font-sans select-none">
      
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="w-80 flex-shrink-0 flex flex-col border-r border-slate-800/80 bg-[#0f0f13]/90 backdrop-blur-xl">
        
        {/* Workspace Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h1 className="font-bold tracking-wider text-sm bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">TRADARA OS</h1>
              <p className="text-[10px] text-emerald-400 font-medium tracking-wide">AI Marketplace Intelligence</p>
            </div>
          </div>
          <button 
            onClick={() => createSession('general')}
            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors border border-emerald-500/20"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="p-3">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search chats, products, deals... (⌘K)" 
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1.5">Recent Conversations</div>
          
          {sessions.map((session: ChatSession) => {
            const isActive = session.id === activeSessionId;
            return (
              <div 
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <MessageSquare className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="truncate font-medium">{session.title}</span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); togglePinSession(session.id); }}
                    className={`p-1 rounded hover:bg-slate-800 ${session.isPinned ? 'text-emerald-400 opacity-100' : 'text-slate-500'}`}
                  >
                    <Pin className="h-3 w-3" />
                  </button>
                  <button 
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteSession(session.id); }}
                    className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer User Profile */}
        <div className="p-3 border-t border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
              BI
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-200 truncate">Bello Ibraheem</div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Online & Secure
              </div>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>

      </aside>

      {/* ================= CENTER CHAT WORKSPACE ================= */}
      <main className="flex-1 flex flex-col bg-[#0a0a0c] relative">
        
        {/* Top Header Navigation */}
        <header className="h-14 border-b border-slate-800/80 bg-[#0f0f13]/60 backdrop-blur-md px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-200">{activeSession?.title || 'TRADARA AI OS'}</h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium uppercase tracking-wider">
              {activeSession?.category || 'General'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => toggleRightPanel()}
              className={`p-2 rounded-lg border transition-all ${isRightPanelOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
              title="Toggle Context Panel"
            >
              <PanelRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
          {activeSession?.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">How can TRADARA AI assist your marketplace today?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ask questions, compare products, evaluate seller reputation, or launch autonomous price negotiations instantly.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                <button 
                  onClick={() => { setInputMessage("Negotiate price for MacBook Pro M3 Max"); }}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 text-left text-xs text-slate-300 transition-all"
                >
                  💬 Start Price Negotiation
                </button>
                <button 
                  onClick={() => { setInputMessage("Find top rated laptop vendors in Ogbomoso"); }}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 text-left text-xs text-slate-300 transition-all"
                >
                  🔍 Find Nearby Sellers
                </button>
              </div>
            </div>
          ) : (
            activeSession?.messages.map((msg: ChatMessage) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex-shrink-0 flex items-center justify-center text-emerald-400 mt-1">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}
                
                <div className={`space-y-3 ${msg.role === 'user' ? 'max-w-xl' : 'flex-1'}`}>
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white font-medium shadow-lg shadow-emerald-600/10' 
                      : 'bg-slate-900/90 border border-slate-800/80 text-slate-200 shadow-xl'
                  }`}>
                    {msg.content || (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>TRADARA AI reasoning & streaming...</span>
                      </div>
                    )}
                  </div>

                  {msg.metadata?.quickOffers && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {msg.metadata.quickOffers.map((offer: { label: string; price: number; formatted: string }, idx: number) => (
                        <button 
                          key={idx}
                          onClick={() => setInputMessage(`Accept offer: ${offer.formatted}`)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Zap className="h-3 w-3 text-emerald-400" />
                          {offer.label} ({offer.formatted})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ================= BOTTOM INPUT AREA ================= */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0f0f13]/80 backdrop-blur-xl">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
            <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 focus-within:border-emerald-500/50 shadow-2xl transition-all">
              <textarea 
                rows={2}
                value={inputMessage}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputMessage(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder="Ask TRADARA AI anything, negotiate prices, or mention products..."
                className="w-full bg-transparent p-3.5 pr-24 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none custom-scrollbar"
              />

              {/* Action Toolbar inside Input */}
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <button type="button" className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors" title="Attach file">
                  <Paperclip className="h-4 w-4" />
                </button>
                <button 
                  type="submit" 
                  disabled={!inputMessage.trim() || isGenerating}
                  className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        </div>

      </main>

      {/* ================= RIGHT CONTEXT PANEL ================= */}
      <AnimatePresence>
        {isRightPanelOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 border-l border-slate-800/80 bg-[#0f0f13]/90 backdrop-blur-xl flex flex-col overflow-hidden"
          >
            {/* Panel Tabs */}
            <div className="flex border-b border-slate-800/80 p-2 gap-1 bg-slate-950/40">
              <button 
                onClick={() => setRightPanelTab('negotiation')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeRightPanelTab === 'negotiation' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Negotiation
              </button>
              <button 
                onClick={() => setRightPanelTab('product')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeRightPanelTab === 'product' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Product Specs
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {activeSession?.activeProduct ? (
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60">
                    <img src={activeSession.activeProduct.images[0]} alt="Product" className="w-full h-40 object-cover" />
                    <div className="p-4 space-y-2">
                      <h4 className="font-bold text-xs text-slate-100">{activeSession.activeProduct.name}</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">List Price</span>
                        <span className="font-bold text-sm text-emerald-400">₦{activeSession.activeProduct.listPrice?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Negotiation Matrix */}
                  {activeSession.negotiationState && (
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">AI Negotiation Matrix</div>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Probability of Acceptance</span>
                          <span className="font-bold text-emerald-400">{activeSession.negotiationState.probabilityOfAcceptance}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${activeSession.negotiationState.probabilityOfAcceptance}%` }}></div>
                        </div>
                      </div>

                      <button 
                        onClick={() => setInputMessage("Finalize and accept this deal")}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Finalize Deal Now
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No active product or negotiation context selected for this conversation.
                </div>
              )}
            </div>

          </motion.aside>
        )}
      </AnimatePresence>

    </div>
  );
};