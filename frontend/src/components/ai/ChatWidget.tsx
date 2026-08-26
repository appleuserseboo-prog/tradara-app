import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '../../context/AIContext';
import { ToolExecutionModal } from './ToolExecutionModal';
import type { ToolCallItem } from '../../types/ai';
import { Send, Bot, User, Sparkles, ChevronDown } from 'lucide-react';

export const ChatWidget: React.FC = () => {
  const { messages, isProcessing, pendingApproval, sendMessage, executeToolWithApproval, cancelToolApproval } = useAI();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  return (
    <div className="flex flex-col h-[550px] w-full max-w-[420px] border border-gray-200 rounded-2xl bg-slate-50 shadow-2xl overflow-hidden font-sans">
      
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 text-white flex justify-between items-center shadow-md z-10">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <Sparkles className="w-5 h-5 text-blue-200" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 border-2 border-blue-800 rounded-full" />
          </div>
          <div>
            <h3 className="font-bold text-[15px] leading-tight">Tradara Omnintelligence</h3>
            <p className="text-xs text-blue-200 mt-0.5">Always active</p>
          </div>
        </div>
        <button className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Body */}
      <div className="flex-1 p-5 overflow-y-auto space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60 mt-8">
            <Bot className="w-12 h-12 text-gray-400" />
            <p className="text-sm text-gray-500 max-w-[200px]">
              Ask Tradara AI to search products, track orders, or run store analytics.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          
          return (
            <div
              key={msg.id}
              className={`flex items-end space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center shadow-sm ${
                isUser ? 'bg-blue-600 text-white' : 'bg-white text-indigo-700 border border-gray-200'
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                    isUser 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Tool Execution Display */}
                {msg.toolCalls?.map((call: ToolCallItem, idx: number) => (
                  <div key={idx} className="mt-2 w-full p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs">
                    <div className="flex items-center space-x-1.5 mb-1.5">
                      <Bot className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-semibold text-indigo-900">Executed: {call.toolName}</span>
                    </div>
                    {call.result && (
                      <div className="bg-white rounded-lg border border-indigo-50 p-2 overflow-x-auto">
                        <pre className="text-[11px] text-gray-600 font-mono">
                          {JSON.stringify(call.result.result || call.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isProcessing && (
          <div className="flex items-end space-x-2">
            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-white text-indigo-700 border border-gray-200 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-gray-100 px-4 py-3.5 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-1.5">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center space-x-2 bg-slate-50 border border-gray-200 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Tradara AI..."
            className="flex-1 bg-transparent px-3 py-2 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      <ToolExecutionModal
        isOpen={Boolean(pendingApproval)}
        pendingApproval={pendingApproval}
        onConfirm={executeToolWithApproval}
        onCancel={cancelToolApproval}
        isExecuting={isProcessing}
      />
    </div>
  );
};