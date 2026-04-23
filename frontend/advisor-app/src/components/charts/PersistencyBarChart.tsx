import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatChartCurrency, formatCurrency } from '../../utils/formatCurrency';

interface PersistencyBarChartProps {
  data: { year: string; baseline: number; adjusted: number }[];
  title?: string;
  baselineLabel?: string;
  adjustedLabel?: string;
}

export default function PersistencyBarChart({
  data,
  title = 'Condition Impact - 5 Years',
  baselineLabel = 'Baseline',
  adjustedLabel = 'Condition Adjusted',
}: PersistencyBarChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eeedf2" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatChartCurrency} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Legend />
          <Bar dataKey="baseline" fill="#795900" radius={[2, 2, 0, 0]} name={baselineLabel} />
          <Bar dataKey="adjusted" fill="#36B24E" radius={[2, 2, 0, 0]} name={adjustedLabel} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
