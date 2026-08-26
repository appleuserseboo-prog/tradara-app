import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, ArrowLeft, Send, Bot, User, Headphones, Tag, Check, AlertCircle, Brain, Target, ShieldCheck } from 'lucide-react';
import { aiApiService } from '../services/aiApi';
import type { BuyerPerception, MarketplaceIntelligence } from '../types/ai';

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

interface Message {
  id: string;
  sender: 'ai' | 'user' | 'system' | 'human';
  text: string;
  timestamp: string;
  perception?: BuyerPerception;
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
  const [offerInput, setOfferInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHumanHandover, setIsHumanHandover] = useState(false);
  const [buyerSession, setBuyerSession] = useState('');
  const [activeAgreedPrice, setActiveAgreedPrice] = useState<number | null>(null);
  const [intelligence, setIntelligence] = useState<MarketplaceIntelligence | null>(null);
  const [latestPerception, setLatestPerception] = useState<BuyerPerception | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currencySymbol = product?.currency || '₦';
  const numericPrice = Number(product?.price || 0);

  useEffect(() => {
    if (isOpen) {
      let existingSession = localStorage.getItem('tradara_buyer_session');
      if (!existingSession) {
        existingSession = `session_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
        localStorage.setItem('tradara_buyer_session', existingSession);
      }
      setBuyerSession(existingSession);

      const initialGreeting: Message = {
        id: 'msg-1',
        sender: 'ai',
        text: `Hello! I am TRADARA AI Assistant. I am trained on "${product.stockName}" specs, real-time demand, and verified seller negotiation rules. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([initialGreeting]);
      setIsHumanHandover(false);
      setActiveAgreedPrice(null);

      if (product.id && existingSession) {
        aiApiService.getNegotiationHistory(product.id, existingSession)
          .then((res) => {
            if (res.success && res.session && res.session.messages.length > 0) {
              const formattedMsgs: Message[] = res.session.messages.map((m: any) => ({
                id: m.id || String(Math.random()),
                sender: m.sender === 'buyer' ? 'user' : m.sender === 'system' ? 'system' : 'ai',
                text: m.message,
                timestamp: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                offer: m.offerMade ? {
                  discountedPrice: m.offerMade,
                  discountPercent: Math.round(((numericPrice - m.offerMade) / numericPrice) * 100),
                  status: res.session?.agreedPrice === m.offerMade ? 'accepted' : 'pending'
                } : undefined
              }));
              setMessages(formattedMsgs);
              if (res.session.agreedPrice) {
                setActiveAgreedPrice(res.session.agreedPrice);
              }
              if (res.session.status === 'transferred' || res.session.status === 'human_agent') {
                setIsHumanHandover(true);
              }
            }
          })
          .catch((err: unknown) => console.error('Error fetching chat history:', err));
      }
    }
  }, [isOpen, product, numericPrice]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent, customOffer?: number) => {
    if (e) e.preventDefault();
    const textToSend = inputValue.trim();
    if (!textToSend && !customOffer) return;

    const currentOfferPrice = customOffer || (offerInput ? Number(offerInput) : undefined);

    const userMessageText = textToSend || `I would like to make an offer of ${currencySymbol}${currentOfferPrice?.toLocaleString()}`;
    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      offer: currentOfferPrice ? {
        discountedPrice: currentOfferPrice,
        discountPercent: Math.round(((numericPrice - currentOfferPrice) / numericPrice) * 100),
        status: 'pending'
      } : undefined
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue('');
    setOfferInput('');
    setIsTyping(true);

    try {
      const response = await aiApiService.sendChatMessage({
        itemId: product.id,
        buyerSession,
        message: userMessageText,
        offeredPrice: currentOfferPrice,
        quantity: 1,
      });

      if (response.success && response.data) {
        const { reply, status, agreedPrice, perception, intelligence } = response.data;

        if (perception) setLatestPerception(perception);
        if (intelligence) setIntelligence(intelligence);
        if (agreedPrice) setActiveAgreedPrice(agreedPrice);

        if (status === 'transferred' || status === 'human_agent') {
          setIsHumanHandover(true);
        }

        const aiResponseMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: status === 'transferred' ? 'system' : 'ai',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          perception: perception || undefined,
          offer: agreedPrice ? {
            discountedPrice: agreedPrice,
            discountPercent: Math.round(((numericPrice - agreedPrice) / numericPrice) * 100),
            status: 'accepted'
          } : undefined
        };

        setMessages((prev) => [...prev, aiResponseMsg]);
      }
    } catch (error: unknown) {
      console.error('Error in sales negotiation:', error);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'system',
        text: 'Network issue connecting to TRADARA AI Sales Engine. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const requestHumanAgent = async () => {
    setIsHumanHandover(true);
    setInputValue('I would like to speak with a human seller representative.');
    await handleSendMessage(undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-2xl h-[650px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-blue-100">
        
        {/* Header - TRADARA Blue Theme */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
              title="Return to store"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                <Bot className="w-6 h-6 text-blue-100" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-blue-400 border-2 border-blue-900 rounded-full" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg leading-tight">{product.stockName}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-300/30 text-blue-100 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> TRADARA AI
                </span>
              </div>
              <p className="text-xs text-blue-100/80 flex items-center gap-2 mt-0.5">
                <span>List Price: {currencySymbol}{numericPrice.toLocaleString()}</span>
                {intelligence && intelligence.categoryDemandScore && (
                  <span className="text-red-200 font-medium bg-red-500/20 px-1.5 py-0.5 rounded border border-red-300/20">
                    High Demand
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isHumanHandover && (
              <button
                onClick={requestHumanAgent}
                className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors border border-white/15"
                title="Connect with Human Seller"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Human Agent</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Intelligence Bar - TRADARA Blue & Red Touch */}
        {(latestPerception || intelligence) && (
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center space-x-3 overflow-x-auto py-0.5 scrollbar-none">
              {latestPerception?.detectedIntent && (
                <span className="flex items-center gap-1 font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                  <Target className="w-3 h-3 text-blue-600" /> Intent: {latestPerception.detectedIntent}
                </span>
              )}
              {latestPerception?.sentiment && (
                <span className="flex items-center gap-1 text-gray-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                  <Brain className="w-3 h-3 text-blue-600" /> Sentiment: {latestPerception.sentiment}
                </span>
              )}
              {intelligence?.itemHistoricalConversions !== undefined && intelligence.itemHistoricalConversions > 0 && (
                <span className="flex items-center gap-1 text-gray-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                  <ShieldCheck className="w-3 h-3 text-blue-600" /> {intelligence.itemHistoricalConversions} Deals Closed
                </span>
              )}
            </div>
          </div>
        )}

        {/* Active Agreed Deal Banner */}
        {activeAgreedPrice && (
          <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between shadow-inner">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-blue-200 bg-blue-800/50 p-0.5 rounded-full" />
              <span className="text-xs font-semibold">
                Deal Locked! Agreed Price: <span className="text-sm text-amber-200 font-bold">{currencySymbol}{activeAgreedPrice.toLocaleString()}</span>
              </span>
            </div>
            {onAddToCartWithDiscount && (
              <button
                onClick={() => onAddToCartWithDiscount(activeAgreedPrice)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 shadow-sm"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Claim Deal</span>
              </button>
            )}
          </div>
        )}

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSystem = msg.sender === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 max-w-md text-center">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-600 border border-blue-100'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                    }`}
                  >
                    <p>{msg.text}</p>

                    {msg.offer && (
                      <div className={`mt-2.5 pt-2 border-t ${isUser ? 'border-blue-500' : 'border-gray-100'} flex items-center justify-between text-xs`}>
                        <div className="flex items-center space-x-1.5">
                          <Tag className={`w-3.5 h-3.5 ${isUser ? 'text-blue-200' : 'text-blue-600'}`} />
                          <span className="font-medium">
                            Offer: {currencySymbol}{msg.offer.discountedPrice.toLocaleString()} ({msg.offer.discountPercent}% OFF)
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          msg.offer.status === 'accepted'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {msg.offer.status.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 px-1 block">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-start space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-white text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-gray-100 p-3.5 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-1.5">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Controls */}
        <div className="p-3.5 bg-white border-t border-gray-100 space-y-2">
          {!isHumanHandover && (
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
              <span className="text-gray-400 font-medium shrink-0">Quick Offer:</span>
              {[5, 10, 15].map((pct) => {
                const calculatedOffer = Math.round(numericPrice * (1 - pct / 100));
                return (
                  <button
                    key={pct}
                    onClick={() => handleSendMessage(undefined, calculatedOffer)}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors font-medium shrink-0"
                  >
                    {pct}% Off ({currencySymbol}{calculatedOffer.toLocaleString()})
                  </button>
                );
              })}
            </div>
          )}

          <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isHumanHandover
                  ? 'Message live representative...'
                  : 'Ask about specs, request discount, or make an offer...'
              }
              className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all placeholder:text-gray-400"
            />
            
            <button
              type="submit"
              disabled={!inputValue.trim() && !offerInput}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white p-2.5 rounded-xl transition-all shadow-md shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};