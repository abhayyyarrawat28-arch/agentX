import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency, STATUS_BADGES } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [renewalSettings, setRenewalSettings] = useState({ isPriorityCustomer: false, fixedMonthlyReturn: false, monthlyRenewalAmount: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/customers/${id}`)
      .then(res => {
        const data = res.data.data;
        setCustomer(data.customer);
        setPolicies(data.policies || []);
        setSummary(data.summary || null);
        setRenewalSettings({
          isPriorityCustomer: Boolean(data.customer?.isPriorityCustomer),
          fixedMonthlyReturn: Boolean(data.customer?.fixedMonthlyReturn),
          monthlyRenewalAmount: data.customer?.monthlyRenewalAmount ? String(data.customer.monthlyRenewalAmount) : '',
        });
      })
      .catch(() => navigate('/customers'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const saveRenewalSettings = async () => {
    if (!id) return;
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      const response = await api.patch(`/customers/${id}`, {
        isPriorityCustomer: renewalSettings.isPriorityCustomer,
        fixedMonthlyReturn: renewalSettings.fixedMonthlyReturn,
        monthlyRenewalAmount: renewalSettings.fixedMonthlyReturn && renewalSettings.monthlyRenewalAmount
          ? Number(renewalSettings.monthlyRenewalAmount)
          : null,
      });
      setCustomer(response.data.data);
      setSettingsMessage('Renewal watch settings updated');
    } catch (err: any) {
      setSettingsMessage(err.response?.data?.error?.message || 'Failed to update renewal watch settings');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) return <div className="text-gray-500 p-6">Loading...</div>;
  if (!customer) return null;

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Customer management</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">{customer.firstName} {customer.lastName}</h1>
          <p className="page-subtitle">Review contact information, active relationship depth, and linked policies for this policy holder.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {customer.isPriorityCustomer && <span className="data-chip data-chip-active">Priority Renewal</span>}
          {customer.fixedMonthlyReturn && <span className="data-chip">Fixed Monthly Return</span>}
          <Link to={`/policies/create?customerId=${customer._id}`} className="btn-primary">Add Policy for Customer</Link>
          <button onClick={() => navigate('/customers')} className="btn-secondary">Back to Customers</button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-lg text-gray-900 mb-3">Contact Details</h2>
          <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-y-2 gap-x-3 text-sm">
            <span className="text-gray-500">Phone</span><span className="min-w-0 font-medium break-words">{customer.mobile}</span>
            <span className="text-gray-500">Email</span><span className="min-w-0 font-medium break-all">{customer.email || '—'}</span>
            <span className="text-gray-500">City</span><span className="min-w-0 font-medium break-words">{customer.address?.city || '—'}</span>
            <span className="text-gray-500">DOB</span><span className="min-w-0 font-medium break-words">{customer.dateOfBirth ? formatDate(customer.dateOfBirth) : '—'}</span>
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold text-lg text-gray-900 mb-3">Summary</h2>
          <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-y-2 gap-x-3 text-sm">
            <span className="text-gray-500">Total Policies</span><span className="min-w-0 font-medium break-words">{summary?.totalPolicies ?? policies.length}</span>
            <span className="text-gray-500">Active Policies</span><span className="min-w-0 font-medium break-words">{summary?.activePolicies ?? '—'}</span>
            <span className="text-gray-500">Total Premium</span><span className="min-w-0 font-medium break-words">{formatCurrency(summary?.totalAnnualPremium ?? 0)}</span>
            <span className="text-gray-500">Monthly Renewal Amount</span><span className="min-w-0 font-medium break-words">{customer.monthlyRenewalAmount ? formatCurrency(customer.monthlyRenewalAmount) : '—'}</span>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-lg text-gray-900">Priority Renewal Settings</h2>
            <p className="text-sm text-gray-500">Control whether this customer appears in the dashboard renewal watch list.</p>
          </div>
          {settingsMessage && <span className={`data-chip ${settingsMessage.includes('updated') ? 'data-chip-active' : ''}`}>{settingsMessage}</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="rounded-2xl border border-gray-200 px-4 py-3 bg-gray-50">
            <span className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={renewalSettings.isPriorityCustomer}
                onChange={(event) => setRenewalSettings((current) => ({ ...current, isPriorityCustomer: event.target.checked }))}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">Manual priority tracking</span>
                <span className="block text-xs text-gray-500 mt-1">Keep this customer in the priority renewal list even if automated risk rules do not trigger.</span>
              </span>
            </span>
          </label>
          <label className="rounded-2xl border border-gray-200 px-4 py-3 bg-gray-50 md:col-span-2">
            <span className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={renewalSettings.fixedMonthlyReturn}
                onChange={(event) => setRenewalSettings((current) => ({
                  ...current,
                  fixedMonthlyReturn: event.target.checked,
                  monthlyRenewalAmount: event.target.checked ? current.monthlyRenewalAmount : '',
                }))}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="block text-sm font-medium text-gray-900">Fixed return every month</span>
                <span className="block text-xs text-gray-500 mt-1">Use this for customers who should always appear in the monthly renewal-return list.</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={renewalSettings.monthlyRenewalAmount}
                  onChange={(event) => setRenewalSettings((current) => ({ ...current, monthlyRenewalAmount: event.target.value }))}
                  className="input-field mt-3 max-w-xs"
                  placeholder="Expected monthly renewal amount"
                  disabled={!renewalSettings.fixedMonthlyReturn}
                />
              </span>
            </span>
          </label>
        </div>
        <div className="flex justify-end">
          <button onClick={saveRenewalSettings} disabled={savingSettings} className="btn-primary">
            {savingSettings ? 'Saving...' : 'Save Renewal Settings'}
          </button>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-lg text-gray-900 mb-3">Policies</h2>
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Policy #</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th><th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Premium</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Start Date</th>
            </tr></thead>
            <tbody>
              {policies.map(p => (
                <tr key={p._id} className="border-b">
                  <td className="p-3"><Link to={`/policies/${p._id}`} className="text-primary hover:underline">{p.policyNumber}</Link></td>
                  <td className="p-3">{p.productName}</td>
                  <td className="p-3 text-right">{formatCurrency(p.annualPremium)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGES[p.persistencyStatus] || 'bg-gray-100 text-gray-600'}`}>{p.persistencyStatus}</span></td>
                  <td className="p-3">{formatDate(p.issueDate)}</td>
                </tr>
              ))}
              {policies.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">No policies</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
