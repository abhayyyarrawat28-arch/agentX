import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { queryKeys } from '../../services/queryKeys';
import { ConfigPageSkeleton } from '../../components/ui/PageSkeletons';

type ProductName = 'Term Plan' | 'Savings Plan' | 'ULIP' | 'Endowment';

type SlabFormRow = {
  minPremium: number;
  maxPremium: string;
  bonusRate: number;
};

type ProductAdjustmentForm = {
  termPlan: number;
  savingsPlan: number;
  ulip: number;
  endowment: number;
};

type SimulationConditionFormRow = {
  key: string;
  label: string;
  description: string;
  basePersistency: number;
  annualBoost: number;
  premiumSensitivity: number;
  volumeSensitivity: number;
  productAdjustments: ProductAdjustmentForm;
};

type PlanCommissionFormRow = {
  id?: string;
  name: ProductName;
  fyCommissionRate: number;
  renewalYear2: number;
  renewalYear3: number;
  renewalYear4: number;
  renewalYear5: number;
  isActive: boolean;
  currentEffectiveFrom: string;
};

type CommissionConfigFormValues = {
  persistencyThreshold: number;
  mdrtTarget: number;
  effectiveFrom: string;
  slabs: SlabFormRow[];
  productSchedules: PlanCommissionFormRow[];
};

const PLAN_NAMES: ProductName[] = ['Term Plan', 'Savings Plan', 'ULIP', 'Endowment'];

const PLAN_GUIDANCE: Record<ProductName, {
  family: string;
  payoutStyle: string;
  bestPractice: string;
  defaultRates: {
    fyCommissionRate: number;
    renewalYear2: number;
    renewalYear3: number;
    renewalYear4: number;
    renewalYear5: number;
  };
}> = {
  'Term Plan': {
    family: 'Protection',
    payoutStyle: 'Front-loaded with a light trail',
    bestPractice: 'Indian protection products generally carry the strongest first-year payout and a smaller renewal trail because servicing cost is lower and premium terms are cleaner.',
    defaultRates: { fyCommissionRate: 35, renewalYear2: 7.5, renewalYear3: 7.5, renewalYear4: 5, renewalYear5: 5 },
  },
  'Savings Plan': {
    family: 'Traditional Savings',
    payoutStyle: 'Balanced first-year and renewals',
    bestPractice: 'Savings plans typically spread economics across first-year and renewal commissions, so plan-wise trail rates matter almost as much as upfront payouts.',
    defaultRates: { fyCommissionRate: 25, renewalYear2: 5, renewalYear3: 5, renewalYear4: 5, renewalYear5: 5 },
  },
  ULIP: {
    family: 'Market-linked',
    payoutStyle: 'Lower upfront with monitored trail',
    bestPractice: 'ULIP payouts are usually more conservative upfront, with tighter ongoing trail economics and closer persistency oversight due to product complexity and market sensitivity.',
    defaultRates: { fyCommissionRate: 15, renewalYear2: 3, renewalYear3: 3, renewalYear4: 2, renewalYear5: 2 },
  },
  Endowment: {
    family: 'Guaranteed / Traditional',
    payoutStyle: 'Healthy upfront plus renewal trail',
    bestPractice: 'Endowment business commonly sits between protection and savings in payout design, with meaningful first-year income supported by a durable renewal trail.',
    defaultRates: { fyCommissionRate: 30, renewalYear2: 6, renewalYear3: 6, renewalYear4: 4, renewalYear5: 4 },
  },
};

const DEFAULT_SLABS: SlabFormRow[] = [
  { minPremium: 0, maxPremium: '500000', bonusRate: 0 },
  { minPremium: 500000, maxPremium: '1500000', bonusRate: 5 },
  { minPremium: 1500000, maxPremium: '3000000', bonusRate: 8 },
  { minPremium: 3000000, maxPremium: '', bonusRate: 12 },
];

const DEFAULT_SIMULATION_CONDITIONS: SimulationConditionFormRow[] = [
  {
    key: 'market-volatility',
    label: 'Market Volatility',
    description: 'Stress renewal outcomes when client sentiment weakens and higher-risk products face more pressure.',
    basePersistency: 0.74,
    annualBoost: -0.02,
    premiumSensitivity: -0.02,
    volumeSensitivity: -0.01,
    productAdjustments: { termPlan: 0.01, savingsPlan: 0.02, ulip: -0.05, endowment: 0 },
  },
  {
    key: 'renewal-campaign',
    label: 'Renewal Campaign',
    description: 'Model stronger follow-up and reminder campaigns.',
    basePersistency: 0.84,
    annualBoost: 0.03,
    premiumSensitivity: 0.01,
    volumeSensitivity: 0.02,
    productAdjustments: { termPlan: 0.01, savingsPlan: 0.03, ulip: 0, endowment: 0.02 },
  },
  {
    key: 'high-ticket-push',
    label: 'High Ticket Push',
    description: 'Stress large-premium business where follow-up quality determines the renewal lift.',
    basePersistency: 0.79,
    annualBoost: -0.01,
    premiumSensitivity: 0.04,
    volumeSensitivity: -0.02,
    productAdjustments: { termPlan: 0.02, savingsPlan: 0.01, ulip: -0.01, endowment: 0.02 },
  },
];

const PRODUCT_ADJUSTMENT_FIELDS: Array<{ key: keyof ProductAdjustmentForm; label: string }> = [
  { key: 'termPlan', label: 'Term Plan' },
  { key: 'savingsPlan', label: 'Savings Plan' },
  { key: 'ulip', label: 'ULIP' },
  { key: 'endowment', label: 'Endowment' },
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function toPercent(value?: number | null) {
  return Number((((value ?? 0) as number) * 100).toFixed(2));
}

function toNullableString(value?: number | null) {
  return value === null || value === undefined ? '' : String(value);
}

function toDateInput(value?: string | Date | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function percentInput(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function createEmptySlab(): SlabFormRow {
  return { minPremium: 0, maxPremium: '', bonusRate: 0 };
}

function createEmptySimulationCondition(): SimulationConditionFormRow {
  return {
    key: '',
    label: '',
    description: '',
    basePersistency: 80,
    annualBoost: 0,
    premiumSensitivity: 0,
    volumeSensitivity: 0,
    productAdjustments: { termPlan: 0, savingsPlan: 0, ulip: 0, endowment: 0 },
  };
}

function buildDefaultPlanSchedules(): PlanCommissionFormRow[] {
  return PLAN_NAMES.map((name) => ({
    id: '',
    name,
    fyCommissionRate: PLAN_GUIDANCE[name].defaultRates.fyCommissionRate,
    renewalYear2: PLAN_GUIDANCE[name].defaultRates.renewalYear2,
    renewalYear3: PLAN_GUIDANCE[name].defaultRates.renewalYear3,
    renewalYear4: PLAN_GUIDANCE[name].defaultRates.renewalYear4,
    renewalYear5: PLAN_GUIDANCE[name].defaultRates.renewalYear5,
    isActive: true,
    currentEffectiveFrom: '',
  }));
}

function mapProductsToForm(products: any[]): PlanCommissionFormRow[] {
  return PLAN_NAMES.map((name) => {
    const matching = products.filter((product) => product.name === name);
    const activeVersion = matching.find((product) => product.isActive);
    const selected = activeVersion ?? matching[0];
    const fallback = PLAN_GUIDANCE[name].defaultRates;

    return {
      id: selected?._id ?? '',
      name,
      fyCommissionRate: toPercent(selected?.fyCommissionRate ?? fallback.fyCommissionRate / 100),
      renewalYear2: toPercent(selected?.renewalRates?.year2 ?? fallback.renewalYear2 / 100),
      renewalYear3: toPercent(selected?.renewalRates?.year3 ?? fallback.renewalYear3 / 100),
      renewalYear4: toPercent(selected?.renewalRates?.year4 ?? fallback.renewalYear4 / 100),
      renewalYear5: toPercent(selected?.renewalRates?.year5 ?? fallback.renewalYear5 / 100),
      isActive: selected?.isActive ?? true,
      currentEffectiveFrom: toDateInput(selected?.effectiveFrom),
    };
  });
}

function mapConfigToForm(config: any, products: any[]): CommissionConfigFormValues {
  const resolvedSlabs = Array.isArray(config?.slabs) && config.slabs.length > 0 ? config.slabs : DEFAULT_SLABS;

  return {
    persistencyThreshold: toPercent(config?.persistencyThreshold ?? 0.85),
    mdrtTarget: Number(config?.mdrtTarget ?? 3000000),
    effectiveFrom: todayDate(),
    slabs: resolvedSlabs.map((slab: any) => ({
      minPremium: Number(slab.minPremium ?? 0),
      maxPremium: toNullableString(slab.maxPremium),
      bonusRate: toPercent(slab.bonusRate ?? 0),
    })),
    productSchedules: mapProductsToForm(products),
  };
}

function nearlyEqual(a?: number, b?: number) {
  return Math.abs((a ?? 0) - (b ?? 0)) < 0.000001;
}

function normalizeRatio(value: number) {
  if (!Number.isFinite(value)) return 0;
  // Accept both ratio input (0.84) and percent-like input (84).
  return Math.abs(value) > 1 ? value / 100 : value;
}

function toNumberOr(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function CommissionConfigPage() {
  const queryClient = useQueryClient();
  const [simulationConditions, setSimulationConditions] = useState<SimulationConditionFormRow[]>(DEFAULT_SIMULATION_CONDITIONS);
  const [message, setMessage] = useState('');

  const { control, register, handleSubmit, reset, watch } = useForm<CommissionConfigFormValues>({
    defaultValues: {
      persistencyThreshold: 85,
      mdrtTarget: 3000000,
      effectiveFrom: todayDate(),
      slabs: DEFAULT_SLABS,
      productSchedules: buildDefaultPlanSchedules(),
    },
  });

  const slabFields = useFieldArray({ control, name: 'slabs' });
  const planSchedules = watch('productSchedules');

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.products,
    queryFn: async () => {
      const productsResponse = await api.get('/products');
      return Array.isArray(productsResponse.data.data) ? productsResponse.data.data : [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: queryKeys.adminConfigs,
    queryFn: async () => {
      const configResponse = await api.get('/admin/configs');
      return Array.isArray(configResponse.data.data) ? configResponse.data.data[0] : configResponse.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: CommissionConfigFormValues) => {
      const configPayload = {
        persistencyThreshold: normalizeRatio(toNumberOr(data.persistencyThreshold, 85)),
        mdrtTarget: Math.max(1, toNumberOr(data.mdrtTarget, 3000000)),
        effectiveFrom: data.effectiveFrom || todayDate(),
        slabs: data.slabs.map((slab) => ({
          minPremium: Math.max(0, toNumberOr(slab.minPremium, 0)),
          maxPremium: slab.maxPremium === '' ? null : toNumberOr(slab.maxPremium, 0),
          bonusRate: normalizeRatio(toNumberOr(slab.bonusRate, 0)),
        })),
        simulationConditions: simulationConditions.map((condition) => ({
          ...condition,
          basePersistency: normalizeRatio(Number(condition.basePersistency)),
          annualBoost: normalizeRatio(Number(condition.annualBoost)),
          premiumSensitivity: normalizeRatio(Number(condition.premiumSensitivity)),
          volumeSensitivity: normalizeRatio(Number(condition.volumeSensitivity)),
          productAdjustments: {
            termPlan: normalizeRatio(Number(condition.productAdjustments.termPlan)),
            savingsPlan: normalizeRatio(Number(condition.productAdjustments.savingsPlan)),
            ulip: normalizeRatio(Number(condition.productAdjustments.ulip)),
            endowment: normalizeRatio(Number(condition.productAdjustments.endowment)),
          },
        })),
      };

      const productRequests: Promise<unknown>[] = [];

      for (const schedule of data.productSchedules) {
        const existing = products.find((product: any) => product._id === schedule.id)
          ?? products.find((product: any) => product.name === schedule.name);

        const productPayload = {
          fyCommissionRate: Number(schedule.fyCommissionRate) / 100,
          renewalRates: {
            year2: Number(schedule.renewalYear2) / 100,
            year3: Number(schedule.renewalYear3) / 100,
            year4: Number(schedule.renewalYear4) / 100,
            year5: Number(schedule.renewalYear5) / 100,
          },
          isActive: schedule.isActive,
        };

        if (existing) {
          const unchanged =
            nearlyEqual(existing.fyCommissionRate, productPayload.fyCommissionRate)
            && nearlyEqual(existing.renewalRates?.year2, productPayload.renewalRates.year2)
            && nearlyEqual(existing.renewalRates?.year3, productPayload.renewalRates.year3)
            && nearlyEqual(existing.renewalRates?.year4, productPayload.renewalRates.year4)
            && nearlyEqual(existing.renewalRates?.year5, productPayload.renewalRates.year5)
            && Boolean(existing.isActive) === Boolean(productPayload.isActive);

          if (!unchanged) {
            productRequests.push(api.patch(`/products/${existing._id}`, productPayload));
          }
          continue;
        }

        productRequests.push(api.post('/products', {
          name: schedule.name,
          effectiveFrom: new Date(data.effectiveFrom).toISOString(),
          ...productPayload,
        }));
      }

      await Promise.all([
        api.put('/admin/configs', configPayload),
        ...productRequests,
      ]);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminConfigs }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products }),
      ]);
      setMessage('Commission architecture saved successfully');
    },
  });

  useEffect(() => {
    if (!configData) return;
    setSimulationConditions(Array.isArray(configData?.simulationConditions) && configData.simulationConditions.length > 0
      ? configData.simulationConditions
      : DEFAULT_SIMULATION_CONDITIONS);
    reset(mapConfigToForm(configData, products));
  }, [configData, products, reset]);

  const onSubmit = async (data: CommissionConfigFormValues) => {
    setMessage('');

    try {
      await saveConfigMutation.mutateAsync(data);
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      const details = apiError?.details && typeof apiError.details === 'object'
        ? Object.entries(apiError.details)
          .map(([path, messages]) => `${path}: ${Array.isArray(messages) ? messages.join(', ') : String(messages)}`)
          .join(' | ')
        : '';

      setMessage(details ? `Validation failed - ${details}` : (apiError?.message || 'Failed to save commission architecture'));
    }
  };

  const loading = productsLoading || configLoading;
  const saving = saveConfigMutation.isPending;

  if (loading) return <ConfigPageSkeleton />;

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Configuration</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">Commission Configuration</h1>
          <p className="page-subtitle">Business-facing control center for live payout design. Manage plan-wise commission schedules, bonus slabs, persistency thresholds, and performance targets from one place.</p>
        </div>
        {message && <span className={`data-chip ${message.includes('success') ? 'data-chip-active' : ''}`}>{message}</span>}
      </section>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-6xl">
        <section className="stat-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Persistency Threshold (%)</label>
              <input type="number" step="0.1" {...register('persistencyThreshold', { valueAsNumber: true })} className="input-field w-full" />
              <p className="mt-1 text-xs text-gray-500">Used as the governance floor for renewal-quality monitoring.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">MDRT Target (₹)</label>
              <input type="number" step="1000" {...register('mdrtTarget', { valueAsNumber: true })} className="input-field w-full" />
              <p className="mt-1 text-xs text-gray-500">Shared annual production benchmark for the agency force.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Effective From</label>
              <input type="date" {...register('effectiveFrom')} className="input-field w-full" />
              <p className="mt-1 text-xs text-gray-500">Applied when creating any missing plan schedule and when saving the active config version.</p>
            </div>
          </div>
        </section>

        <section className="stat-card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Plan-Wise Commission Schedules</h2>
            <p className="text-sm text-gray-500">Maintain the live payout schedule by product and policy year. Use this section for the actual commission rates payable on business written, while incentive slabs and thresholds stay separate below.</p>
          </div>

          <div className="space-y-4">
            {planSchedules?.map((schedule, index) => {
              const guidance = PLAN_GUIDANCE[schedule.name];
              const renewalTrail = Number(schedule.renewalYear2 || 0)
                + Number(schedule.renewalYear3 || 0)
                + Number(schedule.renewalYear4 || 0)
                + Number(schedule.renewalYear5 || 0);
              const fiveYearPayout = Number(schedule.fyCommissionRate || 0) + renewalTrail;

              return (
                <div key={schedule.name} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
                  <input type="hidden" {...register(`productSchedules.${index}.id`)} />
                  <input type="hidden" {...register(`productSchedules.${index}.name`)} />
                  <input type="hidden" {...register(`productSchedules.${index}.currentEffectiveFrom`)} />

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900">{schedule.name}</h3>
                        <span className="data-chip">{guidance.family}</span>
                        <span className="data-chip">{guidance.payoutStyle}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{guidance.bestPractice}</p>
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" {...register(`productSchedules.${index}.isActive`)} className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                      Active for new sales
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">First-Year Commission (%)</label>
                      <input type="number" step="0.1" {...register(`productSchedules.${index}.fyCommissionRate`, { valueAsNumber: true })} className="input-field w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Renewal Year 2 (%)</label>
                      <input type="number" step="0.1" {...register(`productSchedules.${index}.renewalYear2`, { valueAsNumber: true })} className="input-field w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Renewal Year 3 (%)</label>
                      <input type="number" step="0.1" {...register(`productSchedules.${index}.renewalYear3`, { valueAsNumber: true })} className="input-field w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Renewal Year 4 (%)</label>
                      <input type="number" step="0.1" {...register(`productSchedules.${index}.renewalYear4`, { valueAsNumber: true })} className="input-field w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Renewal Year 5 (%)</label>
                      <input type="number" step="0.1" {...register(`productSchedules.${index}.renewalYear5`, { valueAsNumber: true })} className="input-field w-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">5-Year Payout Weight</p>
                      <p className="mt-2 text-lg font-semibold text-gray-900">{percentInput(fiveYearPayout)}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Renewal Trail Total</p>
                      <p className="mt-2 text-lg font-semibold text-gray-900">{percentInput(renewalTrail)}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Current Effective From</p>
                      <p className="mt-2 text-lg font-semibold text-gray-900">{schedule.currentEffectiveFrom ? new Date(schedule.currentEffectiveFrom).toLocaleDateString('en-IN') : 'Will use config date'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="stat-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Production Bonus Overlays</h2>
              <p className="text-sm text-gray-500">Use premium slabs for insurer-defined production bonuses on top of the plan-wise payout grid, not as a replacement for base commission schedules.</p>
            </div>
            <button type="button" onClick={() => slabFields.append(createEmptySlab())} className="btn-secondary">Add Bonus Condition</button>
          </div>

          <div className="space-y-3">
            {slabFields.fields.map((field, index) => (
              <div key={field.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Condition {index + 1}</p>
                    <p className="text-xs text-gray-500">Company-defined production bonus rule for annual premium output.</p>
                  </div>
                  <button type="button" onClick={() => slabFields.remove(index)} disabled={slabFields.fields.length === 1} className="btn-secondary disabled:opacity-50">Remove</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Minimum Premium (₹)</label>
                    <input type="number" step="1000" {...register(`slabs.${index}.minPremium`, { valueAsNumber: true })} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Maximum Premium (₹)</label>
                    <input type="number" step="1000" placeholder="Leave blank for open ended" {...register(`slabs.${index}.maxPremium`)} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bonus Rate (%)</label>
                    <input type="number" step="0.1" {...register(`slabs.${index}.bonusRate`, { valueAsNumber: true })} className="input-field w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Commission Architecture'}</button>
        </div>
      </form>
    </div>
  );
}