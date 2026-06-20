import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidChartProps {
  chart: string;
}

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'sans-serif',
});

export function MermaidChart({ chart }: MermaidChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      // Clear previous content
      ref.current.innerHTML = chart;
      
      // Render mermaid chart
      mermaid.run({
        nodes: [ref.current],
      }).catch((error) => {
        console.error('Mermaid rendering error:', error);
        if (ref.current) {
          ref.current.innerHTML = `<pre class="text-red-500">图表渲染失败: ${error.message}</pre>`;
        }
      });
    }
  }, [chart]);

  return (
    <div className="my-4 p-4 bg-white rounded-lg border overflow-x-auto">
      <div ref={ref} className="mermaid" />
    </div>
  );
}
