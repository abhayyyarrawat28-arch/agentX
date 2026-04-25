import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { queryKeys } from '../../services/queryKeys';
import { AgentDetailPageSkeleton } from '../../components/ui/PageSkeletons';

const formatCurrency = (value?: number | null) => `₹${(value ?? 0).toLocaleString('en-IN')}`;
const formatPercent = (value?: number | null) => `${((value ?? 0) * 100).toFixed(1)}%`;

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: detail, isLoading: loading } = useQuery({
    queryKey: queryKeys.adminAgentDetail(id || ''),
    queryFn: async () => {
      const res = await api.get(`/admin/agents/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
    retry: false,
  });

  if (!id) return null;

  useEffect(() => {
    if (!loading && detail && !detail.agent) {
      navigate('/agents');
    }
  }, [loading, detail, navigate]);

  if (loading) return <AgentDetailPageSkeleton />;
  if (!detail?.agent) return null;

  const agent = detail.agent;
  const performance = detail.performance || {};
  const displayName = agent.name || agent.employeeId || 'Agent Detail';

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Agent performance</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">{displayName}</h1>
          <p className="page-subtitle">Review agent identity, production quality, and portfolio coverage from the admin control center.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="data-chip">{agent.employeeId}</span>
          <span className="data-chip">{performance.customerCount ?? 0} customers</span>
          <button onClick={() => navigate('/agents')} className="btn-secondary">Back to Overview</button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="page-kicker">Production</p>
          <p className="text-sm text-gray-500 font-semibold">YTD Premium</p>
          <p className="text-[2rem] font-extrabold tracking-[-0.04em] text-gray-900 mt-3">{formatCurrency(performance.ytdPremium)}</p>
        </div>
        <div className="stat-card">
          <p className="page-kicker">Production</p>
          <p className="text-sm text-gray-500 font-semibold">Total Policies</p>
          <p className="text-[2rem] font-extrabold tracking-[-0.04em] text-gray-900 mt-3">{performance.policyCount ?? 0}</p>
        </div>
        <div className="stat-card">
          <p className="page-kicker">Quality</p>
          <p className="text-sm text-gray-500 font-semibold">Active Policies</p>
          <p className="text-[2rem] font-extrabold tracking-[-0.04em] text-gray-900 mt-3">{performance.activePolicies ?? 0}</p>
        </div>
        <div className="stat-card">
          <p className="page-kicker">Quality</p>
          <p className="text-sm text-gray-500 font-semibold">Persistency</p>
          <p className="text-[2rem] font-extrabold tracking-[-0.04em] text-gray-900 mt-3">{formatPercent(performance.persistencyRate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="stat-card">
          <h2 className="font-semibold text-gray-900 mb-4">Agent Info</h2>
          <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-y-2 gap-x-3 text-sm">
            <span className="text-gray-500">Employee ID</span><span className="min-w-0 font-medium break-words">{agent.employeeId}</span>
            <span className="text-gray-500">Email</span><span className="min-w-0 font-medium break-all">{agent.email || '—'}</span>
            <span className="text-gray-500">Phone</span><span className="min-w-0 font-medium break-words">{agent.mobile || agent.phone || '—'}</span>
            <span className="text-gray-500">Branch</span><span className="min-w-0 font-medium break-words">{agent.branchId || agent.branch || '—'}</span>
          </div>
        </div>
        <div className="stat-card">
          <h2 className="font-semibold text-gray-900 mb-4">Performance</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-gray-500">MDRT Target</span><span className="font-medium">{formatCurrency(performance.mdrtTarget)}</span>
            <span className="text-gray-500">Target Achieved</span><span className="font-medium">{formatPercent(performance.percentAchieved ? performance.percentAchieved / 100 : 0)}</span>
            <span className="text-gray-500">Customer Base</span><span className="font-medium">{performance.customerCount ?? 0}</span>
            <span className="text-gray-500">MDRT Status</span><span className="font-medium capitalize">{performance.mdrtStatus || 'at-risk'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
