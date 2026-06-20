import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertCircle, CheckCircle } from "lucide-react";
import { z } from "zod";

interface ReferralStats {
  confirmedCommission?: number;
}

interface WithdrawFormProps {
  stats?: ReferralStats;
}

const banks = [
  { value: "工商银行", label: "中国工商银行" },
  { value: "农业银行", label: "中国农业银行" },
  { value: "中国银行", label: "中国银行" },
  { value: "建设银行", label: "中国建设银行" },
  { value: "交通银行", label: "交通银行" },
  { value: "招商银行", label: "招商银行" },
  { value: "浦发银行", label: "浦发银行" },
  { value: "民生银行", label: "民生银行" },
  { value: "光大银行", label: "光大银行" },
  { value: "华夏银行", label: "华夏银行" },
  { value: "其他", label: "其他银行" },
];

export default function WithdrawForm({ stats }: WithdrawFormProps) {
  const [formData, setFormData] = useState({
    amount: "",
    bankName: "",
    bankBranch: "",
    bankAccount: "",
    realName: "",
    idCard: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const requestWithdrawal = trpc.referral.requestWithdrawal.useMutation({
    onSuccess: () => {
      toast.success("提现申请已提交，我们将在5个工作日内完成打款");
      setFormData({
        amount: "",
        bankName: "",
        bankBranch: "",
        bankAccount: "",
        realName: "",
        idCard: "",
      });
      setErrors({});
    },
    onError: (error) => {
      toast.error(error.message || "提现申请失败");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // 清除该字段的错误
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, bankName: value }));
    if (errors.bankName) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.bankName;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const amount = parseFloat(formData.amount);
    if (!formData.amount) {
      newErrors.amount = "请输入提现金额";
    } else if (amount < 50) {
      newErrors.amount = "最低提现金额为¥50";
    } else if ((stats?.confirmedCommission || 0) < amount) {
      newErrors.amount = "可提现余额不足";
    }

    if (!formData.bankName) newErrors.bankName = "请选择银行";
    if (!formData.bankBranch) newErrors.bankBranch = "请填写开户行";
    if (!formData.bankAccount) newErrors.bankAccount = "请填写银行卡号";
    if (!formData.realName) newErrors.realName = "请填写真实姓名";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    requestWithdrawal.mutate({
      amount: parseFloat(formData.amount),
      bankName: formData.bankName,
      bankBranch: formData.bankBranch,
      bankAccount: formData.bankAccount,
      realName: formData.realName,
      idCard: formData.idCard || undefined,
    });
  };

  const confirmedBalance = stats?.confirmedCommission || 0;
  const isDisabled = confirmedBalance < 50;

  return (
    <Card>
      <CardHeader>
        <CardTitle>申请提现</CardTitle>
        <CardDescription>
          可提现余额：¥{confirmedBalance.toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isDisabled && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              可提现余额不足¥50，无法申请提现。请等待更多佣金确认。
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 提现金额 */}
          <div className="space-y-2">
            <Label htmlFor="amount">提现金额（元）*</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              placeholder="最低¥50"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              disabled={isDisabled || requestWithdrawal.isPending}
              className={errors.amount ? "border-red-500" : ""}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* 银行信息 */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium">银行账户信息</h3>

            <div className="space-y-2">
              <Label htmlFor="bankName">银行名称 *</Label>
              <Select value={formData.bankName} onValueChange={handleSelectChange}>
                <SelectTrigger
                  id="bankName"
                  disabled={isDisabled || requestWithdrawal.isPending}
                  className={errors.bankName ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="选择银行" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.value} value={bank.value}>
                      {bank.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bankName && (
                <p className="text-sm text-red-500">{errors.bankName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankBranch">开户行 *</Label>
              <Input
                id="bankBranch"
                name="bankBranch"
                placeholder="如：上海市分行XX支行"
                value={formData.bankBranch}
                onChange={handleChange}
                disabled={isDisabled || requestWithdrawal.isPending}
                className={errors.bankBranch ? "border-red-500" : ""}
              />
              {errors.bankBranch && (
                <p className="text-sm text-red-500">{errors.bankBranch}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccount">银行卡号 *</Label>
              <Input
                id="bankAccount"
                name="bankAccount"
                placeholder="请输入银行卡号"
                value={formData.bankAccount}
                onChange={handleChange}
                disabled={isDisabled || requestWithdrawal.isPending}
                className={errors.bankAccount ? "border-red-500" : ""}
              />
              {errors.bankAccount && (
                <p className="text-sm text-red-500">{errors.bankAccount}</p>
              )}
            </div>
          </div>

          {/* 个人信息 */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium">个人信息</h3>

            <div className="space-y-2">
              <Label htmlFor="realName">真实姓名 *</Label>
              <Input
                id="realName"
                name="realName"
                placeholder="请输入真实姓名"
                value={formData.realName}
                onChange={handleChange}
                disabled={isDisabled || requestWithdrawal.isPending}
                className={errors.realName ? "border-red-500" : ""}
              />
              {errors.realName && (
                <p className="text-sm text-red-500">{errors.realName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="idCard">身份证号（可选）</Label>
              <Input
                id="idCard"
                name="idCard"
                placeholder="用于税务处理"
                value={formData.idCard}
                onChange={handleChange}
                disabled={isDisabled || requestWithdrawal.isPending}
              />
            </div>
          </div>

          {/* 提示信息 */}
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              提现申请提交后，我们将在5个工作日内完成打款。单季度佣金≥¥800需代扣20%个税。
            </AlertDescription>
          </Alert>

          {/* 提交按钮 */}
          <Button
            type="submit"
            className="w-full"
            disabled={isDisabled || requestWithdrawal.isPending}
            size="lg"
          >
            {requestWithdrawal.isPending ? "提交中..." : "提交提现申请"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
