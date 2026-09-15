// ==========================================
// FILE: src/components/ai/TradaraAISidebar.tsx
// ==========================================

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Image as ImageIcon, 
  FolderKanban, 
  Compass, 
  Pin, 
  Search, 
  Plus, 
  Settings, 
  Send, 
  Bot, 
  User, 
  Check, 
  Copy, 
  Zap,
  ArrowLeft,
  X
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
  category: 'pinned' | 'recent' | 'archived';
  preview: string;
  updatedAt?: string;
}

interface TradaraAISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: {
    productName?: string;
    price?: string;
    category?: string;
  };
  isAuthenticated?: boolean;
  currentUser?: {
    name?: string;
    email?: string;
  };
}

// Simple helper to safely render markdown bold/bullet formatting cleanly without raw asterisks leaking out
const renderFormattedMessage = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    // Check if line is a bullet item starting with • or * or -
    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('*') || line.trim().startsWith('-');
    let cleanedLine = line;
    if (isBullet) {
      cleanedLine = line.trim().replace(/^[•*\-]\s*/, '');
    }

    // Replace markdown bold **text** with clean bold HTML spans
    const parts = cleanedLine.split(/(\*\*.*?\*\*)/g);

    return (
      <div key={lineIdx} className={`${isBullet ? 'flex items-start gap-2 my-1 pl-1' : 'my-0.5'}`}>
        {isBullet && <span className="text-blue-400 font-bold select-none">•</span>}
        <span className="flex-1">
          {parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              const boldContent = part.slice(2, -2);
              return <strong key={partIdx} className="font-semibold text-slate-100">{boldContent}</strong>;
            }
            return part;
          })}
        </span>
      </div>
    );
  });
};

export const TradaraAISidebar: React.FC<TradaraAISidebarProps> = ({ 
  isOpen, 
  onClose,
  initialContext,
  isAuthenticated = false,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'library' | 'projects' | 'explore'>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [threads, setThreads] = useState<ChatThread[]>([
    {
      id: 'conv-default-1',
      title: initialContext?.productName ? `Inquiring about ${initialContext.productName}` : 'General Marketplace Assistance',
      category: 'recent',
      preview: initialContext?.productName ? `Analyzing pricing for ${initialContext.productName}...` : 'Started new session with Tradara AI GOAT Engine.',
      updatedAt: 'Just now'
    }
  ]);

  const [activeThreadId, setActiveThreadId] = useState<string>('conv-default-1');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: initialContext?.productName 
        ? `Hello! I am the TRADARA AI GOAT ENGINE. I am analyzing "${initialContext.productName}" priced at ${initialContext.price || 'N/A'}. Let's negotiate or explore product specifications!`
        : `Hello! I am the TRADARA AI GOAT ENGINE, your advanced persistent assistant. Ask me any question, explore marketplace intelligence, or start dynamic negotiations!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getUserInitials = () => {
    if (!isAuthenticated || !currentUser) return '';
    if (currentUser.name) {
      const parts = currentUser.name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return currentUser.name.slice(0, 2).toUpperCase();
    }
    if (currentUser.email) {
      return currentUser.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const userInitials = getUserInitials();

  // Intelligent professional response generator with clean formatting
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || isGenerating) return;

    const userText = currentMessage.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setCurrentMessage('');
    setIsGenerating(true);

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          title: t.title === 'General Marketplace Assistance' ? userText.slice(0, 30) + '...' : t.title,
          preview: userText,
          updatedAt: 'Just now'
        };
      }
      return t;
    }));

    setTimeout(() => {
      const lower = userText.toLowerCase();
      let replyText = '';

      if (lower.includes('what is ai') || lower.includes('artificial intelligence') || lower.includes('what is artificial intelligence')) {
        replyText = `Artificial Intelligence (AI) refers to the simulation of human intelligence in machines programmed to think, learn, adapt, and solve complex problems.\n\nKey pillars of AI include:\n• **Machine Learning (ML):** Systems that improve automatically through data experience without explicit programming.\n• **Natural Language Processing (NLP):** Enabling computers to understand, interpret, and generate human language accurately.\n• **Computer Vision:** Allowing machines to derive meaningful information and analysis from digital images and videos.\n• **Generative AI:** Models capable of producing new content, code, or analytics based on learned patterns.\n\nOn Tradara, AI powers our GOAT Engine to provide real-time product recommendations, automated price negotiations, and full-stack engineering support.`;
      } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        replyText = `Hello! It is great to connect with you. Whether you are looking to evaluate a marketplace product, negotiate a fair price, build full-stack code, or explore general concepts, I am ready to assist you. What would you like to explore today?`;
      } else if (lower.includes('question') || lower.includes('answer') || lower.includes('help') || lower.includes('can you')) {
        replyText = `Yes, absolutely! I can answer questions across technical engineering, marketplace pricing, security frameworks, mathematics, and business logic. What specific inquiry do you have in mind?`;
      } else if (lower.includes('price') || lower.includes('negotiate') || lower.includes('cost') || lower.includes('bargain')) {
        replyText = `Analyzing market value rates... Based on current inventory trends, we can structure an optimized pricing or negotiation bracket for this listing. Would you like me to draft a discount proposal or analyze profit margins?`;
      } else if (lower.includes('code') || lower.includes('react') || lower.includes('typescript') || lower.includes('prisma') || lower.includes('component')) {
        replyText = `Tradara GOAT Engine architecture is fully optimized for full-stack React, TypeScript, and Prisma workflows. \n\nHere is an optimized component handler pattern for your query:\n\n• **Handler Architecture:** Async transaction routing with strict type safety.\n• **State Management:** Seamless React hook synchronization.\n\nWhat specific module or feature would you like to build or debug next?`;
      } else {
        replyText = `That is a fascinating inquiry regarding "${userText}".\n\nTo provide the exact technical or strategic breakdown you need:\n• **Context Evaluation:** We analyze your query through the lens of modern software development and marketplace economics.\n• **Execution Strategy:** Delivering comprehensive code structures and professional guidance.\n\nLet me know if you would like me to expand on any specific angle of this topic!`;
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsGenerating(false);
    }, 900);
  };

  const handleNewChat = () => {
    const newId = 'conv-' + Date.now();
    const newThread: ChatThread = {
      id: newId,
      title: 'New Conversation',
      category: 'recent',
      preview: 'Ready for your questions...',
      updatedAt: 'Just now'
    };

    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newId);
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: 'Started a brand new session with the Tradara AI GOAT Engine. How can I assist you today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleTogglePin = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        const newCategory = t.category === 'pinned' ? 'recent' : 'pinned';
        return { ...t, category: newCategory };
      }
      return t;
    }));
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredThreads = threads.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedThreads = filteredThreads.filter(t => t.category === 'pinned');
  const recentThreads = filteredThreads.filter(t => t.category === 'recent');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] pt-16 md:pt-20 bg-[#0c0c10] border-l border-slate-800 shadow-2xl flex text-slate-100 font-sans animate-in slide-in-from-right duration-300">
      
      {/* Left Mini Icon Nav */}
      <div className="w-16 bg-[#070709] border-r border-slate-800/80 flex flex-col items-center py-4 justify-between select-none">
        <div className="space-y-4 flex flex-col items-center">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 cursor-pointer">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="w-8 h-[1px] bg-slate-800" />
          
          <button 
            onClick={() => setActiveTab('chat')}
            title="Chat Workspace"
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'chat' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <MessageSquare className="h-5 w-5" />
          </button>
          
          <button 
            onClick={() => setActiveTab('library')}
            title="Library & Media"
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'library' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          <button 
            onClick={() => setActiveTab('projects')}
            title="Projects"
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'projects' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <FolderKanban className="h-5 w-5" />
          </button>

          <button 
            onClick={() => setActiveTab('explore')}
            title="Explore Intelligence"
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'explore' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <Compass className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 flex flex-col items-center">
          <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all" title="Settings">
            <Settings className="h-5 w-5" />
          </button>
          
          {isAuthenticated && userInitials ? (
            <div className="h-9 w-9 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-400 shadow-sm" title={currentUser?.name || currentUser?.email || 'Logged in user'}>
              {userInitials}
            </div>
          ) : (
            <div className="h-9 w-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-sm" title="Not logged in">
              <User className="h-4 w-4 opacity-60" />
            </div>
          )}
        </div>
      </div>

      {/* Main Drawer Content */}
      <div className="flex-1 flex flex-col h-full bg-[#0f0f13] overflow-hidden">
        
        {/* Top Header Bar with Highly Visible Return (X) and Arrow Buttons */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-[#0f0f13] sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              title="Return to Marketplace"
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1.5 shadow-sm text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
              <div>
                <h2 className="text-xs font-bold tracking-wider text-slate-100 flex items-center gap-1.5">
                  <span>TRADARA AI</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-400 font-mono border border-blue-500/30">GOAT ENGINE</span>
                </h2>
                <p className="text-[10px] text-slate-400">Persistent Dynamic Assistant & Negotiation Core</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            title="Return to Marketplace (Close)"
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-rose-200 transition-all flex items-center gap-1.5 shadow-sm text-xs font-bold cursor-pointer"
          >
            <span>Return</span>
            <X className="h-4 w-4 text-rose-400 font-bold" />
          </button>
        </div>

        {/* Dynamic Tab Body */}
        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
            
            {/* Search & New Chat Bar */}
            <div className="p-3 border-b border-slate-800/60 bg-slate-900/40 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search user conversations & messages..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <button 
                  onClick={handleNewChat}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Chat</span>
                </button>
              </div>

              {/* Dynamic Conversation Threads Quick Bar */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1.5 py-1 flex items-center gap-1 flex-shrink-0">
                  <Pin className="h-3 w-3 text-blue-400" /> Active:
                </div>
                {pinnedThreads.map((t) => (
                  <button 
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] flex-shrink-0 border transition-all truncate max-w-[140px] flex items-center gap-1.5 ${activeThreadId === t.id ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-medium' : 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-800'}`}
                  >
                    <span>{t.title}</span>
                    <span onClick={(e) => handleTogglePin(e, t.id)} className="hover:text-white"><Pin className="h-2.5 w-2.5 text-blue-400" /></span>
                  </button>
                ))}
                {recentThreads.map((t) => (
                  <button 
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] flex-shrink-0 border transition-all truncate max-w-[140px] flex items-center gap-1.5 ${activeThreadId === t.id ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-medium' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                  >
                    <span>{t.title}</span>
                    <span onClick={(e) => handleTogglePin(e, t.id)} className="opacity-40 hover:opacity-100"><Pin className="h-2.5 w-2.5" /></span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 group ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="h-7 w-7 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0 text-blue-400">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="relative group/msg max-w-[85%]">
                    <div className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600 text-white font-medium rounded-tr-sm shadow-lg shadow-blue-600/20' 
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm shadow-md'
                    }`}>
                      {msg.sender === 'ai' ? (
                        <div className="space-y-1">
                          {renderFormattedMessage(msg.text)}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-white/5 text-[9px]">
                        <span className={msg.sender === 'user' ? 'text-blue-100/70' : 'text-slate-500'}>
                          {msg.timestamp}
                        </span>
                        
                        <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1.5 ml-2">
                          <button 
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            title="Copy text"
                            className="p-1 rounded hover:bg-white/10 text-slate-300 transition-colors"
                          >
                            {copiedId === msg.id ? <Check className="h-3 w-3 text-blue-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {msg.sender === 'user' && (
                    <div className="h-7 w-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}
              {isGenerating && (
                <div className="flex gap-3 justify-start">
                  <div className="h-7 w-7 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0 text-blue-400 animate-pulse">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 text-xs bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                    <span>GOAT Engine is formulating professional response...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-800 bg-[#0f0f13]">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input 
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Ask any question or negotiate an item..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-4 pr-12 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 shadow-inner"
                />
                <button 
                  type="submit"
                  disabled={!currentMessage.trim() || isGenerating}
                  className="absolute right-2 p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-all shadow-md shadow-blue-600/20"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
              <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
                <span>GOAT Engine v3.5 Secure AI</span>
                <span className="flex items-center gap-1 text-blue-400">
                  <Zap className="h-3 w-3" /> Ready for live negotiation
                </span>
              </div>
            </div>

          </div>
        ) : activeTab === 'library' ? (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto pb-20 md:pb-6">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-400" />
              <span>Library & Media Gallery</span>
            </h3>
            <p className="text-xs text-slate-400">Saved visual assets, marketplace product snapshots, and generated design files.</p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col justify-between opacity-80">
                <span className="text-[10px] font-mono text-blue-400">MARKETPLACE_UI.png</span>
                <span className="text-[11px] text-slate-300 font-medium">Dashboard Mockup</span>
              </div>
              <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col justify-between opacity-80">
                <span className="text-[10px] font-mono text-blue-400">HERO_BANNER.png</span>
                <span className="text-[11px] text-slate-300 font-medium">Global Asset</span>
              </div>
            </div>
          </div>
        ) : activeTab === 'projects' ? (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto pb-20 md:pb-6">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-blue-400" />
              <span>TRADARA Active Projects</span>
            </h3>
            <div className="space-y-2.5 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-200">TRADARA OS Marketplace</h4>
                <p className="text-[11px] text-slate-400 mt-1">Full-stack React, TypeScript, Prisma, MongoDB & AI Negotiation.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto pb-20 md:pb-6">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Compass className="h-4 w-4 text-blue-400" />
              <span>Explore AI Intelligence</span>
            </h3>
            <p className="text-xs text-slate-400">Discover pre-configured prompt guides and automated negotiation strategies.</p>
            <div className="space-y-2 pt-1">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span className="font-bold text-blue-400 block mb-1">Automated Buyer Negotiation</span>
                <span className="text-slate-400 text-[11px]">Dynamic discount algorithms based on inventory thresholds.</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};