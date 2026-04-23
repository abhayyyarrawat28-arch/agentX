import { useState, useEffect } from 'react';
import api from '../../services/api';

function formatAction(action: string) {
  return action.replace(/_/g, ' ');
}

function formatActor(log: any) {
  return log.performedBy?.name || log.performedBy?.employeeId || 'System';
}

function formatDetails(log: any) {
  const payload = log.diff?.after && Object.keys(log.diff.after).length > 0 ? log.diff.after : log.diff?.before;
  if (!payload || Object.keys(payload).length === 0) return '—';
  return JSON.stringify(payload);
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({});

  useEffect(() => {
    setLoading(true);
    api.get('/admin/logs', { params: { page, limit: 50 } })
      .then(res => { setLogs(res.data.data); setMeta(res.data.meta); })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Operational trace</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">Audit Logs</h1>
          <p className="page-subtitle">Track privileged changes, onboarding decisions, and business updates performed across the system.</p>
        </div>
        <span className="data-chip">Page {page}</span>
      </section>
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full table-fixed text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-40 p-3 text-left text-xs font-semibold text-gray-500 uppercase">Timestamp</th><th className="w-40 p-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th><th className="w-36 p-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th><th className="w-52 p-3 text-left text-xs font-semibold text-gray-500 uppercase">Target</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
            </tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 align-top"><span className="block break-words">{new Date(l.createdAt).toLocaleString()}</span></td>
                  <td className="p-3 align-top"><span className="block break-words">{formatActor(l)}</span></td>
                  <td className="p-3 align-top capitalize"><span className="block break-words">{formatAction(l.action)}</span></td>
                  <td className="p-3 align-top"><span className="block break-all">{l.targetId || '—'}</span></td>
                  <td className="p-3 align-top"><span className="block whitespace-normal break-all">{formatDetails(l)}</span></td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">No logs</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary">Prev</button>
          <span className="px-3 py-2 text-sm">Page {page} of {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary">Next</button>
        </div>
      )}
    </div>
  );
}
