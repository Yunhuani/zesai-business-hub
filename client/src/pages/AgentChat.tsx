import { useAuth } from "@/_core/hooks/useAuth";
import { AppFooter } from "@/components/layout/Footer";
import { AppHeader } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { EnhancedMessage } from "@/components/EnhancedMessage";
import { toast } from "sonner";
import { InsufficientCreditsDialog } from "@/components/InsufficientCreditsDialog";
import { LoginMethodDialog } from "@/components/LoginMethodDialog";
import { WeChatBrowserGuide } from "@/components/WeChatBrowserGuide";
import { isWeChatBrowser } from "@/utils/wechatDetector";
import { formatToBeijingTimeShort } from "@/utils/formatTime";
import { trackAgent, AgentEvents } from "@/lib/analytics";
import {
  extractRecommendedSkill,
  getRecommendedSkillCta,
  getRecommendedSkillHref,
  type RecommendedSkill,
} from "@shared/recommendedSkill";
import {
  ANONYMOUS_ADVISOR_LIMIT,
  ANONYMOUS_REGISTER_GUIDANCE,
  appendAnonymousGuidance,
  getNextAnonymousTurnState,
} from "@shared/anonymousAdvisor";

const ZESAI_ADVISOR_AGENT_NAME = "泽思AI顾问";
const CHAT_CREDIT_COST = 10;
const ANONYMOUS_ADVISOR_TURNS_KEY = "zesai_advisor_anonymous_turns";

type AnonymousChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
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
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [pendingMessage, setPendingMessage] = useState<string | null>(initialMessage);
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInsufficientCreditsDialog, setShowInsufficientCreditsDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isInWeChatBrowser] = useState(isWeChatBrowser());
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [tempWelcomeMessage, setTempWelcomeMessage] = useState<string | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [tempUserMessage, setTempUserMessage] = useState<string | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const waitingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [anonymousTurns, setAnonymousTurns] = useState(readAnonymousTurns);
  const [anonymousMessages, setAnonymousMessages] = useState<AnonymousChatMessage[]>([]);

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
      setIsFirstMessage(false);
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
      if (data.error) {
        toast.warning(data.error);
      } else {
        toast.success("文u6863u4e0au4f20u6210u529f！");
      }
      // 将提取的文本内容作为消息发送
      if (data.extractedText && conversationId) {
        const summary = `我上u4f20了一份文档：${data.filename}\n\n文档内容：\n${data.extractedText.substring(0, 3000)}${data.extractedText.length > 3000 ? '...(内容过长，已截断)' : ''}`;
        sendMessage.mutate({
          conversationId,
          content: summary,
        });
      }
    },
    onError: (error) => {
      toast.error("文档上u4f20失败: " + error.message);
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
      <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
        <AppHeader />
        <main className="zs-container flex min-h-[560px] items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-[var(--zs-primary)] border-t-transparent rounded-full animate-spin" />
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
        <AppHeader />
        <main className="zs-container flex min-h-[560px] items-center justify-center py-16">
          <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Agent 不存在</h2>
          <Button asChild>
            <Link href="/">返回首页</Link>
          </Button>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  const IconComponent = (Icons as any)[agent.icon] || Icons.Sparkles;
  const isZesaiAdvisor = agent.name === ZESAI_ADVISOR_AGENT_NAME;
  const credits = subscriptionData?.credits;
  const isAnonymousAdvisorMode = !isAuthenticated && isZesaiAdvisor;
  const anonymousLimitReached = isAnonymousAdvisorMode && anonymousTurns >= ANONYMOUS_ADVISOR_LIMIT;
  const inputDisabled = isAuthenticated
    ? sendMessage.isPending || !conversationId
    : !isAnonymousAdvisorMode || anonymousLimitReached || isStreaming || isWaitingForResponse;

  const renderAssistantContent = (content: string) => {
    const { displayContent, recommendedSkill } = extractRecommendedSkill(content);

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.delta) {
              if (waitingTimeoutRef.current) {
                clearTimeout(waitingTimeoutRef.current);
                waitingTimeoutRef.current = null;
              }
              setIsWaitingForResponse(false);
              setIsStreaming(true);
              fullContent += parsed.delta;
              setStreamingMessage(fullContent);
            }
          } catch {
            // Skip invalid SSE chunks.
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
        },
      ]);
      persistAnonymousTurns(turnState.nextTurns);
      setIsStreaming(false);
      setStreamingMessage("");
    } catch (error: any) {
      console.error("Anonymous advisor stream error:", error);
      toast.error("发送消息失败: " + error.message);
      setAnonymousMessages(previousMessages);
      setMessage(userMessage);
      setIsStreaming(false);
      setStreamingMessage("");
    } finally {
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
        waitingTimeoutRef.current = null;
      }
      setIsWaitingForResponse(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // 检查登录状态，未登录则显示登录选择对话框
    if (!isAuthenticated && isZesaiAdvisor) {
      await sendAnonymousAdvisorMessage(message);
      return;
    }

    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    
    if (!conversationId) {
      // Conversation还未创建，将消息加入待发送队列
      setPendingMessage(message);
      setMessage("");
      toast.info("正在创建对话...");
      return;
    }
    
    const userMessage = message;
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
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.delta) {
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
                fullContent += parsed.delta;
                setStreamingMessage(fullContent);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      // Refresh messages after streaming completes
      await refetchMessages();
      setIsStreaming(false);
      setStreamingMessage("");
      setTempUserMessage(null); // 清除临时用户消息
    } catch (error: any) {
      console.error("Stream error:", error);
      toast.error("发送消息失败: " + error.message);
      setIsStreaming(false);
      setStreamingMessage("");
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
      handleSendMessage();
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

  return (
    <div className="flex h-screen flex-col bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      {/* Header */}
      <header className="sticky top-0 z-10 flex-shrink-0 border-b border-[var(--zs-line)] bg-[rgba(250,250,248,.86)] backdrop-blur-[12px]">
        <div className="zs-container py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <Icons.ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--zs-primary)] rounded-[var(--zs-radius-md)] flex items-center justify-center">
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold">{agent.name}</h1>
                <p className="text-sm text-muted-foreground hidden md:block">
                  {isZesaiAdvisor ? "泽思AI顾问团队 · 商业问题诊断与工具推荐" : agent.description}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 开始新对话按钮 */}
            {isAuthenticated && agent && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  // 添加new=1参数，强制创建新对话
                  window.location.href = `/agent/${effectiveAgentId}?new=1`;
                }}
              >
                <Icons.Plus className="w-4 h-4" />
                开始新对话
              </Button>
            )}
            {/* 历史对话下拉菜单 */}
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Icons.History className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                  <DropdownMenuLabel>历史对话</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(() => {
                    const filteredConvs = allConversations?.filter(
                      (c) => c.agentId === agent.id
                    ).slice(0, 10);
                    
                    if (!filteredConvs || filteredConvs.length === 0) {
                      return (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          暂无历史对话
                        </div>
                      );
                    }
                    
                    return filteredConvs.map((conv) => (
                      <DropdownMenuItem
                        key={conv.id}
                        asChild
                        className="cursor-pointer"
                      >
                        <Link href={`/conversation/${conv.id}`} className="flex flex-col gap-1 py-2">
                          <div className="font-medium truncate">{conv.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatToBeijingTimeShort(conv.updatedAt)}
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    ));
                  })()}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/history" className="gap-2">
                      <Icons.List className="w-4 h-4" />
                      查看全部历史
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Messages area - scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
          {/* WeChat Browser Guide */}
          {isInWeChatBrowser && (
            <div className="mb-6">
              <WeChatBrowserGuide />
            </div>
          )}
          
          <div className="space-y-4">
            {isAnonymousAdvisorMode ? (
              <>
                <div className="mb-5 rounded-[var(--zs-radius-lg)] border border-[var(--zs-line)] bg-[var(--zs-card)] px-4 py-3 shadow-[var(--zs-shadow-card)]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Icons.Sparkles className="h-4 w-4 text-[var(--zs-gold)]" />
                      <span className="text-sm font-semibold text-[var(--zs-ink)]">泽思AI顾问</span>
                      <Badge variant="outline" className="border-[var(--zs-line)] text-[var(--zs-sub)]">
                        未注册体验
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--zs-sub)]">
                      <span>已用 {anonymousTurns}/{ANONYMOUS_ADVISOR_LIMIT} 轮</span>
                      <button
                        type="button"
                        onClick={() => setShowLoginDialog(true)}
                        className="font-semibold text-[var(--zs-primary)] hover:underline"
                      >
                        注册后继续
                      </button>
                    </div>
                  </div>
                </div>

                {anonymousMessages.length === 0 && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] text-sm md:text-base pl-3">
                      <EnhancedMessage content="我是泽思AI顾问。你可以直接描述当前最棘手的经营问题，我会先给一个轻诊断判断，再推荐适合继续深入的能力入口。" />
                    </div>
                  </div>
                )}

                {anonymousMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] text-sm md:text-base ${
                        msg.role === "user"
                          ? "rounded-[var(--zs-radius-md)] p-3 md:p-4 bg-[var(--zs-primary)] text-white"
                          : "pl-3"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        renderAssistantContent(msg.content)
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isStreaming && streamingMessage && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] text-sm md:text-base pl-3">
                      {renderAssistantContent(streamingMessage)}
                    </div>
                  </div>
                )}

                {anonymousLimitReached && (
                  <Card className="rounded-[var(--zs-radius-lg)] border-[var(--zs-line)] bg-[var(--zs-card)] p-4 shadow-[var(--zs-shadow-card)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm leading-6 text-[var(--zs-sub)]">{ANONYMOUS_REGISTER_GUIDANCE}</p>
                      <Button onClick={() => setShowLoginDialog(true)} className="shrink-0 gap-2">
                        <Icons.LogIn className="h-4 w-4" />
                        注册 / 登录
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            ) : !isAuthenticated ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-[var(--zs-primary)] rounded-[var(--zs-radius-lg)] flex items-center justify-center mx-auto mb-6">
                    <IconComponent className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">欢迎使用 {agent?.name}</h2>
                  <p className="text-muted-foreground mb-6">{agent?.description}</p>
                  <Button
                    onClick={() => setShowLoginDialog(true)}
                    className="gap-2"
                    size="lg"
                  >
                    <Icons.LogIn className="w-4 h-4" />
                    登录开始咨询
                  </Button>
                </div>
              </div>
            ) : !conversationId ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center text-muted-foreground">
                  <Icons.Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>正在准备对话...</p>
                </div>
              </div>
            ) : (
              <>
                {isZesaiAdvisor && (
                  <div className="mb-5 rounded-[var(--zs-radius-lg)] border border-[var(--zs-line)] bg-[var(--zs-card)] px-4 py-3 shadow-[var(--zs-shadow-card)]">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Icons.Sparkles className="h-4 w-4 text-[var(--zs-gold)]" />
                        <span className="text-sm font-semibold text-[var(--zs-ink)]">泽思AI顾问</span>
                        <Badge variant="outline" className="border-[var(--zs-line)] text-[var(--zs-sub)]">
                          团队顾问
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--zs-sub)]">
                        <span>剩余额度 {credits ? credits.total.toLocaleString() : "..."} 积分</span>
                        <span>每轮对话 {CHAT_CREDIT_COST} 积分</span>
                        <Link href="/credits" className="font-semibold text-[var(--zs-primary)] hover:underline">
                          获取额度
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
                {/* 临时欢迎消息（在数据库保存完成前显示） */}
                {tempWelcomeMessage && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] text-sm md:text-base pl-3">
                      {renderAssistantContent(tempWelcomeMessage)}
                    </div>
                  </div>
                )}
                {messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] text-sm md:text-base ${
                        msg.role === "user"
                          ? "rounded-[var(--zs-radius-md)] p-3 md:p-4 bg-[var(--zs-primary)] text-white"
                          : "pl-3"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        renderAssistantContent(msg.content)
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                
              {/* 临时用户消息（立即显示） */}
              {tempUserMessage && (
                <div className="flex justify-end">
                  <div className="max-w-[90%] rounded-[var(--zs-radius-md)] p-3 md:p-4 text-sm md:text-base bg-[var(--zs-primary)] text-white">
                    <p className="whitespace-pre-wrap">{tempUserMessage}</p>
                  </div>
                </div>
              )}

              
              {/* Streaming message */}
              {isStreaming && streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] text-sm md:text-base pl-3">
                    {renderAssistantContent(streamingMessage)}
                  </div>
                </div>
              )}
            </>
            )}
            {/* 正在等待响应提示 */}
            {isWaitingForResponse && (
              <div className="flex justify-start">
                <div className="p-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="font-medium">泽思</span>
                    <span>正在思考</span>
                    <span className="inline-flex">
                      <span className="animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }}>·</span>
                      <span className="animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }}>·</span>
                      <span className="animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }}>·</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input area - fixed at bottom */}
      <div className="flex-shrink-0 border-t border-[var(--zs-line)] bg-[rgba(250,250,248,.9)] backdrop-blur-[12px]">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6 lg:px-8">
          {/* ChatGPT风格统一输入容器 */}
          {isAuthenticated && (
            <div className="mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[var(--zs-sub)]">
              <span>剩余额度 {credits ? credits.total.toLocaleString() : "..."} 积分</span>
              <span>本轮对话将消耗 {CHAT_CREDIT_COST} 积分</span>
            </div>
          )}
          {isAnonymousAdvisorMode && (
            <div className="mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[var(--zs-sub)]">
              <span>未注册体验 {anonymousTurns}/{ANONYMOUS_ADVISOR_LIMIT} 轮</span>
              <span>注册后使用现有积分额度继续对话</span>
            </div>
          )}
          <div className="flex items-end gap-2 rounded-[var(--zs-radius-lg)] border border-[var(--zs-line)] bg-[var(--zs-card)] px-3 py-2 shadow-[var(--zs-shadow-card)]">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            {/* 附件按钮 - 内部左侧 */}
            <button
              onClick={handleFileUpload}
              disabled={!isAuthenticated}
              title="上传文档"
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[var(--zs-sub)] hover:text-[var(--zs-ink)] transition-colors rounded-[var(--zs-radius-sm)] hover:bg-[var(--zs-bg-soft)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icons.Plus className="w-5 h-5" />
            </button>
            {/* 输入框 */}
            <Textarea
              placeholder={
                anonymousLimitReached
                  ? "注册后继续深入对话"
                  : isAnonymousAdvisorMode
                    ? "直接描述你的经营问题，未注册可体验 3 轮..."
                    : !isAuthenticated
                      ? "请先登录后开始咨询..."
                      : "请输入您的信息或问题..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={inputDisabled}
              className="flex-1 min-h-[24px] max-h-[200px] resize-none text-sm sm:text-base bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-1"
              rows={1}
              style={{
                height: 'auto',
                overflowY: message.split('\n').length > 5 ? 'auto' : 'hidden',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 200) + 'px';
              }}
            />
            {/* 发送按钮 - 内部右侧 */}
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || inputDisabled}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[var(--zs-primary)] text-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--zs-primary-2)] transition-colors"
            >
              {sendMessage.isPending || (isAnonymousAdvisorMode && (isStreaming || isWaitingForResponse)) ? (
                <Icons.Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Icons.ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">AI 也可能会犯错，请核查重要信息。</p>
        </div>
      </div>

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
  const href = getRecommendedSkillHref(skill);
  const cta = getRecommendedSkillCta(skill);
  const isAvailable = skill.status === "available";

  return (
    <Card className="max-w-xl rounded-[var(--zs-radius-lg)] border-[var(--zs-line)] bg-[var(--zs-card)] p-4 shadow-[var(--zs-shadow-card)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[var(--zs-ink)]">{skill.name}</span>
            <Badge
              variant="outline"
              className={
                isAvailable
                  ? "border-[rgba(31,61,50,.22)] bg-[var(--zs-primary-soft)] text-[var(--zs-primary)]"
                  : "border-[rgba(201,162,75,.32)] bg-[rgba(201,162,75,.16)] text-[#6f551d]"
              }
            >
              {isAvailable ? "available" : "coming_soon"}
            </Badge>
          </div>
          {skill.reason ? (
            <p className="mt-2 text-sm leading-6 text-[var(--zs-sub)]">{skill.reason}</p>
          ) : null}
        </div>
        <Button asChild variant={isAvailable ? "default" : "outline"} className="shrink-0 gap-2">
          <Link href={href}>
            {cta}
            {isAvailable ? <Icons.ArrowRight className="h-4 w-4" /> : <Icons.Bell className="h-4 w-4" />}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
