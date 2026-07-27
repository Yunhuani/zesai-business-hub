import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail } from "lucide-react";
import { useLocation } from "wouter";

interface LoginMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 登录方式选择对话框
 * 提供邮箱登录方式（国内可用）
 */
export function LoginMethodDialog({ open, onOpenChange }: LoginMethodDialogProps) {
  const [, setLocation] = useLocation();

  const handleEmailLogin = () => {
    onOpenChange(false);
    setLocation("/login");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>选择登录方式</DialogTitle>
          <DialogDescription>
            请选择您偏好的登录方式继续使用
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {/* 邮箱登录 - 推荐 */}
          <Button
            onClick={handleEmailLogin}
            className="w-full h-auto py-4 flex flex-col items-start gap-2"
            variant="outline"
          >
            <div className="flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold flex items-center gap-2">
                  邮箱登录
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">推荐</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  使用邮箱和密码登录，国内访问稳定
                </div>
              </div>
            </div>
          </Button>
        </div>

        <div className="text-xs text-center text-muted-foreground">
          没有账号？选择邮箱登录后可以注册
        </div>
      </DialogContent>
    </Dialog>
  );
}
