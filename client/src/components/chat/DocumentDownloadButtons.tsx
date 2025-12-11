import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * 文档下载按钮组件
 * 识别AI消息中的文件清单并渲染下载按钮
 */

interface DocumentItem {
  fileId: string;
  fileName: string;
  format: "word" | "pdf";
}

interface DocumentDownloadButtonsProps {
  messageId: number;
  conversationId: number;
  agentId: number;
  content: string;
}

/**
 * 从消息内容中识别文件清单
 * 格式示例：
 * 【可下载文件】
 * - 商业计划书（完整版）.docx
 * - 融资路演PPT大纳.pdf
 */
function parseDocumentList(content: string): DocumentItem[] {
  const documents: DocumentItem[] = [];

  // 查找【可下载文件】标记
  const fileListMatch = content.match(/【可下载文件】\s*([\s\S]*?)(?=\n\n|$)/);
  if (!fileListMatch) return documents;

  const fileListContent = fileListMatch[1];
  const lines = fileListContent.split("\n");

  for (const line of lines) {
    // 匹配格式：- 文件名.扩展名（无类型标记）
    const match = line.match(/^-\s*(.+?)\.(docx|pdf)\s*$/);
    if (!match) continue;

    const [, fileName, format] = match;

    // 生成fileId（用于去重和缓存）
    const fileId = fileName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w\u4e00-\u9fa5_]/g, "");

    documents.push({
      fileId,
      fileName: `${fileName}.${format}`,
      format: format as "word" | "pdf",
    });
  }

  return documents;
}

export function DocumentDownloadButtons({
  messageId,
  conversationId,
  agentId,
  content,
}: DocumentDownloadButtonsProps) {
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const documents = parseDocumentList(content);

  const generateMutation = trpc.document.generate.useMutation({
    onSuccess: (data) => {
      setLoadingFileId(null);
      if (data.cached) {
        toast.success("文档已存在，直接下载");
      } else {
        toast.success("文档生成成功！");
      }
      // 自动下载
      window.open(data.downloadUrl, "_blank");
    },
    onError: (error) => {
      setLoadingFileId(null);
      toast.error(error.message || "文档生成失败");
    },
  });

  const handleDownload = (doc: DocumentItem) => {
    setLoadingFileId(doc.fileId);
    generateMutation.mutate({
      conversationId,
      messageId,
      agentId,
      fileId: doc.fileId,
      fileName: doc.fileName,
      format: doc.format,
      documentType: "heavy", // 统一使用最高质量标准
    });
  };

  // 如果没有识别到文件清单，不渲染
  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <FileText className="w-4 h-4" />
        可下载文件
      </div>
      <div className="flex flex-wrap gap-2">
        {documents.map((doc) => {
          const isLoading = loadingFileId === doc.fileId;
          const credits = 200; // 统一使用最高质量标准，200积分

          return (
            <Button
              key={doc.fileId}
              variant="outline"
              size="sm"
              onClick={() => handleDownload(doc)}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {doc.fileName}
              <span className="text-xs text-muted-foreground">
                ({credits}积分)
              </span>
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        提示：文件生成后7天内可免费重复下载
      </p>
    </div>
  );
}
