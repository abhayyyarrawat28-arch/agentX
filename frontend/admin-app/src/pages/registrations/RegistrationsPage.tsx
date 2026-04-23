import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  useEffect(() => {
    if (!rejectingId) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && actionLoading !== rejectingId) {
        setRejectingId(null);
        setRejectionNote('');
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [rejectingId, actionLoading]);

  const load = () => {
    setLoading(true);
    api.get('/admin/registrations').then(res => setRegistrations(res.data.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAction = async (id: string, action: 'approve' | 'reject', payload?: Record<string, unknown>) => {
    setActionLoading(id);
    try {
      await api.post(`/admin/registrations/${id}/${action}`, payload || {});
      load();
    } catch { }
    finally { setActionLoading(null); }
  };

  const submitRejection = async () => {
    if (!rejectingId || rejectionNote.trim().length < 5) return;
    await handleAction(rejectingId, 'reject', { rejectionNote: rejectionNote.trim() });
    setRejectingId(null);
    setRejectionNote('');
  };

  if (loading) return <div className="text-gray-500 p-6">Loading...</div>;

  const pendingCount = registrations.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Approval workflow</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">Agent Registrations</h1>
          <p className="page-subtitle">Review self-registration requests, approve valid agents, and clear pending onboarding items.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="data-chip data-chip-active">Pending Approvals ({pendingCount})</span>
          <span className="data-chip">Total Requests {registrations.length}</span>
        </div>
      </section>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[48rem] table-fixed text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee ID</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
          </tr></thead>
          <tbody>
            {registrations.map(r => (
              <tr key={r._id} className="border-b">
                <td className="p-3 align-top"><span className="block break-words">{r.fullName}</span></td>
                <td className="p-3 align-top"><span className="block break-all">{r.employeeId}</span></td>
                <td className="p-3 align-top"><span className="block break-all">{r.email}</span></td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'approved' ? 'bg-green-100 text-green-800' : r.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.status}</span></td>
                <td className="p-3 align-top">
                  {r.status === 'pending' && (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleAction(r._id, 'approve')} disabled={actionLoading === r._id} className="btn-primary px-4 py-2 text-xs">
                        {actionLoading === r._id ? 'Processing...' : 'Approve'}
                      </button>
                      <button onClick={() => { setRejectingId(r._id); setRejectionNote(''); }} disabled={actionLoading === r._id} className="btn-danger px-4 py-2 text-xs">
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {registrations.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">No registrations</td></tr>}
          </tbody>
        </table>
      </div>

      {rejectingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => {
            if (actionLoading === rejectingId) return;
            setRejectingId(null);
            setRejectionNote('');
          }}
        >
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <p className="page-kicker">Registration review</p>
            <h2 className="text-2xl font-extrabold tracking-[-0.04em] text-gray-900">Reject Application</h2>
            <p className="page-subtitle">Provide a clear reason so the agent receives a useful rejection message.</p>
            <textarea
              value={rejectionNote}
              onChange={(event) => setRejectionNote(event.target.value)}
              className="input-field mt-4 h-32"
              placeholder="Enter rejection note"
            />
            <p className="mt-2 text-xs text-gray-500">Minimum 5 characters.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => { setRejectingId(null); setRejectionNote(''); }}>
                Cancel
              </button>
              <button type="button" className="btn-danger" disabled={rejectionNote.trim().length < 5 || actionLoading === rejectingId} onClick={submitRejection}>
                {actionLoading === rejectingId ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
