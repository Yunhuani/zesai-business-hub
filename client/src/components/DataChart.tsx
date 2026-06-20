import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }>;
}

interface DataChartProps {
  data: ChartData;
}

export function DataChart({ data }: DataChartProps) {
  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || generateColors(data.labels.length, 0.6),
      borderColor: dataset.borderColor || generateColors(data.labels.length, 1),
      borderWidth: 1,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !!data.title,
        text: data.title || '',
      },
    },
  };

  const renderChart = () => {
    switch (data.type) {
      case 'bar':
        return <Bar data={chartData} options={options} />;
      case 'line':
        return <Line data={chartData} options={options} />;
      case 'pie':
        return <Pie data={chartData} options={options} />;
      default:
        return <div className="text-red-500">不支持的图表类型: {data.type}</div>;
    }
  };

  return (
    <div className="my-4 p-4 bg-white rounded-lg border">
      <div style={{ height: '400px' }}>
        {renderChart()}
      </div>
    </div>
  );
}

// Generate color palette
function generateColors(count: number, alpha: number): string[] {
  const colors = [
    `rgba(99, 102, 241, ${alpha})`,   // indigo
    `rgba(34, 197, 94, ${alpha})`,    // green
    `rgba(239, 68, 68, ${alpha})`,    // red
    `rgba(251, 146, 60, ${alpha})`,   // orange
    `rgba(168, 85, 247, ${alpha})`,   // purple
    `rgba(236, 72, 153, ${alpha})`,   // pink
    `rgba(14, 165, 233, ${alpha})`,   // sky
    `rgba(234, 179, 8, ${alpha})`,    // yellow
  ];
  
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
}
