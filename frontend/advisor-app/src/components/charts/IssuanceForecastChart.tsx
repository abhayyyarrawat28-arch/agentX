import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS, formatChartCurrency, formatCurrency } from '../../utils/formatCurrency';

interface IssuanceForecastChartProps {
  data: { month: string; projected: number; actual: number | null }[];
  avgMonthlyIssuance: number;
  totalAnnualIssuance: number;
  title?: string;
  tagLabel?: string;
}

export default function IssuanceForecastChart({
  data,
  avgMonthlyIssuance,
  totalAnnualIssuance,
  title = 'Issuance Forecast',
  tagLabel = 'Projected vs Actual',
}: IssuanceForecastChartProps) {
  const exportCsv = () => {
    const rows = ['Month,Projected,Actual', ...data.map((row) => `${row.month},${row.projected},${row.actual ?? ''}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'issuance-forecast.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <div>
          <h3 className="chart-panel-title">{title}</h3>
          <span className="chart-panel-tag">{tagLabel}</span>
        </div>
        <button type="button" onClick={exportCsv} className="btn-secondary text-xs px-3 py-2">
          Export CSV
        </button>
      </div>
      <div className="h-60 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#efe2d3" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#43474f' }} />
            <YAxis tickFormatter={formatChartCurrency} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="projected" fill="#a7c8ff" radius={[4, 4, 0, 0]} name="Projected" />
            <Bar dataKey="actual" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} name="Actual" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-[#f8efe7] px-3 py-3">
          <p className="text-xs font-semibold text-gray-500">Avg Monthly Issuance</p>
          <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(avgMonthlyIssuance)}</p>
        </div>
        <div className="rounded-xl bg-[#f8efe7] px-3 py-3">
          <p className="text-xs font-semibold text-gray-500">Total Annual Issuance</p>
          <p className="mt-2 text-lg font-bold text-gray-900">{formatCurrency(totalAnnualIssuance)}</p>
        </div>
      </div>
    </div>
  );
}