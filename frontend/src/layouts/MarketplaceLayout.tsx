import React, { useState, useEffect } from 'react';
import { Sparkles, Home, ShoppingBag, MessageSquare, User } from 'lucide-react';
import { TradaraAiDrawer } from '../components/chat/TradaraAiDrawer';
import type { ItemContext } from '../components/chat/TradaraAiDrawer';

interface MarketplaceLayoutProps {
  children: React.ReactNode;
  activeItem?: ItemContext | null;
}

export const MarketplaceLayout: React.FC<MarketplaceLayoutProps> = ({ children, activeItem }) => {
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [buyerSession, setBuyerSession] = useState<string>('');

  useEffect(() => {
    let session = localStorage.getItem('tradara_buyer_session');
    if (!session) {
      session = 'session_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      localStorage.setItem('tradara_buyer_session', session);
    }
    setBuyerSession(session);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Left Navigation Rail (WhatsApp Meta AI Rail Style) */}
      <aside className="w-full md:w-16 md:min-h-screen bg-slate-900/90 border-r border-slate-800 flex md:flex-col items-center justify-between p-3 z-40">
        <div className="flex md:flex-col items-center gap-6 w-full justify-around md:justify-start">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-xl">
            T
          </div>

          <div className="h-px w-8 bg-slate-800 hidden md:block" />

          <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <Home className="w-5 h-5" />
          </button>

          <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <ShoppingBag className="w-5 h-5" />
          </button>

          {/* Meta AI-Style Floating AI Trigger Rail */}
          <button
            onClick={() => setIsAiOpen(!isAiOpen)}
            className="relative p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-400 text-white shadow-lg shadow-purple-500/30 hover:scale-110 transition-transform group"
            title="Open TRADARA AI Assistant"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
          </button>
        </div>

        <div className="hidden md:flex flex-col items-center gap-4">
          <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <MessageSquare className="w-5 h-5" />
          </button>
          <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <User className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Viewport Content */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {children}
      </main>

      {/* Floating Action Button (FAB) */}
      {!isAiOpen && (
        <button
          onClick={() => setIsAiOpen(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white rounded-2xl shadow-2xl border border-purple-400/30 flex items-center gap-2.5 hover:scale-105 transition-all group"
        >
          <div className="p-1.5 rounded-lg bg-white/10 group-hover:rotate-12 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-black leading-tight">TRADARA AI</p>
            <p className="text-[10px] text-purple-200">
              {activeItem ? `Bargain for ${activeItem.title}` : 'Tap to Chat'}
            </p>
          </div>
        </button>
      )}

      {/* Persistent AI Assistant Drawer Component */}
      <TradaraAiDrawer
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        activeItem={activeItem}
        buyerSession={buyerSession}
      />
    </div>
  );
};