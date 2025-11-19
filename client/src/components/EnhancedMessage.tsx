import { Streamdown } from 'streamdown';
import { MermaidChart } from './MermaidChart';
import { DataChart } from './DataChart';

interface EnhancedMessageProps {
  content: string;
}

export function EnhancedMessage({ content }: EnhancedMessageProps) {
  // Parse content for special blocks
  const parts = parseContent(content);

  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        if (part.type === 'mermaid') {
          return <MermaidChart key={index} chart={part.content} />;
        }
        
        if (part.type === 'chart') {
          try {
            const chartData = JSON.parse(part.content);
            return <DataChart key={index} data={chartData} />;
          } catch (error) {
            console.error('Failed to parse chart data:', error);
            return (
              <div key={index} className="text-red-500 p-4 border rounded">
                图表数据格式错误
              </div>
            );
          }
        }
        
        // Regular markdown content
        return <Streamdown key={index}>{part.content}</Streamdown>;
      })}
    </div>
  );
}

interface ContentPart {
  type: 'markdown' | 'mermaid' | 'chart';
  content: string;
}

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let currentIndex = 0;

  // Regex to match code blocks
  const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > currentIndex) {
      const textBefore = content.substring(currentIndex, match.index);
      if (textBefore.trim()) {
        parts.push({ type: 'markdown', content: textBefore });
      }
    }

    const language = match[1].toLowerCase();
    const code = match[2];

    if (language === 'mermaid') {
      parts.push({ type: 'mermaid', content: code });
    } else if (language === 'chart' || language === 'json-chart') {
      parts.push({ type: 'chart', content: code });
    } else {
      // Keep other code blocks as markdown
      parts.push({ type: 'markdown', content: match[0] });
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < content.length) {
    const remaining = content.substring(currentIndex);
    if (remaining.trim()) {
      parts.push({ type: 'markdown', content: remaining });
    }
  }

  // If no special blocks found, return whole content as markdown
  if (parts.length === 0) {
    parts.push({ type: 'markdown', content });
  }

  return parts;
}
