import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PRODUCT_COLORS, formatCurrency } from '../../utils/formatCurrency';

interface ProductMixPieChartProps {
  data: { productType: string; count: number; totalPremium: number; percentage: number }[];
}

export default function ProductMixPieChart({ data }: ProductMixPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-panel flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">No data yet</p>
      </div>
    );
  }

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <h3 className="chart-panel-title">Product Mix</h3>
        <span className="chart-panel-tag">By Count</span>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="count" nameKey="productType" label={({ productType, percentage }) => `${productType} ${percentage}%`}>
            {data.map((entry) => (
              <Cell key={entry.productType} fill={PRODUCT_COLORS[entry.productType] || '#737780'} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number, n: string, props: any) => [`${v} policies — ${formatCurrency(props.payload.totalPremium)}`, n]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
