import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DiagnosisInsufficientCredits } from "@/lib/diagnosisSubmissionError";
import { CircleAlert } from "lucide-react";
import { Link } from "wouter";

interface DiagnosisInsufficientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFreeUser: boolean;
  credits: DiagnosisInsufficientCredits | null;
}

export function DiagnosisInsufficientDialog({
  open,
  onOpenChange,
  isFreeUser,
  credits,
}: DiagnosisInsufficientDialogProps) {
  if (!credits) return null;

  const actionHref = isFreeUser ? "/pricing" : "/credits";
  const actionLabel = isFreeUser ? "成为会员" : "购买积分包";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-[var(--zs-primary)]/15 bg-[var(--zs-card)] p-0 sm:max-w-md">
        <div className="h-1 bg-gradient-to-r from-[var(--zs-primary)] to-[var(--zs-gold)]" />
        <div className="p-6">
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--zs-primary-soft)] text-[var(--zs-primary)]">
              <CircleAlert className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl text-[var(--zs-primary)]">
              积分暂时不够
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-7 text-[var(--zs-sub)]">
              {isFreeUser ? (
                <>
                  做一次 NBG 增长诊断需 {credits.required.toLocaleString()} 积分，您还差{" "}
                  {credits.missing.toLocaleString()} 积分。成为泽思AI会员即可获得积分并使用。
                </>
              ) : (
                <>
                  本次诊断需 {credits.required.toLocaleString()} 积分，您还差{" "}
                  {credits.missing.toLocaleString()} 积分。可购买积分包补充后继续。
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button asChild className="w-full sm:w-auto">
              <Link href={actionHref} onClick={() => onOpenChange(false)}>
                {actionLabel}
              </Link>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
