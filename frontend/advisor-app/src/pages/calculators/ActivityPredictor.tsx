import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { calculatorService } from '../../services/calculator.service';
import { formatCurrency } from '../../utils/formatCurrency';

interface FormData {
  meetingsPerWeek: number;
  conversionRate: number;
  averagePremiumPerSale: number;
  productType: string;
}

type ActivityView = 'activityFunnel' | 'weeklyPlan';

export default function ActivityPredictor() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ActivityView>('activityFunnel');
  const [submittedInput, setSubmittedInput] = useState<FormData | null>(null);
  const { register, handleSubmit } = useForm<FormData>({
    defaultValues: { meetingsPerWeek: 10, conversionRate: 20, averagePremiumPerSale: 50000, productType: 'Term Plan' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true); setError(''); setResult(null);
    try {
      const payload = {
        meetingsPerWeek: Number(data.meetingsPerWeek),
        conversionRate: Number(data.conversionRate) / 100,
        averagePremiumPerSale: Number(data.averagePremiumPerSale),
        productType: data.productType,
      };
      const res = await calculatorService.activityPredictor(payload);
      setSubmittedInput({
        meetingsPerWeek: Number(data.meetingsPerWeek),
        conversionRate: Number(data.conversionRate),
        averagePremiumPerSale: Number(data.averagePremiumPerSale),
        productType: data.productType,
      });
      setResult(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Prediction failed');
    } finally { setLoading(false); }
  };

  const funnelMax = result?.funnelData?.reduce((max: number, step: any) => Math.max(max, step.value || 0), 0) || 1;
  const weeksPerMonth = 4.33;
  const weeklyPolicies = result ? result.expectedPolicies / weeksPerMonth : 0;
  const weeklyPremium = result ? result.expectedPremium / weeksPerMonth : 0;
  const weeklyIncentive = result ? result.expectedIncentive / weeksPerMonth : 0;

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Calculator module</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">Activity-to-Income Predictor</h1>
          <p className="page-subtitle">Convert weekly meeting volume into policy output, premium production, and expected earnings using current product economics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`data-chip ${viewMode === 'activityFunnel' ? 'data-chip-active' : ''}`} aria-pressed={viewMode === 'activityFunnel'} onClick={() => setViewMode('activityFunnel')}>
            Activity Funnel
          </button>
          <button type="button" className={`data-chip ${viewMode === 'weeklyPlan' ? 'data-chip-active' : ''}`} aria-pressed={viewMode === 'weeklyPlan'} onClick={() => setViewMode('weeklyPlan')}>
            Weekly Plan
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-4 card space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Meetings / Week</label>
            <input type="number" min="1" step="1" {...register('meetingsPerWeek')} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Conversion Rate (%)</label>
            <input type="number" min="1" max="100" step="1" {...register('conversionRate', { setValueAs: v => Number(v) })} className="input-field w-full" required />
            <p className="text-xs text-outline mt-1">e.g. 20 for 20%</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Avg Premium / Sale (₹)</label>
            <input type="number" min="1000" step="1000" {...register('averagePremiumPerSale')} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Product Type</label>
            <select {...register('productType')} className="input-field w-full">
              <option value="Term Plan">Term Plan</option>
              <option value="Savings Plan">Savings Plan</option>
              <option value="ULIP">ULIP</option>
              <option value="Endowment">Endowment</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Calculating...' : 'Predict'}
          </button>
        </form>

        <div className="lg:col-span-8 space-y-4">
          {error && <div className="bg-error-container text-error p-4 rounded">{error}</div>}

          {!result && !error && (
            <div className="card flex items-center justify-center h-64 text-gray-400">
              Enter your activity details and click Predict
            </div>
          )}

          {result && viewMode === 'activityFunnel' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card text-center">
                  <p className="text-3xl font-bold text-primary">{result.expectedPolicies}</p>
                  <p className="text-sm text-gray-500 mt-1">Monthly Policies</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(result.expectedPremium)}</p>
                  <p className="text-sm text-gray-500 mt-1">Monthly Premium</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(result.expectedFYC)}</p>
                  <p className="text-sm text-gray-500 mt-1">Expected FYC</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-[#1f2838]">{formatCurrency(result.expectedIncentive)}</p>
                  <p className="text-sm text-gray-500 mt-1">Expected Incentive</p>
                </div>
              </div>

              {result.funnelData && (
                <div className="card">
                  <h3 className="font-semibold mb-4 text-gray-900">Conversion Funnel</h3>
                  <div className="space-y-3">
                    {result.funnelData.map((step: any, i: number) => {
                      const pct = Math.round((step.value / funnelMax) * 100);
                      const colors = ['bg-orange-300', 'bg-orange-400', 'bg-orange-500', 'bg-[#1f2838]'];
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{step.stage}</span>
                            <span className="font-medium">{step.value}</span>
                          </div>
                          <div className="w-full overflow-hidden bg-gray-200 rounded-full h-4">
                            <div className={`${colors[i] || 'bg-primary'} rounded-full h-4 transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {result.product && (
                <div className="card text-sm">
                  <span className="font-medium">Product:</span> {result.product.name} &middot;
                  <span className="font-medium"> FY Commission Rate:</span> {(result.product.fyCommissionRate * 100).toFixed(1)}%
                </div>
              )}
            </>
          )}

          {result && viewMode === 'weeklyPlan' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-primary">{submittedInput?.meetingsPerWeek ?? '—'}</p>
                  <p className="text-sm text-gray-500 mt-1">Meetings / Week</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-emerald-600">{weeklyPolicies.toFixed(1)}</p>
                  <p className="text-sm text-gray-500 mt-1">Policies / Week</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(weeklyPremium)}</p>
                  <p className="text-sm text-gray-500 mt-1">Premium / Week</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-[#1f2838]">{formatCurrency(weeklyIncentive)}</p>
                  <p className="text-sm text-gray-500 mt-1">Incentive / Week</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card">
                  <h3 className="font-semibold mb-4 text-gray-900">Weekly Plan Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Monthly Policies</span><span className="font-medium">{result.expectedPolicies}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Monthly Premium</span><span className="font-medium">{formatCurrency(result.expectedPremium)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Monthly Incentive</span><span className="font-medium">{formatCurrency(result.expectedIncentive)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Annual Premium Run Rate</span><span className="font-medium">{formatCurrency(result.expectedPremium * 12)}</span></div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="font-semibold mb-4 text-gray-900">Assumptions</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Conversion Rate</span><span className="font-medium">{submittedInput ? `${submittedInput.conversionRate}%` : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Avg Premium / Sale</span><span className="font-medium">{submittedInput ? formatCurrency(submittedInput.averagePremiumPerSale) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Product</span><span className="font-medium">{submittedInput?.productType || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">FY Commission Rate</span><span className="font-medium">{((result.product?.fyCommissionRate || 0) * 100).toFixed(1)}%</span></div>
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
