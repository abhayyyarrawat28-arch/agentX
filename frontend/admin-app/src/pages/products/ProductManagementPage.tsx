import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { queryKeys } from '../../services/queryKeys';

type ProductFormValues = {
  name: 'Term Plan' | 'Savings Plan' | 'ULIP' | 'Endowment';
  fyCommissionRate: number;
  renewalYear2: number;
  renewalYear3: number;
  renewalYear4: number;
  renewalYear5: number;
  effectiveFrom: string;
};

export default function ProductManagementPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, reset } = useForm<ProductFormValues>({
    defaultValues: {
      name: 'Term Plan',
      fyCommissionRate: 35,
      renewalYear2: 7.5,
      renewalYear3: 7.5,
      renewalYear4: 5,
      renewalYear5: 5,
      effectiveFrom: new Date().toISOString().slice(0, 10),
    },
  });

  const { data: products = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.products,
    queryFn: async () => {
      const res = await api.get('/products');
      return Array.isArray(res.data.data) ? res.data.data : [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const createProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      await api.post('/products', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    setError('');
    try {
      await createProductMutation.mutateAsync({
        name: data.name,
        fyCommissionRate: Number(data.fyCommissionRate) / 100,
        renewalRates: {
          year2: Number(data.renewalYear2) / 100,
          year3: Number(data.renewalYear3) / 100,
          year4: Number(data.renewalYear4) / 100,
          year5: Number(data.renewalYear5) / 100,
        },
        effectiveFrom: new Date(data.effectiveFrom).toISOString(),
        isActive: true,
      });
      reset(); setShowForm(false);
    } catch (err: any) { setError(err.response?.data?.error?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Inventory control</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">Product Management</h1>
          <p className="page-subtitle">Raw product master for creating and maintaining effective-dated plan definitions. Use Commission Config as the business-facing control center for live payout design, thresholds, and incentive governance.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? 'Cancel' : '+ Add Product'}</button>
      </section>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium mb-1">Product Type</label>
            <select {...register('name')} className="input-field w-full" required>
              <option value="Term Plan">Term Plan</option><option value="Savings Plan">Savings Plan</option><option value="ULIP">ULIP</option><option value="Endowment">Endowment</option>
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">FY Commission Rate (%)</label><input type="number" step="0.1" {...register('fyCommissionRate', { valueAsNumber: true })} className="input-field w-full" required placeholder="e.g. 35 for 35%" /></div>
          <div><label className="block text-sm font-medium mb-1">Effective From</label><input type="date" {...register('effectiveFrom')} className="input-field w-full" required /></div>
          <div><label className="block text-sm font-medium mb-1">Renewal Year 2 (%)</label><input type="number" step="0.1" {...register('renewalYear2', { valueAsNumber: true })} className="input-field w-full" required /></div>
          <div><label className="block text-sm font-medium mb-1">Renewal Year 3 (%)</label><input type="number" step="0.1" {...register('renewalYear3', { valueAsNumber: true })} className="input-field w-full" required /></div>
          <div><label className="block text-sm font-medium mb-1">Renewal Year 4 (%)</label><input type="number" step="0.1" {...register('renewalYear4', { valueAsNumber: true })} className="input-field w-full" required /></div>
          <div><label className="block text-sm font-medium mb-1">Renewal Year 5 (%)</label><input type="number" step="0.1" {...register('renewalYear5', { valueAsNumber: true })} className="input-field w-full" required /></div>
          {error && <p className="text-error text-sm xl:col-span-3 md:col-span-2">{error}</p>}
          <div className="xl:col-span-3 md:col-span-2"><button type="submit" disabled={createProductMutation.isPending} className="btn-primary">{createProductMutation.isPending ? 'Creating...' : 'Create Product'}</button></div>
        </form>
      )}

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[52rem] table-fixed text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th><th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">FY Commission Rate</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Renewal Trail</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th><th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Effective From</th></tr></thead>
          <tbody>
            {products.map((p: any) => (
              <tr key={p._id} className="border-b"><td className="p-3"><span className="block break-words">{p.name}</span></td><td className="p-3 text-right">{((p.fyCommissionRate || 0) * 100).toFixed(1)}%</td><td className="p-3"><span className="block break-words">Y2 {((p.renewalRates?.year2 || 0) * 100).toFixed(1)}% · Y3 {((p.renewalRates?.year3 || 0) * 100).toFixed(1)}% · Y4 {((p.renewalRates?.year4 || 0) * 100).toFixed(1)}% · Y5 {((p.renewalRates?.year5 || 0) * 100).toFixed(1)}%</span></td><td className="p-3 capitalize">{p.isActive ? 'active' : 'inactive'}</td><td className="p-3">{p.effectiveFrom ? new Date(p.effectiveFrom).toLocaleDateString('en-IN') : '—'}</td></tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
