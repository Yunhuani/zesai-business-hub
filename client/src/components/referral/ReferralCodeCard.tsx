import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ReferralCodeCardProps {
  code?: string;
  url?: string;
  loading?: boolean;
}

export default function ReferralCodeCard({ code, url, loading }: ReferralCodeCardProps) {
  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("邀请码已复制");
    }
  };

  const handleCopyUrl = () => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("邀请链接已复制");
    }
  };

  const handleShare = () => {
    if (url && navigator.share) {
      navigator.share({
        title: "泽思AI商业智库",
        text: "我在用泽思AI，邀请你一起来！",
        url: url,
      });
    } else if (url) {
      handleCopyUrl();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>我的邀请码</CardTitle>
        <CardDescription>分享邀请码给朋友，赚取佣金奖励</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <div className="h-10 bg-muted rounded animate-pulse" />
            <div className="h-10 bg-muted rounded animate-pulse" />
          </div>
        ) : (
          <>
            {/* 邀请码 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">邀请码</label>
              <div className="flex gap-2">
                <Input
                  value={code || ""}
                  readOnly
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                  title="复制邀请码"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 邀请链接 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">邀请链接</label>
              <div className="flex gap-2">
                <Input
                  value={url || ""}
                  readOnly
                  className="text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                  title="复制邀请链接"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 分享按钮 */}
            <Button
              onClick={handleShare}
              className="w-full"
              size="lg"
            >
              <Share2 className="w-4 h-4 mr-2" />
              分享邀请链接
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
