import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { calculatorService } from '../../services/calculator.service';
import { formatCurrency } from '../../utils/formatCurrency';

interface FormData {
  targetIncome: number;
  incomePeriod: string;
  productType: string;
}

const PRODUCTS = ['Term Plan', 'Savings Plan', 'ULIP', 'Endowment'];

type ReverseCalculatorView = 'goalPlanning' | 'salesTargets';

export default function ReverseCalculator() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ReverseCalculatorView>('goalPlanning');
  const [submittedInput, setSubmittedInput] = useState<FormData | null>(null);
  const { register, handleSubmit } = useForm<FormData>({
    defaultValues: { targetIncome: 50000, incomePeriod: 'monthly', productType: 'Savings Plan' }
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true); setError(''); setResult(null);
    try {
      const payload = {
        targetIncome: Number(data.targetIncome),
        incomePeriod: data.incomePeriod,
        productType: data.productType,
      };
      const res = await calculatorService.reverseCalc(payload);
      setSubmittedInput({
        targetIncome: Number(data.targetIncome),
        incomePeriod: data.incomePeriod,
        productType: data.productType,
      });
      setResult(res.data.data);
    } catch (err: any) { setError(err.response?.data?.error?.message || 'Calculation failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Calculator module</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">Reverse Income Planner</h1>
          <p className="page-subtitle">Start with an income target and work backwards to the premium, policy, and meeting volume required to reach it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`data-chip ${viewMode === 'goalPlanning' ? 'data-chip-active' : ''}`} aria-pressed={viewMode === 'goalPlanning'} onClick={() => setViewMode('goalPlanning')}>
            Goal Planning
          </button>
          <button type="button" className={`data-chip ${viewMode === 'salesTargets' ? 'data-chip-active' : ''}`} aria-pressed={viewMode === 'salesTargets'} onClick={() => setViewMode('salesTargets')}>
            Sales Targets
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-4 card space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Target Income (₹)</label>
            <input type="number" min="1000" step="1000" {...register('targetIncome', { valueAsNumber: true })} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Income Period</label>
            <select {...register('incomePeriod')} className="input-field w-full">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Product Type</label>
            <select {...register('productType')} className="input-field w-full">
              {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Calculating...' : 'Calculate'}</button>
        </form>

        <div className="lg:col-span-8 space-y-4">
          {error && <div className="bg-error-container text-error p-4 rounded">{error}</div>}

          {!result && !error && (
            <div className="card flex items-center justify-center h-64 text-gray-400">
              Enter your income target and click Calculate
            </div>
          )}

          {result && viewMode === 'goalPlanning' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(result.annualTarget)}</p>
                  <p className="text-sm text-gray-500 mt-1">Annual Target</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(result.requiredPremium)}</p>
                  <p className="text-sm text-gray-500 mt-1">Required Premium</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-amber-600">{result.requiredPolicies}</p>
                  <p className="text-sm text-gray-500 mt-1">Policies Needed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Product</span><span className="font-medium">{result.product?.name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">FY Commission Rate</span><span className="font-medium">{((result.product?.fyCommissionRate || 0) * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Income per ₹1 Premium</span><span className="font-medium">₹{result.incomePerRupee?.toFixed(4)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Average Premium Basis</span><span className="font-medium">{formatCurrency(result.resolvedAverageAnnualPremium || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Income Period</span><span className="font-medium capitalize">{submittedInput?.incomePeriod || '—'}</span></div>
                    {result.unrealistic && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                        This target may be unrealistic and would require selling {result.requiredPolicies} policies in a year.
                      </div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">Planning Inputs</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Target Income</span><span className="font-medium">{submittedInput ? formatCurrency(submittedInput.targetIncome) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Product Type</span><span className="font-medium">{submittedInput?.productType || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Policies Needed / Month</span><span className="font-medium">{Math.ceil(result.requiredPolicies / 12)}</span></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {result && viewMode === 'salesTargets' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-primary">{result.requiredPolicies}</p>
                  <p className="text-sm text-gray-500 mt-1">Policies Needed</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-emerald-600">{result.requiredWeekly}</p>
                  <p className="text-sm text-gray-500 mt-1">Policies / Week</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-amber-600">{result.requiredDaily}</p>
                  <p className="text-sm text-gray-500 mt-1">Policies / Day</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-[#1f2838]">{formatCurrency(result.requiredPremium / 12)}</p>
                  <p className="text-sm text-gray-500 mt-1">Premium / Month</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">Sales Target Breakdown</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Required Premium</span><span className="font-medium">{formatCurrency(result.requiredPremium)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Required Premium / Week</span><span className="font-medium">{formatCurrency(result.requiredPremium / 52)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Required Premium / Day</span><span className="font-medium">{formatCurrency(result.requiredPremium / 365)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Policies Needed / Month</span><span className="font-medium">{Math.ceil(result.requiredPolicies / 12)}</span></div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">Plan Assumptions</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Income Period</span><span className="font-medium capitalize">{submittedInput?.incomePeriod || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Product Type</span><span className="font-medium">{submittedInput?.productType || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Annual Target</span><span className="font-medium">{formatCurrency(result.annualTarget)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
