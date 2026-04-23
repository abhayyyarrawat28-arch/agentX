import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

export default function MyCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') || 1);
  const search = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params: any = { page, limit: 20 };
    if (search) params.search = search;
    api.get('/customers', { params })
      .then(res => { setCustomers(res.data.data); setMeta(res.data.meta); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search]);

  const updateParams = (next: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    setSearchParams(params);
  };

  const applySearch = () => {
    updateParams({ search: searchInput.trim(), page: 1 });
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Relationship view</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">My Customers</h1>
          <p className="page-subtitle">Search and manage policy holders, contact details, and portfolio concentration.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="data-chip">{customers.length} visible</span>
          <Link to="/customers/create" className="btn-primary">+ New Customer</Link>
        </div>
      </section>

      <div className="card flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1 max-w-2xl">
          <label className="block text-sm font-medium mb-1">Search Customers</label>
          <input
            type="text"
            placeholder="Search by name, phone, or PAN"
            className="input-field w-full"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') applySearch(); }}
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={applySearch} className="btn-primary">Apply</button>
          <button type="button" onClick={clearSearch} className="btn-secondary">Clear</button>
        </div>
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full table-fixed text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Renewal Watch</th><th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Policies</th><th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Premium</th>
            </tr></thead>
            <tbody>
              {customers.map(c => (
                <tr key={c._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-3 align-top"><Link to={`/customers/${c._id}`} className="break-words text-primary hover:underline">{c.firstName} {c.lastName}</Link></td>
                  <td className="p-3 align-top break-words">{c.mobile}</td>
                  <td className="p-3 align-top"><span className="block break-all">{c.email || '—'}</span></td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {c.isPriorityCustomer && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">Manual</span>}
                      {c.fixedMonthlyReturn && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">Monthly</span>}
                      {!c.isPriorityCustomer && !c.fixedMonthlyReturn && <span className="text-xs text-gray-400">Standard</span>}
                    </div>
                  </td>
                  <td className="p-3 text-right">{c.totalActivePolicies ?? '—'}</td>
                  <td className="p-3 text-right">{c.totalAnnualPremium ? `₹${c.totalAnnualPremium.toLocaleString('en-IN')}` : '—'}</td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No customers found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => updateParams({ page: page - 1 })} className="btn-secondary">Prev</button>
          <span className="px-3 py-2 text-sm">Page {page} of {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => updateParams({ page: page + 1 })} className="btn-secondary">Next</button>
        </div>
      )}
    </div>
  );
}
