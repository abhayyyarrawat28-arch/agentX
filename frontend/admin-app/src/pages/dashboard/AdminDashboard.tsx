import { useState, useEffect } from 'react';
import api from '../../services/api';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const formatPercent = (value?: number | null) => `${((value ?? 0) * 100).toFixed(1)}%`;

type AdminDashboardView = 'ytd' | 'liveOps';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<AdminDashboardView>('ytd');

  useEffect(() => {
    api.get('/admin/dashboard').then(res => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 p-6">Loading...</div>;
  if (!data) return <div className="text-red-600 p-6">Failed to load dashboard</div>;

  const topAgents = data.topAgents ?? [];
  const updatedAt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
  const ytdCards = [
    { label: 'Total Agents', value: data.totalAgents ?? 0 },
    { label: 'Active Policies', value: data.activePolicies ?? 0 },
    { label: 'Total Premium (YTD)', value: fmt(data.ytdPremium ?? 0) },
    { label: 'Total FYC (YTD)', value: fmt(data.ytdFYC ?? 0) },
    { label: 'Pending Registrations', value: data.pendingRegistrations ?? 0 },
    { label: 'Avg Persistency', value: formatPercent(data.avgPersistency) },
    { label: 'MDRT Qualified', value: data.mdrtQualified ?? 0 },
    { label: 'Lapsed Policies', value: data.lapsedPolicies ?? 0 },
  ];
  const liveOpsCards = [
    { label: 'Pending Registrations', value: data.pendingRegistrations ?? 0 },
    { label: 'Active Policies', value: data.activePolicies ?? 0 },
    { label: 'Avg Persistency', value: formatPercent(data.avgPersistency) },
    { label: 'Lapsed Policies', value: data.lapsedPolicies ?? 0 },
    { label: 'Total Agents', value: data.totalAgents ?? 0 },
    { label: 'MDRT Qualified', value: data.mdrtQualified ?? 0 },
    { label: 'Total Premium (YTD)', value: fmt(data.ytdPremium ?? 0) },
    { label: 'Total FYC (YTD)', value: fmt(data.ytdFYC ?? 0) },
  ];
  const cards = viewMode === 'ytd' ? ytdCards : liveOpsCards;
  const operationalSignals = [
    {
      label: 'Approval Queue',
      value: `${data.pendingRegistrations ?? 0} pending`,
      detail: (data.pendingRegistrations ?? 0) > 0 ? 'Registrations need review' : 'No pending approvals',
    },
    {
      label: 'Portfolio Risk',
      value: `${data.lapsedPolicies ?? 0} lapsed`,
      detail: (data.lapsedPolicies ?? 0) > 0 ? 'Retention outreach recommended' : 'No lapsed-policy pressure',
    },
    {
      label: 'Persistency Health',
      value: formatPercent(data.avgPersistency),
      detail: (data.avgPersistency ?? 0) >= 0.85 ? 'Running above benchmark' : 'Below target threshold',
    },
    {
      label: 'Field Force',
      value: `${data.totalAgents ?? 0} agents`,
      detail: `${data.activePolicies ?? 0} active policies in force`,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Head office dashboard</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">Admin Dashboard</h1>
          <p className="page-subtitle">{viewMode === 'ytd' ? 'Monitor agent production, registration backlog, portfolio health, and configuration readiness from a single control view.' : 'Switch to live operations to focus on approvals, retention pressure, and the team workload that needs immediate attention.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`data-chip ${viewMode === 'ytd' ? 'data-chip-active' : ''}`} aria-pressed={viewMode === 'ytd'} onClick={() => setViewMode('ytd')}>
            YTD View
          </button>
          <button type="button" className={`data-chip ${viewMode === 'liveOps' ? 'data-chip-active' : ''}`} aria-pressed={viewMode === 'liveOps'} onClick={() => setViewMode('liveOps')}>
            Live Ops
          </button>
          <span className="surface-note">Updated as of: {updatedAt}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => <Card key={card.label} label={card.label} value={card.value} />)}
      </div>

      {viewMode === 'ytd' && topAgents.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="page-kicker mb-1">Ranking</p>
              <h2 className="text-lg font-bold text-gray-900">Top Agents by Premium</h2>
            </div>
            <span className="data-chip">Leaderboard</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] table-fixed text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee ID</th><th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">YTD Premium</th><th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Policies</th></tr></thead>
              <tbody>
                {topAgents.map((a: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50"><td className="p-3"><span className="block break-words">{a.name}</span></td><td className="p-3"><span className="block break-all">{a.employeeId}</span></td><td className="p-3 text-right">{fmt(a.ytdPremium)}</td><td className="p-3 text-right">{a.policyCount}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'liveOps' && (
        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="page-kicker mb-1">Operations</p>
              <h2 className="text-lg font-bold text-gray-900">Live Ops Pulse</h2>
            </div>
            <span className="data-chip">Operational Watch</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {operationalSignals.map(signal => (
              <div key={signal.label} className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
                <p className="page-kicker mb-2">Ops Signal</p>
                <p className="text-sm font-semibold text-gray-500">{signal.label}</p>
                <p className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-gray-900">{signal.value}</p>
                <p className="mt-2 text-sm text-gray-500">{signal.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <p className="page-kicker">Operations</p>
      <p className="text-sm text-gray-500 font-semibold">{label}</p>
      <p className="text-[2rem] font-extrabold tracking-[-0.04em] text-gray-900 mt-3">{value}</p>
    </div>
  );
}
