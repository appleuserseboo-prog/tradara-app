import React, { useState } from 'react';
import { useAI } from '../../context/AIContext';
import { ToolExecutionModal } from './ToolExecutionModal';
import type { ToolCallItem } from '../../types/ai';

export const ChatWidget: React.FC = () => {
  const { messages, isProcessing, pendingApproval, sendMessage, executeToolWithApproval, cancelToolApproval } = useAI();
  const [input, setInput] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  return (
    <div className="flex flex-col h-[500px] w-full max-w-md border border-gray-300 rounded-lg bg-white shadow-lg overflow-hidden">
      <div className="bg-blue-600 p-4 text-white font-bold flex justify-between items-center">
        <span>Tradara Omnintelligence</span>
        <span className="text-xs bg-blue-700 px-2 py-1 rounded">v1.0</span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500 text-center italic mt-10">
            Ask Tradara AI to search products, track orders, or run store analytics.
          </p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 text-sm ${
                msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.content}
            </div>

            {msg.toolCalls?.map((call: ToolCallItem, idx: number) => (
              <div key={idx} className="mt-1 p-2 rounded bg-gray-50 border border-gray-200 text-xs w-[80%]">
                <span className="font-semibold text-gray-700">Tool Executed: {call.toolName}</span>
                {call.result && (
                  <pre className="mt-1 overflow-x-auto text-[10px] text-gray-600">
                    {JSON.stringify(call.result.result || call.result, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-gray-200 flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask or command Tradara AI..."
          className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isProcessing}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
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