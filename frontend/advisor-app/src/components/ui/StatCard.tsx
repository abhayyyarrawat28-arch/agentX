interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  icon?: string;
  subtext?: string;
  progressValue?: number;
}

export default function StatCard({ label, value, change, changeDirection, icon, subtext, progressValue }: StatCardProps) {
  const changeColor = changeDirection === 'up' ? 'text-emerald-600' : changeDirection === 'down' ? 'text-red-600' : 'text-gray-500';

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="page-kicker">Portfolio snapshot</p>
          <span className="text-sm text-gray-500 font-semibold">{label}</span>
        </div>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className="text-[2rem] font-extrabold text-gray-900 tracking-[-0.04em]">{value}</div>
      {change && (
        <span className={`text-xs font-semibold ${changeColor}`}>
          {changeDirection === 'up' ? '↑' : changeDirection === 'down' ? '↓' : ''} {change}
        </span>
      )}
      {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
      {progressValue !== undefined && (
        <div className="mt-4">
          <div className="w-full bg-[#f2e8de] rounded-full h-2.5 overflow-hidden">
            <div
              className="h-2.5 rounded-full transition-all"
              style={{ background: 'linear-gradient(90deg, #ffbf85 0%, #f97316 100%)', width: `${Math.min(progressValue, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 mt-2 inline-block font-semibold">{progressValue.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
