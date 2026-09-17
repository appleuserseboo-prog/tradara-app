// ==========================================
// FILE: src/components/ai/TradaraAISidebar.tsx
// ==========================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  FolderKanban,
  Compass,
  Pin,
  Search,
  Plus,
  Settings,
  Send,
  Bot,
  User,
  Check,
  Copy,
  Zap,
  ArrowLeft,
  X,
  Pencil,
  RotateCcw,
  Trash2,
  Archive,
  MoreHorizontal,
  StopCircle,
  ChevronDown,
  PanelLeft,
  Clock,
  ShieldCheck,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Code2,
  CheckCircle2
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user' | 'system';
  text: string;
  timestamp: string;
  createdAt?: string;
  requiresConfirmation?: boolean;
  pendingToolDetails?: {
    toolName: string;
    params: any;
  };
  toolExecutions?: Array<{
    toolName?: string;
    name?: string;
    status?: string;
    result?: any;
  }>;
  isError?: boolean;
  isStreaming?: boolean;
}

interface ChatThread {
  id: string;
  title: string;
  category: 'pinned' | 'recent' | 'archived';
  preview: string;
  updatedAt?: string;
  serverSessionId?: string;
}

interface HistoryItem {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface TradaraAISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: {
    productId?: string;
    itemId?: string;
    productName?: string;
    price?: string;
    category?: string;
    description?: string;
    currency?: string;
    image?: string;
  };
  isAuthenticated?: boolean;
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
    role?: 'BUYER' | 'SELLER' | 'ADMIN';
  };
}

// ==========================================
// Markdown / Text Rendering
// ==========================================

const renderInlineText = (text: string, keyPrefix: string = '') => {
  const parts = text.split(
    /(`[^`]+`|\*\*.*?\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
  );

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={key}
          className="px-1.5 py-0.5 rounded-md bg-slate-950 border border-slate-700 text-blue-300 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={key} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={key} className="italic text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

    if (linkMatch) {
      return (
        <a
          key={key}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
};

const renderFormattedMessage = (text: string) => {
  if (!text) return null;

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeLanguage = '';
  let codeLines: string[] = [];

  const flushCodeBlock = (index: number) => {
    if (!codeLines.length && !inCodeBlock) {
      return;
    }

    const code = codeLines.join('\n');

    elements.push(
      <div
        key={`code-${index}`}
        className="my-3 overflow-hidden rounded-xl border border-slate-700 bg-[#08090d]"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <Code2 className="h-3.5 w-3.5 text-blue-400" />
            <span>{codeLanguage || 'code'}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(code);
            }}
            className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Copy code"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>

        <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed text-slate-300 font-mono">
          <code>{code}</code>
        </pre>
      </div>
    );

    codeLines = [];
    codeLanguage = '';
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
      } else {
        inCodeBlock = false;
        flushCodeBlock(lineIdx);
      }

      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (!trimmed) {
      elements.push(
        <div
          key={`space-${lineIdx}`}
          className="h-1.5"
        />
      );

      return;
    }

    const isBullet =
      trimmed.startsWith('•') ||
      trimmed.startsWith('* ') ||
      trimmed.startsWith('- ') ||
      /^\d+\.\s/.test(trimmed);

    if (isBullet) {
      const numbered = /^\d+\.\s/.test(trimmed);

      const cleanedLine = numbered
        ? trimmed.replace(/^\d+\.\s*/, '')
        : trimmed.replace(/^[•*\-]\s*/, '');

      elements.push(
        <div
          key={`line-${lineIdx}`}
          className="flex items-start gap-2 my-1 pl-1"
        >
          <span className="text-blue-400 font-bold select-none min-w-[12px]">
            {numbered
              ? trimmed.match(/^\d+/)?.[0]
              : '•'}
          </span>

          <span className="flex-1">
            {renderInlineText(
              cleanedLine,
              `line-${lineIdx}`
            )}
          </span>
        </div>
      );

      return;
    }

    if (trimmed.startsWith('#')) {
      const headingText = trimmed.replace(
        /^#+\s*/,
        ''
      );

      elements.push(
        <div
          key={`heading-${lineIdx}`}
          className="font-semibold text-slate-100 mt-2 mb-1"
        >
          {renderInlineText(
            headingText,
            `heading-${lineIdx}`
          )}
        </div>
      );

      return;
    }

    elements.push(
      <div
        key={`line-${lineIdx}`}
        className="my-1"
      >
        {renderInlineText(
          line,
          `line-${lineIdx}`
        )}
      </div>
    );
  });

  if (inCodeBlock) {
    flushCodeBlock(lines.length);
  }

  return elements;
};

// ==========================================
// Main Component
// ==========================================

export const TradaraAISidebar: React.FC<
  TradaraAISidebarProps
> = ({
  isOpen,
  onClose,
  initialContext,
  isAuthenticated = false,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<
    'chat' | 'library' | 'projects' | 'explore'
  >('chat');

  const [searchQuery, setSearchQuery] = useState('');
  const [currentMessage, setCurrentMessage] =
    useState('');
  const [isGenerating, setIsGenerating] =
    useState(false);
  const [copiedId, setCopiedId] =
    useState<string | null>(null);
  const [
    editingMessageId,
    setEditingMessageId
  ] = useState<string | null>(null);
  const [editingText, setEditingText] =
    useState('');
  const [
    showThreadMenu,
    setShowThreadMenu
  ] = useState<string | null>(null);

  const [connectionState, setConnectionState] =
    useState<
      'ready' | 'connecting' | 'online' | 'error'
    >('ready');

  const [errorMessage, setErrorMessage] =
    useState('');

  const [serverSessionId, setServerSessionId] =
    useState<string | undefined>();

  const [
    generationController,
    setGenerationController
  ] = useState<AbortController | null>(null);

  const backendUrl = (
    import.meta.env.VITE_API_URL ||
    'https://tradara-backend.onrender.com'
  ).replace(/\/+$/, '');

  const [buyerSession] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return `session_${Date.now()}`;
    }

    let storedSession = localStorage.getItem(
      'tradara_buyer_session'
    );

    if (!storedSession) {
      storedSession =
        'session_' +
        Math.random()
          .toString(36)
          .substring(2, 15) +
        Date.now().toString(36);

      localStorage.setItem(
        'tradara_buyer_session',
        storedSession
      );
    }

    return storedSession;
  });

  const initialThreadTitle =
    initialContext?.productName
      ? `Inquiring about ${initialContext.productName}`
      : 'General AI Assistant';

  const [threads, setThreads] =
    useState<ChatThread[]>([
      {
        id: 'conv-default-1',
        title: initialThreadTitle,
        category: 'recent',
        preview: initialContext?.productName
          ? `Ready to explore ${initialContext.productName}.`
          : 'Ask anything or give Tradara AI an instruction.',
        updatedAt: 'Just now'
      }
    ]);

  const [activeThreadId, setActiveThreadId] =
    useState<string>('conv-default-1');

  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: 'm1',
        sender: 'ai',
        text: initialContext?.productName
          ? `Hello! I'm Tradara AI. I can help you understand, compare, and negotiate "${initialContext.productName}"${
              initialContext.price
                ? `, currently listed at ${
                    initialContext.currency || '₦'
                  }${initialContext.price}`
                : ''
            }. You can also ask me general questions, technical questions, math, coding, research-style questions, or anything else you need help with.`
          : `Hello! I'm Tradara AI. Ask me anything — general questions, coding, mathematics, business, product research, marketplace questions, or instructions you want me to work through.`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    ]);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const inputRef =
    useRef<HTMLInputElement>(null);

  // ==========================================
  // Local Persistence
  // ==========================================

  const storageKey =
    `tradara_ai_workspace_${
      currentUser?.id || buyerSession
    }`;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const saved =
        localStorage.getItem(storageKey);

      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);

      if (
        Array.isArray(parsed.threads) &&
        parsed.threads.length > 0
      ) {
        setThreads(parsed.threads);
      }

      if (parsed.activeThreadId) {
        setActiveThreadId(
          parsed.activeThreadId
        );
      }

      if (
        parsed.messagesByThread &&
        typeof parsed.messagesByThread ===
          'object'
      ) {
        const activeMessages =
          parsed.messagesByThread[
            parsed.activeThreadId
          ];

        if (
          Array.isArray(activeMessages) &&
          activeMessages.length > 0
        ) {
          setMessages(activeMessages);
        }
      }
    } catch (error) {
      console.warn(
        '[Tradara AI] Failed to restore local workspace:',
        error
      );
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const existingRaw =
        localStorage.getItem(storageKey);

      const existing = existingRaw
        ? JSON.parse(existingRaw)
        : {};

      const messagesByThread = {
        ...(existing.messagesByThread || {}),
        [activeThreadId]: messages
      };

      localStorage.setItem(
        storageKey,
        JSON.stringify({
          threads,
          activeThreadId,
          messagesByThread
        })
      );
    } catch (error) {
      console.warn(
        '[Tradara AI] Failed to persist workspace:',
        error
      );
    }
  }, [
    threads,
    messages,
    activeThreadId,
    storageKey
  ]);

  // ==========================================
  // Scroll / Keyboard
  // ==========================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, activeThreadId]);

  useEffect(() => {
    const handleKeyboard = (
      event: KeyboardEvent
    ) => {
      if (!isOpen) {
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (
        event.key === 'Escape' &&
        isGenerating
      ) {
        event.preventDefault();
        generationController?.abort();
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyboard
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyboard
      );
    };
  }, [
    isOpen,
    isGenerating,
    generationController
  ]);

  // ==========================================
  // User Identity
  // ==========================================

  const getUserInitials = () => {
    if (
      !isAuthenticated ||
      !currentUser
    ) {
      return '';
    }

    if (currentUser.name) {
      const parts =
        currentUser.name
          .trim()
          .split(/\s+/);

      if (parts.length >= 2) {
        return (
          parts[0][0] +
          parts[1][0]
        ).toUpperCase();
      }

      return currentUser.name
        .slice(0, 2)
        .toUpperCase();
    }

    if (currentUser.email) {
      return currentUser.email
        .slice(0, 2)
        .toUpperCase();
    }

    return 'U';
  };

  const userInitials =
    getUserInitials();

  // ==========================================
  // Backend Helpers
  // ==========================================

  const buildHistory = (): HistoryItem[] => {
    return messages
      .filter(
        (message) =>
          message.sender === 'user' ||
          message.sender === 'ai'
      )
      .slice(-20)
      .map((message) => ({
        role:
          message.sender === 'user'
            ? 'user'
            : 'model',
        parts: [
          {
            text: message.text
          }
        ]
      }));
  };

  const resolveProductId = () => {
    return (
      initialContext?.productId ||
      initialContext?.itemId ||
      undefined
    );
  };

  const isProductContextActive =
    Boolean(resolveProductId());

  const buildProductPayload = () => {
    const productId =
      resolveProductId();

    if (!productId) {
      return undefined;
    }

    const numericPrice =
      initialContext?.price !== undefined
        ? Number(
            String(
              initialContext.price
            ).replace(/,/g, '')
          )
        : undefined;

    return {
      id: productId,
      name:
        initialContext?.productName ||
        undefined,
      listPrice:
        numericPrice !== undefined &&
        !Number.isNaN(numericPrice)
          ? numericPrice
          : undefined,
      currency:
        initialContext?.currency ||
        '₦',
      category:
        initialContext?.category,
      description:
        initialContext?.description
    };
  };

  const parseSseResponse = async (
    response: Response,
    assistantMessageId: string
  ) => {
    const contentType =
      response.headers.get(
        'content-type'
      ) || '';

    if (
      !contentType.includes(
        'text/event-stream'
      )
    ) {
      const json =
        await response.json();

      if (
        !response.ok ||
        json.success === false
      ) {
        throw new Error(
          json.error ||
            json.message ||
            `Server responded with HTTP ${response.status}`
        );
      }

      const data =
        json.data || json;

      const reply =
        data.reply ||
        data.response ||
        data.message ||
        data.content ||
        '';

      setMessages((prev) =>
        prev.map((message) =>
          message.id ===
          assistantMessageId
            ? {
                ...message,
                text:
                  reply ||
                  'The AI returned an empty response.',
                isStreaming: false,
                isError: false
              }
            : message
        )
      );

      if (data.sessionId) {
        setServerSessionId(
          data.sessionId
        );

        setThreads((prev) =>
          prev.map((thread) =>
            thread.id ===
            activeThreadId
              ? {
                  ...thread,
                  serverSessionId:
                    data.sessionId
                }
              : thread
          )
        );
      }

      return data;
    }

    const reader =
      response.body?.getReader();

    if (!reader) {
      throw new Error(
        'The AI streaming connection could not be opened.'
      );
    }

    const decoder =
      new TextDecoder();

    let buffer = '';
    let accumulatedText = '';
    let finalData: any = null;

    while (true) {
      const {
        done,
        value
      } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(
        value,
        { stream: true }
      );

      const events =
        buffer.split('\n\n');

      buffer =
        events.pop() || '';

      for (const event of events) {
        const lines =
          event.split('\n');

        for (const line of lines) {
          if (
            !line.startsWith('data:')
          ) {
            continue;
          }

          const raw =
            line.slice(5).trim();

          if (!raw) {
            continue;
          }

          let parsed: any;

          try {
            parsed = JSON.parse(
              raw
            );
          } catch {
            continue;
          }

          if (parsed.error) {
            throw new Error(
              parsed.error
            );
          }

          if (parsed.chunk) {
            const chunkText =
              typeof parsed.chunk ===
              'string'
                ? parsed.chunk
                : parsed.chunk
                    ?.content || '';

            if (chunkText) {
              accumulatedText +=
                chunkText;

              setMessages((prev) =>
                prev.map(
                  (message) =>
                    message.id ===
                    assistantMessageId
                      ? {
                          ...message,
                          text:
                            accumulatedText,
                          isStreaming:
                            true,
                          isError:
                            false
                        }
                      : message
                )
              );
            }
          }

          if (
            parsed.type === 'text' &&
            parsed.content
          ) {
            accumulatedText +=
              parsed.content;

            setMessages((prev) =>
              prev.map(
                (message) =>
                  message.id ===
                  assistantMessageId
                    ? {
                        ...message,
                        text:
                          accumulatedText,
                        isStreaming:
                          true,
                        isError:
                          false
                      }
                    : message
              )
            );
          }

          if (parsed.done) {
            finalData =
              parsed.data ||
              parsed;

            if (
              finalData?.response &&
              !accumulatedText
            ) {
              accumulatedText =
                finalData.response;
            }

            if (
              finalData?.sessionId
            ) {
              setServerSessionId(
                finalData.sessionId
              );

              setThreads((prev) =>
                prev.map(
                  (thread) =>
                    thread.id ===
                    activeThreadId
                      ? {
                          ...thread,
                          serverSessionId:
                            finalData.sessionId
                        }
                      : thread
                )
              );
            }
          }
        }
      }
    }

    const finalText =
      accumulatedText ||
      finalData?.response ||
      finalData?.message ||
      'The AI returned an empty response.';

    setMessages((prev) =>
      prev.map((message) =>
        message.id ===
        assistantMessageId
          ? {
              ...message,
              text: finalText,
              isStreaming: false,
              isError: false,
              toolExecutions:
                finalData?.toolExecutions ||
                finalData?.toolExecution ||
                undefined
            }
          : message
      )
    );

    return finalData;
  };

  // ==========================================
  // Main AI Request
  // ==========================================

  const handleSendMessage = async (
    confirmation: boolean = false,
    pendingTool?: any,
    overrideText?: string
  ) => {
    const userText = (
      overrideText ??
      currentMessage
    ).trim();

    if (
      !userText &&
      !pendingTool
    ) {
      return;
    }

    const controller =
      new AbortController();

    setGenerationController(
      controller
    );

    setIsGenerating(true);
    setConnectionState(
      'connecting'
    );
    setErrorMessage('');

    const userMessageText =
      userText ||
      'Confirm Action';

    if (
      userText &&
      !pendingTool
    ) {
      const now =
        new Date();

      const userMsg: Message = {
        id: `msg_${Date.now()}`,
        sender: 'user',
        text: userText,
        timestamp:
          now.toLocaleTimeString(
            [],
            {
              hour: '2-digit',
              minute: '2-digit'
            }
          ),
        createdAt:
          now.toISOString()
      };

      setMessages((prev) => [
        ...prev,
        userMsg
      ]);

      setCurrentMessage('');

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id ===
          activeThreadId
            ? {
                ...thread,
                title:
                  thread.title ===
                    'New Conversation' ||
                  thread.title ===
                    'General AI Assistant' ||
                  thread.title ===
                    'General Marketplace Assistance'
                    ? userText.length >
                      30
                      ? `${userText.slice(
                          0,
                          30
                        )}...`
                      : userText
                    : thread.title,
                preview: userText,
                updatedAt:
                  'Just now'
              }
            : thread
        )
      );
    }

    const assistantMessageId =
      `ai_${Date.now()}`;

    const assistantNow =
      new Date();

    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        sender: 'ai',
        text: '',
        timestamp:
          assistantNow.toLocaleTimeString(
            [],
            {
              hour: '2-digit',
              minute: '2-digit'
            }
          ),
        createdAt:
          assistantNow.toISOString(),
        isStreaming: true
      }
    ]);

    try {
      const product =
        buildProductPayload();

      const endpoint =
        `${backendUrl}/api/ai/chat`;

      const history =
        buildHistory();

      const payload = {
        message:
          userMessageText,
        history,
        conversationHistory:
          history,
        product,
        itemId:
          resolveProductId(),
        buyerSession,
        buyerId:
          currentUser?.id,
        sessionId:
          serverSessionId,
        threadId:
          activeThreadId,
        userConfirmationConfirmed:
          confirmation,
        pendingTool
      };

      const response =
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
            Accept:
              'text/event-stream, application/json'
          },
          body: JSON.stringify(
            payload
          ),
          signal:
            controller.signal
        });

      if (
        !response.ok &&
        response.status === 400
      ) {
        let serverError =
          'The AI request was rejected by the backend.';

        try {
          const errorBody =
            await response.json();

          serverError =
            errorBody.error ||
            errorBody.message ||
            serverError;
        } catch {
          // Keep generic error.
        }

        throw new Error(
          serverError
        );
      }

      if (!response.ok) {
        let serverError =
          `Tradara AI returned HTTP ${response.status}.`;

        try {
          const errorBody =
            await response.json();

          serverError =
            errorBody.error ||
            errorBody.message ||
            serverError;
        } catch {
          // Keep HTTP error.
        }

        throw new Error(
          serverError
        );
      }

      const result =
        await parseSseResponse(
          response,
          assistantMessageId
        );

      setConnectionState(
        'online'
      );

      if (
        result?.requiresConfirmation
      ) {
        setMessages((prev) =>
          prev.map(
            (message) =>
              message.id ===
              assistantMessageId
                ? {
                    ...message,
                    requiresConfirmation:
                      true,
                    pendingToolDetails:
                      result.pendingToolDetails ||
                      result.data
                        ?.pendingToolDetails
                  }
                : message
          )
        );
      }
    } catch (error: any) {
      if (
        error?.name ===
        'AbortError'
      ) {
        setMessages((prev) =>
          prev.map(
            (message) =>
              message.id ===
              assistantMessageId
                ? {
                    ...message,
                    text:
                      message.text ||
                      'Generation stopped by the user.',
                    isStreaming:
                      false
                  }
                : message
          )
        );

        setConnectionState(
          'ready'
        );

        return;
      }

      console.error(
        '[Tradara AI] Backend communication error:',
        error
      );

      const message =
        error?.message ||
        'Tradara AI could not connect to the intelligence backend.';

      setConnectionState(
        'error'
      );

      setErrorMessage(
        message
      );

      setMessages((prev) =>
        prev.map(
          (existingMessage) =>
            existingMessage.id ===
            assistantMessageId
              ? {
                  ...existingMessage,
                  text: `I couldn't complete that request because the Tradara AI service returned an error.\n\n**Connection error:** ${message}\n\nPlease try again.`,
                  isStreaming:
                    false,
                  isError: true
                }
              : existingMessage
        )
      );
    } finally {
      setIsGenerating(
        false
      );

      setGenerationController(
        null
      );
    }
  };

  // ==========================================
  // Confirmation
  // ==========================================

  const handleConfirmAction = (
    message: Message,
    approved: boolean
  ) => {
    setMessages((prev) =>
      prev.map((item) =>
        item.id === message.id
          ? {
              ...item,
              requiresConfirmation:
                false
            }
          : item
      )
    );

    if (approved) {
      void handleSendMessage(
        true,
        message.pendingToolDetails,
        'Confirm Action'
      );

      return;
    }

    const now =
      new Date();

    setMessages((prev) => [
      ...prev,
      {
        id: `sys_${Date.now()}`,
        sender: 'system',
        text: 'Action cancelled by user.',
        timestamp:
          now.toLocaleTimeString(
            [],
            {
              hour: '2-digit',
              minute: '2-digit'
            }
          )
      }
    ]);
  };

  // ==========================================
  // New Chat
  // ==========================================

  const handleNewChat = () => {
    if (isGenerating) {
      generationController?.abort();
    }

    const newId =
      `conv-${Date.now()}`;

    const newThread: ChatThread = {
      id: newId,
      title:
        'New Conversation',
      category: 'recent',
      preview:
        'Ready for your next question...',
      updatedAt:
        'Just now'
    };

    setThreads((prev) => [
      newThread,
      ...prev
    ]);

    setActiveThreadId(
      newId
    );

    setServerSessionId(
      undefined
    );

    setErrorMessage('');
    setConnectionState(
      'ready'
    );

    const now =
      new Date();

    setMessages([
      {
        id: `m-${Date.now()}`,
        sender: 'ai',
        text: `New conversation started. I'm ready — ask me anything or give me an instruction.`,
        timestamp:
          now.toLocaleTimeString(
            [],
            {
              hour: '2-digit',
              minute: '2-digit'
            }
          )
      }
    ]);
  };

  // ==========================================
  // Thread Selection
  // ==========================================

  const handleSelectThread = (
    threadId: string
  ) => {
    if (
      threadId ===
      activeThreadId
    ) {
      return;
    }

    const currentStorageKey =
      storageKey;

    try {
      const savedRaw =
        localStorage.getItem(
          currentStorageKey
        );

      const saved = savedRaw
        ? JSON.parse(savedRaw)
        : {};

      const savedMessages =
        saved.messagesByThread?.[
          threadId
        ];

      if (
        Array.isArray(
          savedMessages
        ) &&
        savedMessages.length > 0
      ) {
        setMessages(
          savedMessages
        );
      } else {
        const now =
          new Date();

        setMessages([
          {
            id: `m-${Date.now()}`,
            sender: 'ai',
            text: 'This conversation is ready. Continue where you left off.',
            timestamp:
              now.toLocaleTimeString(
                [],
                {
                  hour: '2-digit',
                  minute: '2-digit'
                }
              )
          }
        ]);
      }

      const selectedThread =
        threads.find(
          (thread) =>
            thread.id ===
            threadId
        );

      setServerSessionId(
        selectedThread?.serverSessionId
      );
    } catch {
      setMessages([]);
    }

    setActiveThreadId(
      threadId
    );

    setShowThreadMenu(
      null
    );
  };

  // ==========================================
  // Pin / Archive / Delete
  // ==========================================

  const handleTogglePin = (
    event: React.MouseEvent,
    threadId: string
  ) => {
    event.stopPropagation();

    setThreads((prev) =>
      prev.map((thread) => {
        if (
          thread.id !==
          threadId
        ) {
          return thread;
        }

        return {
          ...thread,
          category:
            thread.category ===
            'pinned'
              ? 'recent'
              : 'pinned'
        };
      })
    );
  };

  const handleArchiveThread = (
    event: React.MouseEvent,
    threadId: string
  ) => {
    event.stopPropagation();

    setThreads((prev) =>
      prev.map((thread) =>
        thread.id ===
        threadId
          ? {
              ...thread,
              category:
                'archived'
            }
          : thread
      )
    );

    setShowThreadMenu(
      null
    );
  };

  const handleDeleteThread = (
    event: React.MouseEvent,
    threadId: string
  ) => {
    event.stopPropagation();

    const remaining =
      threads.filter(
        (thread) =>
          thread.id !==
          threadId
      );

    if (
      remaining.length === 0
    ) {
      handleNewChat();
      setShowThreadMenu(
        null
      );
      return;
    }

    setThreads(
      remaining
    );

    setShowThreadMenu(
      null
    );

    if (
      threadId ===
      activeThreadId
    ) {
      const nextThread =
        remaining[0];

      setActiveThreadId(
        nextThread.id
      );

      setServerSessionId(
        nextThread.serverSessionId
      );

      try {
        const savedRaw =
          localStorage.getItem(
            storageKey
          );

        const saved = savedRaw
          ? JSON.parse(
              savedRaw
            )
          : {};

        const savedMessages =
          saved.messagesByThread?.[
            nextThread.id
          ];

        if (
          Array.isArray(
            savedMessages
          ) &&
          savedMessages.length
        ) {
          setMessages(
            savedMessages
          );
        } else {
          const now =
            new Date();

          setMessages([
            {
              id: `m-${Date.now()}`,
              sender: 'ai',
              text: 'Conversation selected. How can I help?',
              timestamp:
                now.toLocaleTimeString(
                  [],
                  {
                    hour: '2-digit',
                    minute:
                      '2-digit'
                  }
                )
            }
          ]);
        }
      } catch {
        setMessages([]);
      }
    }
  };

  // ==========================================
  // Copy
  // ==========================================

  const handleCopyText = async (
    text: string,
    id: string
  ) => {
    try {
      await navigator.clipboard.writeText(
        text
      );

      setCopiedId(id);

      window.setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      console.warn(
        '[Tradara AI] Clipboard failed:',
        error
      );
    }
  };

  // ==========================================
  // Edit Message
  // ==========================================

  const handleStartEdit = (
    message: Message
  ) => {
    if (
      message.sender !==
      'user'
    ) {
      return;
    }

    setEditingMessageId(
      message.id
    );

    setEditingText(
      message.text
    );
  };

  const handleCancelEdit =
    () => {
      setEditingMessageId(
        null
      );

      setEditingText('');
    };

  const handleSubmitEdit =
    () => {
      const text =
        editingText.trim();

      if (
        !text ||
        !editingMessageId
      ) {
        return;
      }

      const editedIndex =
        messages.findIndex(
          (message) =>
            message.id ===
            editingMessageId
        );

      if (
        editedIndex === -1
      ) {
        handleCancelEdit();
        return;
      }

      const now =
        new Date();

      const newUserMessage: Message =
        {
          id: `msg_${Date.now()}`,
          sender: 'user',
          text,
          timestamp:
            now.toLocaleTimeString(
              [],
              {
                hour: '2-digit',
                minute: '2-digit'
              }
            ),
          createdAt:
            now.toISOString()
        };

      setMessages((prev) => [
        ...prev.slice(
          0,
          editedIndex
        ),
        newUserMessage
      ]);

      setEditingMessageId(
        null
      );

      setEditingText('');

      window.setTimeout(() => {
        void handleSendMessage(
          false,
          undefined,
          text
        );
      }, 50);
    };

  // ==========================================
  // Regenerate
  // ==========================================

  const handleRegenerate = (
    message: Message
  ) => {
    const messageIndex =
      messages.findIndex(
        (item) =>
          item.id ===
          message.id
      );

    if (
      messageIndex <= 0
    ) {
      return;
    }

    const previousUserMessage =
      [...messages]
        .slice(
          0,
          messageIndex
        )
        .reverse()
        .find(
          (item) =>
            item.sender ===
            'user'
        );

    if (
      !previousUserMessage
    ) {
      return;
    }

    setMessages((prev) =>
      prev.filter(
        (item) =>
          item.id !==
          message.id
      )
    );

    void handleSendMessage(
      false,
      undefined,
      previousUserMessage.text
    );
  };

  // ==========================================
  // Clear Conversation
  // ==========================================

  const handleClearConversation =
    () => {
      if (isGenerating) {
        generationController?.abort();
      }

      const now =
        new Date();

      setMessages([
        {
          id: `m-${Date.now()}`,
          sender: 'ai',
          text: "Conversation cleared. I'm ready for a fresh start.",
          timestamp:
            now.toLocaleTimeString(
              [],
              {
                hour: '2-digit',
                minute: '2-digit'
              }
            )
        }
      ]);

      setServerSessionId(
        undefined
      );

      setErrorMessage('');

      setConnectionState(
        'ready'
      );

      setShowThreadMenu(
        null
      );
    };

  // ==========================================
  // Quick Prompts
  // ==========================================

  const quickPrompts =
    useMemo(() => {
      if (
        isProductContextActive
      ) {
        return [
          'What should I know about this product?',
          'Can I negotiate the price?',
          'What is the best deal available?',
          'Tell me about the product condition'
        ];
      }

      return [
        'Explain machine learning simply',
        'Help me write some code',
        'Solve a difficult problem',
        'Help me research an idea'
      ];
    }, [
      isProductContextActive
    ]);

  const filteredThreads =
    threads.filter(
      (thread) => {
        const query =
          searchQuery
            .toLowerCase()
            .trim();

        if (!query) {
          return true;
        }

        return (
          thread.title
            .toLowerCase()
            .includes(query) ||
          thread.preview
            .toLowerCase()
            .includes(query)
        );
      }
    );

  const pinnedThreads =
    filteredThreads.filter(
      (thread) =>
        thread.category ===
        'pinned'
    );

  const recentThreads =
    filteredThreads.filter(
      (thread) =>
        thread.category ===
        'recent'
    );

  const archivedThreads =
    filteredThreads.filter(
      (thread) =>
        thread.category ===
        'archived'
    );

  const activeThread =
    threads.find(
      (thread) =>
        thread.id ===
        activeThreadId
    );

  // ==========================================
  // Connection Label
  // ==========================================

  const connectionLabel =
    connectionState ===
    'connecting'
      ? 'Connecting to AI'
      : connectionState ===
        'online'
      ? 'AI online'
      : connectionState ===
        'error'
      ? 'Connection issue'
      : 'AI ready';

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed top-16 md:top-20 bottom-0 right-0 z-50 w-full md:w-[520px] bg-[#0c0c10] border-l border-slate-800 shadow-2xl flex text-slate-100 font-sans animate-in slide-in-from-right duration-300">
      {/* ==========================================
          Left Mini Icon Nav
          ========================================== */}

      <div className="w-16 bg-[#070709] border-r border-slate-800/80 flex flex-col items-center py-4 justify-between select-none">
        <div className="space-y-4 flex flex-col items-center">
          <div
            className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 cursor-pointer"
            title="Tradara AI"
          >
            <Sparkles className="h-5 w-5 text-white" />
          </div>

          <div className="w-8 h-[1px] bg-slate-800" />

          <button
            onClick={() =>
              setActiveTab('chat')
            }
            title="Chat Workspace"
            className={`p-2.5 rounded-xl transition-all ${
              activeTab === 'chat'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="h-5 w-5" />
          </button>

          <button
            onClick={() =>
              setActiveTab(
                'library'
              )
            }
            title="Library & Media"
            className={`p-2.5 rounded-xl transition-all ${
              activeTab === 'library'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          <button
            onClick={() =>
              setActiveTab(
                'projects'
              )
            }
            title="Projects"
            className={`p-2.5 rounded-xl transition-all ${
              activeTab ===
              'projects'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FolderKanban className="h-5 w-5" />
          </button>

          <button
            onClick={() =>
              setActiveTab(
                'explore'
              )
            }
            title="Explore Intelligence"
            className={`p-2.5 rounded-xl transition-all ${
              activeTab ===
              'explore'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Compass className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 flex flex-col items-center">
          <button
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>

          {isAuthenticated &&
          userInitials ? (
            <div
              className="h-9 w-9 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-400 shadow-sm"
              title={
                currentUser?.name ||
                currentUser?.email ||
                'Logged in user'
              }
            >
              {userInitials}
            </div>
          ) : (
            <div
              className="h-9 w-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-sm"
              title="Guest"
            >
              <User className="h-4 w-4 opacity-60" />
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          Main Drawer Content
          ========================================== */}

      <div className="flex-1 flex flex-col h-full bg-[#0f0f13] overflow-hidden">
        {/* ==========================================
            Header
            ========================================== */}

        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-[#0f0f13]/90 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              title="Return to Marketplace"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center justify-center shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  connectionState ===
                  'error'
                    ? 'bg-rose-500'
                    : connectionState ===
                      'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-blue-500 animate-pulse'
                }`}
              />

              <div className="min-w-0">
                <h2 className="text-xs font-bold tracking-wider text-slate-100 flex items-center gap-1.5">
                  <span>
                    TRADARA AI
                  </span>

                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-400 font-mono border border-blue-500/30">
                    AGENTIC
                  </span>
                </h2>

                <p className="text-[10px] text-slate-400 truncate">
                  {connectionLabel}
                  {activeThread?.title
                    ? ` • ${activeThread.title}`
                    : ''}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Return to Marketplace"
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 transition-all flex items-center gap-1.5 shadow-sm text-xs font-semibold"
          >
            <span className="hidden sm:inline">
              Return
            </span>

            <X className="h-4 w-4 text-rose-400 font-bold" />
          </button>
        </div>

        {/* ==========================================
            Chat
            ========================================== */}

        {activeTab ===
        'chat' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search & New Chat */}

            <div className="p-3 border-b border-slate-800/60 bg-slate-900/40 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />

                  <input
                    type="text"
                    value={
                      searchQuery
                    }
                    onChange={(
                      event
                    ) =>
                      setSearchQuery(
                        event.target
                          .value
                      )
                    }
                    placeholder="Search conversations..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <button
                  onClick={
                    handleNewChat
                  }
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>
                    New Chat
                  </span>
                </button>
              </div>

              {/* Thread bar */}

              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1.5 py-1 flex items-center gap-1 flex-shrink-0">
                  <Pin className="h-3 w-3 text-blue-400" />
                  Chats:
                </div>

                {pinnedThreads.map(
                  (thread) => (
                    <div
                      key={
                        thread.id
                      }
                      className="relative flex-shrink-0"
                    >
                      <button
                        onClick={() =>
                          handleSelectThread(
                            thread.id
                          )
                        }
                        className={`px-2.5 py-1 pr-7 rounded-lg text-[11px] border transition-all truncate max-w-[160px] ${
                          activeThreadId ===
                          thread.id
                            ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-medium'
                            : 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {
                          thread.title
                        }
                      </button>

                      <button
                        onClick={(
                          event
                        ) =>
                          handleTogglePin(
                            event,
                            thread.id
                          )
                        }
                        className="absolute right-1.5 top-1.5 text-blue-400 hover:text-white"
                        title="Unpin"
                      >
                        <Pin className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )
                )}

                {recentThreads
                  .slice(0, 5)
                  .map(
                    (thread) => (
                      <div
                        key={
                          thread.id
                        }
                        className="relative flex-shrink-0"
                      >
                        <button
                          onClick={() =>
                            handleSelectThread(
                              thread.id
                            )
                          }
                          className={`px-2.5 py-1 pr-7 rounded-lg text-[11px] border transition-all truncate max-w-[160px] ${
                            activeThreadId ===
                            thread.id
                              ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-medium'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {
                            thread.title
                          }
                        </button>

                        <button
                          onClick={(
                            event
                          ) =>
                            handleTogglePin(
                              event,
                              thread.id
                            )
                          }
                          className="absolute right-1.5 top-1.5 opacity-40 hover:opacity-100 text-slate-400 hover:text-blue-400"
                          title="Pin"
                        >
                          <Pin className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )
                  )}
              </div>
            </div>

            {/* ==========================================
                Messages
                ========================================== */}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(
                (message) => (
                  <div
                    key={
                      message.id
                    }
                    className={`flex gap-3 group ${
                      message.sender ===
                      'user'
                        ? 'justify-end'
                        : message.sender ===
                          'system'
                        ? 'justify-center'
                        : 'justify-start'
                    }`}
                  >
                    {message.sender ===
                      'ai' && (
                      <div className="h-7 w-7 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0 text-blue-400">
                        {message.isError ? (
                          <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                        ) : (
                          <Bot className="h-3.5 w-3.5" />
                        )}
                      </div>
                    )}

                    <div
                      className={`relative group/msg max-w-[88%] ${
                        message.sender ===
                        'user'
                          ? 'max-w-[82%]'
                          : ''
                      }`}
                    >
                      {editingMessageId ===
                      message.id ? (
                        <div className="rounded-2xl border border-blue-500/40 bg-slate-900 p-3 shadow-lg">
                          <textarea
                            value={
                              editingText
                            }
                            onChange={(
                              event
                            ) =>
                              setEditingText(
                                event.target
                                  .value
                              )
                            }
                            autoFocus
                            rows={4}
                            className="w-full resize-none bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
                          />

                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={
                                handleCancelEdit
                              }
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                            >
                              Cancel
                            </button>

                            <button
                              onClick={
                                handleSubmitEdit
                              }
                              disabled={
                                !editingText.trim()
                              }
                              className="px-3 py-1.5 rounded-lg bg-blue-600 disabled:opacity-40 text-white text-[11px] font-semibold"
                            >
                              Send edited message
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                            message.sender ===
                            'user'
                              ? 'bg-blue-600 text-white font-medium rounded-tr-sm shadow-lg shadow-blue-600/20'
                              : message.sender ===
                                'system'
                              ? 'bg-slate-800 text-slate-300 italic text-center rounded-xl'
                              : message.isError
                              ? 'bg-rose-950/30 border border-rose-800/50 text-slate-200 rounded-tl-sm'
                              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm shadow-md'
                          }`}
                        >
                          {message.sender ===
                          'ai' ? (
                            <div className="space-y-1">
                              {message.text ? (
                                renderFormattedMessage(
                                  message.text
                                )
                              ) : (
                                <div className="flex items-center gap-2 text-slate-400">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />

                                  <span>
                                    Thinking...
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">
                              {
                                message.text
                              }
                            </p>
                          )}

                          {/* Confirmation */}

                          {message.requiresConfirmation && (
                            <div className="mt-3 pt-2.5 border-t border-slate-800">
                              <div className="flex items-center gap-2 mb-2 text-[10px] text-amber-300">
                                <ShieldCheck className="h-3.5 w-3.5" />

                                <span>
                                  Your confirmation is required before this action is executed.
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleConfirmAction(
                                      message,
                                      true
                                    )
                                  }
                                  className="flex-1 bg-blue-600 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg hover:bg-blue-500 transition shadow-md"
                                >
                                  Confirm & Execute
                                </button>

                                <button
                                  onClick={() =>
                                    handleConfirmAction(
                                      message,
                                      false
                                    )
                                  }
                                  className="flex-1 bg-slate-800 text-slate-300 text-[11px] font-semibold py-1.5 px-3 rounded-lg hover:bg-slate-700 transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Timestamp + Actions */}

                          {message.sender !==
                            'system' && (
                            <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-white/5 text-[9px]">
                              <span
                                className={
                                  message.sender ===
                                  'user'
                                    ? 'text-blue-100/70'
                                    : 'text-slate-500'
                                }
                              >
                                {
                                  message.timestamp
                                }
                              </span>

                              <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 ml-2">
                                <button
                                  onClick={() =>
                                    handleCopyText(
                                      message.text,
                                      message.id
                                    )
                                  }
                                  title="Copy text"
                                  className="p-1 rounded hover:bg-white/10 text-slate-300 transition-colors"
                                >
                                  {copiedId ===
                                  message.id ? (
                                    <Check className="h-3 w-3 text-blue-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>

                                {message.sender ===
                                  'user' && (
                                  <button
                                    onClick={() =>
                                      handleStartEdit(
                                        message
                                      )
                                    }
                                    title="Edit message"
                                    className="p-1 rounded hover:bg-white/10 text-slate-300"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                )}

                                {message.sender ===
                                  'ai' &&
                                  !message.isStreaming &&
                                  !message.isError && (
                                    <button
                                      onClick={() =>
                                        handleRegenerate(
                                          message
                                        )
                                      }
                                      title="Regenerate response"
                                      className="p-1 rounded hover:bg-white/10 text-slate-300"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </button>
                                  )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {message.sender ===
                      'user' && (
                      <div className="h-7 w-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Quick prompts */}

              {messages.length <=
                1 &&
                !isGenerating && (
                  <div className="pt-2">
                    <div className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">
                      Try asking
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {quickPrompts.map(
                        (prompt) => (
                          <button
                            key={
                              prompt
                            }
                            onClick={() =>
                              void handleSendMessage(
                                false,
                                undefined,
                                prompt
                              )
                            }
                            className="text-left px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/30 hover:bg-blue-500/5 text-[11px] text-slate-300 transition-all"
                          >
                            {
                              prompt
                            }
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

              <div
                ref={
                  messagesEndRef
                }
              />
            </div>

            {/* ==========================================
                Error Banner
                ========================================== */}

            {connectionState ===
              'error' &&
              errorMessage && (
                <div className="mx-3 mb-2 rounded-xl border border-rose-800/50 bg-rose-950/20 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />

                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-rose-300">
                        AI connection problem
                      </p>

                      <p className="text-[10px] text-slate-400 mt-0.5 break-words">
                        {
                          errorMessage
                        }
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setConnectionState(
                          'ready'
                        );

                        setErrorMessage(
                          ''
                        );
                      }}
                      className="text-slate-500 hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

            {/* ==========================================
                Input
                ========================================== */}

            <div className="p-3 border-t border-slate-800 bg-[#0f0f13]">
              <form
                onSubmit={(
                  event
                ) => {
                  event.preventDefault();

                  if (
                    isGenerating
                  ) {
                    generationController?.abort();
                    return;
                  }

                  void handleSendMessage();
                }}
                className="relative flex items-center"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={
                    currentMessage
                  }
                  onChange={(
                    event
                  ) =>
                    setCurrentMessage(
                      event.target
                        .value
                    )
                  }
                  placeholder={
                    isProductContextActive
                      ? 'Ask about the product, price, specs, or anything else...'
                      : 'Ask anything or give Tradara AI an instruction...'
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-4 pr-12 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 shadow-inner"
                />

                <button
                  type="submit"
                  disabled={
                    !currentMessage.trim() &&
                    !isGenerating
                  }
                  className={`absolute right-2 p-2 rounded-xl text-white transition-all shadow-md ${
                    isGenerating
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                  } disabled:opacity-40`}
                  title={
                    isGenerating
                      ? 'Stop generation'
                      : 'Send message'
                  }
                >
                  {isGenerating ? (
                    <StopCircle className="h-3.5 w-3.5" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Ctrl/⌘ + K to focus
                </span>

                <span className="flex items-center gap-1">
                  {connectionState ===
                  'online' ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-blue-400" />
                      AI connected
                    </>
                  ) : connectionState ===
                    'error' ? (
                    <>
                      <AlertCircle className="h-3 w-3 text-rose-400" />
                      Backend unavailable
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 text-blue-400" />

                      {isGenerating
                        ? 'Processing'
                        : 'Ready'}
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        ) : activeTab ===
          'library' ? (
          // ==========================================
          // Library
          // ==========================================
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-400" />

              <span>
                Library & Media Gallery
              </span>
            </h3>

            <p className="text-xs text-slate-400">
              Saved visual assets,
              marketplace product
              snapshots, conversation
              resources, and generated
              design files.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col justify-between opacity-80">
                <span className="text-[10px] font-mono text-blue-400">
                  MARKETPLACE_UI.png
                </span>

                <span className="text-[11px] text-slate-300 font-medium">
                  Dashboard Mockup
                </span>
              </div>

              <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col justify-between opacity-80">
                <span className="text-[10px] font-mono text-blue-400">
                  HERO_BANNER.png
                </span>

                <span className="text-[11px] text-slate-300 font-medium">
                  Global Asset
                </span>
              </div>

              <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-500">
                  AI_CONTEXT
                </span>

                <span className="text-[11px] text-slate-300 font-medium">
                  Conversation intelligence
                </span>
              </div>

              <div className="h-28 rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-500">
                  PRODUCT_CONTEXT
                </span>

                <span className="text-[11px] text-slate-300 font-medium">
                  Active product information
                </span>
              </div>
            </div>
          </div>
        ) : activeTab ===
          'projects' ? (
          // ==========================================
          // Projects
          // ==========================================
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-blue-400" />

              <span>
                TRADARA Active Projects
              </span>
            </h3>

            <div className="space-y-2.5 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">
                      TRADARA OS Marketplace
                    </h4>

                    <p className="text-[11px] text-slate-400 mt-1">
                      Full-stack React,
                      TypeScript, Prisma,
                      MongoDB & Agentic AI.
                    </p>
                  </div>

                  <PanelLeft className="h-4 w-4 text-blue-400" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-200">
                  AI Intelligence Core
                </h4>

                <p className="text-[11px] text-slate-400 mt-1">
                  General reasoning,
                  marketplace assistance,
                  tool execution, memory
                  and negotiation.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // ==========================================
          // Explore
          // ==========================================
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Compass className="h-4 w-4 text-blue-400" />

              <span>
                Explore AI Intelligence
              </span>
            </h3>

            <p className="text-xs text-slate-400">
              Use Tradara AI for much
              more than product
              negotiation.
            </p>

            <div className="space-y-2 pt-1">
              {[
                {
                  title:
                    'General Intelligence',
                  text: 'Ask questions about science, history, technology, business, mathematics and everyday topics.'
                },
                {
                  title:
                    'Coding Partner',
                  text: 'Explain, debug, design and improve JavaScript, TypeScript, React, Node.js and other code.'
                },
                {
                  title:
                    'Marketplace Agent',
                  text: 'Understand products, compare information, negotiate where configured, and guide purchase workflows.'
                },
                {
                  title:
                    'Reasoning & Planning',
                  text: 'Break large problems into steps and help you work through complex tasks.'
                },
                {
                  title:
                    'Conversation Memory',
                  text: 'Maintain the current conversation context so follow-up questions make sense.'
                }
              ].map(
                (item) => (
                  <div
                    key={
                      item.title
                    }
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <span className="font-bold text-blue-400 block mb-1 text-xs">
                      {
                        item.title
                      }
                    </span>

                    <span className="text-slate-400 text-[11px]">
                      {item.text}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            Archived / Thread Management Overlay
            ========================================== */}

        {activeTab ===
          'chat' &&
          showThreadMenu &&
          (() => {
            const thread =
              threads.find(
                (item) =>
                  item.id ===
                  showThreadMenu
              );

            if (!thread) {
              return null;
            }

            return (
              <div className="absolute right-3 top-16 z-[70] w-48 rounded-xl border border-slate-700 bg-slate-950 shadow-2xl p-1.5">
                <button
                  onClick={(
                    event
                  ) =>
                    handleTogglePin(
                      event,
                      thread.id
                    )
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-slate-300 hover:bg-slate-800"
                >
                  <Pin className="h-3.5 w-3.5" />

                  {thread.category ===
                  'pinned'
                    ? 'Unpin conversation'
                    : 'Pin conversation'}
                </button>

                <button
                  onClick={(
                    event
                  ) =>
                    handleArchiveThread(
                      event,
                      thread.id
                    )
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-slate-300 hover:bg-slate-800"
                >
                  <Archive className="h-3.5 w-3.5" />

                  Archive
                </button>

                <button
                  onClick={(
                    event
                  ) =>
                    handleDeleteThread(
                      event,
                      thread.id
                    )
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />

                  Delete
                </button>

                <button
                  onClick={() =>
                    setShowThreadMenu(
                      null
                    )
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-slate-500 hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" />

                  Close
                </button>
              </div>
            );
          })()}

        {/* ==========================================
            Thread Footer Controls
            ========================================== */}

        {activeTab ===
          'chat' && (
          <div className="hidden">
            <button title="Thread options">
              <MoreHorizontal />
            </button>

            <button title="Clear conversation">
              <Trash2 />
            </button>

            <button title="Refresh">
              <RefreshCw />
            </button>

            <button title="Open">
              <ExternalLink />
            </button>

            <button title="Collapse">
              <ChevronDown />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradaraAISidebar;