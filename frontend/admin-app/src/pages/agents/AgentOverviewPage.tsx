import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { queryKeys } from '../../services/queryKeys';
import { TablePageSkeleton } from '../../components/ui/PageSkeletons';

const formatPercent = (value?: number | null) => `${((value ?? 0) * 100).toFixed(1)}%`;

export default function AgentOverviewPage() {
  const { data: agents = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.adminAgents,
    queryFn: async () => {
      const res = await api.get('/admin/agents');
      return Array.isArray(res.data.data) ? res.data.data : [];
    },
    staleTime: 2 * 60 * 1000,
  });

  if (loading) return <TablePageSkeleton rows={8} cols={6} />;

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Agent performance</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">Agent Overview</h1>
          <p className="page-subtitle">Compare agent production, premium contribution, and persistency at a glance.</p>
        </div>
        <span className="data-chip">{agents.length} agents</span>
      </section>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[48rem] table-fixed text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee ID</th><th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Policies</th><th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">YTD Premium</th><th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Persistency</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
          </tr></thead>
          <tbody>
            {agents.map((a: any) => (
              <tr key={a._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="p-3"><span className="block break-words">{a.name || 'Unnamed agent'}</span></td>
                <td className="p-3"><span className="block break-all">{a.employeeId}</span></td>
                <td className="p-3 text-right">{a.policyCount ?? '—'}</td>
                <td className="p-3 text-right">₹{(a.ytdPremium ?? 0).toLocaleString('en-IN')}</td>
                <td className="p-3 text-right">{formatPercent(a.persistencyRate)}</td>
                <td className="p-3"><Link to={`/agents/${a._id}`} className="text-primary hover:underline text-sm">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
