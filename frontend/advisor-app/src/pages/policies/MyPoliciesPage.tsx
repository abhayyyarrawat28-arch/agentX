import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { policyService } from '../../services/policy.service';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { STATUS_BADGES } from '../../utils/formatCurrency';

const PRODUCT_TYPES = ['Term Plan', 'Savings Plan', 'ULIP', 'Endowment'];

export default function MyPoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page') || 1);
  const status = searchParams.get('status') || '';
  const search = searchParams.get('search') || '';
  const productType = searchParams.get('productType') || '';
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params: any = { page, limit: 20 };
    if (status) params.status = status;
    if (search) params.search = search;
    if (productType) params.productType = productType;
    policyService.list(params)
      .then(res => { setPolicies(res.data.data); setMeta(res.data.meta); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, status, search, productType]);

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

  const applyFilters = () => {
    updateParams({ search: searchInput.trim(), page: 1 });
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Portfolio desk</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">My Policies</h1>
          <p className="page-subtitle">Review active business, status movement, and policy timelines across your book.</p>
        </div>
        <Link to="/policies/create" className="btn-primary">+ New Sale</Link>
      </section>

      <div className="flex gap-2 flex-wrap">
        {['', 'active', 'lapsed', 'surrendered'].map(s => (
          <button key={s} onClick={() => updateParams({ status: s, page: 1 })}
            className={`data-chip capitalize ${status === s ? 'data-chip-active' : ''}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Search Policies</label>
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }}
            placeholder="Search by policy number or product"
            className="input-field w-full"
          />
        </div>
        <div className="min-w-[220px]">
          <label className="block text-sm font-medium mb-1">Product Type</label>
          <select
            value={productType}
            onChange={(event) => updateParams({ productType: event.target.value, page: 1 })}
            className="input-field w-full"
          >
            <option value="">All Products</option>
            {PRODUCT_TYPES.map((product) => (
              <option key={product} value={product}>{product}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={applyFilters} className="btn-primary">Apply</button>
          <button type="button" onClick={clearFilters} className="btn-secondary">Clear</button>
        </div>
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Policy #</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th><th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Premium</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Start Date</th>
            </tr></thead>
            <tbody>
              {policies.map(p => (
                <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-3"><Link to={`/policies/${p._id}`} className="text-primary hover:underline">{p.policyNumber}</Link></td>
                  <td className="p-3">{p.policyHolderId?.firstName} {p.policyHolderId?.lastName}</td>
                  <td className="p-3">{p.productName}</td>
                  <td className="p-3 text-right">{formatCurrency(p.annualPremium)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGES[p.persistencyStatus] || 'bg-gray-100 text-gray-600'}`}>{p.persistencyStatus}</span></td>
                  <td className="p-3">{formatDate(p.issueDate)}</td>
                </tr>
              ))}
              {policies.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No policies found</td></tr>}
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
