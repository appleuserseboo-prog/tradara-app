// ==========================================
// FILE: frontend/src/hooks/useAIChat.ts
// ==========================================

import { useState, useCallback, useRef } from 'react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  metadata?: Record<string, any>;
}

interface UseAIChatOptions {
  apiEndpoint?: string;
  getAuthToken?: () => string | null;
  onError?: (error: Error) => void;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const {
    apiEndpoint = '/api/ai/chat/stream',
    getAuthToken,
    onError,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Sends a new message and streams the AI response chunk by chunk.
   */
  const sendMessage = useCallback(
    async (prompt: string, metadata?: Record<string, any>) => {
      if (!prompt.trim() || isLoading) return;

      setError(null);
      setIsLoading(true);

      const userMessageId = `msg_user_${Date.now()}`;
      const assistantMessageId = `msg_ai_${Date.now()}`;

      const userMessage: ChatMessage = {
        id: userMessageId,
        sender: 'user',
        content: prompt.trim(),
        timestamp: new Date().toISOString(),
        metadata,
      };

      const initialAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        sender: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };

      // Optimistically append user message and empty assistant placeholder
      setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);

      // Abort any ongoing stream before launching a new request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const token = getAuthToken ? getAuthToken() : null;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: prompt, metadata }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('ReadableStream not supported by response body.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace(/^data:\s*/, '').trim();

              if (dataStr === '[DONE]') {
                break;
              }

              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.text || parsed.content || parsed.delta || '';
                accumulatedText += delta;

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedText }
                      : msg
                  )
                );
              } catch (_e) {
                // If chunk is raw text rather than JSON
                accumulatedText += dataStr;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedText }
                      : msg
                  )
                );
              }
            }
          }
        }

        // Mark streaming complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
          )
        );
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Stream aborted by user.');
        } else {
          const errMsg = err.message || 'Failed to communicate with AI stream endpoint.';
          setError(errMsg);
          if (onError) onError(err);

          // Update assistant placeholder to reflect error
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: 'An error occurred while streaming response.',
                    isStreaming: false,
                  }
                : msg
            )
          );
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [apiEndpoint, getAuthToken, isLoading, onError]
  );

  /**
   * Aborts an in-flight SSE stream.
   */
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  /**
   * Clears all messages from state.
   */
  const clearMessages = useCallback(() => {
    stopStreaming();
    setMessages([]);
    setError(null);
  }, [stopStreaming]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}