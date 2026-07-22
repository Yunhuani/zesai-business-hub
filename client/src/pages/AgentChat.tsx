import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { Link, useParams, useLocation } from "wouter";
import { EnhancedMessage } from "@/components/EnhancedMessage";
import { toast } from "sonner";
import { InsufficientCreditsDialog } from "@/components/InsufficientCreditsDialog";
import { LoginMethodDialog } from "@/components/LoginMethodDialog";
import { WeChatBrowserGuide } from "@/components/WeChatBrowserGuide";
import { isWeChatBrowser } from "@/utils/wechatDetector";
import { formatToBeijingTimeShort } from "@/utils/formatTime";
import { trackAgent, AgentEvents } from "@/lib/analytics";
import { APP_LOGO, APP_LOGO_FULL } from "@/const";
import {
  getRecommendedSkillTarget,
  type RecommendedSkill,
  type RecommendedSkillMetadata,
} from "@shared/recommendedSkill";
import { parseAdvisorSseData } from "@shared/advisorStream";
import { getAssistantPresentation } from "@/lib/agentChatStream";
import {
  ADVISOR_SUGGESTED_PROMPTS,
  buildDocumentAnalysisPrompt,
  shouldShowAdvisorSuggestions,
} from "@/lib/agentChatPresentation";
import {
  ANONYMOUS_ADVISOR_LIMIT,
  ANONYMOUS_REGISTER_GUIDANCE,
  appendAnonymousGuidance,
  getNextAnonymousTurnState,
} from "@shared/anonymousAdvisor";

const ZESAI_ADVISOR_AGENT_NAME = "泽思AI顾问";
const ANONYMOUS_ADVISOR_TURNS_KEY = "zesai_advisor_anonymous_turns";

type AnonymousChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendationMetadata?: RecommendedSkillMetadata | null;
};

function readAnonymousTurns() {
  if (typeof window === "undefined") return 0;
  const value = Number.parseInt(window.localStorage.getItem(ANONYMOUS_ADVISOR_TURNS_KEY) || "0", 10);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(ANONYMOUS_ADVISOR_LIMIT, value));
}

function createClientMessageId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AgentChat() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  
  // 区分两种路由：/agent/:id 和 /conversation/:id
  const isConversationRoute = location.startsWith('/conversation/');
  const agentId = isConversationRoute ? 0 : parseInt(params.id || "0");
  const urlConversationId = isConversationRoute ? parseInt(params.id || "0") : null;
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  // Get initial message from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const initialMessage = urlParams.get('initial');
  const isNewConversation = urlParams.get('new') === '1';
  
  // Get conversation data if loading from URL
  const { data: conversationData, isLoading: conversationLoading } = trpc.conversation.getById.useQuery(
    { id: urlConversationId! },
    { enabled: !!urlConversationId }
  );
  
  const effectiveAgentId = urlConversationId && conversationData ? conversationData.agentId : agentId;
  const { data: agent, isLoading: agentLoading } = trpc.agent.getById.useQuery(
    { id: effectiveAgentId },
    { enabled: !!effectiveAgentId }
  );
  const isZesaiAdvisorAgent = agent?.name === ZESAI_ADVISOR_AGENT_NAME;
  
  // Get latest conversation for this agent
  const { data: latestConversation } = trpc.conversation.getLatestByAgent.useQuery(
    { agentId: effectiveAgentId },
    { enabled: !!effectiveAgentId && isAuthenticated && !urlConversationId }
  );
  
  const { data: subscriptionData } = trpc.subscription.get.useQuery(undefined, { enabled: isAuthenticated });
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [pendingMessage, setPendingMessage] = useState<string | null>(initialMessage);
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInsufficientCreditsDialog, setShowInsufficientCreditsDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isInWeChatBrowser] = useState(isWeChatBrowser());
  const [streamingMessage, setStreamingMessage] = useState("");
  const [streamingRecommendation, setStreamingRecommendation] = useState<RecommendedSkillMetadata | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [tempWelcomeMessage, setTempWelcomeMessage] = useState<string | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [tempUserMessage, setTempUserMessage] = useState<string | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const waitingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [anonymousTurns, setAnonymousTurns] = useState(readAnonymousTurns);
  const [anonymousMessages, setAnonymousMessages] = useState<AnonymousChatMessage[]>([]);
  const [historyOpen, setHistoryOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 1024
  );
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);

  const persistAnonymousTurns = (turns: number) => {
    const safeTurns = Math.max(0, Math.min(ANONYMOUS_ADVISOR_LIMIT, turns));
    setAnonymousTurns(safeTurns);
    window.localStorage.setItem(ANONYMOUS_ADVISOR_TURNS_KEY, String(safeTurns));
  };

  const { data: messages, refetch: refetchMessages } = trpc.message.list.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId }
  );

  // Get all conversations for history dropdown
  const { data: allConversations, refetch: refetchConversations } = trpc.conversation.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming) {
      scrollToBottom();
    }
  }, [streamingMessage, isStreaming]);
  
  // Cleanup typewriter interval and waiting timeout on unmount
  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
      }
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
      }
    };
  }, []);

  // 追踪进入对话页面
  useEffect(() => {
    if (agent && isAuthenticated) {
      trackAgent(AgentEvents.AGENT_CONVERSATION_START, agent.id, agent.name);
    }
  }, [agent, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && agent && isZesaiAdvisorAgent && !isAuthenticated && initialMessage && !hasProcessedInitialMessage) {
      setMessage(initialMessage);
      setHasProcessedInitialMessage(true);
    }
  }, [authLoading, agent, isZesaiAdvisorAgent, isAuthenticated, initialMessage, hasProcessedInitialMessage]);

  // Load conversation from URL if present
  useEffect(() => {
    if (urlConversationId && isAuthenticated) {
      setConversationId(urlConversationId);
    }
  }, [urlConversationId, isAuthenticated]);

  // Load latest conversation or create new one
  useEffect(() => {
    if (agent && isAuthenticated && !conversationId && !urlConversationId) {
      // 如果是“开始新对话”操作，强制创建新对话
      if (isNewConversation) {
        createConversation.mutate({
          agentId: agent.id,
          title: `${agent.name} - ${new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
        });
      } else if (latestConversation) {
        // Load existing conversation
        setConversationId(latestConversation.id);
      } else if (latestConversation === null) {
        // Only create when we confirmed there's no existing conversation
        createConversation.mutate({
          agentId: agent.id,
          title: `${agent.name} - ${new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
        });
      }
      // If latestConversation is undefined, it means query is still loading, wait
    }
  }, [agent, isAuthenticated, conversationId, urlConversationId, latestConversation, isNewConversation]);

  // Welcome message is sent automatically when creating a new conversation
  // No need to send it again when loading existing conversations

  const createConversation = trpc.conversation.create.useMutation({
    onSuccess: (data) => {
      const newConversationId = data.id;
      setConversationId(newConversationId);
      
      // 如果有欢迎语，立即在前端显示（不等待数据库）
      if (agent?.welcomeMessage && !hasShownWelcome) {
        setTempWelcomeMessage(agent.welcomeMessage);
        setHasShownWelcome(true);
        // 启动打字机效果
        setIsStreaming(true);
        setStreamingMessage("");
        
        const fullText = agent.welcomeMessage;
        let currentIndex = 0;
        
        if (typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current);
        }
        
        typewriterIntervalRef.current = setInterval(() => {
          if (currentIndex < fullText.length) {
            const chunkSize = Math.min(2, fullText.length - currentIndex);
            setStreamingMessage(prev => prev + fullText.slice(currentIndex, currentIndex + chunkSize));
            currentIndex += chunkSize;
          } else {
            if (typewriterIntervalRef.current) {
              clearInterval(typewriterIntervalRef.current);
              typewriterIntervalRef.current = null;
            }
            setIsStreaming(false);
            setStreamingMessage("");
          }
        }, 30);
      }
      
      // 后台异步保存欢迎消息到数据库
      sendWelcomeMessage.mutate({
        conversationId: newConversationId,
        agentId: effectiveAgentId,
      });
      
      // 刷新历史对话列表，确保新对话立即显示
      refetchConversations();
      
      // 如果有待发送的消息，现在发送
      if (pendingMessage) {
        sendMessage.mutate({
          conversationId: newConversationId,
          content: pendingMessage,
        });
        setPendingMessage(null);
      }
    },
    onError: (error) => {
      toast.error("创建对话失败: " + error.message);
      setPendingMessage(null);
    },
  });

  const sendWelcomeMessage = trpc.message.sendWelcome.useMutation({
    onSuccess: (data) => {
      // 欢迎消息已在前端显示，这里只需要刷新messages列表
      refetchMessages();
      // 清除临时欢迎消息，使用数据库中的消息
      setTempWelcomeMessage(null);
    },
  });

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: (data) => {
      // Start typewriter effect
      setIsStreaming(true);
      setStreamingMessage("");
      
      const fullText = data.content;
      let currentIndex = 0;
      
      const typewriterInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          // Add characters in chunks for smoother effect
          const chunkSize = Math.min(2, fullText.length - currentIndex);
          setStreamingMessage(prev => prev + fullText.slice(currentIndex, currentIndex + chunkSize));
          currentIndex += chunkSize;
        } else {
          clearInterval(typewriterInterval);
          setIsStreaming(false);
          setStreamingMessage("");
          refetchMessages();
        }
      }, 30); // 30ms per chunk for smooth typing effect
      
      setMessage("");
    },
    onError: (error) => {
      // Check if error is insufficient credits
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.error === "INSUFFICIENT_CREDITS") {
          setShowInsufficientCreditsDialog(true);
          return;
        }
      } catch {
        // Not a JSON error, proceed with normal error handling
      }
      toast.error("发送消息失败: " + error.message);
    },
  });

  const uploadDocument = trpc.document.upload.useMutation({
    onSuccess: (data) => {
      setUploadingFileName(null);
      if (data.error) {
        toast.warning(data.error);
      } else {
        toast.success("文档已读取，正在结合内容分析");
      }
      // 将提取的文本内容作为消息发送
      if (data.extractedText && conversationId) {
        const summary = buildDocumentAnalysisPrompt(data.filename, data.extractedText);
        sendMessage.mutate({
          conversationId,
          content: summary,
        });
      }
    },
    onError: (error) => {
      setUploadingFileName(null);
      toast.error("文档上传失败: " + error.message);
    },
  });

  // 允许未登录用户访问agent页面，只在发送消息时才提示登录
  // useEffect(() => {
  //   if (!authLoading && !isAuthenticated) {
  //     window.location.href = getLoginUrl();
  //   }
  // }, [authLoading, isAuthenticated]);

  if (authLoading || agentLoading || (urlConversationId && conversationLoading)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--zs-bg)] text-[var(--zs-ink)]">
        <Icons.Loader2 className="h-8 w-8 animate-spin text-[var(--zs-primary)]" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--zs-bg)] px-6 text-[var(--zs-ink)]">
          <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Agent 不存在</h2>
          <Button asChild>
            <Link href="/">返回首页</Link>
          </Button>
          </div>
      </div>
    );
  }

  const isZesaiAdvisor = agent.name === ZESAI_ADVISOR_AGENT_NAME;
  const isAnonymousAdvisorMode = !isAuthenticated && isZesaiAdvisor;
  const anonymousLimitReached = isAnonymousAdvisorMode && anonymousTurns >= ANONYMOUS_ADVISOR_LIMIT;
  const inputDisabled = isAuthenticated
    ? sendMessage.isPending || !conversationId
    : !isAnonymousAdvisorMode || anonymousLimitReached || isStreaming || isWaitingForResponse;

  const renderAssistantContent = (
    content: string,
    recommendationMetadata?: RecommendedSkillMetadata | null,
  ) => {
    const { displayContent, recommendedSkill } = getAssistantPresentation({
      content,
      recommendationMetadata,
    });

    return (
      <div className="space-y-3">
        {displayContent ? <EnhancedMessage content={displayContent} /> : null}
        {recommendedSkill ? <RecommendedSkillCard skill={recommendedSkill} /> : null}
      </div>
    );
  };

  const sendAnonymousAdvisorMessage = async (rawMessage: string) => {
    const userMessage = rawMessage.trim();
    if (!userMessage) return;

    const turnState = getNextAnonymousTurnState(anonymousTurns);
    if (!turnState.allowed) {
      setShowLoginDialog(true);
      toast.info("注册后继续深入对话");
      return;
    }

    const previousMessages = anonymousMessages;
    setAnonymousMessages((current) => [
      ...current,
      { id: createClientMessageId(), role: "user", content: userMessage },
    ]);
    setMessage("");
    setTempUserMessage(null);
    setIsStreaming(false);
    setStreamingMessage("");
    setStreamingRecommendation(null);

    waitingTimeoutRef.current = setTimeout(() => {
      setIsWaitingForResponse(true);
    }, 300);

    try {
      const response = await fetch("/api/chat/anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: userMessage,
          history: previousMessages.slice(-6).map((item) => ({
            role: item.role,
            content: item.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429 && errorData.message) {
          setAnonymousMessages((current) => [
            ...current,
            {
              id: createClientMessageId(),
              role: "assistant",
              content: errorData.message,
            },
          ]);
          toast.info(errorData.message);
          setIsStreaming(false);
          setStreamingMessage("");
          return;
        }
        throw new Error(errorData.error || "Anonymous stream failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let fullContent = "";
      let recommendationMetadata: RecommendedSkillMetadata | null = null;
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event = parseAdvisorSseData(line.slice(6));
          if (event?.type === "message.delta") {
              if (waitingTimeoutRef.current) {
                clearTimeout(waitingTimeoutRef.current);
                waitingTimeoutRef.current = null;
              }
              setIsWaitingForResponse(false);
              setIsStreaming(true);
              fullContent += event.delta;
              setStreamingMessage(fullContent);
          } else if (event?.type === "recommendation") {
            recommendationMetadata = event.recommendation;
            setStreamingRecommendation(event.recommendation);
          }
        }
      }

      const assistantContent = turnState.shouldAppendGuidance
        ? appendAnonymousGuidance(fullContent || ANONYMOUS_REGISTER_GUIDANCE)
        : fullContent;
      setAnonymousMessages((current) => [
        ...current,
        {
          id: createClientMessageId(),
          role: "assistant",
          content: assistantContent || "抱歉，我暂时无法生成回复。",
          recommendationMetadata,
        },
      ]);
      persistAnonymousTurns(turnState.nextTurns);
      setIsStreaming(false);
      setStreamingMessage("");
      setStreamingRecommendation(null);
    } catch (error: any) {
      console.error("Anonymous advisor stream error:", error);
      toast.error("发送消息失败: " + error.message);
      setAnonymousMessages(previousMessages);
      setMessage(userMessage);
      setIsStreaming(false);
      setStreamingMessage("");
      setStreamingRecommendation(null);
    } finally {
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      setIsWaitingForResponse(false);
    }
  };

  const handleSendMessage = async (suggestedMessage?: string) => {
    const nextMessage = typeof suggestedMessage === "string" ? suggestedMessage : message;
    if (!nextMessage.trim()) return;
    
    // 检查登录状态，未登录则显示登录选择对话框
    if (!isAuthenticated && isZesaiAdvisor) {
      await sendAnonymousAdvisorMessage(nextMessage);
      return;
    }

    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    
    if (!conversationId) {
      // Conversation还未创建，将消息加入待发送队列
      setPendingMessage(nextMessage);
      setMessage("");
      toast.info("正在创建对话...");
      return;
    }
    
    const userMessage = nextMessage;
    const requestId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessage("");
    
    // 追踪发送消息事件
    if (agent) {
      trackAgent(AgentEvents.AGENT_MESSAGE_SEND, agent.id, agent.name, {
        conversation_id: conversationId,
      });
    }
    
    // 立即显示用户消息
    setTempUserMessage(userMessage);
    setIsStreaming(false);
    setStreamingMessage("");
    setStreamingRecommendation(null);
    
    // 设置300ms延迟，如果还没收到响应才显示"正在思考"
    waitingTimeoutRef.current = setTimeout(() => {
      setIsWaitingForResponse(true);
    }, 300);
    
    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem('auth_token') ? {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`
          } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          conversationId,
          content: userMessage,
          requestId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "INSUFFICIENT_CREDITS") {
          setShowInsufficientCreditsDialog(true);
          return;
        }
        throw new Error(errorData.error || "Stream failed");
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");
      
      const decoder = new TextDecoder();
      let fullContent = "";
      let sseBuffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const event = parseAdvisorSseData(line.slice(6));
            if (event?.type === "message.delta") {
                // 第一次收到内容时，清除等待状态并开启流式显示
                if (!isStreaming) {
                  // 清除等待提示
                  if (waitingTimeoutRef.current) {
                    clearTimeout(waitingTimeoutRef.current);
                    waitingTimeoutRef.current = null;
                  }
                  setIsWaitingForResponse(false);
                  setIsStreaming(true);
                }
                fullContent += event.delta;
                setStreamingMessage(fullContent);
            } else if (event?.type === "recommendation") {
              setStreamingRecommendation(event.recommendation);
            }
          }
        }
      }
      
      // Refresh messages after streaming completes
      await refetchMessages();
      setIsStreaming(false);
      setStreamingMessage("");
      setStreamingRecommendation(null);
      setTempUserMessage(null); // 清除临时用户消息
    } catch (error: any) {
      console.error("Stream error:", error);
      toast.error("发送消息失败: " + error.message);
      setIsStreaming(false);
      setStreamingMessage("");
      setStreamingRecommendation(null);
      setTempUserMessage(null);
      setMessage(userMessage); // Restore message on error
    } finally {
      // 确保清除等待状态
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      setIsWaitingForResponse(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件大小(16MB)
      const maxSize = 16 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("文件大小超过16MB限制");
        return;
      }

      // 验证文件类型
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("不支持的文件类型。仅支持 PDF、Word 和 Excel 文件。");
        return;
      }

      // 读取文件并转换为Base64
      const reader = new FileReader();
      reader.onload = () => {
        setUploadingFileName(file.name);
        const base64Content = (reader.result as string).split(',')[1];
        uploadDocument.mutate({
          filename: file.name,
          content: base64Content,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    }
    // 清空输入，允许上传相同文件
    e.target.value = '';
  };

  const advisorConversations = allConversations?.filter(item => item.agentId === agent.id) ?? [];
  const showAdvisorSuggestions = isZesaiAdvisor && (
    isAnonymousAdvisorMode
      ? anonymousMessages.length === 0
      : isAuthenticated && !tempUserMessage && shouldShowAdvisorSuggestions(messages)
  );

  const startNewConversation = () => {
    if (isAuthenticated) {
      window.location.href = `/agent/${effectiveAgentId}?new=1`;
      return;
    }
    setAnonymousMessages([]);
    setMessage("");
    setHistoryOpen(false);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      {historyOpen ? (
        <button
          type="button"
          aria-label="关闭历史对话"
          className="fixed inset-0 z-30 bg-black/15 backdrop-blur-[1px] lg:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[286px] shrink-0 flex-col border-r border-[var(--zs-line)] bg-[#f6f7f3] transition-transform duration-300 lg:relative lg:z-0 ${
          historyOpen ? "translate-x-0" : "-translate-x-full lg:hidden"
        }`}
      >
        <div className="flex h-[68px] items-center justify-between px-5">
          <Link href="/" className="flex items-center" aria-label="返回泽思AI首页">
            <img src={APP_LOGO_FULL} alt="泽思AI" className="h-8 w-auto" />
          </Link>
          <button
            type="button"
            onClick={() => setHistoryOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-xl text-[var(--zs-sub)] transition hover:bg-white hover:text-[var(--zs-primary)]"
            aria-label="收起历史对话"
          >
            <Icons.PanelLeftClose className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={startNewConversation}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[13px] bg-[var(--zs-primary)] text-sm font-semibold text-white shadow-[0_8px_22px_rgba(31,61,50,.14)] transition hover:-translate-y-0.5 hover:bg-[var(--zs-primary-2)]"
          >
            <Icons.Plus className="h-4 w-4" />
            新对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="mb-2 px-2">
            <span className="text-xs font-semibold tracking-wide text-[var(--zs-sub)]">历史对话</span>
          </div>
          {isAuthenticated ? (
            advisorConversations.length > 0 ? (
              <div className="space-y-1">
                {advisorConversations.map(conversation => {
                  const selected = conversation.id === conversationId;
                  return (
                    <Link
                      key={conversation.id}
                      href={`/conversation/${conversation.id}`}
                      onClick={() => setHistoryOpen(false)}
                      className={`group block rounded-xl px-3 py-2.5 transition ${
                        selected ? "bg-[#e4ebe5] text-[var(--zs-primary)]" : "hover:bg-white/80"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <Icons.MessageCircle className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium leading-5">{conversation.title}</p>
                          <p className="mt-0.5 text-[11px] text-[var(--zs-sub)]">
                            {formatToBeijingTimeShort(conversation.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="px-3 py-8 text-center text-xs leading-5 text-[var(--zs-sub)]">你的经营对话会保存在这里</p>
            )
          ) : (
            <button
              type="button"
              onClick={() => setShowLoginDialog(true)}
              className="w-full rounded-xl border border-dashed border-[var(--zs-line)] px-4 py-5 text-left text-xs leading-5 text-[var(--zs-sub)] transition hover:border-[var(--zs-primary)] hover:bg-white"
            >
              登录后保存多轮对话，并在不同设备继续。
            </button>
          )}
        </div>

        {isAuthenticated ? (
          <Link
            href="/credits"
            aria-label="打开账户与积分"
            className="m-3 flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-white/80"
          >
            <img src={APP_LOGO} alt="" className="h-9 w-9 shrink-0 object-contain" />
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{user?.email || user?.username || "泽思用户"}</p>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setShowLoginDialog(true)}
            className="m-3 flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-white/80"
          >
            <img src={APP_LOGO} alt="" className="h-9 w-9 shrink-0 object-contain" />
            <span className="text-sm font-medium">登录账户</span>
          </button>
        )}
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col bg-[var(--zs-bg)]">
        <header className="z-20 flex h-[68px] shrink-0 items-center justify-between border-b border-[var(--zs-line)] bg-[rgba(250,250,248,.9)] px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {!historyOpen ? (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--zs-sub)] transition hover:bg-[var(--zs-primary-soft)] hover:text-[var(--zs-primary)]"
                aria-label="打开历史对话"
              >
                <Icons.PanelLeftOpen className="h-[18px] w-[18px]" />
              </button>
            ) : null}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-semibold">{agent.name}</h1>
                <span className="h-1.5 w-1.5 rounded-full bg-[#4f9b69]" aria-label="在线" />
              </div>
              <p className="hidden truncate text-xs text-[var(--zs-sub)] sm:block">
                {isZesaiAdvisor ? "随时梳理经营问题，找到更优解" : agent.description}
              </p>
            </div>
          </div>
          {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => setShowLoginDialog(true)}
                className="h-9 rounded-xl border border-[var(--zs-line)] bg-white px-3 text-xs font-medium text-[var(--zs-primary)]"
              >
                登录
              </button>
          ) : null}
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          <div className="mx-auto flex min-h-full w-full max-w-[860px] flex-col px-4 pb-8 pt-6 sm:px-7 lg:pt-9">
            {isInWeChatBrowser ? <div className="mb-5"><WeChatBrowserGuide /></div> : null}

            {showAdvisorSuggestions ? (
              <AdvisorStarter
                onSelect={prompt => void handleSendMessage(prompt)}
                disabled={inputDisabled}
              />
            ) : !isAuthenticated && !isAnonymousAdvisorMode ? (
              <div className="m-auto max-w-md py-16 text-center">
                <ZesaiMark large />
                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">登录后使用 {agent.name}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--zs-sub)]">{agent.description}</p>
                <Button onClick={() => setShowLoginDialog(true)} className="mt-6 rounded-xl">登录开始咨询</Button>
              </div>
            ) : !isAnonymousAdvisorMode && !conversationId ? (
              <div className="m-auto flex items-center gap-2 py-16 text-sm text-[var(--zs-sub)]">
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
                正在准备对话
              </div>
            ) : (
              <div className="space-y-7 py-2 sm:py-4">
                {tempWelcomeMessage ? (
                  <MessageRow role="assistant">{renderAssistantContent(tempWelcomeMessage)}</MessageRow>
                ) : null}
                {isAnonymousAdvisorMode
                  ? anonymousMessages.map(item => (
                      <MessageRow key={item.id} role={item.role}>
                        {item.role === "assistant" ? renderAssistantContent(item.content, item.recommendationMetadata) : <p className="whitespace-pre-wrap">{item.content}</p>}
                      </MessageRow>
                    ))
                  : messages?.map(item => (
                      <MessageRow key={item.id} role={item.role}>
                        {item.role === "assistant" ? renderAssistantContent(item.content, item.recommendationMetadata) : <p className="whitespace-pre-wrap">{item.content}</p>}
                      </MessageRow>
                    ))}

                {tempUserMessage ? (
                  <MessageRow role="user"><p className="whitespace-pre-wrap">{tempUserMessage}</p></MessageRow>
                ) : null}
                {isStreaming && streamingMessage ? (
                  <MessageRow role="assistant" streaming>{renderAssistantContent(streamingMessage, streamingRecommendation)}</MessageRow>
                ) : null}
                {isWaitingForResponse ? <ThinkingRow /> : null}

                {anonymousLimitReached ? (
                  <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-[var(--zs-line)] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm leading-6 text-[var(--zs-sub)]">{ANONYMOUS_REGISTER_GUIDANCE}</p>
                    <Button onClick={() => setShowLoginDialog(true)} className="shrink-0 rounded-xl">注册 / 登录</Button>
                  </div>
                ) : null}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </section>

        <div className="shrink-0 bg-[linear-gradient(to_top,var(--zs-bg)_72%,transparent)] px-3 pb-3 pt-4 sm:px-6 sm:pb-4">
          <div className="mx-auto w-full max-w-[860px]">
            {uploadingFileName ? (
              <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--zs-line)] bg-white px-3 py-1.5 text-xs text-[var(--zs-sub)]">
                <Icons.Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--zs-primary)]" />
                <span className="truncate">正在读取 {uploadingFileName}</span>
              </div>
            ) : null}
            <div className="rounded-[20px] border border-[rgba(31,61,50,.16)] bg-white p-2 shadow-[0_16px_44px_rgba(31,61,50,.09)] transition focus-within:border-[rgba(31,61,50,.38)] focus-within:shadow-[0_18px_50px_rgba(31,61,50,.12)]">
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileChange} className="hidden" />
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={!isAuthenticated || uploadDocument.isPending}
                  title={isAuthenticated ? "上传 PDF、Word 或 Excel 文档" : "登录后上传文档"}
                  aria-label="上传文档"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--zs-sub)] transition hover:bg-[var(--zs-bg-soft)] hover:text-[var(--zs-primary)] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {uploadDocument.isPending ? <Icons.Loader2 className="h-5 w-5 animate-spin" /> : <Icons.Plus className="h-5 w-5" />}
                </button>
                <Textarea
                  placeholder={anonymousLimitReached ? "注册后继续深入对话" : !isAuthenticated && !isAnonymousAdvisorMode ? "请先登录后开始咨询" : "描述你的经营问题…"}
                  value={message}
                  onChange={event => setMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={inputDisabled}
                  rows={1}
                  className="max-h-[180px] min-h-10 flex-1 resize-none border-0 bg-transparent px-1 py-2.5 text-[15px] leading-6 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  onInput={event => {
                    const target = event.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${Math.min(target.scrollHeight, 180)}px`;
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={!message.trim() || inputDisabled}
                  aria-label="发送消息"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--zs-primary)] text-white shadow-[0_6px_16px_rgba(31,61,50,.2)] transition hover:-translate-y-0.5 hover:bg-[var(--zs-primary-2)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {sendMessage.isPending || (isAnonymousAdvisorMode && (isStreaming || isWaitingForResponse)) ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.ArrowUp className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-[var(--zs-sub)]">
              <span>AI 可能会犯错，请核查重要信息</span>
            </div>
          </div>
        </div>
      </main>

      {/* Insufficient Credits Dialog */}
      <InsufficientCreditsDialog
        open={showInsufficientCreditsDialog}
        onOpenChange={setShowInsufficientCreditsDialog}
        isFreeUser={!subscriptionData?.subscription?.plan || subscriptionData?.subscription?.plan === 'free'}
      />
      
      {/* Login Method Dialog */}
      <LoginMethodDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
      />
    </div>
  );
}

function RecommendedSkillCard({ skill }: { skill: RecommendedSkill }) {
  const target = getRecommendedSkillTarget(skill.key);
  if (!target) return null;

  return (
    <div className="relative mt-5 max-w-2xl overflow-hidden rounded-[18px] border border-[rgba(201,162,75,.26)] bg-[radial-gradient(circle_at_92%_20%,rgba(31,61,50,.12),transparent_38%),linear-gradient(135deg,#fffdf8,#f7f8f3)] p-5 pl-6 shadow-[0_14px_38px_rgba(31,61,50,.08)] sm:p-6 sm:pl-7">
      <div className="absolute inset-y-0 left-0 w-1 bg-[var(--zs-gold)]" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[rgba(201,162,75,.35)] bg-white/80 text-[var(--zs-gold)]">
              <Icons.ChartNoAxesCombined className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[#8a6b27]">建议继续深入</p>
              <h3 className="mt-0.5 text-lg font-semibold tracking-[-0.02em] text-[var(--zs-primary)]">{target.name}</h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-[var(--zs-sub)]">{skill.reason || target.description}</p>
        </div>
        {target.available && target.href ? (
          <Link
            href={target.href}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--zs-primary)] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--zs-primary-2)]"
          >
            {target.cta}
            <Icons.ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-[var(--zs-line)] bg-white/60 px-4 text-sm text-[var(--zs-sub)]">
            {target.cta}
          </span>
        )}
      </div>
    </div>
  );
}

function ZesaiMark({ large = false }: { large?: boolean }) {
  return (
    <img
      src={APP_LOGO}
      alt=""
      aria-hidden="true"
      className={`shrink-0 object-contain ${large ? "mx-auto h-14 w-14" : "h-9 w-9"}`}
    />
  );
}

function AdvisorStarter({ onSelect, disabled }: { onSelect: (prompt: string) => void; disabled: boolean }) {
  const promptIcons = [Icons.Search, Icons.TrendingUp, Icons.Users, Icons.Target];
  return (
    <div className="my-auto w-full py-8 sm:py-14">
      <div className="mx-auto max-w-[700px]">
        <h2 className="text-balance text-center font-serif text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[var(--zs-primary)] sm:text-[40px]">
          今天想解决什么经营问题？
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-6 text-[var(--zs-sub)] sm:text-[15px]">
          从一个具体问题开始。泽思AI顾问会先给出轻诊断，再推荐适合继续深入的方向。
        </p>
        <div className="mt-10">
          <p className="mb-3 text-sm font-semibold text-[var(--zs-primary)]">猜你想问</p>
          <div className="space-y-2.5">
            {ADVISOR_SUGGESTED_PROMPTS.map((prompt, index) => {
              const PromptIcon = promptIcons[index];
              return (
                <button
                  key={prompt}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(prompt)}
                  className="group flex w-full items-center gap-3 rounded-[14px] border border-[var(--zs-line)] bg-white/70 px-4 py-3 text-left text-sm leading-6 transition hover:-translate-y-0.5 hover:border-[rgba(31,61,50,.28)] hover:bg-white hover:shadow-[0_10px_28px_rgba(31,61,50,.06)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
                >
                  <PromptIcon className="h-[18px] w-[18px] shrink-0 text-[var(--zs-primary)]" />
                  <span className="flex-1">{prompt}</span>
                  <Icons.ChevronRight className="h-4 w-4 text-[var(--zs-sub)] transition group-hover:translate-x-0.5 group-hover:text-[var(--zs-primary)]" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ role, streaming = false, children }: { role: string; streaming?: boolean; children: ReactNode }) {
  const isUser = role === "user";
  if (role === "system") return null;
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`} style={{ contentVisibility: "auto" }}>
      {isUser ? (
        <div className="max-w-[86%] rounded-[18px] rounded-br-[6px] bg-[#e7eee8] px-4 py-3 text-[14px] leading-6 text-[var(--zs-ink)] sm:max-w-[76%] sm:text-[15px]">
          {children}
        </div>
      ) : (
        <div className="flex w-full items-start gap-3 sm:gap-4">
          <ZesaiMark />
          <div className="min-w-0 flex-1 pt-1 text-[14px] leading-7 text-[var(--zs-ink)] sm:text-[15px]">
            {children}
            {streaming ? <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-[var(--zs-primary)] align-middle" /> : null}
          </div>
        </div>
      )}
    </div>
  );
}

function ThinkingRow() {
  return (
    <MessageRow role="assistant">
      <div className="flex items-center gap-2 text-sm text-[var(--zs-sub)]">
        <span>正在思考</span>
        <span className="flex gap-1">
          {[0, 1, 2].map(index => <span key={index} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--zs-primary)]" style={{ animationDelay: `${index * 140}ms` }} />)}
        </span>
      </div>
    </MessageRow>
  );
}
