// ==========================================
// FILE: frontend/src/components/AIChatWindow.tsx
// ==========================================

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  StopCircle, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  Zap,
  Tag
} from 'lucide-react';
import { useAIChat, type ChatMessage } from '../hooks/useAIChat';

interface AIChatWindowProps {
  apiEndpoint?: string;
  getAuthToken?: () => string | null;
  storeName?: string;
}

export const AIChatWindow: React.FC<AIChatWindowProps> = ({
  apiEndpoint = '/api/ai/chat/stream',
  getAuthToken,
  storeName = 'TRADARA Assistant',
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
  } = useAIChat({
    apiEndpoint,
    getAuthToken,
  });

  // Auto-scroll to latest message on update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    sendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-[650px] w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100">
      
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-100 text-base tracking-wide">{storeName}</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full uppercase">
                GOAT Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous Negotiation & Knowledge Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              disabled={isLoading}
              title="Clear Conversation"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* MESSAGES BODY */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-6">
            <div className="p-4 rounded-full bg-slate-800/50 border border-slate-700/50 text-emerald-400">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-semibold text-slate-200">How can TRADARA AI assist you today?</h3>
              <p className="text-sm text-slate-400">
                Initiate autonomous counter-offers, query vendor refund policies, or inspect store logistics instantly.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg pt-2">
              <button
                onClick={() => handleQuickPrompt("I want to offer $180 for item listed at $250. Can we negotiate?")}
                className="flex items-start gap-3 p-3.5 text-left text-xs bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 hover:border-emerald-500/30 rounded-xl transition-all group"
              >
                <Tag className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-slate-300 group-hover:text-slate-100">Propose $180 offer on a $250 item</span>
              </button>

              <button
                onClick={() => handleQuickPrompt("What is the platform's return policy for negotiated sales?")}
                className="flex items-start gap-3 p-3.5 text-left text-xs bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 hover:border-emerald-500/30 rounded-xl transition-all group"
              >
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-slate-300 group-hover:text-slate-100">Check refund policy for AI negotiations</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg: ChatMessage) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-medium text-xs shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-emerald-600/90 text-white'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-tl-none shadow-sm'
                }`}
              >
                {/* Content */}
                <div className="whitespace-pre-wrap break-words">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle" />
                  )}
                </div>

                {/* Timestamp */}
                <div
                  className={`text-[10px] mt-1.5 opacity-60 ${
                    msg.sender === 'user' ? 'text-right text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Global Error Notice */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 my-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT FORM */}
      <footer className="p-4 bg-slate-950/90 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your negotiation offer or ask a query..."
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all disabled:opacity-50"
          />

          {isLoading ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="p-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 rounded-xl transition-all flex items-center justify-center shrink-0"
              title="Stop Streaming"
            >
              <StopCircle className="w-5 h-5 animate-spin" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="p-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-medium rounded-xl transition-all shadow-lg shadow-emerald-500/10 shrink-0 flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </form>
      </footer>
    </div>
  );
};