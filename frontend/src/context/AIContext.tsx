import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { AIMessage, PendingToolApproval, ToolExecutionResult } from '../types/ai';
import { aiApiService } from '../services/aiApi';

export interface BuyerPerception {
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated' | 'eager';
  urgency: 'low' | 'medium' | 'high';
  priceSensitivity: 'low' | 'medium' | 'high';
  detectedIntent: 'inquiry' | 'bargain' | 'specs_check' | 'human_request' | 'bulk_inquiry' | 'closing';
  estimatedMaxBudget?: number;
}

export interface MarketplaceIntelligence {
  itemHistoricalConversions: number;
  averageAgreedDiscountPercent: number;
  buyerPastNegotiationCount: number;
  buyerSuccessfulDeals: number;
  categoryDemandScore: number;
}

interface AIContextType {
  messages: AIMessage[];
  isProcessing: boolean;
  pendingApproval: PendingToolApproval | null;
  lastPerception: BuyerPerception | null;
  lastIntelligence: MarketplaceIntelligence | null;
  sendMessage: (content: string, options?: { itemId?: string; buyerSession?: string; buyerId?: string; offeredPrice?: number; quantity?: number }) => Promise<void>;
  executeToolWithApproval: () => Promise<void>;
  cancelToolApproval: () => void;
  clearMessages: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingToolApproval | null>(null);
  const [lastPerception, setLastPerception] = useState<BuyerPerception | null>(null);
  const [lastIntelligence, setLastIntelligence] = useState<MarketplaceIntelligence | null>(null);

  const sendMessage = async (
    content: string,
    options?: { itemId?: string; buyerSession?: string; buyerId?: string; offeredPrice?: number; quantity?: number }
  ) => {
    const userMsg: AIMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // 1. Check if an item-specific AI sales session exists or option is provided
      if (options?.itemId && options?.buyerSession) {
        const response = await aiApiService.sendChatMessage({
          itemId: options.itemId,
          buyerSession: options.buyerSession,
          buyerId: options.buyerId,
          message: content,
          offeredPrice: options.offeredPrice,
          quantity: options.quantity
        });

        if (response.success && response.data) {
          const { reply, perception, intelligence, agreedPrice, status } = response.data;

          if (perception) setLastPerception(perception);
          if (intelligence) setLastIntelligence(intelligence);

          const aiMsg: AIMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            content: reply,
            timestamp: new Date().toISOString(),
            agreedPrice: agreedPrice || undefined,
            status: status || undefined
          };
          setMessages((prev) => [...prev, aiMsg]);
        }
      } 
      // 2. High-risk operational tool dispatch triggering approval interface
      else if (content.toLowerCase().includes('update stock') || content.toLowerCase().includes('change price')) {
        setPendingApproval({
          toolName: 'updateStock',
          parameters: { productId: 'prod_101', quantity: 50 },
          riskLevel: 'EXECUTE'
        });

        const aiMsg: AIMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: 'This operation requires confirmation before changes are made to your store stock.',
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, aiMsg]);
      } 
      // 3. Fallback to general AI Assistant tool integration / Store helper
      else {
        const result = await aiApiService.executeTool({
          toolName: 'searchProducts',
          parameters: { query: content }
        });

        const aiMsg: AIMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: result?.message || `TRADARA AI Assistant: "${content}". How can I help with your store operations or negotiations?`,
          timestamp: new Date().toISOString(),
          toolCalls: result ? [
            {
              toolName: 'searchProducts',
              parameters: { query: content },
              result,
              status: 'completed'
            }
          ] : undefined
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      const errorMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: `Error processing request: ${errorMessage}`,
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
        content: `Executed operation "${pendingApproval.toolName}" successfully.`,
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error executing action.';
      const errorMsg: AIMessage = {
        id: Date.now().toString(),
        sender: 'assistant',
        content: `Tool approval execution failed: ${errorMessage}`,
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

  const clearMessages = () => {
    setMessages([]);
    setLastPerception(null);
    setLastIntelligence(null);
  };

  return (
    <AIContext.Provider
      value={{
        messages,
        isProcessing,
        pendingApproval,
        lastPerception,
        lastIntelligence,
        sendMessage,
        executeToolWithApproval,
        cancelToolApproval,
        clearMessages
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