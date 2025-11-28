import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ExpertConsultationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpertConsultationDialog({
  open,
  onOpenChange,
}: ExpertConsultationDialogProps) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [requirement, setRequirement] = useState("");

  const submitRequest = trpc.system.submitExpertConsultation.useMutation({
    onSuccess: () => {
      toast.success("提交成功", {
        description: "我们的专家顾问将尽快与您联系",
      });
      setName("");
      setContact("");
      setRequirement("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("提交失败", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("请填写您的姓名");
      return;
    }
    
    if (!contact.trim()) {
      toast.error("请填写联系方式");
      return;
    }
    
    if (!requirement.trim()) {
      toast.error("请描述您的咨询需求");
      return;
    }

    submitRequest.mutate({
      name: name.trim(),
      contact: contact.trim(),
      requirement: requirement.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>联系专家顾问</DialogTitle>
          <DialogDescription>
            请填写以下信息,我们的专家顾问将尽快与您联系
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">姓名 *</Label>
            <Input
              id="name"
              placeholder="请输入您的姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitRequest.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">联系方式 *</Label>
            <Input
              id="contact"
              placeholder="手机号/微信号/邮箱"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              disabled={submitRequest.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requirement">咨询需求 *</Label>
            <Textarea
              id="requirement"
              placeholder="请简要描述您的咨询需求..."
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              disabled={submitRequest.isPending}
              rows={4}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitRequest.isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitRequest.isPending}>
              {submitRequest.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              提交
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
