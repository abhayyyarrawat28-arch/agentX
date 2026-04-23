import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { policyService } from '../../services/policy.service';
import { formatCurrency, STATUS_BADGES } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    policyService.getById(id)
      .then(res => setPolicy(res.data.data))
      .catch(() => navigate('/policies'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-gray-500 p-6">Loading...</div>;
  if (!policy) return null;

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Policy management</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">{policy.policyNumber}</h1>
          <p className="page-subtitle">Review premium, tenure, and policy holder details for this recorded sale.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`data-chip capitalize ${policy.persistencyStatus === 'active' ? 'data-chip-active' : ''}`}>{policy.persistencyStatus}</span>
          <button onClick={() => navigate('/policies')} className="btn-secondary">Back to Policies</button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg text-gray-900">Policy Details</h2>
          <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-y-2 gap-x-3 text-sm">
            <span className="text-gray-500">Product</span><span className="min-w-0 font-medium break-words">{policy.productName}</span>
            <span className="text-gray-500">Annual Premium</span><span className="min-w-0 font-medium break-words">{formatCurrency(policy.annualPremium)}</span>
            <span className="text-gray-500">Sum Assured</span><span className="min-w-0 font-medium break-words">{formatCurrency(policy.sumAssured)}</span>
            <span className="text-gray-500">Frequency</span><span className="min-w-0 font-medium capitalize break-words">{policy.paymentFrequency}</span>
            <span className="text-gray-500">Term</span><span className="min-w-0 font-medium break-words">{policy.policyTerm} years</span>
            <span className="text-gray-500">Issue Date</span><span className="min-w-0 font-medium break-words">{formatDate(policy.issueDate)}</span>
            <span className="text-gray-500">Maturity Date</span><span className="min-w-0 font-medium break-words">{formatDate(policy.maturityDate)}</span>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold text-lg text-gray-900">Customer Details</h2>
          <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-y-2 gap-x-3 text-sm">
            <span className="text-gray-500">Name</span><span className="min-w-0 font-medium break-words">{policy.policyHolderId?.firstName} {policy.policyHolderId?.lastName}</span>
            <span className="text-gray-500">Phone</span><span className="min-w-0 font-medium break-words">{policy.policyHolderId?.mobile || '—'}</span>
            <span className="text-gray-500">Email</span><span className="min-w-0 font-medium break-all">{policy.policyHolderId?.email || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
