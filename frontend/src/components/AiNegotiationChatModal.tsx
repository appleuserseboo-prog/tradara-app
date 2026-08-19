import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Bot, User, Headphones, Tag, Check, AlertCircle, Brain, Target, ShieldCheck } from 'lucide-react';

export interface ProductContext {
  id: string;
  stockName: string;
  price: number;
  currency?: string;
  category?: string;
  city?: string;
  area?: string;
  description?: string;
  images?: string[];
}

interface IntelligenceContext {
  itemHistoricalConversions?: number;
  averageAgreedDiscountPercent?: number;
  buyerPastNegotiationCount?: number;
  buyerSuccessfulDeals?: number;
  categoryDemandScore?: number;
}

interface PerceptionContext {
  sentiment?: string;
  urgency?: string;
  priceSensitivity?: string;
  detectedIntent?: string;
}

interface Message {
  id: string;
  sender: 'ai' | 'user' | 'system' | 'human';
  text: string;
  timestamp: string;
  perception?: PerceptionContext;
  offer?: {
    discountedPrice: number;
    discountPercent: number;
    status: 'pending' | 'accepted' | 'declined';
  };
}

interface AiNegotiationChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductContext;
  onAddToCartWithDiscount?: (discountedPrice: number) => void;
}

export const AiNegotiationChatModal: React.FC<AiNegotiationChatModalProps> = ({
  isOpen,
  onClose,
  product,
  onAddToCartWithDiscount,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHumanHandover, setIsHumanHandover] = useState(false);
  const [intelligence, setIntelligence] = useState<IntelligenceContext | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currencySymbol = product?.currency || '₦';
  const numericPrice = Number(product?.price || 0);

  // Initialize chat when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialGreeting: Message = {
        id: 'msg-1',
        sender: 'ai',
        text: `Hello! I'm your TRADARA AI Assistant. I am trained on "${product.stockName}" specs, real-time demand, and verified seller negotiation rules. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([initialGreeting]);
      setIsHumanHandover(false);

      // Simulate marketplace cognitive initialization
      setIntelligence({
        itemHistoricalConversions: 12,
        averageAgreedDiscountPercent: 8.5,
        buyerPastNegotiationCount: 3,
        buyerSuccessfulDeals: 2,
        categoryDemandScore: 0.85,
      });
    }
  }, [isOpen, product]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsgText = inputValue.trim();
    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue('');

    if (isHumanHandover) {
      // Simulate live agent routing
      setTimeout(() => {
        const agentResponse: Message = {
          id: `agent-${Date.now()}`,
          sender: 'human',
          text: "Thanks for your message! A live support agent has received your query and will respond shortly.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, agentResponse]);
      }, 1000);
      return;
    }

    // Trigger AI response simulation with learning perception loop
    setIsTyping(true);
    setTimeout(() => {
      generateAiResponse(userMsgText);
      setIsTyping(false);
    }, 1200);
  };

  const generateAiResponse = (userText: string) => {
    const lowerText = userText.toLowerCase();
    let aiText = '';
    let offerObj: Message['offer'] | undefined = undefined;
    let perceivedState: PerceptionContext = {
      sentiment: 'neutral',
      urgency: 'medium',
      priceSensitivity: 'medium',
      detectedIntent: 'inquiry',
    };

    if (lowerText.includes('discount') || lowerText.includes('cheaper') || lowerText.includes('price') || lowerText.includes('negotiate') || lowerText.includes('best price')) {
      const discountPercent = 10;
      const discountedPrice = Math.round(numericPrice * (1 - discountPercent / 100));
      
      perceivedState = {
        sentiment: 'eager',
        urgency: 'high',
        priceSensitivity: 'high',
        detectedIntent: 'bargain',
      };

      aiText = `Based on current market demand and item history, I can offer an instant special deal of ${discountPercent}% off!`;
      offerObj = {
        discountedPrice,
        discountPercent,
        status: 'pending',
      };
    } else if (lowerText.includes('location') || lowerText.includes('where') || lowerText.includes('city')) {
      perceivedState.detectedIntent = 'inquiry';
      aiText = `This product is located in ${product.city || 'Nigeria'}${product.area ? `, ${product.area}` : ''}. Delivery options can be arranged with the seller upon checkout.`;
    } else if (lowerText.includes('condition') || lowerText.includes('details') || lowerText.includes('specs')) {
      perceivedState.detectedIntent = 'specs_check';
      aiText = `Here is what the seller notes about "${product.stockName}": "${product.description || 'No additional detailed specs available.'}"`;
    } else {
      aiText = `Regarding "${product.stockName}", it is listed at ${currencySymbol}${numericPrice.toLocaleString()} in category "${product.category || 'General'}". Feel free to ask for a special offer or connect with a human representative!`;
    }

    const aiMessage: Message = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: aiText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      perception: perceivedState,
      offer: offerObj,
    };

    setMessages((prev) => [...prev, aiMessage]);
  };

  const handleAcceptOffer = (msgId: string, discountedPrice: number) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId && msg.offer) {
          return {
            ...msg,
            offer: { ...msg.offer, status: 'accepted' },
          };
        }
        return msg;
      })
    );

    if (onAddToCartWithDiscount) {
      onAddToCartWithDiscount(discountedPrice);
    }

    const systemConfirmation: Message = {
      id: `sys-${Date.now()}`,
      sender: 'system',
      text: `Offer accepted! Item at discounted price of ${currencySymbol}${discountedPrice.toLocaleString()} added to your action list. Learning model updated with successful deal feedback.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, systemConfirmation]);
  };

  const handleTriggerHumanHandover = () => {
    setIsHumanHandover(true);
    const systemNotice: Message = {
      id: `sys-handover-${Date.now()}`,
      sender: 'system',
      text: 'You have been switched to Human Handover Mode. A support agent will assist you directly.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, systemNotice]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900/90 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[680px] max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-slate-900 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-blue-400">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="font-black text-white text-base tracking-wide flex items-center gap-2">
                Ask DIRECTLY
                <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                  {isHumanHandover ? 'HUMAN AGENT' : 'COGNITIVE AI'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">
                {product.stockName}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Intelligence / Learning Telemetry Bar */}
        {intelligence && !isHumanHandover && (
          <div className="bg-slate-950/60 border-b border-white/5 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
              <Brain size={13} />
              Model Learning Active
            </span>
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-emerald-400">
                <Target size={12} /> {intelligence.itemHistoricalConversions} Deals Closed
              </span>
              <span className="flex items-center gap-1 text-blue-400">
                <ShieldCheck size={12} /> Verified Seller Rules
              </span>
            </span>
          </div>
        )}

        {/* Handover Notice / Control Bar */}
        {!isHumanHandover && (
          <div className="bg-blue-950/30 border-b border-white/5 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
            <span>Need personalized human help?</span>
            <button
              onClick={handleTriggerHumanHandover}
              className="flex items-center gap-1.5 font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Headphones size={14} /> Switch to Human Support
            </button>
          </div>
        )}

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-xs text-slate-400 flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            const isUser = msg.sender === 'user';
            const isHuman = msg.sender === 'human';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : isHuman
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-600/30 border border-purple-500/40 text-purple-300'
                  }`}
                >
                  {isUser ? <User size={16} /> : isHuman ? <Headphones size={16} /> : <Bot size={16} />}
                </div>

                <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-4 rounded-3xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-800/90 text-slate-200 border border-white/10 rounded-tl-none shadow-lg'
                    }`}
                  >
                    {msg.text}

                    {/* Perceived Intent Tagging UI */}
                    {msg.perception && (
                      <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-1">
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">
                          Intent: {msg.perception.detectedIntent}
                        </span>
                        <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">
                          Sentiment: {msg.perception.sentiment}
                        </span>
                      </div>
                    )}

                    {/* Render Interactive Offer Card if provided */}
                    {msg.offer && (
                      <div className="mt-3 p-3 bg-slate-900/80 border border-blue-500/30 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Tag size={12} className="text-blue-400" /> Special Offer
                          </span>
                          <span className="font-bold text-emerald-400">
                            Save {msg.offer.discountPercent}%
                          </span>
                        </div>
                        <div className="text-lg font-black text-white">
                          {currencySymbol}{msg.offer.discountedPrice.toLocaleString()}
                          <span className="text-xs text-slate-500 line-through ml-2 font-normal">
                            {currencySymbol}{numericPrice.toLocaleString()}
                          </span>
                        </div>

                        {msg.offer.status === 'pending' ? (
                          <button
                            onClick={() => handleAcceptOffer(msg.id, msg.offer!.discountedPrice)}
                            className="w-full mt-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                          >
                            <Check size={14} /> Accept Offer & Apply Discount
                          </button>
                        ) : (
                          <div className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 py-1.5 px-3 rounded-xl text-center">
                            ✓ Offer Applied
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-slate-400 text-xs italic bg-slate-800/40 w-fit px-4 py-2 rounded-full border border-white/5">
              <Bot size={14} className="animate-spin text-blue-400" />
              <span>AI is evaluating context and crafting response...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-white/10 flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isHumanHandover ? "Type your message to human support..." : "Ask a question or request a discount..."}
            className="flex-1 bg-slate-800/80 text-white placeholder-slate-500 text-sm px-4 py-3 rounded-2xl border border-white/10 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="bg-blue-600 disabled:opacity-40 hover:bg-blue-500 text-white p-3 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 shrink-0"
          >
            <Send size={18} />
          </button>
        </form>

      </div>
    </div>
  );
};