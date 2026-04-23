import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';
import { STATUS_COLORS } from '../../utils/formatCurrency';

interface MDRTRingChartProps {
  percentAchieved: number;
  ytdPremium: number;
  mdrtTarget: number;
  remaining: number;
  estimatedQualificationDate: string | null;
  mdrtStatus: 'qualified' | 'on-track' | 'at-risk';
  daysLeft: number;
  title?: string;
  tagLabel?: string;
}

export default function MDRTRingChart({
  percentAchieved, ytdPremium, mdrtTarget, remaining, estimatedQualificationDate, mdrtStatus, daysLeft, title = 'MDRT Progress', tagLabel = 'YTD',
}: MDRTRingChartProps) {
  const statusColor = STATUS_COLORS[mdrtStatus];
  const data = [{ value: Math.min(percentAchieved, 100), fill: statusColor }];

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <h3 className="chart-panel-title">{title}</h3>
        <span className="chart-panel-tag">{tagLabel}</span>
      </div>
      <div className="flex flex-col items-center">
        <div className="relative h-44 w-full max-w-[11rem] sm:h-48 sm:max-w-[12rem]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#eeedf2' }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[2rem] font-extrabold tracking-[-0.05em]" style={{ color: statusColor }}>
              {percentAchieved.toFixed(0)}%
            </span>
            <span className="text-xs capitalize font-semibold" style={{ color: statusColor }}>
              {mdrtStatus.replace('-', ' ')}
            </span>
          </div>
        </div>
        <div className="mt-4 space-y-2 w-full">
          <div className="flex justify-between text-sm">
            <span className="text-outline">Remaining Premium</span>
            <span className="font-medium">{formatCurrency(remaining)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-outline">Days Left</span>
            <span className={`font-medium ${daysLeft < 90 ? 'text-error' : ''}`}>{daysLeft}</span>
          </div>
          {estimatedQualificationDate && (
            <div className="flex justify-between text-sm">
              <span className="text-outline">Est. Qualification</span>
              <span className="font-medium">{new Date(estimatedQualificationDate).toLocaleDateString('en-IN')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
