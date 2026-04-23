import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts';
import { CHART_COLORS, formatChartCurrency, formatCurrency } from '../../utils/formatCurrency';

interface IncomeGrowthAreaChartProps {
  data: { month: string; fyc: number; renewal: number; bonus: number; isForecast: boolean }[];
  title?: string;
  tagLabel?: string;
}

export default function IncomeGrowthAreaChart({ data, title = 'Income Growth', tagLabel = 'Rolling Timeline' }: IncomeGrowthAreaChartProps) {
  const currentMonth = data.find(d => !d.isForecast)?.month;

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <h3 className="chart-panel-title">{title}</h3>
        <span className="chart-panel-tag">{tagLabel}</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="fycGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.32} />
              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#efe2d3" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={formatChartCurrency} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          {currentMonth && <ReferenceLine x={currentMonth} stroke={CHART_COLORS.red} strokeDasharray="4 4" label="Today" />}
          <Legend />
          <Area type="monotone" dataKey="fyc" stackId="1" fill="url(#fycGrad)" stroke={CHART_COLORS.primary} name="FYC" />
          <Area type="monotone" dataKey="renewal" stackId="1" fill="#fde7d5" stroke={CHART_COLORS.container} name="Renewal" />
          <Area type="monotone" dataKey="bonus" stackId="1" fill="#fff2dd" stroke={CHART_COLORS.amber} name="Bonus" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
