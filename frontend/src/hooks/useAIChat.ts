// ==========================================
// FILE: frontend/src/hooks/useAIChat.ts
// TRADARA AI — Unified Agent Streaming Chat Hook
// ==========================================

import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  metadata?: Record<string, any>;
}

export interface AIChatAttachment {
  id?: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'document';
  name?: string;
  url?: string;
  mimeType?: string;
  size?: number;
  data?: string;
  metadata?: Record<string, any>;
}

export interface AIChatContext {
  user?: Record<string, any>;
  product?: Record<string, any>;
  project?: Record<string, any>;
  messages?: Array<Record<string, any>>;
  attachments?: AIChatAttachment[];
  memory?: Array<Record<string, any>>;
  globalContext?: Record<string, any>;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface AIChatRequestOptions {
  metadata?: Record<string, any>;

  context?: AIChatContext;

  attachments?: AIChatAttachment[];

  itemId?: string;

  conversationId?: string;

  sessionId?: string;

  taskId?: string;

  buyerSession?: string;

  userId?: string;

  agent?: string;

  intent?: string;

  executeActions?: boolean;

  approvedAction?: Record<string, any>;

  stream?: boolean;
}

interface UseAIChatOptions {
  /**
   * Tradara agent endpoint.
   *
   * Defaults to:
   * /api/ai/agent
   */
  apiEndpoint?: string;

  /**
   * Optional authentication token provider.
   */
  getAuthToken?: () => string | null;

  /**
   * Called when an unrecoverable streaming error occurs.
   */
  onError?: (error: Error) => void;

  /**
   * Called whenever an agent SSE event is received.
   */
  onEvent?: (event: TradaraAgentEvent) => void;

  /**
   * Optional initial messages.
   */
  initialMessages?: ChatMessage[];
}

export interface TradaraAgentEvent {
  type?: string;

  event?: string;

  requestId?: string;

  messageId?: string;

  timestamp?: string;

  text?: string;

  content?: string;

  delta?: string;

  chunk?: string;

  status?: string;

  agent?: string;

  activeAgent?: string;

  intent?: string;

  activeIntent?: string;

  plan?: any;

  result?: any;

  verification?: any;

  tool?: any;

  toolCall?: any;

  toolResult?: any;

  approval?: any;

  requiresConfirmation?: boolean;

  pendingToolDetails?: any;

  error?: string;

  metadata?: Record<string, any>;

  [key: string]: any;
}

export interface SendMessageResult {
  success: boolean;

  requestId?: string;

  content: string;

  events: TradaraAgentEvent[];

  metadata?: Record<string, any>;

  result?: any;
}

/**
 * Extract a backend URL from common Vite environment variables.
 */
function getDefaultApiEndpoint(): string {
  const env = import.meta.env as Record<string, string | undefined>;

  const configuredBase =
    env.VITE_API_URL ||
    env.VITE_BACKEND_URL ||
    '';

  if (!configuredBase) {
    return '/api/ai/agent';
  }

  const normalizedBase = configuredBase.replace(/\/+$/, '');

  if (
    normalizedBase.endsWith('/api/ai/agent')
  ) {
    return normalizedBase;
  }

  if (
    normalizedBase.endsWith('/api/ai')
  ) {
    return `${normalizedBase}/agent`;
  }

  if (
    normalizedBase.endsWith('/api')
  ) {
    return `${normalizedBase}/ai/agent`;
  }

  return `${normalizedBase}/api/ai/agent`;
}

/**
 * Safely extract streamed text from an agent event.
 */
function extractEventText(
  event: TradaraAgentEvent
): string {
  const candidates = [
    event.delta,
    event.chunk,
    event.text,
    event.content,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }

  return '';
}

/**
 * Determine whether an event represents a terminal stream event.
 */
function isTerminalEvent(
  event: TradaraAgentEvent
): boolean {
  const type = String(
    event.type ||
      event.event ||
      ''
  ).toLowerCase();

  return (
    type === 'done' ||
    type === 'complete' ||
    type === 'completed' ||
    type === 'final' ||
    type === 'finish' ||
    type === 'finished'
  );
}

/**
 * Some agent implementations send the complete assistant answer
 * repeatedly in `content`/`text` instead of sending deltas.
 *
 * This function prevents accidental duplication.
 */
function appendStreamText(
  current: string,
  incoming: string,
  event: TradaraAgentEvent
): string {
  if (!incoming) {
    return current;
  }

  const type = String(
    event.type ||
      event.event ||
      ''
  ).toLowerCase();

  const looksLikeDelta =
    type === 'chunk' ||
    type === 'content' ||
    type === 'delta' ||
    type === 'text';

  if (looksLikeDelta) {
    return current + incoming;
  }

  /**
   * If the backend explicitly provides a complete response,
   * prefer that response instead of duplicating it.
   */
  if (
    event.result &&
    typeof event.result.content === 'string' &&
    event.result.content === incoming
  ) {
    return incoming;
  }

  if (incoming === current) {
    return current;
  }

  if (incoming.startsWith(current)) {
    return incoming;
  }

  if (current.endsWith(incoming)) {
    return current;
  }

  /**
   * If the incoming value is already contained in the current
   * response, don't append it again.
   */
  if (
    current.includes(incoming) &&
    incoming.length > 20
  ) {
    return current;
  }

  /**
   * For unknown events, append by default.
   */
  return current + incoming;
}

/**
 * Parse an SSE data payload.
 */
function parseSSEData(
  rawData: string
): TradaraAgentEvent | string | null {
  const data = rawData.trim();

  if (!data) {
    return null;
  }

  if (data === '[DONE]') {
    return '[DONE]';
  }

  try {
    const parsed = JSON.parse(data);

    if (
      typeof parsed === 'string'
    ) {
      return {
        type: 'text',
        text: parsed,
      };
    }

    if (
      parsed &&
      typeof parsed === 'object'
    ) {
      return parsed as TradaraAgentEvent;
    }

    return null;
  } catch {
    /**
     * Some legacy endpoints may emit plain text SSE.
     */
    return {
      type: 'text',
      text: data,
    };
  }
}

/**
 * Parse an SSE block into events.
 *
 * Supports:
 *
 * data: {...}
 *
 * event: content
 * data: {...}
 *
 * Multiple data lines are joined according to SSE semantics.
 */
function parseSSEBlock(
  block: string
): TradaraAgentEvent | string | null {
  const lines = block.split(/\r?\n/);

  const dataLines: string[] = [];

  let eventName = '';

  for (const line of lines) {
    if (line.startsWith(':')) {
      continue;
    }

    if (line.startsWith('event:')) {
      eventName = line
        .slice(6)
        .trim();

      continue;
    }

    if (line.startsWith('data:')) {
      dataLines.push(
        line
          .slice(5)
          .replace(/^ /, '')
      );
    }
  }

  if (!dataLines.length) {
    return null;
  }

  const payload =
    dataLines.join('\n');

  const parsed =
    parseSSEData(payload);

  if (
    parsed &&
    parsed !== '[DONE]' &&
    typeof parsed === 'object' &&
    eventName &&
    !parsed.type
  ) {
    parsed.type = eventName;
  }

  return parsed;
}

export function useAIChat(
  options: UseAIChatOptions = {}
) {
  const {
    apiEndpoint = getDefaultApiEndpoint(),
    getAuthToken,
    onError,
    onEvent,
    initialMessages = [],
  } = options;

  const [messages, setMessages] =
    useState<ChatMessage[]>(
      initialMessages
    );

  const [isLoading, setIsLoading] =
    useState<boolean>(false);

  const [error, setError] =
    useState<string | null>(null);

  const [
    activeAgent,
    setActiveAgent,
  ] = useState<string | null>(null);

  const [
    activeIntent,
    setActiveIntent,
  ] = useState<string | null>(null);

  const [
    agentStatus,
    setAgentStatus,
  ] = useState<string | null>(null);

  const [
    currentPlan,
    setCurrentPlan,
  ] = useState<any>(null);

  const [
    pendingApproval,
    setPendingApproval,
  ] = useState<any>(null);

  const abortControllerRef =
    useRef<AbortController | null>(null);

  /**
   * Keep a mounted flag so asynchronous stream callbacks
   * do not attempt state updates after unmount.
   */
  const mountedRef =
    useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Update the assistant message with a streamed event.
   */
  const processAgentEvent = useCallback(
    (
      event: TradaraAgentEvent,
      assistantMessageId: string,
      accumulatedTextRef: {
        value: string;
      }
    ) => {
      if (!mountedRef.current) {
        return;
      }

      const type = String(
        event.type ||
          event.event ||
          ''
      ).toLowerCase();

      /**
       * Agent identity.
       */
      if (
        event.agent ||
        event.activeAgent
      ) {
        setActiveAgent(
          event.agent ||
            event.activeAgent ||
            null
        );
      }

      /**
       * Intent.
       */
      if (
        event.intent ||
        event.activeIntent
      ) {
        setActiveIntent(
          event.intent ||
            event.activeIntent ||
            null
        );
      }

      /**
       * Status.
       */
      if (event.status) {
        setAgentStatus(
          event.status
        );
      }

      /**
       * Planning.
       */
      if (
        event.plan !== undefined
      ) {
        setCurrentPlan(
          event.plan
        );
      }

      /**
       * Approval / confirmation.
       */
      if (
        type ===
          'approval_required' ||
        type ===
          'requires_confirmation' ||
        event.requiresConfirmation
      ) {
        setPendingApproval(
          event.approval ||
            event.pendingToolDetails ||
            event.tool ||
            event.toolCall ||
            event.metadata ||
            null
        );
      }

      /**
       * Explicit approval completed.
       */
      if (
        type === 'approval_granted' ||
        type === 'approval_completed'
      ) {
        setPendingApproval(null);
      }

      /**
       * Error event.
       */
      if (
        type === 'error' ||
        type === 'failed'
      ) {
        const errorMessage =
          event.error ||
          event.result?.error ||
          'Tradara AI encountered an error.';

        setError(errorMessage);

        setMessages(
          (previous) =>
            previous.map(
              (message) =>
                message.id ===
                assistantMessageId
                  ? {
                      ...message,
                      content:
                        accumulatedTextRef.value ||
                        errorMessage,
                      isStreaming: false,
                      metadata: {
                        ...message.metadata,
                        agentEvent: event,
                      },
                    }
                  : message
            )
        );

        return;
      }

      /**
       * Extract streamed assistant text.
       */
      const incomingText =
        extractEventText(event);

      if (incomingText) {
        accumulatedTextRef.value =
          appendStreamText(
            accumulatedTextRef.value,
            incomingText,
            event
          );

        setMessages(
          (previous) =>
            previous.map(
              (message) =>
                message.id ===
                assistantMessageId
                  ? {
                      ...message,
                      content:
                        accumulatedTextRef.value,
                      isStreaming: true,
                      metadata: {
                        ...message.metadata,
                        agent:
                          event.agent ||
                          event.activeAgent ||
                          message.metadata?.agent,
                        intent:
                          event.intent ||
                          event.activeIntent ||
                          message.metadata?.intent,
                        lastEventType:
                          type,
                      },
                    }
                  : message
            )
        );
      }

      /**
       * A complete event can contain the final response
       * under result.content.
       */
      const resultContent =
        typeof event.result?.content ===
        'string'
          ? event.result.content
          : '';

      if (
        resultContent &&
        resultContent !==
          accumulatedTextRef.value
      ) {
        accumulatedTextRef.value =
          resultContent;

        setMessages(
          (previous) =>
            previous.map(
              (message) =>
                message.id ===
                assistantMessageId
                  ? {
                      ...message,
                      content:
                        resultContent,
                      isStreaming:
                        !isTerminalEvent(
                          event
                        ),
                      metadata: {
                        ...message.metadata,
                        result:
                          event.result,
                      },
                    }
                  : message
            )
        );
      }

      /**
       * Final metadata.
       */
      if (
        type === 'verification' ||
        event.verification
      ) {
        setMessages(
          (previous) =>
            previous.map(
              (message) =>
                message.id ===
                assistantMessageId
                  ? {
                      ...message,
                      metadata: {
                        ...message.metadata,
                        verification:
                          event.verification ||
                          event.result?.verification,
                      },
                    }
                  : message
            )
        );
      }

      if (
        event.metadata ||
        event.tool ||
        event.toolCall ||
        event.toolResult
      ) {
        setMessages(
          (previous) =>
            previous.map(
              (message) =>
                message.id ===
                assistantMessageId
                  ? {
                      ...message,
                      metadata: {
                        ...message.metadata,
                        eventMetadata:
                          event.metadata,
                        tool:
                          event.tool,
                        toolCall:
                          event.toolCall,
                        toolResult:
                          event.toolResult,
                      },
                    }
                  : message
            )
        );
      }

      /**
       * Mark the assistant message complete.
       */
      if (
        isTerminalEvent(event)
      ) {
        setMessages(
          (previous) =>
            previous.map(
              (message) =>
                message.id ===
                assistantMessageId
                  ? {
                      ...message,
                      isStreaming: false,
                    }
                  : message
            )
        );
      }

      if (onEvent) {
        onEvent(event);
      }
    },
    [onEvent]
  );

  /**
   * Send a message through the Tradara Agent Gateway.
   */
  const sendMessage = useCallback(
    async (
      prompt: string,
      requestOptions?: AIChatRequestOptions
    ): Promise<
      SendMessageResult | undefined
    > => {
      const trimmedPrompt =
        prompt.trim();

      if (
        !trimmedPrompt ||
        isLoading
      ) {
        return undefined;
      }

      setError(null);
      setIsLoading(true);
      setAgentStatus('starting');
      setPendingApproval(null);

      /**
       * Abort an older stream first.
       */
      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();
      }

      const controller =
        new AbortController();

      abortControllerRef.current =
        controller;

      const now =
        Date.now();

      const userMessageId =
        `msg_user_${now}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;

      const assistantMessageId =
        `msg_ai_${now}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;

      const userMessage: ChatMessage = {
        id: userMessageId,
        sender: 'user',
        content: trimmedPrompt,
        timestamp:
          new Date().toISOString(),
        metadata:
          requestOptions?.metadata,
      };

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        sender: 'assistant',
        content: '',
        timestamp:
          new Date().toISOString(),
        isStreaming: true,
        metadata: {
          agent:
            requestOptions?.agent,
          intent:
            requestOptions?.intent,
        },
      };

      setMessages(
        (previous) => [
          ...previous,
          userMessage,
          assistantMessage,
        ]
      );

      const accumulatedTextRef = {
        value: '',
      };

      const receivedEvents: TradaraAgentEvent[] =
        [];

      let finalResult: any =
        undefined;

      try {
        const token =
          getAuthToken
            ? getAuthToken()
            : null;

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

        const context =
          requestOptions?.context
            ? {
                ...requestOptions.context,
              }
            : undefined;

        const attachments =
          requestOptions?.attachments ||
          context?.attachments ||
          [];

        /**
         * Include conversation history in the context.
         *
         * This makes the hook useful even when the backend
         * session is not yet persisted.
         */
        const conversationMessages =
          messages
            .filter(
              (message) =>
                message.id !==
                assistantMessageId
            )
            .map(
              (message) => ({
                id: message.id,
                role:
                  message.sender ===
                  'assistant'
                    ? 'assistant'
                    : message.sender ===
                      'system'
                    ? 'system'
                    : 'user',
                content:
                  message.content,
                timestamp:
                  message.timestamp,
                metadata:
                  message.metadata,
              })
            );

        const finalContext: AIChatContext = {
          ...(context || {}),

          messages:
            context?.messages ||
            conversationMessages,

          attachments:
            attachments,

          metadata: {
            ...(context?.metadata ||
              {}),
            source:
              'tradara-ai-web-client',
          },
        };

        const body: Record<
          string,
          any
        > = {
          message:
            trimmedPrompt,

          stream:
            requestOptions?.stream !==
            false,

          context:
            finalContext,

          attachments,

          metadata:
            requestOptions?.metadata ||
            {},

          ...(requestOptions?.itemId
            ? {
                itemId:
                  requestOptions.itemId,
              }
            : {}),

          ...(requestOptions?.conversationId
            ? {
                conversationId:
                  requestOptions.conversationId,
              }
            : {}),

          ...(requestOptions?.sessionId
            ? {
                sessionId:
                  requestOptions.sessionId,
              }
            : {}),

          ...(requestOptions?.taskId
            ? {
                taskId:
                  requestOptions.taskId,
              }
            : {}),

          ...(requestOptions?.buyerSession
            ? {
                buyerSession:
                  requestOptions.buyerSession,
              }
            : {}),

          ...(requestOptions?.userId
            ? {
                userId:
                  requestOptions.userId,
              }
            : {}),

          ...(requestOptions?.agent
            ? {
                agent:
                  requestOptions.agent,
              }
            : {}),

          ...(requestOptions?.intent
            ? {
                intent:
                  requestOptions.intent,
              }
            : {}),

          executeActions:
            requestOptions
              ?.executeActions === true,

          ...(requestOptions?.approvedAction
            ? {
                approvedAction:
                  requestOptions.approvedAction,
              }
            : {}),
        };

        const response =
          await fetch(
            apiEndpoint,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(
                body
              ),
              signal:
                controller.signal,
            }
          );

        if (!response.ok) {
          let backendMessage =
            '';

          try {
            const errorBody =
              await response.json();

            backendMessage =
              errorBody?.error ||
              errorBody?.message ||
              '';
          } catch {
            /**
             * Response was not JSON.
             */
          }

          throw new Error(
            backendMessage ||
              `HTTP Error ${response.status}: ${response.statusText}`
          );
        }

        /**
         * Non-streaming fallback.
         *
         * This keeps the hook compatible with agent
         * requests where stream=false.
         */
        const contentType =
          response.headers.get(
            'content-type'
          ) || '';

        if (
          !contentType.includes(
            'text/event-stream'
          )
        ) {
          const result =
            await response.json();

          const finalContent =
            typeof result?.content ===
            'string'
              ? result.content
              : typeof result?.result
                    ?.content ===
                  'string'
              ? result.result.content
              : '';

          accumulatedTextRef.value =
            finalContent;

          finalResult =
            result;

          setMessages(
            (previous) =>
              previous.map(
                (message) =>
                  message.id ===
                  assistantMessageId
                    ? {
                        ...message,
                        content:
                          finalContent,
                        isStreaming:
                          false,
                        metadata: {
                          ...message.metadata,
                          result,
                        },
                      }
                    : message
              )
          );

          setAgentStatus(
            result?.status ||
              'completed'
          );

          if (
            result?.agent ||
            result?.activeAgent
          ) {
            setActiveAgent(
              result.agent ||
                result.activeAgent
            );
          }

          if (
            result?.intent ||
            result?.activeIntent
          ) {
            setActiveIntent(
              result.intent ||
                result.activeIntent
            );
          }

          return {
            success:
              result?.success !== false,
            requestId:
              result?.requestId,
            content:
              finalContent,
            events:
              receivedEvents,
            metadata:
              result?.metadata,
            result,
          };
        }

        if (!response.body) {
          throw new Error(
            'ReadableStream is not supported by the response body.'
          );
        }

        const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder(
            'utf-8'
          );

        let buffer = '';

        let streamFinished =
          false;

        while (!streamFinished) {
          const {
            done,
            value,
          } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(
            value,
            {
              stream: true,
            }
          );

          /**
           * SSE events are separated by a blank line.
           */
          const blocks =
            buffer.split(
              /\r?\n\r?\n/
            );

          buffer =
            blocks.pop() || '';

          for (
            const block of blocks
          ) {
            const parsed =
              parseSSEBlock(block);

            if (
              parsed === null
            ) {
              continue;
            }

            if (
              parsed ===
              '[DONE]'
            ) {
              streamFinished =
                true;

              break;
            }

            if (
              typeof parsed ===
              'string'
            ) {
              accumulatedTextRef.value =
                appendStreamText(
                  accumulatedTextRef.value,
                  parsed,
                  {
                    type: 'text',
                    text: parsed,
                  }
                );

              setMessages(
                (previous) =>
                  previous.map(
                    (message) =>
                      message.id ===
                      assistantMessageId
                        ? {
                            ...message,
                            content:
                              accumulatedTextRef.value,
                            isStreaming:
                              true,
                          }
                        : message
                  )
              );

              continue;
            }

            const event =
              parsed as TradaraAgentEvent;

            receivedEvents.push(
              event
            );

            if (
              event.result
            ) {
              finalResult =
                event.result;
            }

            processAgentEvent(
              event,
              assistantMessageId,
              accumulatedTextRef
            );

            if (
              isTerminalEvent(
                event
              )
            ) {
              /**
               * Do not immediately terminate the underlying
               * reader here. Some gateways send a `final`
               * event followed by `[DONE]`.
               *
               * We simply mark the message complete and
               * continue consuming until DONE/EOF.
               */
              setMessages(
                (previous) =>
                  previous.map(
                    (message) =>
                      message.id ===
                      assistantMessageId
                        ? {
                            ...message,
                            isStreaming:
                              false,
                          }
                        : message
                  )
              );
            }
          }
        }

        /**
         * Flush any remaining decoder data.
         */
        buffer += decoder.decode();

        if (buffer.trim()) {
          const parsed =
            parseSSEBlock(buffer);

          if (
            parsed &&
            parsed !== '[DONE]' &&
            typeof parsed !==
              'string'
          ) {
            const event =
              parsed as TradaraAgentEvent;

            receivedEvents.push(
              event
            );

            if (
              event.result
            ) {
              finalResult =
                event.result;
            }

            processAgentEvent(
              event,
              assistantMessageId,
              accumulatedTextRef
            );
          }
        }

        /**
         * Ensure the assistant message is no longer
         * marked as streaming when the connection ends.
         */
        setMessages(
          (previous) =>
            previous.map(
              (message) =>
                message.id ===
                assistantMessageId
                  ? {
                      ...message,
                      isStreaming:
                        false,
                    }
                  : message
            )
        );

        setAgentStatus(
          (previous) =>
            previous ===
              'failed'
              ? previous
              : 'completed'
        );

        return {
          success: true,
          requestId:
            receivedEvents.find(
              (event) =>
                event.requestId
            )?.requestId,
          content:
            accumulatedTextRef.value,
          events:
            receivedEvents,
          metadata:
            receivedEvents[
              receivedEvents.length -
                1
            ]?.metadata,
          result:
            finalResult,
        };
      } catch (err: any) {
        if (
          err?.name ===
          'AbortError'
        ) {
          /**
           * Aborting is a normal user action, not an error.
           */
          setAgentStatus(
            'stopped'
          );

          setMessages(
            (previous) =>
              previous.map(
                (message) =>
                  message.id ===
                  assistantMessageId
                    ? {
                        ...message,
                        isStreaming:
                          false,
                      }
                    : message
              )
          );

          return {
            success: false,
            content:
              accumulatedTextRef.value,
            events:
              receivedEvents,
            result:
              finalResult,
          };
        }

        const errorMessage =
          err?.message ||
          'Failed to communicate with the Tradara AI agent.';

        setError(
          errorMessage
        );

        setAgentStatus(
          'failed'
        );

        if (
          onError
        ) {
          onError(
            err instanceof Error
              ? err
              : new Error(
                  errorMessage
                )
          );
        }

        setMessages(
          (previous) =>
            previous.map(
              (message) =>
                message.id ===
                assistantMessageId
                  ? {
                      ...message,
                      content:
                        accumulatedTextRef.value ||
                        'Tradara AI could not complete this request.',
                      isStreaming:
                        false,
                      metadata: {
                        ...message.metadata,
                        error:
                          errorMessage,
                      },
                    }
                  : message
            )
        );

        return {
          success: false,
          content:
            accumulatedTextRef.value,
          events:
            receivedEvents,
          result:
            finalResult,
        };
      } finally {
        if (
          abortControllerRef.current ===
          controller
        ) {
          abortControllerRef.current =
            null;
        }

        if (
          mountedRef.current
        ) {
          setIsLoading(
            false
          );
        }
      }
    },
    [
      apiEndpoint,
      getAuthToken,
      isLoading,
      messages,
      onError,
      processAgentEvent,
    ]
  );

  /**
   * Stop the active Tradara AI task.
   */
  const stopStreaming =
    useCallback(() => {
      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();

        abortControllerRef.current =
          null;
      }

      setIsLoading(false);
      setAgentStatus('stopped');

      setMessages(
        (previous) =>
          previous.map(
            (message) =>
              message.isStreaming
                ? {
                    ...message,
                    isStreaming:
                      false,
                  }
                : message
          )
      );
    }, []);

  /**
   * Clear the current conversation.
   */
  const clearMessages =
    useCallback(() => {
      stopStreaming();

      setMessages([]);

      setError(null);

      setActiveAgent(null);

      setActiveIntent(null);

      setAgentStatus(null);

      setCurrentPlan(null);

      setPendingApproval(null);
    }, [stopStreaming]);

  /**
   * Replace the entire conversation.
   *
   * Useful when loading an existing Tradara conversation.
   */
  const setChatMessages =
    useCallback(
      (
        nextMessages:
          | ChatMessage[]
          | ((
              previous: ChatMessage[]
            ) => ChatMessage[])
      ) => {
        setMessages(
          nextMessages
        );
      },
      []
    );

  /**
   * Add a message without contacting the AI.
   *
   * Useful for system events, imported conversations,
   * restored messages, etc.
   */
  const addMessage =
    useCallback(
      (
        message: ChatMessage
      ) => {
        setMessages(
          (previous) => [
            ...previous,
            message,
          ]
        );
      },
      []
    );

  /**
   * Update one message by ID.
   */
  const updateMessage =
    useCallback(
      (
        messageId: string,
        updater:
          | Partial<ChatMessage>
          | ((
              message: ChatMessage
            ) => ChatMessage)
      ) => {
        setMessages(
          (previous) =>
            previous.map(
              (message) => {
                if (
                  message.id !==
                  messageId
                ) {
                  return message;
                }

                if (
                  typeof updater ===
                  'function'
                ) {
                  return updater(
                    message
                  );
                }

                return {
                  ...message,
                  ...updater,
                };
              }
            )
        );
      },
      []
    );

  return {
    /**
     * Core conversation state.
     */
    messages,

    isLoading,

    error,

    /**
     * Agent intelligence state.
     */
    activeAgent,

    activeIntent,

    agentStatus,

    currentPlan,

    pendingApproval,

    /**
     * Core actions.
     */
    sendMessage,

    stopStreaming,

    clearMessages,

    /**
     * Conversation management.
     */
    setChatMessages,

    addMessage,

    updateMessage,
  };
}