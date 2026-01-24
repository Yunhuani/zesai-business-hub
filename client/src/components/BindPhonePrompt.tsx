import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

/**
 * 绑定手机号提示弹窗
 * - 老用户（邮箱注册，未绑定手机）：登录后立即弹窗
 * - 新用户（邮箱注册，未绑定手机）：第2次登录弹窗
 */
export function BindPhonePrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const markPromptedMutation = trpc.auth.markBindPhonePrompted.useMutation();

  useEffect(() => {
    if (!user) return;

    // 判断是否需要显示弹窗
    const shouldShowPrompt = () => {
      // 已有手机号，不需要提示
      if (user.phone) return false;
      
      // 已经提示过，不再提示
      if (user.bindPhonePrompted) return false;
      
      // 没有邮箱的用户（如手机注册用户），不需要提示
      if (!user.email) return false;
      
      // 老用户（loginCount为0或1表示首次登录）：立即提示
      // 新用户（loginCount >= 2）：第2次登录提示
      const loginCount = user.loginCount || 0;
      
      // 如果是老用户（之前注册但loginCount还是0），立即提示
      // 如果是新用户，第2次登录（loginCount >= 2）时提示
      if (loginCount === 0 || loginCount >= 2) {
        return true;
      }
      
      return false;
    };

    if (shouldShowPrompt()) {
      // 延迟1秒显示，让用户先看到首页
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleBind = async () => {
    // 标记已提示
    try {
      await markPromptedMutation.mutateAsync();
    } catch (e) {
      console.error("标记已提示失败", e);
    }
    setIsOpen(false);
    navigate("/bind-phone");
  };

  const handleSkip = async () => {
    // 标记已提示
    try {
      await markPromptedMutation.mutateAsync();
    } catch (e) {
      console.error("标记已提示失败", e);
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          {/* 图标 */}
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          
          {/* 标题 */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            绑定手机号，登录更便捷
          </h3>
          
          {/* 描述 */}
          <p className="text-gray-500 text-sm mb-6">
            绑定后可使用手机验证码快速登录
          </p>
          
          {/* 按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              跳过
            </button>
            <button
              onClick={handleBind}
              className="flex-1 px-4 py-2.5 text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/25"
            >
              立即绑定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
