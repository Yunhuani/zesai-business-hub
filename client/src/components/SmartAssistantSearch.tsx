import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">
          不知道选哪个AI顾问，可以在下方框内输入你想解决的问题
        </p>
      </div>
      
      <div className="flex gap-3 items-center bg-background/80 backdrop-blur-sm border-2 border-purple-200/50 rounded-xl p-3 shadow-diffuse hover:shadow-lg hover:border-purple-300/70 transition-all duration-300">
        <Textarea
          placeholder="描述你的商业挑战或目标..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base bg-transparent min-h-[40px] max-h-[120px] resize-none py-2"
          rows={1}
          style={{
            height: 'auto',
            overflowY: query.split('\n').length > 3 ? 'auto' : 'hidden'
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
          }}
        />
        <Button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          开始咨询
        </Button>
      </div>
    </div>
  );
}
