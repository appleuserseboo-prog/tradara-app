import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AIMessage, PendingToolApproval, ToolExecutionResult } from '../types/ai';
import { aiApiService } from '../services/aiApi';

interface AIContextType {
  messages: AIMessage[];
  isProcessing: boolean;
  pendingApproval: PendingToolApproval | null;
  sendMessage: (content: string) => Promise<void>;
  executeToolWithApproval: () => Promise<void>;
  cancelToolApproval: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingToolApproval | null>(null);

  const sendMessage = async (content: string) => {
    const userMsg: AIMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // Mock AI intent parsing trigger to searchProducts for demonstration
      if (content.toLowerCase().includes('search') || content.toLowerCase().includes('find')) {
        const result = await aiApiService.executeTool({
          toolName: 'searchProducts',
          parameters: { query: content }
        });

        const aiMsg: AIMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: `Here are the search results for "${content}":`,
          timestamp: new Date().toISOString(),
          toolCalls: [
            {
              toolName: 'searchProducts',
              parameters: { query: content },
              result,
              status: 'completed'
            }
          ]
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else if (content.toLowerCase().includes('update stock')) {
        setPendingApproval({
          toolName: 'updateStock',
          parameters: { productId: 'prod_101', quantity: 50 },
          riskLevel: 'EXECUTE'
        });
      } else {
        const aiMsg: AIMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: `Tradara AI received: "${content}". How can I assist with your store operations?`,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      const errorMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: `Error processing request: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeToolWithApproval = async () => {
    if (!pendingApproval) return;
    setIsProcessing(true);

    try {
      const result: ToolExecutionResult = await aiApiService.executeTool({
        toolName: pendingApproval.toolName,
        parameters: pendingApproval.parameters,
        confirmed: true
      });

      const aiMsg: AIMessage = {
        id: Date.now().toString(),
        sender: 'assistant',
        content: `Executed operation ${pendingApproval.toolName} successfully.`,
        timestamp: new Date().toISOString(),
        toolCalls: [
          {
            toolName: pendingApproval.toolName,
            parameters: pendingApproval.parameters,
            result,
            status: 'completed'
          }
        ]
      };

      setMessages((prev) => [...prev, aiMsg]);
      setPendingApproval(null);
    } catch (err: any) {
      const errorMsg: AIMessage = {
        id: Date.now().toString(),
        sender: 'assistant',
        content: `Tool approval execution failed: ${err.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelToolApproval = () => {
    setPendingApproval(null);
  };

  return (
    <AIContext.Provider
      value={{
        messages,
        isProcessing,
        pendingApproval,
        sendMessage,
        executeToolWithApproval,
        cancelToolApproval
      }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};