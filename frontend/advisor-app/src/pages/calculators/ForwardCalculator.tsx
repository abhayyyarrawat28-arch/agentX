import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { calculatorService } from '../../services/calculator.service';
import { formatChartCurrency, formatCurrency } from '../../utils/formatCurrency';
import type { ForwardCalcResult } from '../../types/calculator.types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FormData {
  policiesSold: number;
  averageAnnualPremium: number;
  productType: string;
  persistencyRate: number;
}

const PRODUCTS = ['Term Plan', 'Savings Plan', 'ULIP', 'Endowment'];

type ForwardCalculatorView = 'projection' | 'fiveYear';

type ProjectionRow = ForwardCalcResult['chartData'][number];

function formatPolicyCount(value: number) {
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(2).replace(/\.00$/, '');
}

function ProjectionTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: ProjectionRow }>; label?: string }) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <div className="mt-2 space-y-1 text-xs text-gray-600">
        <div className="flex justify-between gap-4"><span>Total income</span><span className="font-semibold text-gray-900">{formatCurrency(point.income)}</span></div>
        <div className="flex justify-between gap-4"><span>New business</span><span>{formatCurrency(point.newBusinessIncome)}</span></div>
        <div className="flex justify-between gap-4"><span>Renewal carry-forward</span><span>{formatCurrency(point.renewalIncome)}</span></div>
        <div className="flex justify-between gap-4"><span>Annual bonus</span><span>{formatCurrency(point.bonusIncome)}</span></div>
      </div>
    </div>
  );
}

export default function ForwardCalculator() {
  const [result, setResult] = useState<ForwardCalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ForwardCalculatorView>('projection');
  const [submittedInput, setSubmittedInput] = useState<FormData | null>(null);

  const { register, handleSubmit } = useForm<FormData>({
    defaultValues: { policiesSold: 10, averageAnnualPremium: 50000, productType: 'Term Plan', persistencyRate: 80 }
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true); setError(''); setResult(null);
    try {
      const payload = {
        policiesSold: Number(data.policiesSold),
        averageAnnualPremium: Number(data.averageAnnualPremium),
        productType: data.productType,
        persistencyRate: Number(data.persistencyRate) / 100,
      };
      const res = await calculatorService.forwardCalc(payload);
      setSubmittedInput({
        policiesSold: Number(data.policiesSold),
        averageAnnualPremium: Number(data.averageAnnualPremium),
        productType: data.productType,
        persistencyRate: Number(data.persistencyRate),
      });
      setResult(res.data.data as ForwardCalcResult);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Calculation failed');
    } finally { setLoading(false); }
  };

  const yearlyRows = result?.chartData ?? [];

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Calculator module</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">Forward Incentive Calculator</h1>
          <p className="page-subtitle">Project annual new-business income and a progressive 5-year earnings runway that compounds renewals year over year.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`data-chip ${viewMode === 'projection' ? 'data-chip-active' : ''}`} aria-pressed={viewMode === 'projection'} onClick={() => setViewMode('projection')}>
            Income Projection
          </button>
          <button type="button" className={`data-chip ${viewMode === 'fiveYear' ? 'data-chip-active' : ''}`} aria-pressed={viewMode === 'fiveYear'} onClick={() => setViewMode('fiveYear')}>
            5 Year View
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-4 card space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Policies Sold</label>
            <input type="number" min="1" step="1" {...register('policiesSold', { valueAsNumber: true })} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Avg Annual Premium (₹)</label>
            <input type="number" min="1000" step="1000" {...register('averageAnnualPremium', { valueAsNumber: true })} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Product Type</label>
            <select {...register('productType')} className="input-field w-full">
              {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Persistency Rate (%)</label>
            <input type="number" min="1" max="100" step="1" {...register('persistencyRate', { valueAsNumber: true })} className="input-field w-full" required />
            <p className="text-xs text-gray-400 mt-1">e.g. 80 for 80% retention</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Calculating...' : 'Calculate'}</button>
        </form>

        <div className="lg:col-span-8 space-y-4">
          {error && <div className="bg-error-container text-error p-4 rounded">{error}</div>}

          {!result && !error && (
            <div className="card flex items-center justify-center h-64 text-gray-400">
              Enter policy details and click Calculate
            </div>
          )}

          {result && viewMode === 'projection' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(result.firstYearCommission)}</p>
                  <p className="text-sm text-gray-500 mt-1">Annual New Business Commission</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(result.renewalTotal)}</p>
                  <p className="text-sm text-gray-500 mt-1">Renewal Contribution (5yr)</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(result.bonusEarnings)}</p>
                  <p className="text-sm text-gray-500 mt-1">Bonus Earnings (5yr)</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.totalCumulativeIncome)}</p>
                  <p className="text-sm text-gray-500 mt-1">Total 5-Year Income</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">Breakdown</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Total Annual Premium</span><span className="font-medium">{formatCurrency(result.totalAnnualPremium)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Product</span><span className="font-medium">{result.product?.name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">FY Commission Rate</span><span className="font-medium">{((result.product?.fyCommissionRate || 0) * 100).toFixed(1)}%</span></div>
                    {result.bonusRate > 0 && <div className="flex justify-between"><span className="text-gray-500">Bonus Rate</span><span className="font-medium">{(result.bonusRate * 100).toFixed(1)}%</span></div>}
                    <div className="flex justify-between"><span className="text-gray-500">Annual Bonus</span><span className="font-medium">{formatCurrency(result.annualBonusEarnings)}</span></div>
                    <hr className="border-gray-100" />
                    {result.chartData?.map((row) => (
                      <div key={row.year} className="flex justify-between"><span className="text-gray-500">{row.year} Renewal Carry-Forward</span><span className="font-medium">{formatCurrency(row.renewalIncome)}</span></div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">Projection Inputs</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Policies Sold</span><span className="font-medium">{submittedInput?.policiesSold ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Avg Annual Premium</span><span className="font-medium">{submittedInput ? formatCurrency(submittedInput.averageAnnualPremium) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Persistency Rate</span><span className="font-medium">{submittedInput ? `${submittedInput.persistencyRate}%` : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Average Annual Income</span><span className="font-medium">{formatCurrency(result.totalCumulativeIncome / Math.max(result.chartData?.length || 1, 1))}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Average Monthly Income</span><span className="font-medium">{formatCurrency(result.totalCumulativeIncome / 60)}</span></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {result && viewMode === 'fiveYear' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(yearlyRows[0]?.income || 0)}</p>
                  <p className="text-sm text-gray-500 mt-1">Year 1 Income</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(yearlyRows[yearlyRows.length - 1]?.income || 0)}</p>
                  <p className="text-sm text-gray-500 mt-1">Year 5 Income</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {yearlyRows.length > 1
                      ? `${Math.max((((yearlyRows[yearlyRows.length - 1]?.income || 0) - (yearlyRows[0]?.income || 0)) / Math.max(yearlyRows[0]?.income || 1, 1)) * 100, 0).toFixed(0)}%`
                      : '0%'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">5-Year Growth</p>
                </div>
              </div>

              {result.chartData && (
                <div className="card">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Progressive Income by Year</h3>
                  <p className="text-xs text-gray-400 mb-4">Each year layers new business income on top of renewal carry-forward from earlier production. Expected in-force counts use persistency-weighted portfolio values rather than early rounding.</p>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={result.chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eeedf2" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={formatChartCurrency} tick={{ fontSize: 10 }} />
                      <Tooltip content={<ProjectionTooltip />} />
                      <Bar dataKey="income" fill="#795900" radius={[4, 4, 0, 0]} name="Income" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="card">
                <h3 className="text-sm font-medium text-gray-500 mb-4">5-Year Outlook</h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 text-sm">
                  {yearlyRows.map((row) => (
                    <div key={row.year} className="rounded-2xl border border-gray-100 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{row.year}</p>
                          <p className="text-xs text-gray-500 mt-1">New business + renewal carry-forward + annual bonus</p>
                        </div>
                        <p className="font-semibold text-gray-900">{formatCurrency(row.income)}</p>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-500 sm:grid-cols-3">
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2"><span>New business</span><span className="font-semibold text-gray-700">{formatCurrency(row.newBusinessIncome)}</span></div>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2"><span>Renewal carry-forward</span><span className="font-semibold text-gray-700">{formatCurrency(row.renewalIncome)}</span></div>
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2"><span>Annual bonus</span><span className="font-semibold text-gray-700">{formatCurrency(row.bonusIncome)}</span></div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>Expected in-force policies</span>
                        <span className="font-semibold text-gray-700">{formatPolicyCount(row.activePolicies)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
