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
import { toast } from "sonner";

export default function AgentChat() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const agentId = parseInt(params.id || "0");
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  const { data: agent, isLoading: agentLoading } = trpc.agent.getById.useQuery({ id: agentId });
  const { data: subscriptionData } = trpc.subscription.get.useQuery(undefined, { enabled: isAuthenticated });
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 自动创建对话并发送欢迎消息
  useEffect(() => {
    if (agent && isAuthenticated && !conversationId) {
      createConversation.mutate({
        agentId: agent.id,
        title: `${agent.name} - ${new Date().toLocaleDateString()}`,
      });
    }
  }, [agent, isAuthenticated]);

  const createConversation = trpc.conversation.create.useMutation({
    onSuccess: (data) => {
      setConversationId(data.insertId as number);
      // 自动发送欢迎消息
      setTimeout(() => {
        sendWelcomeMessage.mutate({
          conversationId: data.insertId as number,
          agentId: agentId,
        });
      }, 500);
    },
    onError: (error) => {
      toast.error("创建对话失败: " + error.message);
    },
  });

  const sendWelcomeMessage = trpc.message.sendWelcome.useMutation({
    onSuccess: () => {
      refetchMessages();
    },
  });

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: () => {
      refetchMessages();
      setMessage("");
      setIsFirstMessage(false);
    },
    onError: (error) => {
      toast.error("发送消息失败: " + error.message);
    },
  });

  const exportPDF = trpc.export.exportPDF.useMutation({
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);

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

  const handleExportPDF = () => {
    if (!conversationId) return;
    exportPDF.mutate({ conversationId });
  };

  const handleExportPPT = () => {
    if (!conversationId) return;
    generatePPTMutation.mutate({ conversationId });
  };

  const handleSendMessage = () => {
    if (!message.trim() || !conversationId) return;
    sendMessage.mutate({
      conversationId,
      content: message,
    });
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
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
            {subscriptionData && (
              <div className="text-sm text-muted-foreground">
                {subscriptionData.usage.limit === 0
                  ? "无限次咨询"
                  : `剩余 ${subscriptionData.usage.remaining}/${subscriptionData.usage.limit} 次`}
              </div>
            )}
            <Link href="/history">
              <Button variant="ghost" className="gap-2">
                <Icons.History className="w-4 h-4" />
                历史记录
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Messages */}
          <div className="space-y-4 min-h-[500px] max-h-[600px] overflow-y-auto bg-white rounded-lg border shadow-sm p-6">
            {!messages || messages.length === 0 ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center text-muted-foreground">
                  <Icons.Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p>正在准备对话...</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-4 ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white"
                        : "bg-gray-50 border"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <EnhancedMessage content={msg.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border rounded-lg p-4">
                  <Icons.Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Export buttons */}
          {conversationId && messages && messages.length > 2 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={exportPDF.isPending}
                className="gap-2"
              >
                {exportPDF.isPending ? (
                  <Icons.Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icons.FileText className="w-4 h-4" />
                )}
                导出PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPPT}
                disabled={generatePPTMutation.isPending}
                className="gap-2"
              >
                {generatePPTMutation.isPending ? (
                  <Icons.Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icons.Presentation className="w-4 h-4" />
                )}
                生成PPT
              </Button>
            </div>
          )}

          {/* Input area */}
          <Card className="p-4 bg-white shadow-sm">
            <div className="space-y-3">
              {isFirstMessage && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                  <Icons.Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    💡 <strong>提示:</strong> 您提供的信息越详细,生成的方案质量就越高。您可以通过对话或上传文档(PDF/Word/Excel)的方式提供信息。
                  </p>
                </div>
              )}
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
                  placeholder="输入您的问题或信息..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={sendMessage.isPending || !conversationId}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessage.isPending || !conversationId}
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
          </Card>
        </div>
      </div>
    </div>
  );
}
