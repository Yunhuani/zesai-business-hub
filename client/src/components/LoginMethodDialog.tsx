import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
          <DialogTitle className="text-[var(--zs-primary)]">注册后继续对话</DialogTitle>
        </DialogHeader>

        <Button
          onClick={handleEmailLogin}
          className="mt-2 h-12 w-full rounded-xl bg-[var(--zs-primary)] font-semibold text-white hover:bg-[var(--zs-primary-2)]"
        >
          用邮箱继续
        </Button>
      </DialogContent>
    </Dialog>
  );
}
