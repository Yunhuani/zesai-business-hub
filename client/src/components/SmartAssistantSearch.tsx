import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";

interface SmartAssistantSearchProps {
  smartAssistantId: number;
}

// 示例问题列表
const EXAMPLE_QUESTIONS = [
  "帮我写一份Pre-A轮融资的商业计划书",
  "分析一下新能源汽车行业的竞争格局",
  "我的SaaS产品月活停滞，如何突破？",
  "三个合伙人，股权应该怎么分配？",
  "如何从0到1打造个人IP？",
];

export function SmartAssistantSearch({ smartAssistantId }: SmartAssistantSearchProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const [placeholder, setPlaceholder] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // 打字机效果
  useEffect(() => {
    // 如果用户已输入内容或聚焦，停止动画
    if (query || isFocused) {
      return;
    }

    const currentQuestion = EXAMPLE_QUESTIONS[questionIndex];

    if (isPaused) {
      // 暂停2秒后开始删除
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(pauseTimer);
    }

    if (!isDeleting) {
      // 打字阶段
      if (charIndex < currentQuestion.length) {
        const typeTimer = setTimeout(() => {
          setPlaceholder(currentQuestion.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, 80);
        return () => clearTimeout(typeTimer);
      } else {
        // 打字完成，进入暂停
        setIsPaused(true);
      }
    } else {
      // 删除阶段
      if (charIndex > 0) {
        const deleteTimer = setTimeout(() => {
          setCharIndex(charIndex - 1);
          setPlaceholder(currentQuestion.slice(0, charIndex - 1));
        }, 30);
        return () => clearTimeout(deleteTimer);
      } else {
        // 删除完成，切换到下一个问题
        setIsDeleting(false);
        setQuestionIndex((questionIndex + 1) % EXAMPLE_QUESTIONS.length);
      }
    }
  }, [query, isFocused, questionIndex, charIndex, isDeleting, isPaused]);

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

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    if (!query) {
      setIsFocused(false);
      // 重置打字机状态
      setQuestionIndex(0);
      setCharIndex(0);
      setIsDeleting(false);
      setIsPaused(false);
      setPlaceholder("");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex gap-2 md:gap-3 items-center bg-background/80 backdrop-blur-sm border-2 border-purple-200/50 rounded-xl p-2 md:p-3 shadow-diffuse hover:shadow-lg hover:border-purple-300/70 transition-all duration-300">
        <div className="flex-1 relative">
          <Textarea
            placeholder={isFocused || query ? "描述你的商业挑战或目标..." : ""}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm md:text-base bg-transparent min-h-[36px] md:min-h-[40px] max-h-[120px] resize-none py-2"
            rows={1}
            style={{
              height: 'auto',
              overflowY: query.split('\n').length > 3 ? 'auto' : 'hidden',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          {/* 打字机效果的placeholder */}
          {!query && !isFocused && (
            <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center pointer-events-none px-3 py-2">
              <span className="text-sm md:text-base text-muted-foreground">
                {placeholder}
                <span className="animate-pulse">|</span>
              </span>
            </div>
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-4 md:px-8 md:py-6 text-sm md:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
          <span className="hidden md:inline">开始咨询</span>
        </Button>
      </div>
      <div className="text-center mt-4">
        <p className="text-xs text-muted-foreground">
          不知道选下面哪个AI顾问，在框内输入你想解决的问题
        </p>
      </div>
    </div>
  );
}
