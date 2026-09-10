// ==========================================
// FILE: src/components/ai/TradaraAISidebar.tsx
// ==========================================

import React, { useState } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Image as ImageIcon, 
  FolderKanban, 
  Calendar, 
  Compass, 
  Pin, 
  Search, 
  Plus, 
  Settings, 
  X, 
  Send, 
  Bot, 
  User, 
  ChevronRight,
  SlidersHorizontal,
  Tag,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

interface ChatThread {
  id: string;
  title: string;
  category: 'pinned' | 'recent';
  preview: string;
}

interface TradaraAISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: {
    productName?: string;
    price?: string;
    category?: string;
  };
}

export const TradaraAISidebar: React.FC<TradaraAISidebarProps> = ({ 
  isOpen, 
  onClose,
  initialContext 
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'library' | 'projects' | 'explore'>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  
  // Mock chat threads mirroring advanced workspace organization
  const [pinnedThreads] = useState<ChatThread[]>([
    { id: 'p1', title: 'Push Code to GitHub', category: 'pinned', preview: 'Configuring automated CI/CD workflows...' },
    { id: 'p2', title: 'Unconventional Income Strategies', category: 'pinned', preview: 'Analyzing digital asset monetization...' },
    { id: 'p3', title: 'Viral AI Quotes Prompt', category: 'pinned', preview: 'Optimizing high-engagement copy...' },
    { id: 'p4', title: 'Cybersecurity Overview', category: 'pinned', preview: 'Zero Trust & NIST framework review...' }
  ]);

  const [recentThreads, setRecentThreads] = useState<ChatThread[]>([
    { id: 'r1', title: 'Write Logbook Entries', category: 'recent', preview: 'SIWES weekly activity breakdown...' },
    { id: 'r2', title: 'Upgrade Tradara AI UI', category: 'recent', preview: 'Implementing advanced sidebar drawer...' },
    { id: 'r3', title: 'Product Negotiation Engine', category: 'recent', preview: 'Gemini SDK generative pricing logic...' }
  ]);

  const [activeThreadId, setActiveThreadId] = useState<string>('r2');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: initialContext?.productName 
        ? `Hello! I am TRADARA AI GOAT ENGINE. I am analyzing "${initialContext.productName}" priced at ${initialContext.price || 'N/A'}. Let's negotiate or explore product specifications!`
        : `Hello! I am TRADARA AI GOAT ENGINE, your advanced persistent assistant. Ask me any question, explore marketplace intelligence, or start dynamic negotiations!`,
      timestamp: '16:18'
    }
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: currentMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    const query = currentMessage;
    setCurrentMessage('');

    // Simulate GOAT Engine Intelligent Response
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `[GOAT ENGINE ACTIVE] Processing query regarding "${query}". Leveraging real-time marketplace context and Gemini intelligence to optimize your workflow and secure the best outcome.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] bg-[#0c0c10] border-l border-slate-800 shadow-2xl flex text-slate-100 font-sans animate-in slide-in-from-right duration-300">
      
      {/* Left Mini Icon Nav (ChatGPT Style Drawer Sidebar) */}
      <div className="w-16 bg-[#070709] border-r border-slate-800/80 flex flex-col items-center py-4 justify-between select-none">
        <div className="space-y-4 flex flex-col items-center">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 cursor-pointer">
            <Sparkles className="h-5 w-5 text-slate-950" />
          </div>
          <div className="w-8 h-[1px] bg-slate-800" />
          
          <button 
            onClick={() => setActiveTab('chat')}
            title="Chat Workspace"
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'chat' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <MessageSquare className="h-5 w-5" />
          </button>
          
          <button 
            onClick={() => setActiveTab('library')}
            title="Library & Media"
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'library' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          <button 
            onClick={() => setActiveTab('projects')}
            title="Projects"
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'projects' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <FolderKanban className="h-5 w-5" />
          </button>

          <button 
            onClick={() => setActiveTab('explore')}
            title="Explore Intelligence"
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'explore' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <Compass className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 flex flex-col items-center">
          <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all">
            <Settings className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-400">
            BI
          </div>
        </div>
      </div>

      {/* Main Drawer Content */}
      <div className="flex-1 flex flex-col h-full bg-[#0f0f13] overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#0f0f13]/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h2 className="text-xs font-bold tracking-wider text-slate-100 flex items-center gap-1.5">
                <span>TRADARA AI</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/30">GOAT ENGINE</span>
              </h2>
              <p className="text-[10px] text-slate-400">Persistent Dynamic Assistant & Negotiation Core</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Tab Body */}
        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Search & New Chat Bar */}
            <div className="p-3 border-b border-slate-800/60 bg-slate-900/40 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chats, prompts, or items..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <button 
                  onClick={() => {
                    setMessages([{ id: Date.now().toString(), sender: 'ai', text: 'Started a brand new session. How can the GOAT ENGINE assist you today?', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New</span>
                </button>
              </div>

              {/* Quick Navigation Drawer items (Pinned & Recents preview) */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1.5 py-1 flex items-center gap-1 flex-shrink-0">
                  <Pin className="h-3 w-3 text-emerald-400" /> Pinned:
                </div>
                {pinnedThreads.map((t) => (
                  <button 
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-300 flex-shrink-0 border border-slate-700/50 transition-all truncate max-w-[140px]"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="h-7 w-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 text-emerald-400">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-sm shadow-lg shadow-emerald-500/10' 
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm shadow-md'
                  }`}>
                    <p>{msg.text}</p>
                    <span className={`block text-[9px] mt-1.5 ${msg.sender === 'user' ? 'text-slate-900/70' : 'text-slate-500'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                  {msg.sender === 'user' && (
                    <div className="h-7 w-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-800 bg-[#0f0f13]">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input 
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Ask any question or negotiate an item..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-4 pr-12 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 shadow-inner"
                />
                <button 
                  type="submit"
                  disabled={!currentMessage.trim()}
                  className="absolute right-2 p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 transition-all shadow-md shadow-emerald-500/20"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
              <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
                <span>GOAT Engine v3.5 Secure AI</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <Zap className="h-3 w-3" /> Ready for live negotiation
                </span>
              </div>
            </div>

          </div>
        ) : activeTab === 'library' ? (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-emerald-400" />
              <span>Library & Visual Assets</span>
            </h3>
            <p className="text-xs text-slate-400">Manage saved images, product media, and generated design assets.</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="h-32 rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-emerald-400">MARKETPLACE_UI.png</span>
                <span className="text-[11px] text-slate-300 font-medium">Dashboard Mockup</span>
              </div>
              <div className="h-32 rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-emerald-400">WHATSAPP_WEBHOOK.png</span>
                <span className="text-[11px] text-slate-300 font-medium">Integration Schema</span>
              </div>
            </div>
          </div>
        ) : activeTab === 'projects' ? (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-emerald-400" />
              <span>TRADARA Active Projects</span>
            </h3>
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-200">TRADARA OS Marketplace</h4>
                <p className="text-[11px] text-slate-400 mt-1">Full-stack React, TypeScript, Prisma, MongoDB & AI Negotiation.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-200">WhatsApp Webhook Clone</h4>
                <p className="text-[11px] text-slate-400 mt-1">Real-time messaging with Meta Developers API integration.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Compass className="h-4 w-4 text-emerald-400" />
              <span>Explore AI Intelligence</span>
            </h3>
            <p className="text-xs text-slate-400">Discover pre-configured prompt templates, security audits, and automated negotiation strategies.</p>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs hover:border-emerald-500/50 transition-all cursor-pointer">
                <span className="font-bold text-emerald-400 block mb-1">Automated Buyer Negotiation</span>
                <span className="text-slate-400 text-[11px]">Dynamic discount algorithms based on inventory thresholds.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs hover:border-emerald-500/50 transition-all cursor-pointer">
                <span className="font-bold text-emerald-400 block mb-1">OWASP Security Audit Bot</span>
                <span className="text-slate-400 text-[11px]">Automated vulnerability scanner & access control checks.</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};