import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: "至少8个字符", test: (p) => p.length >= 8 },
  { label: "包含大写字母", test: (p) => /[A-Z]/.test(p) },
  { label: "包含小写字母", test: (p) => /[a-z]/.test(p) },
  { label: "包含数字", test: (p) => /[0-9]/.test(p) },
  { label: "包含特殊字符", test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const results = useMemo(() => {
    return requirements.map((req) => ({
      ...req,
      passed: req.test(password),
    }));
  }, [password]);

  const passedCount = results.filter((r) => r.passed).length;
  
  // 计算强度等级
  const strength = useMemo(() => {
    if (passedCount <= 2) return { level: "弱", color: "bg-red-500", width: "33%" };
    if (passedCount <= 4) return { level: "中等", color: "bg-yellow-500", width: "66%" };
    return { level: "强", color: "bg-green-500", width: "100%" };
  }, [passedCount]);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* 强度指示条 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-4 h-4 rounded-full border-2 ${passedCount >= 3 ? 'border-green-500' : 'border-gray-500'}`} />
          <span className={passedCount <= 2 ? 'text-red-400' : passedCount <= 4 ? 'text-yellow-400' : 'text-green-400'}>
            {strength.level}
          </span>
        </div>
        <div className="flex gap-1">
          <div className={`h-1 flex-1 rounded ${passedCount >= 1 ? (passedCount <= 2 ? 'bg-red-500' : passedCount <= 4 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-600'}`} />
          <div className={`h-1 flex-1 rounded ${passedCount >= 3 ? (passedCount <= 4 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-600'}`} />
          <div className={`h-1 flex-1 rounded ${passedCount >= 5 ? 'bg-green-500' : 'bg-gray-600'}`} />
        </div>
      </div>

      {/* 校验清单 */}
      <div className="space-y-1">
        {results.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {req.passed ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <X className="w-4 h-4 text-gray-500" />
            )}
            <span className={req.passed ? "text-green-400" : "text-gray-500"}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 导出校验函数供表单使用
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "密码长度至少8位" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "密码需要包含大写字母" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "密码需要包含小写字母" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "密码需要包含数字" };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: "密码需要包含特殊字符" };
  }
  return { valid: true };
}
