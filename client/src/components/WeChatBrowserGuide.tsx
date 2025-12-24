import { X, Lightbulb } from "lucide-react";
import { useState } from "react";

/**
 * 微信浏览器提示组件
 * 底部浅蓝色提示条，可关闭
 */
export function WeChatBrowserGuide() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-blue-50 border-t border-blue-200 shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                为了更好的体验，建议在浏览器中打开。
              </p>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="flex-shrink-0 p-1 rounded-full hover:bg-blue-100 transition-colors"
              aria-label="关闭提示"
            >
              <X className="h-4 w-4 text-blue-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
