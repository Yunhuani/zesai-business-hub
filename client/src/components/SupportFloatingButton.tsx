import { MessageCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";

/**
 * 右下角浮动客服按钮
 * 点击后跳转到客服表单页面
 * 只在首页、价格页等特定页面显示，对话页面不显示
 */
export default function SupportFloatingButton() {
  const [location] = useLocation();
  
  // 定义需要显示客服按钮的页面
  const showOnPages = [
    '/',              // 首页
    '/pricing',       // 价格套餐页
    '/credits',       // 积分充值页
    '/about',         // 关于我们
  ];
  
  // 对话页面不显示（/agent/:id 或 /conversation/:id）
  const isAgentPage = location.startsWith('/agent/') || location.startsWith('/conversation/');
  
  // 如果是对话页面，不显示
  if (isAgentPage) {
    return null;
  }
  
  // 如果不在白名单页面，也不显示
  if (!showOnPages.includes(location)) {
    return null;
  }
  
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
