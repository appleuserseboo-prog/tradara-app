// ==========================================
// FILE: frontend/src/components/ai/TRADARAIntelligenceDrawer.tsx
// ==========================================

import React, { useState, useEffect, useRef } from 'react';

declare const process: {
  env: {
    REACT_APP_BACKEND_URL?: string;
    [key: string]: string | undefined;
  };
};

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  requiresConfirmation?: boolean;
  pendingToolDetails?: {
    toolName: string;
    params: any;
  };
}

export interface TRADARAIntelligenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'BUYER' | 'SELLER' | 'ADMIN';
  userId?: string;
  itemId?: string;
}

export const TRADARAIntelligenceDrawer: React.FC<TRADARAIntelligenceDrawerProps> = ({
  isOpen,
  onClose,
  userRole = 'BUYER',
  userId,
  itemId
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://tradara-backend.onrender.com';

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome_msg',
          sender: 'ai',
          text: `Hello! I am TRADARA Intelligence. How can I assist you with your trade, products, or orders today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (confirmation: boolean = false, pendingTool?: any) => {
    if (!inputText.trim() && !pendingTool) return;

    const userMsgText = inputText.trim();
    const newMsgId = `msg_${Date.now()}`;

    if (userMsgText && !pendingTool) {
      setMessages((prev) => [
        ...prev,
        {
          id: newMsgId,
          sender: 'user',
          text: userMsgText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setInputText('');
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/ai/negotiation/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMsgText || 'Confirm Action',
          itemId,
          userId,
          role: userRole,
          userConfirmationConfirmed: confirmation,
          pendingTool
        })
      });

      const data = await response.json();

      if (data.requiresConfirmation) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: data.reply || data.message || 'This sensitive operation requires your explicit approval.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            requiresConfirmation: true,
            pendingToolDetails: data.pendingToolDetails
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: data.reply || data.message || data.content || 'Request completed.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (error) {
      console.error('Error communicating with TRADARA Intelligence:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'system',
          text: 'Network error. Failed to connect to TRADARA Intelligence.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = (msg: ChatMessage, approved: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, requiresConfirmation: false } : m))
    );

    if (approved) {
      handleSendMessage(true, msg.pendingToolDetails);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys_${Date.now()}`,
          sender: 'system',
          text: 'Action cancelled by user.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl flex flex-col border-l border-gray-200 transition-transform transform duration-300">
      {/* Header */}
      <div className="p-4 bg-emerald-700 text-white flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-emerald-300 rounded-full animate-pulse"></span>
          <h2 className="font-bold text-lg tracking-wide">TRADARA AI</h2>
        </div>
        <button
          onClick={onClose}
          className="text-emerald-100 hover:text-white text-xl font-bold p-1 rounded transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user'
                ? 'items-end'
                : msg.sender === 'system'
                ? 'items-center'
                : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : msg.sender === 'system'
                  ? 'bg-gray-200 text-gray-700 text-xs italic text-center'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

              {msg.requiresConfirmation && (
                <div className="mt-3 pt-2 border-t border-gray-200 flex space-x-2">
                  <button
                    onClick={() => handleConfirmAction(msg, true)}
                    className="flex-1 bg-emerald-600 text-white text-xs font-semibold py-1.5 px-3 rounded hover:bg-emerald-700 transition"
                  >
                    Confirm & Execute
                  </button>
                  <button
                    onClick={() => handleConfirmAction(msg, false)}
                    className="flex-1 bg-gray-300 text-gray-800 text-xs font-semibold py-1.5 px-3 rounded hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex space-x-1.5 items-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your instruction or inquiry..."
            disabled={isLoading}
            className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default TRADARAIntelligenceDrawer;