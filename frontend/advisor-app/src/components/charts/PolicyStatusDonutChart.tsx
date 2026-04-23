import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { STATUS_COLORS } from '../../utils/formatCurrency';

interface PolicyStatusDonutChartProps {
  data: { active: number; lapsed: number; surrendered: number };
}

export default function PolicyStatusDonutChart({ data }: PolicyStatusDonutChartProps) {
  const pieData = [
    { name: 'Active', value: data.active },
    { name: 'Lapsed', value: data.lapsed },
    { name: 'Surrendered', value: data.surrendered },
  ].filter(d => d.value > 0);

  const total = pieData.reduce((s, d) => s + d.value, 0);
  const colors = { Active: STATUS_COLORS.active, Lapsed: STATUS_COLORS.lapsed, Surrendered: STATUS_COLORS.surrendered };

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">No data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Policy Status</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={colors[entry.name as keyof typeof colors]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number, n: string) => [`${v} policies`, n]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center text-2xl font-bold text-primary mt-2">{total} Total</div>
    </div>
  );
}
