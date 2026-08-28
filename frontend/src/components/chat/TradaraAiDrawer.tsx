import React, { useState, useEffect, useRef } from 'react';
import { aiApiService } from '../../services/aiApi';
import type { SendChatMessagePayload } from '../../services/aiApi';
import { Sparkles, Send, Bot, RefreshCw, X, ShoppingBag, UserCheck, ShieldAlert } from 'lucide-react';

export interface ItemContext {
  id: string;
  title: string;
  price: number;
  currency?: string;
  imageUrl?: string;
}

export interface Message {
  id?: string;
  sender: 'buyer' | 'ai' | 'system' | 'seller';
  message: string;
  createdAt?: string;
  offerMade?: number;
}

export interface TradaraAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem?: ItemContext | null;
  buyerSession: string;
  buyerId?: string;
}

export const TradaraAiDrawer: React.FC<TradaraAiDrawerProps> = ({
  isOpen,
  onClose,
  activeItem,
  buyerSession,
  buyerId,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string>('active');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currencySymbol = activeItem?.currency || '₦';

  useEffect(() => {
    if (isOpen && activeItem?.id && buyerSession) {
      fetchHistory();
    } else if (isOpen && !activeItem) {
      setMessages([
        {
          sender: 'ai',
          message: 'Hello! I am TRADARA AI. Select any item in the marketplace to start smart dynamic negotiation or ask about product details!',
        },
      ]);
    }
  }, [isOpen, activeItem?.id, buyerSession]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchHistory = async () => {
    if (!activeItem) return;
    setIsLoading(true);
    try {
      const res = await aiApiService.getNegotiationHistory(activeItem.id, buyerSession);
      if (res.success && res.session) {
        setSessionStatus(res.session.status || 'active');
        if (res.session.messages && res.session.messages.length > 0) {
          setMessages(
            res.session.messages.map((m: any) => ({
              id: m.id,
              sender: m.sender as any,
              message: m.message,
              createdAt: m.createdAt,
              offerMade: m.offerMade,
            }))
          );
        } else {
          setMessages([
            {
              sender: 'ai',
              message: `Hello! I am TRADARA AI representing the seller for "${activeItem.title}". How can I assist you with pricing or specifications today?`,
            },
          ]);
        }
      } else {
        setMessages([
          {
            sender: 'ai',
            message: `Hello! I am TRADARA AI representing the seller for "${activeItem.title}". How can I assist you with pricing or specifications today?`,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setMessages([
        {
          sender: 'system',
          message: 'Could not load past context. Starting a new interaction.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string, numericOffer?: number) => {
    const text = textToSend || inputMessage;
    if ((!text.trim() && !numericOffer) || isLoading) return;

    if (!activeItem) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'buyer',
          message: text,
        },
        {
          sender: 'ai',
          message: 'Please navigate to a specific item page or click on a product card so I can assist you with live negotiations and item specifications.',
        },
      ]);
      setInputMessage('');
      return;
    }

    const userMsgText = numericOffer 
      ? `Offered: ${currencySymbol}${numericOffer.toLocaleString()}` 
      : text;

    const newBuyerMsg: Message = {
      sender: 'buyer',
      message: userMsgText,
      offerMade: numericOffer,
    };

    setMessages((prev) => [...prev, newBuyerMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    const payload: SendChatMessagePayload = {
      itemId: activeItem.id,
      buyerSession,
      buyerId,
      message: userMsgText,
      offeredPrice: numericOffer,
    };

    try {
      const response = await aiApiService.sendChatMessage(payload);
      if (response.success && response.data) {
        if (response.data.status) {
          setSessionStatus(response.data.status);
        }
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            message: response.data!.reply,
            offerMade: response.data!.agreedPrice,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'system',
            message: response.error || 'Unable to connect to TRADARA AI service. Please try again.',
          },
        ]);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'system',
          message: 'Network connection issue. Please verify your connection.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-[120] w-full sm:w-[420px] bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800/80 shadow-2xl flex flex-col transition-all duration-300">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              TRADARA AI
              <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md">
                GOAT Engine
              </span>
            </h3>
            <p className="text-xs text-slate-400">Persistent Dynamic Assistant</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Product Banner Context */}
      {activeItem ? (
        <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            {activeItem.imageUrl ? (
              <img
                src={activeItem.imageUrl}
                alt={activeItem.title}
                className="w-10 h-10 rounded-lg object-cover border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                <ShoppingBag className="w-5 h-5 text-slate-400" />
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{activeItem.title}</p>
              <p className="text-xs font-bold text-amber-400">
                Price: {currencySymbol}{activeItem.price.toLocaleString()}
              </p>
            </div>
          </div>
          {sessionStatus === 'human_agent' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
              <UserCheck className="w-3 h-3" /> Human Agent
            </span>
          )}
        </div>
      ) : (
        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-amber-300 text-xs font-medium">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Browse any product to trigger live AI negotiations.</span>
        </div>
      )}

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              msg.sender === 'buyer' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                msg.sender === 'buyer'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs font-medium'
                  : msg.sender === 'system'
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg text-xs'
                  : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-xs'
              }`}
            >
              {msg.sender === 'ai' && (
                <div className="flex items-center gap-1 text-[10px] text-purple-400 font-bold mb-1">
                  <Bot className="w-3 h-3" /> TRADARA AI
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
            </div>
            <span>TRADARA AI is typing...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Bargaining Carousel Buttons */}
      {activeItem && sessionStatus === 'active' && (
        <div className="p-3 bg-slate-900/60 border-t border-slate-800/80">
          <p className="text-[11px] font-semibold text-slate-400 mb-2">Instant Negotiate Offers:</p>
          <div className="grid grid-cols-3 gap-2">
            {[0.05, 0.1, 0.15].map((pct) => {
              const discounted = Math.round(activeItem.price * (1 - pct));
              return (
                <button
                  key={pct}
                  onClick={() => handleSendMessage(undefined, discounted)}
                  disabled={isLoading}
                  className="px-2 py-1.5 bg-slate-800/80 hover:bg-purple-600/20 border border-slate-700 hover:border-purple-500/50 rounded-xl text-left transition-all group disabled:opacity-50"
                >
                  <p className="text-[10px] text-slate-400 group-hover:text-purple-300 font-bold">
                    {pct * 100}% Off
                  </p>
                  <p className="text-xs font-black text-amber-400">
                    {currencySymbol}{discounted.toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat Input Area */}
      <div className="p-4 bg-slate-950 border-t border-slate-800/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={activeItem ? "Ask specs or offer price..." : "Type message..."}
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-purple-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};