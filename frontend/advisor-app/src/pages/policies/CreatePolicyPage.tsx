import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { policyService } from '../../services/policy.service';

interface LineItem { policyNumber: string; policyHolderId: string; productId: string; productType: string; annualPremium: number; sumAssured: number; policyTerm: number; premiumPayingTerm: number; paymentFrequency: string; issueDate: string; }
interface FormData { policies: LineItem[]; }

export default function CreatePolicyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId') || '';
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, control, handleSubmit, setValue } = useForm<FormData>({
    defaultValues: { policies: [{ policyNumber: '', policyHolderId: preselectedCustomerId, productId: '', productType: '', annualPremium: 50000, sumAssured: 500000, policyTerm: 15, premiumPayingTerm: 15, paymentFrequency: 'annual', issueDate: new Date().toISOString().slice(0, 10) }] }
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'policies' });

  useEffect(() => {
    import('../../services/api').then(({ default: api }) => {
      Promise.all([api.get('/products'), api.get('/customers')])
        .then(([prodRes, custRes]) => { setProducts(prodRes.data.data); setCustomers(custRes.data.data); });
    });
  }, []);

  useEffect(() => {
    if (!preselectedCustomerId || customers.length === 0) {
      return;
    }

    const hasCustomer = customers.some(customer => customer._id === preselectedCustomerId);
    if (hasCustomer) {
      setValue('policies.0.policyHolderId', preselectedCustomerId);
    }
  }, [customers, preselectedCustomerId, setValue]);

  const onSubmit = async (data: FormData) => {
    setLoading(true); setError('');
    try {
      const payload = data.policies.map(p => ({
        ...p,
        annualPremium: Number(p.annualPremium),
        sumAssured: Number(p.sumAssured),
        policyTerm: Number(p.policyTerm),
        premiumPayingTerm: Number(p.premiumPayingTerm),
        issueDate: new Date(p.issueDate).toISOString(),
      }));
      await policyService.bulkCreate({ policies: payload });
      navigate('/policies');
    } catch (err: any) { setError(err.response?.data?.error?.message || 'Failed to create policies'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Policy management</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">Record New Sale</h1>
          <p className="page-subtitle">Capture one or more policies in a single transaction while keeping customer and product mapping accurate.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="data-chip data-chip-active">Bulk Sale Flow</span>
          <span className="data-chip">{fields.length} policy entries</span>
          <Link to="/customers/create" className="btn-secondary">Add Customer</Link>
        </div>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {fields.map((field, idx) => {
          const productField = register(`policies.${idx}.productId`);

          return (
            <div key={field.id} className="card space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-900">Policy {idx + 1}</h3>
                {fields.length > 1 && <button type="button" onClick={() => remove(idx)} className="text-red-600 text-sm hover:underline">Remove</button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Policy Number</label>
                  <input {...register(`policies.${idx}.policyNumber`)} className="input-field w-full" placeholder="POL-XXXX" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Customer</label>
                  <select {...register(`policies.${idx}.policyHolderId`)} className="input-field w-full" required>
                    <option value="">Select customer</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Product</label>
                  <select {...productField} className="input-field w-full" required onChange={(e) => {
                    productField.onChange(e);
                    const prod = products.find(p => p._id === e.target.value);
                    if (prod) setValue(`policies.${idx}.productType`, prod.name);
                  }}>
                    <option value="">Select product</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                  <input type="hidden" {...register(`policies.${idx}.productType`)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Annual Premium (₹)</label>
                  <input type="number" min="1000" {...register(`policies.${idx}.annualPremium`, { valueAsNumber: true })} className="input-field w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sum Assured (₹)</label>
                  <input type="number" min="10000" {...register(`policies.${idx}.sumAssured`, { valueAsNumber: true })} className="input-field w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <select {...register(`policies.${idx}.paymentFrequency`)} className="input-field w-full">
                    <option value="annual">Annual</option>
                    <option value="semi-annual">Semi-Annual</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Issue Date</label>
                  <input type="date" {...register(`policies.${idx}.issueDate`)} className="input-field w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Policy Term (years)</label>
                  <input type="number" min="1" max="40" {...register(`policies.${idx}.policyTerm`, { valueAsNumber: true })} className="input-field w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Premium Paying Term (years)</label>
                  <input type="number" min="1" {...register(`policies.${idx}.premiumPayingTerm`, { valueAsNumber: true })} className="input-field w-full" required />
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex gap-3">
          <button type="button" onClick={() => append({ policyNumber: '', policyHolderId: '', productId: '', productType: '', annualPremium: 50000, sumAssured: 500000, policyTerm: 15, premiumPayingTerm: 15, paymentFrequency: 'annual', issueDate: new Date().toISOString().slice(0, 10) })} className="btn-secondary">+ Add Another</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Policies'}</button>
        </div>
        {error && <div className="bg-error-container text-error p-3 rounded">{error}</div>}
      </form>
    </div>
  );
}
