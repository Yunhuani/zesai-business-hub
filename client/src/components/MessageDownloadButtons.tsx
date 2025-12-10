import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { toast } from "sonner";

interface MessageDownloadButtonsProps {
  messageId: number;
  content: string;
  conversationTitle: string;
}

/**
 * 检测消息内容中的文件类型标注
 */
function detectFileTypes(content: string): string[] {
  const types: string[] = [];
  
  // 检测PDF标注
  if (/[（(]PDF[）)]|[（(]pdf[）)]/i.test(content)) {
    types.push('pdf');
  }
  
  // 检测PPT标注
  if (/[（(]PPT[）)]|[（(]ppt[）)]/i.test(content)) {
    types.push('ppt');
  }
  
  // 检测Excel标注
  if (/[（(]Excel[）)]|[（(]excel[）)]|[（(]表格[）)]/i.test(content)) {
    types.push('excel');
  }
  
  return types;
}

export function MessageDownloadButtons({ messageId, content, conversationTitle }: MessageDownloadButtonsProps) {
  const fileTypes = detectFileTypes(content);
  
  // 如果没有检测到任何文件类型标注，不显示下载按钮
  if (fileTypes.length === 0) {
    return null;
  }

  const exportPDF = trpc.export.exportMessagePDF.useMutation({
    onSuccess: async (data) => {
      try {
        // Convert base64 to blob
        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        
        // Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success("PDF下载成功!");
      } catch (error) {
        console.error('PDF download error:', error);
        toast.error("PDF下载失败");
      }
    },
    onError: (error) => {
      toast.error("生成PDF失败: " + error.message);
    },
  });

  const handleDownloadPDF = () => {
    exportPDF.mutate({ 
      messageId,
      title: conversationTitle 
    });
  };

  const handleDownloadPPT = () => {
    toast.info("PPT导出功能开发中，敬请期待");
  };

  const handleDownloadExcel = () => {
    toast.info("Excel导出功能开发中，敬请期待");
  };

  return (
    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
      {fileTypes.includes('pdf') && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleDownloadPDF}
          disabled={exportPDF.isPending}
        >
          {exportPDF.isPending ? (
            <Icons.Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Icons.Download className="w-4 h-4" />
          )}
          下载PDF
        </Button>
      )}
      
      {fileTypes.includes('ppt') && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleDownloadPPT}
        >
          <Icons.Download className="w-4 h-4" />
          下载PPT
        </Button>
      )}
      
      {fileTypes.includes('excel') && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleDownloadExcel}
        >
          <Icons.Download className="w-4 h-4" />
          下载Excel
        </Button>
      )}
    </div>
  );
}
