import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

interface PolicyWiseSellDistributionChartProps {
  data: { productType: string; policyCount: number; annualPremium: number; percentage?: number }[];
}

export default function PolicyWiseSellDistributionChart({ data }: PolicyWiseSellDistributionChartProps) {
  const strongestSegment = data[0];

  if (!data || data.length === 0) {
    return (
      <div className="chart-panel flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">No sell distribution available yet</p>
      </div>
    );
  }

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <h3 className="chart-panel-title">Policy Wise Sell Distribution</h3>
        <span className="chart-panel-tag">By Policy Count</span>
      </div>
      <div className="rounded-xl bg-[#f8efe7] px-3 py-3 mb-4">
        <p className="text-xs font-semibold text-gray-500">Strongest Segment</p>
        <p className="mt-1 text-base font-bold text-gray-900">{strongestSegment.productType}</p>
        <p className="text-xs text-gray-500 mt-1">{strongestSegment.policyCount} policies | {formatCurrency(strongestSegment.annualPremium)}</p>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#efe2d3" />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="productType" tick={{ fontSize: 10 }} width={90} />
          <Tooltip formatter={(value: number, name: string, props: any) => name === 'Policies' ? [`${value} policies`, name] : [formatCurrency(props.payload.annualPremium), 'Annual Premium']} />
          <Bar dataKey="policyCount" fill="#39455d" radius={[0, 4, 4, 0]} name="Policies" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}