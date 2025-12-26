import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { EnhancedMessage } from "@/components/EnhancedMessage";
import { MessageDownloadButtons } from "@/components/MessageDownloadButtons";
import { DocumentDownloadButtons } from "@/components/chat/DocumentDownloadButtons";
import { toast } from "sonner";
import { InsufficientCreditsDialog } from "@/components/InsufficientCreditsDialog";
import { LoginMethodDialog } from "@/components/LoginMethodDialog";
import { WeChatBrowserGuide } from "@/components/WeChatBrowserGuide";
import { isWeChatBrowser } from "@/utils/wechatDetector";

export default function AgentChat() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const agentId = parseInt(params.id || "0");
  const urlConversationId = location.startsWith('/conversation/') ? parseInt(params.id || "0") : null;
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  // Get initial message from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const initialMessage = urlParams.get('initial');
  
  // Get conversation data if loading from URL
  const { data: conversationData } = trpc.conversation.getById.useQuery(
    { id: urlConversationId! },
    { enabled: !!urlConversationId }
  );
  
  const effectiveAgentId = urlConversationId && conversationData ? conversationData.agentId : agentId;
  const { data: agent, isLoading: agentLoading } = trpc.agent.getById.useQuery(
    { id: effectiveAgentId },
    { enabled: !!effectiveAgentId }
  );
  
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
  const [isThinking, setIsThinking] = useState(false);

  const { data: messages, refetch: refetchMessages } = trpc.message.list.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId }
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
  
  // Cleanup typewriter interval on unmount
  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
      }
    };
  }, []);

  // Load conversation from URL if present
  useEffect(() => {
    if (urlConversationId && isAuthenticated) {
      setConversationId(urlConversationId);
    }
  }, [urlConversationId, isAuthenticated]);

  // Load latest conversation or create new one
  useEffect(() => {
    if (agent && isAuthenticated && !conversationId && !urlConversationId) {
      if (latestConversation) {
        // Load existing conversation
        setConversationId(latestConversation.id);
      } else if (latestConversation === null) {
        // Only create when we confirmed there's no existing conversation
        createConversation.mutate({
          agentId: agent.id,
          title: `${agent.name} - ${new Date().toLocaleDateString()}`,
        });
      }
      // If latestConversation is undefined, it means query is still loading, wait
    }
  }, [agent, isAuthenticated, conversationId, urlConversationId, latestConversation]);

  // Welcome message is sent automatically when creating a new conversation
  // No need to send it again when loading existing conversations

  const createConversation = trpc.conversation.create.useMutation({
    onSuccess: (data) => {
      const newConversationId = data.insertId as number;
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
        agentId: agentId,
      });
      
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

  const exportPDF = trpc.export.exportPDF.useMutation({
    onSuccess: async (data) => {
      try {
        console.log('PDF export response:', { dataLength: data.data?.length, filename: data.filename });
        // Convert base64 to blob
        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success("专业PDF报告已生成！");
      } catch (error) {
        console.error('Export error:', error);
        toast.error("导出失败");
      }
    },
    onError: (error) => {
      toast.error("导出失败: " + error.message);
    },
  });

  const generatePPTMutation = trpc.export.generatePPT.useMutation({
    onSuccess: async (data) => {
      try {
        // Convert base64 to blob
        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success("专业PPT已生成！");
      } catch (error) {
        console.error('Export error:', error);
        toast.error("导出失败");
      }
    },
    onError: (error) => {
      toast.error("生成失败: " + error.message);
    },
  });
  
  // Keep legacy exportPPT for compatibility
  const exportPPT = trpc.export.exportPPT.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data.slides, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("导出PPT结构成功!");
    },
    onError: (error) => {
      toast.error("导出失败: " + error.message);
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

  if (authLoading || agentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Agent 不存在</h2>
          <Button asChild>
            <Link href="/">返回首页</Link>
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = (Icons as any)[agent.icon] || Icons.Sparkles;

  // 暂时隐藏文档导出功能
  // const handleExportPDF = () => {
  //   if (!conversationId) return;
  //   exportPDF.mutate({ conversationId });
  // };

  // const handleExportPPT = () => {
  //   if (!conversationId) return;
  //   generatePPTMutation.mutate({ conversationId });
  // };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // 检查登录状态，未登录则显示登录选择对话框
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
    setMessage("");
    
    // 立即显示用户消息
    setTempUserMessage(userMessage);
    // 显示“正在思考...”
    setIsThinking(true);
    setIsStreaming(false);
    setStreamingMessage("");
    
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
                // 第一次收到内容时，关闭思考状态，开启流式显示
                if (isThinking) {
                  setIsThinking(false);
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
      setIsThinking(false);
      setTempUserMessage(null);
      setMessage(userMessage); // Restore message on error
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
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
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <Icons.ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{agent.name}</h1>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {latestConversation && conversationId === latestConversation.id && (
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() => {
                  createConversation.mutate({
                    agentId: agent.id,
                    title: `${agent.name} - ${new Date().toLocaleDateString()}`,
                  });
                }}
              >
                <Icons.Plus className="w-4 h-4" />
                开始新对话
              </Button>
            )}
            {/* PDF/PPT导出按钮已移至消息内容下方 */}
          </div>
        </div>
      </header>

      {/* Messages area - scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* WeChat Browser Guide */}
          {isInWeChatBrowser && (
            <div className="mb-6">
              <WeChatBrowserGuide />
            </div>
          )}
          
          <div className="space-y-4">
            {!isAuthenticated ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
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
                {/* 临时欢迎消息（在数据库保存完成前显示） */}
                {tempWelcomeMessage && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] bg-gray-50 border rounded-lg p-4 text-sm">
                      <EnhancedMessage content={tempWelcomeMessage} />
                    </div>
                  </div>
                )}
                {messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-lg p-4 text-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white"
                          : "bg-gray-50 border"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <>
                          <EnhancedMessage content={msg.content} />
                          <MessageDownloadButtons 
                            messageId={msg.id}
                            content={msg.content}
                            conversationTitle={agent?.name || '商业咨询报告'}
                          />
                          {conversationId && (
                            <DocumentDownloadButtons
                              messageId={msg.id}
                              conversationId={conversationId}
                              agentId={agent?.id || 0}
                              content={msg.content}
                            />
                          )}
                        </>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                
              {/* 临时用户消息（立即显示） */}
              {tempUserMessage && (
                <div className="flex justify-end">
                  <div className="max-w-[90%] rounded-lg p-4 text-sm bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                    <p className="whitespace-pre-wrap">{tempUserMessage}</p>
                  </div>
                </div>
              )}
              
              {/* 思考中提示 */}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium">泽思AI</span>
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
              
              {/* Streaming message */}
              {isStreaming && streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] bg-gray-50 border rounded-lg p-4 text-sm">
                    <EnhancedMessage content={streamingMessage} />
                  </div>
                </div>
              )}
            </>
            )}
            {sendMessage.isPending && !isStreaming && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">Zenith AI</span>
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
      <div className="border-t bg-white flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFileUpload}
                  title="上传文档"
                >
                  <Icons.Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  placeholder={!isAuthenticated ? "请先登录后开始咨询..." : "输入您的问题或信息..."}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!isAuthenticated || sendMessage.isPending || !conversationId}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!isAuthenticated || !message.trim() || sendMessage.isPending || !conversationId}
                  className="gap-2"
                >
                  {sendMessage.isPending ? (
                    <Icons.Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icons.Send className="w-4 h-4" />
                  )}
                  发送
                </Button>
          </div>
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
