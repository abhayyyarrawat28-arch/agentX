import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { CHART_COLORS, formatChartCurrency, formatCurrency } from '../../utils/formatCurrency';

interface MonthlyPremiumChartProps {
  data: { month: string; premium: number }[];
  title?: string;
  tagLabel?: string;
}

export default function MonthlyPremiumChart({ data, title = 'Monthly Premium', tagLabel = '12 Months' }: MonthlyPremiumChartProps) {
  const avg = data.length > 0 ? data.reduce((s, d) => s + d.premium, 0) / data.length : 0;

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <h3 className="chart-panel-title">{title}</h3>
        <span className="chart-panel-tag">{tagLabel}</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#efe2d3" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={formatChartCurrency} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <ReferenceLine y={avg} stroke={CHART_COLORS.amber} strokeDasharray="3 3" label="Avg" />
          <Bar dataKey="premium" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
