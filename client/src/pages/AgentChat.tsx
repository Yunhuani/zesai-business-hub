import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

export default function AgentChat() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const agentId = parseInt(params.id || "0");
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  const { data: agent, isLoading: agentLoading } = trpc.agent.getById.useQuery({ id: agentId });
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [showInputForm, setShowInputForm] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const createConversation = trpc.conversation.create.useMutation({
    onSuccess: (data) => {
      setConversationId(data.insertId as number);
      setShowInputForm(false);
    },
    onError: (error) => {
      toast.error("创建对话失败: " + error.message);
    },
  });

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: () => {
      refetchMessages();
      setMessage("");
    },
    onError: (error) => {
      toast.error("发送消息失败: " + error.message);
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
  const inputFields = JSON.parse(agent.inputFields) as Array<{ name: string; label: string }>;

  const handleStartConversation = () => {
    if (!agent) return;
    createConversation.mutate({
      agentId: agent.id,
      title: `${agent.name} - ${new Date().toLocaleDateString()}`,
    });
  };

  const handleSendMessage = () => {
    if (!message.trim() || !conversationId) return;
    sendMessage.mutate({
      conversationId,
      content: message,
      userInputs: Object.keys(userInputs).length > 0 ? userInputs : undefined,
    });
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
          <Link href="/history">
            <Button variant="ghost" className="gap-2">
              <Icons.History className="w-4 h-4" />
              历史记录
            </Button>
          </Link>
        </div>
      </header>

      <div className="container py-8 max-w-4xl">
        {showInputForm ? (
          <Card>
            <CardHeader>
              <CardTitle>开始咨询</CardTitle>
              <CardDescription>请填写以下信息,帮助我们更好地为您提供咨询服务</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {inputFields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Textarea
                    id={field.name}
                    placeholder={`请输入${field.label}`}
                    value={userInputs[field.name] || ""}
                    onChange={(e) => setUserInputs({ ...userInputs, [field.name]: e.target.value })}
                    rows={3}
                  />
                </div>
              ))}
              <Button
                onClick={handleStartConversation}
                disabled={createConversation.isPending}
                className="w-full"
              >
                {createConversation.isPending ? (
                  <>
                    <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Icons.MessageSquare className="w-4 h-4 mr-2" />
                    开始对话
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Messages */}
            <div className="space-y-4 min-h-[400px] max-h-[600px] overflow-y-auto bg-gray-50 rounded-lg p-4">
              {messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white border shadow-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Streamdown>{msg.content}</Streamdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {sendMessage.isPending && (
                <div className="flex justify-start">
                  <div className="bg-white border shadow-sm rounded-lg p-4">
                    <Icons.Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="输入您的问题..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={3}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessage.isPending}
                    size="icon"
                    className="h-auto"
                  >
                    <Icons.Send className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  按 Enter 发送,Shift + Enter 换行
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
