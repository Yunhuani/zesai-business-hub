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

/**
 * 消息下载按钮组件
 * 
 * 注意：文档下载功能已暂时隐藏，等技术成熟后再开放
 * 如需恢复，将下面的 return null 改为原来的实现代码
 */
export function MessageDownloadButtons({ messageId, content, conversationTitle }: MessageDownloadButtonsProps) {
  // 暂时隐藏文档下载功能，等技术成熟后再开放
  return null;
  
  // ===== 以下代码已注释，保留用于将来恢复功能 =====
  /*
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

  const exportExcel = trpc.export.exportMessageExcel.useMutation({
    onSuccess: async (data) => {
      try {
        // Convert base64 to blob
        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success("Excel下载成功!");
      } catch (error) {
        console.error('Excel download error:', error);
        toast.error("Excel下载失败");
      }
    },
    onError: (error) => {
      toast.error("生成Excel失败: " + error.message);
    },
  });

  const handleDownloadExcel = () => {
    exportExcel.mutate({ 
      messageId,
      title: conversationTitle 
    });
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
          disabled={exportExcel.isPending}
        >
          {exportExcel.isPending ? (
            <Icons.Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Icons.Download className="w-4 h-4" />
          )}
          下载Excel
        </Button>
      )}
    </div>
  );
  */
}
