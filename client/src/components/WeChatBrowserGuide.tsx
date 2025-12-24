import { AlertCircle, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCurrentUrl } from "@/utils/wechatDetector";

interface WeChatBrowserGuideProps {
  /**
   * 是否显示完整引导（包括操作说明）
   * 默认为 true
   */
  showFullGuide?: boolean;
}

/**
 * 微信浏览器引导组件
 * 提示用户在外部浏览器打开以获得更好体验
 */
export function WeChatBrowserGuide({ showFullGuide = true }: WeChatBrowserGuideProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    const url = getCurrentUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("链接已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("复制失败，请手动复制地址栏链接");
    });
  };

  return (
    <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        检测到您正在使用微信浏览器
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200 space-y-3">
        <p>
          由于微信浏览器的限制，部分功能可能无法正常使用（如登录状态保持）。
          建议您在外部浏览器（如Safari、Chrome）中打开以获得更好体验。
        </p>
        
        {showFullGuide && (
          <>
            <div className="space-y-2 text-sm">
              <p className="font-medium">如何在外部浏览器打开：</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>点击右上角"..."菜单按钮</li>
                <li>选择"在浏览器中打开"或"在Safari中打开"</li>
              </ol>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="gap-2 bg-white dark:bg-gray-800"
              >
                {copied ? (
                  <>
                    <Copy className="h-4 w-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    复制链接
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // 尝试在新窗口打开（某些情况下可能会跳转到外部浏览器）
                  window.open(getCurrentUrl(), '_blank');
                }}
                className="gap-2 bg-white dark:bg-gray-800"
              >
                <ExternalLink className="h-4 w-4" />
                尝试打开
              </Button>
            </div>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}
