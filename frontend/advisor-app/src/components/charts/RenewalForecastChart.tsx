import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS, formatChartCurrency, formatCurrency } from '../../utils/formatCurrency';

interface RenewalForecastChartProps {
  data: { month: string; projected: number; actual: number | null }[];
  title?: string;
  tagLabel?: string;
}

export default function RenewalForecastChart({ data, title = 'Renewal Forecast', tagLabel = 'Projected vs Actual' }: RenewalForecastChartProps) {
  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <h3 className="chart-panel-title">{title}</h3>
        <span className="chart-panel-tag">{tagLabel}</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#efe2d3" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#43474f' }} />
          <YAxis tickFormatter={formatChartCurrency} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Legend />
          <Bar dataKey="projected" fill={CHART_COLORS.container} radius={[4, 4, 0, 0]} name="Projected" />
          <Bar dataKey="actual" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} name="Actual" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
