import { MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "./ui/button";

/**
 * 右下角浮动客服按钮
 * 点击后跳转到客服表单页面
 */
export default function SupportFloatingButton() {
  return (
    <Link href="/support">
      <Button
        size="lg"
        className="hidden md:flex fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 z-50"
        aria-label="联系客服"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </Link>
  );
}
