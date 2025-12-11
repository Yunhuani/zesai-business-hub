import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const PLATFORM_ASSISTANT_ID = 999999;

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface CustomerSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CustomerSupportDialog({
  open,
  onOpenChange,
}: CustomerSupportDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  // Initialize conversation when dialog opens
  const { data: agent } = trpc.agent.getById.useQuery(
    { id: PLATFORM_ASSISTANT_ID },
    { enabled: open }
  );

  const createConversation = trpc.conversation.create.useMutation({
    onSuccess: (data) => {
      setConversationId(data.insertId);
      // Add welcome message
      if (agent?.welcomeMessage) {
        setMessages([
          {
            role: "assistant",
            content: agent.welcomeMessage,
            timestamp: new Date(),
          },
        ]);
      }
    },
    onError: (error) => {
      toast.error("创建对话失败：" + error.message);
    },
  });

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: (data) => {
      // Add AI response to messages
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
        },
      ]);

      // Check if user wants to transfer to human support
      if (
        input.includes("转人工") ||
        data.content.includes("创建了人工客服工单")
      ) {
        // Create support ticket
        createTicket.mutate({
          conversationId: conversationId!,
        });
      }
    },
    onError: (error) => {
      toast.error("发送消息失败：" + error.message);
    },
  });

  const createTicket = trpc.support.createTicket.useMutation({
    onSuccess: () => {
      toast.success("已创建客服工单，我们会尽快处理您的问题");
    },
    onError: (error) => {
      toast.error("创建工单失败：" + error.message);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize conversation when dialog opens
  useEffect(() => {
    if (open && !conversationId) {
      createConversation.mutate({
        agentId: PLATFORM_ASSISTANT_ID,
        title: "客服咨询",
      });
    }
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
      setConversationId(null);
    }
  }, [open]);

  const handleSend = () => {
    if (!input.trim() || !conversationId) return;

    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: input,
        timestamp: new Date(),
      },
    ]);

    // Send to backend
    sendMessage.mutate({
      conversationId,
      content: input,
    });

    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[700px] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>平台助手</DialogTitle>
          <DialogDescription>
            我可以帮您解答平台使用问题、技术支持和投诉建议
          </DialogDescription>
        </DialogHeader>

        {/* Messages area */}
        <ScrollArea className="flex-1 px-6" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Streamdown>{message.content}</Streamdown>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  )}
                  <p
                    className={`text-xs mt-1 ${
                      message.role === "user"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="p-6 pt-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题..."
              disabled={sendMessage.isPending || !conversationId}
            />
            <Button
              onClick={handleSend}
              disabled={
                !input.trim() || sendMessage.isPending || !conversationId
              }
              size="icon"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            提示：如需人工客服，请输入"转人工"
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
