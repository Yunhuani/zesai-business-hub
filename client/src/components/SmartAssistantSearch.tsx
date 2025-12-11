import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

interface SmartAssistantSearchProps {
  smartAssistantId: number;
}

export function SmartAssistantSearch({ smartAssistantId }: SmartAssistantSearchProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = () => {
    if (!query.trim()) return;
    
    // 跳转到智能AI助手页面，并携带用户输入作为初始消息
    setLocation(`/agent/${smartAssistantId}?initial=${encodeURIComponent(query)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-12">
      <div className="text-center mb-3">
        <p className="text-sm text-muted-foreground">
          不知道选哪个专家？试试<span className="font-semibold text-purple-600">【智能AI助手】</span>
        </p>
      </div>
      
      <div className="flex gap-3 items-center bg-background border-2 border-border rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
        <Input
          type="text"
          placeholder="描述你的商业挑战或目标..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
        />
        <Button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          开始咨询
        </Button>
      </div>
    </div>
  );
}
