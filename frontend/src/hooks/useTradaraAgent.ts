// ==========================================
// FILE: frontend/src/hooks/useTradaraAgent.ts
// TRADARA AI — Agent Runtime Client
// ==========================================

import {
  useCallback,
  useRef,
  useState,
} from 'react';

export type TradaraAgentType =
  | 'general'
  | 'marketplace'
  | 'research'
  | 'marketing'
  | 'developer'
  | 'finance'
  | 'security'
  | 'support'
  | 'vision'
  | 'media'
  | 'content'
  | 'file'
  | 'planning';

export interface TradaraAgentAttachment {
  id?: string;
  name: string;
  mimeType: string;
  url?: string;
  data?: string;
  size?: number;
  type?:
    | 'image'
    | 'video'
    | 'audio'
    | 'document'
    | 'code'
    | 'other';
  metadata?: Record<string, any>;
}

export interface TradaraAgentMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  metadata?: Record<string, any>;
}

export interface TradaraAgentRequest {
  message: string;

  conversationId?: string;

  sessionId?: string;

  taskId?: string;

  itemId?: string;

  userId?: string;

  agent?: TradaraAgentType;

  attachments?: TradaraAgentAttachment[];

  context?: Record<string, any>;

  executeActions?: boolean;

  approvedAction?: {
    toolName: string;
    params: Record<string, any>;
  };

  metadata?: Record<string, any>;
}

export interface TradaraAgentEvent {
  type:
    | 'start'
    | 'status'
    | 'plan'
    | 'tool_start'
    | 'tool_result'
    | 'content'
    | 'warning'
    | 'approval_required'
    | 'verification'
    | 'complete'
    | 'error'
    | 'final';

  requestId?: string;

  timestamp?: string;

  content?: string;

  status?: string;

  agent?: TradaraAgentType;

  intent?: string;

  plan?: any;

  verification?: any;

  requiresApproval?: boolean;

  pendingAction?: {
    toolName: string;
    params: Record<string, any>;
    reason: string;
  };

  result?: any;

  error?: string;

  metadata?: Record<string, any>;
}

interface UseTradaraAgentOptions {
  apiEndpoint?: string;

  backendUrl?: string;

  getAuthToken?: () => string | null;

  onEvent?: (event: TradaraAgentEvent) => void;

  onError?: (error: Error) => void;
}

function resolveBackendUrl(
  explicitBackendUrl?: string
): string {
  if (explicitBackendUrl) {
    return explicitBackendUrl.replace(/\/+$/, '');
  }

  const envUrl =
    (import.meta as any).env?.VITE_API_URL ||
    (import.meta as any).env?.VITE_BACKEND_URL ||
    '';

  return String(envUrl).replace(/\/+$/, '');
}

export function useTradaraAgent(
  options: UseTradaraAgentOptions = {}
) {
  const {
    apiEndpoint = '/api/ai/agent',
    backendUrl,
    getAuthToken,
    onEvent,
    onError,
  } = options;

  const [messages, setMessages] = useState<
    TradaraAgentMessage[]
  >([]);

  const [isRunning, setIsRunning] =
    useState(false);

  const [error, setError] = useState<string | null>(
    null
  );

  const [activeAgent, setActiveAgent] =
    useState<TradaraAgentType | null>(null);

  const [activeIntent, setActiveIntent] =
    useState<string | null>(null);

  const [status, setStatus] =
    useState<string>('idle');

  const [plan, setPlan] = useState<any>(null);

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      request:
        | string
        | TradaraAgentRequest
    ) => {
      const normalizedRequest: TradaraAgentRequest =
        typeof request === 'string'
          ? {
              message: request,
            }
          : request;

      const message =
        normalizedRequest.message?.trim();

      if (!message || isRunning) {
        return;
      }

      setError(null);
      setIsRunning(true);
      setStatus('starting');

      const userMessageId =
        `user_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 7)}`;

      const assistantMessageId =
        `assistant_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 7)}`;

      const now = new Date().toISOString();

      setMessages((previous) => [
        ...previous,

        {
          id: userMessageId,
          sender: 'user',
          content: message,
          timestamp: now,
        },

        {
          id: assistantMessageId,
          sender: 'assistant',
          content: '',
          timestamp: now,
          isStreaming: true,
        },
      ]);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller =
        new AbortController();

      abortControllerRef.current = controller;

      try {
        const token =
          getAuthToken?.() || null;

        const headers: Record<
          string,
          string
        > = {
          'Content-Type':
            'application/json',

          Accept:
            'text/event-stream',
        };

        if (token) {
          headers.Authorization =
            `Bearer ${token}`;
        }

        const baseUrl =
          resolveBackendUrl(
            backendUrl
          );

        const url =
          baseUrl
            ? `${baseUrl}${apiEndpoint}`
            : apiEndpoint;

        const response =
          await fetch(url, {
            method: 'POST',

            headers,

            body: JSON.stringify({
              ...normalizedRequest,
              message,
              stream: true,
            }),

            signal:
              controller.signal,
          });

        if (!response.ok) {
          let serverMessage =
            `HTTP ${response.status}`;

          try {
            const json =
              await response.json();

            serverMessage =
              json?.error ||
              json?.message ||
              serverMessage;
          } catch {
            // Keep HTTP error.
          }

          throw new Error(
            serverMessage
          );
        }

        if (!response.body) {
          throw new Error(
            'Tradara AI returned no streaming response body.'
          );
        }

        const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder('utf-8');

        let accumulatedText = '';

        let streamBuffer = '';

        while (true) {
          const {
            done,
            value,
          } = await reader.read();

          if (done) {
            break;
          }

          streamBuffer +=
            decoder.decode(value, {
              stream: true,
            });

          const events =
            streamBuffer.split(
              '\n\n'
            );

          streamBuffer =
            events.pop() || '';

          for (const eventBlock of events) {
            const lines =
              eventBlock.split('\n');

            for (const line of lines) {
              if (
                !line.startsWith(
                  'data:'
                )
              ) {
                continue;
              }

              const dataString =
                line
                  .replace(
                    /^data:\s*/,
                    ''
                  )
                  .trim();

              if (
                !dataString
              ) {
                continue;
              }

              if (
                dataString ===
                '[DONE]'
              ) {
                continue;
              }

              let event:
                | TradaraAgentEvent
                | null = null;

              try {
                event =
                  JSON.parse(
                    dataString
                  );
              } catch {
                /*
                 * Some legacy stream implementations
                 * can emit raw text. Preserve it rather
                 * than silently losing the content.
                 */
                accumulatedText +=
                  dataString;

                setMessages(
                  (previous) =>
                    previous.map(
                      (item) =>
                        item.id ===
                        assistantMessageId
                          ? {
                              ...item,
                              content:
                                accumulatedText,
                            }
                          : item
                    )
                );

                continue;
              }

              if (!event) {
                continue;
              }

              if (event.agent) {
                setActiveAgent(
                  event.agent
                );
              }

              if (event.intent) {
                setActiveIntent(
                  event.intent
                );
              }

              if (event.status) {
                setStatus(
                  event.status
                );
              }

              if (event.plan) {
                setPlan(
                  event.plan
                );
              }

              if (
                event.type ===
                'content' &&
                event.content
              ) {
                accumulatedText +=
                  event.content;

                setMessages(
                  (previous) =>
                    previous.map(
                      (item) =>
                        item.id ===
                        assistantMessageId
                          ? {
                              ...item,
                              content:
                                accumulatedText,
                            }
                          : item
                    )
                );
              }

              if (
                event.type ===
                'final'
              ) {
                const finalResult =
                  event.result;

                const finalContent =
                  finalResult?.content;

                if (
                  typeof finalContent ===
                    'string' &&
                  finalContent.length >
                    0
                ) {
                  accumulatedText =
                    finalContent;

                  setMessages(
                    (previous) =>
                      previous.map(
                        (item) =>
                          item.id ===
                          assistantMessageId
                            ? {
                                ...item,
                                content:
                                  finalContent,
                                metadata: {
                                  ...(item.metadata ||
                                    {}),
                                  agent:
                                    finalResult.agent,
                                  intent:
                                    finalResult.intent,
                                  verification:
                                    finalResult.verification,
                                  requestId:
                                    finalResult.requestId,
                                },
                              }
                            : item
                      )
                  );
                }
              }

              onEvent?.(event);
            }
          }
        }

        setMessages(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                assistantMessageId
                  ? {
                      ...item,
                      isStreaming: false,
                    }
                  : item
            )
        );

        setStatus('completed');
      } catch (caughtError: any) {
        if (
          caughtError?.name ===
          'AbortError'
        ) {
          setStatus('cancelled');
          return;
        }

        const errorObject =
          caughtError instanceof Error
            ? caughtError
            : new Error(
                caughtError?.message ||
                  'Tradara AI request failed.'
              );

        console.error(
          '[Tradara Agent Client]',
          errorObject
        );

        setError(
          errorObject.message
        );

        setStatus('failed');

        setMessages(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                assistantMessageId
                  ? {
                      ...item,
                      content:
                        `I couldn't complete that request because the Tradara AI service returned an error: ${errorObject.message}`,
                      isStreaming: false,
                    }
                  : item
            )
        );

        onError?.(
          errorObject
        );
      } finally {
        setIsRunning(false);

        abortControllerRef.current =
          null;
      }
    },
    [
      apiEndpoint,
      backendUrl,
      getAuthToken,
      isRunning,
      onError,
      onEvent,
    ]
  );

  const stop = useCallback(() => {
    if (
      abortControllerRef.current
    ) {
      abortControllerRef.current.abort();

      abortControllerRef.current =
        null;
    }

    setIsRunning(false);
    setStatus('cancelled');
  }, []);

  const clearMessages =
    useCallback(() => {
      stop();

      setMessages([]);

      setError(null);

      setActiveAgent(null);

      setActiveIntent(null);

      setPlan(null);

      setStatus('idle');
    }, [stop]);

  return {
    messages,

    isRunning,

    error,

    activeAgent,

    activeIntent,

    status,

    plan,

    sendMessage,

    stop,

    clearMessages,
  };
}

export default useTradaraAgent;