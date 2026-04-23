import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { Product } from '../product/model';
import { CommissionConfig } from '../config/model';
import { AgentPolicy } from '../agent-policy/model';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { startOfYear, dayOfYear, daysInYear } from '../../utils/dateHelpers';

type ProductAdjustmentKey = 'termPlan' | 'savingsPlan' | 'ulip' | 'endowment';

const DEFAULT_SIMULATION_CONDITIONS = [
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
    description: 'Model the effect of stronger reminder campaigns and renewal follow-up discipline.',
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

function applyPersistencyDecay(count: number, rate: number): number[] {
  return [1, 2, 3, 4, 5].map((yr) => Number((count * Math.pow(rate, yr)).toFixed(4)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

async function getActiveConfig() {
  const now = new Date();
  return CommissionConfig.findOne({
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gt: now } }],
  }).sort({ effectiveFrom: -1 });
}

async function getActiveProduct(productType: string) {
  const now = new Date();
  return Product.findOne({
    name: productType,
    isActive: true,
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gt: now } }],
  }).sort({ effectiveFrom: -1 });
}

function getBonusRate(config: any, totalPremium: number): number {
  if (!config?.slabs) return 0;
  const slab = config.slabs
    .filter((s: any) => totalPremium >= s.minPremium && (s.maxPremium === null || totalPremium <= s.maxPremium))
    .sort((a: any, b: any) => b.minPremium - a.minPremium)[0];
  return slab?.bonusRate || 0;
}

async function resolveAverageAnnualPremium(agentId?: string) {
  const buildAverage = async (match: Record<string, unknown>) => {
    const result = await AgentPolicy.aggregate([
      { $match: match },
      { $group: { _id: null, averageAnnualPremium: { $avg: '$annualPremium' } } },
    ]);
    return result[0]?.averageAnnualPremium ?? null;
  };

  const agentMatch = agentId
    ? { agentId: new mongoose.Types.ObjectId(agentId), persistencyStatus: 'active', isDeleted: false }
    : null;

  const agentAverage = agentMatch ? await buildAverage(agentMatch) : null;
  if (agentAverage && agentAverage > 0) {
    return Math.round(agentAverage);
  }

  const portfolioAverage = await buildAverage({ persistencyStatus: 'active', isDeleted: false });
  if (portfolioAverage && portfolioAverage > 0) {
    return Math.round(portfolioAverage);
  }

  return 50000;
}

function resolveSimulationConditions(config: any) {
  return Array.isArray(config?.simulationConditions) && config.simulationConditions.length > 0
    ? config.simulationConditions
    : DEFAULT_SIMULATION_CONDITIONS;
}

function getProductAdjustmentKey(productType: string): ProductAdjustmentKey {
  switch (productType) {
    case 'Term Plan':
      return 'termPlan';
    case 'Savings Plan':
      return 'savingsPlan';
    case 'ULIP':
      return 'ulip';
    default:
      return 'endowment';
  }
}

function predictPersistency(condition: any, productType: string, policiesSold: number, averageAnnualPremium: number): number {
  const productKey = getProductAdjustmentKey(productType);
  const productAdjustment = condition.productAdjustments?.[productKey] ?? 0;
  const premiumDelta = ((averageAnnualPremium - 50000) / 50000) * (condition.premiumSensitivity ?? 0);
  const volumeDelta = ((policiesSold - 20) / 20) * (condition.volumeSensitivity ?? 0);

  return clamp(
    (condition.basePersistency ?? 0.8)
      + (condition.annualBoost ?? 0)
      + productAdjustment
      + premiumDelta
      + volumeDelta,
    0.35,
    0.99,
  );
}

type ForwardProjectionPoint = {
  year: string;
  income: number;
  newBusinessIncome: number;
  renewalIncome: number;
  bonusIncome: number;
  activePolicies: number;
};

function buildForwardProjection(
  policiesSold: number,
  averageAnnualPremium: number,
  persistencyRate: number,
  fyCommissionRate: number,
  renewalRates: { year2: number; year3: number; year4: number; year5: number },
  annualBonusEarnings: number,
): ForwardProjectionPoint[] {
  const annualNewBusinessIncome = policiesSold * averageAnnualPremium * fyCommissionRate;
  const renewalRatesByAge = [0, renewalRates.year2, renewalRates.year3, renewalRates.year4, renewalRates.year5];

  return [1, 2, 3, 4, 5].map((projectionYear) => {
    let renewalCarryForward = 0;
    let inForcePolicies = policiesSold;

    for (let age = 1; age < projectionYear; age++) {
      const retainedPolicies = policiesSold * Math.pow(persistencyRate, age);
      inForcePolicies += retainedPolicies;
      renewalCarryForward += retainedPolicies * averageAnnualPremium * renewalRatesByAge[age];
    }

    return {
      year: `Year ${projectionYear}`,
      income: Math.round(annualNewBusinessIncome + annualBonusEarnings + renewalCarryForward),
      newBusinessIncome: Math.round(annualNewBusinessIncome),
      renewalIncome: Math.round(renewalCarryForward),
      bonusIncome: Math.round(annualBonusEarnings),
      activePolicies: Number(inForcePolicies.toFixed(2)),
    };
  });
}

function buildSimulationProjection(
  policiesSold: number,
  averageAnnualPremium: number,
  renewalRates: { year2: number; year3: number; year4: number; year5: number },
  persistencyRate: number,
  firstYearRate: number,
) {
  const activePolicies = applyPersistencyDecay(policiesSold, persistencyRate);
  const rateCard = [firstYearRate, renewalRates.year2, renewalRates.year3, renewalRates.year4, renewalRates.year5];
  const projectedIncome = activePolicies.map((activeCount, index) => Math.round(activeCount * averageAnnualPremium * rateCard[index]));

  return {
    activePolicies,
    projectedIncome,
    total5Year: projectedIncome.reduce((sum, value) => sum + value, 0),
  };
}

export async function forwardCalculator(req: Request, res: Response): Promise<void> {
  try {
    const { policiesSold, averageAnnualPremium, productType, persistencyRate } = req.body;

    const product = await getActiveProduct(productType);
    if (!product) {
      sendError(res, 'CONFIG_MISSING', 'No active product config found', 500);
      return;
    }

    const config = await getActiveConfig();
    const totalAnnualPremium = policiesSold * averageAnnualPremium;
    const firstYearCommission = totalAnnualPremium * product.fyCommissionRate;

    const bonusRate = getBonusRate(config, totalAnnualPremium);
    const annualBonusEarnings = bonusRate > 0 ? totalAnnualPremium * bonusRate : 0;
    const chartData = buildForwardProjection(
      policiesSold,
      averageAnnualPremium,
      persistencyRate,
      product.fyCommissionRate,
      product.renewalRates,
      annualBonusEarnings,
    );
    const renewalIncome = chartData.map((point) => point.renewalIncome);
    const renewalTotal = renewalIncome.reduce((sum, value) => sum + value, 0);
    const bonusEarnings = annualBonusEarnings * chartData.length;
    const totalCumulativeIncome = chartData.reduce((sum, point) => sum + point.income, 0);
    const activePolicies = chartData.map((point) => point.activePolicies);

    sendSuccess(res, {
      totalAnnualPremium,
      firstYearCommission,
      renewalIncome: renewalIncome.slice(1),
      renewalTotal,
      bonusEarnings,
      annualBonusEarnings,
      bonusRate,
      totalCumulativeIncome,
      activePolicies,
      chartData,
      product: { name: product.name, fyCommissionRate: product.fyCommissionRate },
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Calculation failed', 500);
  }
}

export async function forwardCalculatorBulk(req: Request, res: Response): Promise<void> {
  try {
    const { policies } = req.body;
    const config = await getActiveConfig();

    const perPolicy = [];
    let totalFYC = 0;
    let totalRenewal = 0;
    let totalPremium = 0;

    for (const p of policies) {
      const product = await getActiveProduct(p.productType);
      if (!product) {
        sendError(res, 'CONFIG_MISSING', `No active config for ${p.productType}`, 500);
        return;
      }

      const fyc = p.annualPremium * product.fyCommissionRate;
      const renewalRateCard = [product.renewalRates.year2, product.renewalRates.year3, product.renewalRates.year4, product.renewalRates.year5];
      const renewal = renewalRateCard.reduce((sum, renewalRate, index) => (
        sum + (Math.pow(p.persistencyRate, index + 1) * p.annualPremium * renewalRate)
      ), 0);

      perPolicy.push({
        productType: p.productType,
        annualPremium: p.annualPremium,
        fyc: Math.round(fyc),
        renewal: Math.round(renewal),
        total: Math.round(fyc + renewal),
      });
      totalFYC += fyc;
      totalRenewal += renewal;
      totalPremium += p.annualPremium;
    }

    const bonusRate = getBonusRate(config, totalPremium);
    const bonusEarnings = totalPremium * bonusRate;

    sendSuccess(res, {
      perPolicy,
      aggregate: {
        totalFYC: Math.round(totalFYC),
        totalRenewal: Math.round(totalRenewal),
        bonusEarnings: Math.round(bonusEarnings),
        totalCumulative: Math.round(totalFYC + totalRenewal + bonusEarnings),
      },
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Bulk calculation failed', 500);
  }
}

export async function reverseCalculator(req: Request, res: Response): Promise<void> {
  try {
    const { targetIncome, incomePeriod, productType, conversionRate } = req.body;

    const product = productType ? await getActiveProduct(productType) : await Product.findOne({ isActive: true });
    if (!product) {
      sendError(res, 'CONFIG_MISSING', 'No active product config found', 500);
      return;
    }

    const annualTarget = targetIncome * (incomePeriod === 'monthly' ? 12 : 4);
    const avgRenewalRate = (product.renewalRates.year2 + product.renewalRates.year3 + product.renewalRates.year4 + product.renewalRates.year5) / 4;
    const incomePerRupee = product.fyCommissionRate + avgRenewalRate;
    const requiredPremium = annualTarget / incomePerRupee;

    const resolvedAAP = await resolveAverageAnnualPremium(req.user?.sub);
    const requiredPolicies = Math.ceil(requiredPremium / resolvedAAP);
    const requiredWeekly = Math.ceil(requiredPolicies / 52);
    const requiredDaily = Math.ceil(requiredPolicies / 365);

    const result: any = {
      annualTarget,
      requiredPremium,
      requiredPolicies,
      requiredWeekly,
      requiredDaily,
      incomePerRupee,
      resolvedAverageAnnualPremium: resolvedAAP,
      unrealistic: requiredPolicies > 500,
      product: { name: product.name, fyCommissionRate: product.fyCommissionRate },
    };

    if (conversionRate) {
      const requiredMeetings = Math.ceil(requiredPolicies / conversionRate);
      result.requiredMeetings = requiredMeetings;
      result.meetingsPerWeek = Math.ceil(requiredMeetings / 52);
    }

    sendSuccess(res, result);
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Reverse calculation failed', 500);
  }
}

export async function persistencySimulator(req: Request, res: Response): Promise<void> {
  try {
    const { policiesSold, averageAnnualPremium, productType, selectedConditionKey } = req.body;

    const product = await getActiveProduct(productType);
    if (!product) {
      sendError(res, 'CONFIG_MISSING', 'No active product config found', 500);
      return;
    }

    const config = await getActiveConfig();
    const availableConditions = resolveSimulationConditions(config);
    const selectedCondition = availableConditions.find((condition: any) => condition.key === selectedConditionKey);
    if (!selectedCondition) {
      sendError(res, 'INVALID_CONDITION', 'Selected simulation condition is not available', 400);
      return;
    }

    const baselinePersistency = clamp(config?.persistencyThreshold ?? 0.8, 0.35, 0.99);
    const predictedPersistency = predictPersistency(selectedCondition, productType, policiesSold, averageAnnualPremium);
    const baselineProjection = buildSimulationProjection(
      policiesSold,
      averageAnnualPremium,
      product.renewalRates,
      baselinePersistency,
      product.fyCommissionRate,
    );
    const conditionAdjustedProjection = buildSimulationProjection(
      policiesSold,
      averageAnnualPremium,
      product.renewalRates,
      predictedPersistency,
      product.fyCommissionRate,
    );

    const chartData = [1, 2, 3, 4, 5].map((yearIndex) => ({
      year: `Year ${yearIndex}`,
      baseline: baselineProjection.projectedIncome[yearIndex - 1],
      adjusted: conditionAdjustedProjection.projectedIncome[yearIndex - 1],
      baselinePolicies: baselineProjection.activePolicies[yearIndex - 1],
      adjustedPolicies: conditionAdjustedProjection.activePolicies[yearIndex - 1],
    }));

    sendSuccess(res, {
      selectedCondition,
      predictedPersistency,
      baselinePersistency,
      baselineProjection,
      conditionAdjustedProjection,
      totalProjectedRenewal: conditionAdjustedProjection.total5Year,
      maxYear5Impact: chartData[4].adjusted - chartData[4].baseline,
      delta: conditionAdjustedProjection.total5Year - baselineProjection.total5Year,
      chartData,
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Simulation failed', 500);
  }
}

export async function persistencySimulatorBulk(req: Request, res: Response): Promise<void> {
  try {
    const { policies, selectedConditionKey } = req.body;
    const config = await getActiveConfig();
    const availableConditions = resolveSimulationConditions(config);
    const selectedCondition = availableConditions.find((condition: any) => condition.key === selectedConditionKey);
    if (!selectedCondition) {
      sendError(res, 'INVALID_CONDITION', 'Selected simulation condition is not available', 400);
      return;
    }

    const baselinePersistency = clamp(config?.persistencyThreshold ?? 0.8, 0.35, 0.99);
    let baselineTotal = 0;
    let adjustedTotal = 0;
    const chartData = [1, 2, 3, 4, 5].map((yr) => ({ year: `Year ${yr}`, baseline: 0, adjusted: 0 }));

    for (const policy of policies) {
      const product = await getActiveProduct(policy.productType);
      if (!product) {
        sendError(res, 'CONFIG_MISSING', `No active config for ${policy.productType}`, 500);
        return;
      }

      const predictedPersistency = predictPersistency(selectedCondition, policy.productType, 1, policy.annualPremium);
      const baselineProjection = buildSimulationProjection(1, policy.annualPremium, product.renewalRates, baselinePersistency, product.fyCommissionRate);
      const adjustedProjection = buildSimulationProjection(1, policy.annualPremium, product.renewalRates, predictedPersistency, product.fyCommissionRate);

      baselineTotal += baselineProjection.total5Year;
      adjustedTotal += adjustedProjection.total5Year;

      chartData.forEach((row, index) => {
        row.baseline += baselineProjection.projectedIncome[index];
        row.adjusted += adjustedProjection.projectedIncome[index];
      });
    }

    sendSuccess(res, {
      selectedCondition,
      baselinePersistency,
      baselineProjection: { total5Year: baselineTotal },
      conditionAdjustedProjection: { total5Year: adjustedTotal },
      delta: adjustedTotal - baselineTotal,
      chartData,
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Bulk simulation failed', 500);
  }
}

export async function getSimulationConditions(req: Request, res: Response): Promise<void> {
  try {
    const config = await getActiveConfig();
    const conditions = resolveSimulationConditions(config).map((condition: any) => ({
      key: condition.key,
      label: condition.label,
      description: condition.description,
      basePersistency: condition.basePersistency,
      annualBoost: condition.annualBoost,
    }));

    sendSuccess(res, { conditions, baselinePersistency: config?.persistencyThreshold ?? 0.8 });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Failed to load simulation conditions', 500);
  }
}

export async function mdrtTracker(req: Request, res: Response): Promise<void> {
  try {
    const agentId = req.user!.sub;
    const config = await getActiveConfig();
    if (!config) {
      sendError(res, 'CONFIG_MISSING', 'No active commission config found', 500);
      return;
    }

    const yearStart = startOfYear();
    const aggResult = await AgentPolicy.aggregate([
      { $match: { agentId: new (mongoose.Types.ObjectId as any)(agentId), issueDate: { $gte: yearStart }, persistencyStatus: 'active', isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$annualPremium' } } },
    ]);
    const ytdPremium = req.body?.manualOverridePremium ?? (aggResult[0]?.total ?? 0);

    const mdrtTarget = config.mdrtTarget;
    const percentAchieved = Math.min((ytdPremium / mdrtTarget) * 100, 100);
    const remaining = Math.max(0, mdrtTarget - ytdPremium);

    const today = new Date();
    const elapsed = dayOfYear(today);
    const totalDays = daysInYear(today);
    const runRate = elapsed > 0 ? ytdPremium / elapsed : 0;
    const daysToQualify = runRate > 0 ? Math.ceil(remaining / runRate) : null;
    const daysLeft = totalDays - elapsed;

    let estimatedQualificationDate: string | null = null;
    if (daysToQualify !== null && daysToQualify <= daysLeft) {
      const est = new Date(today);
      est.setDate(est.getDate() + daysToQualify);
      estimatedQualificationDate = est.toISOString();
    }

    let mdrtStatus: 'qualified' | 'on-track' | 'at-risk';
    if (percentAchieved >= 100) mdrtStatus = 'qualified';
    else if (percentAchieved >= 70) mdrtStatus = 'on-track';
    else mdrtStatus = 'at-risk';

    sendSuccess(res, {
      ytdPremium,
      mdrtTarget,
      percentAchieved: Math.round(percentAchieved * 100) / 100,
      remaining,
      runRate: Math.round(runRate),
      daysLeft,
      daysToQualify,
      estimatedQualificationDate,
      mdrtStatus,
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'MDRT tracking failed', 500);
  }
}

export async function activityPredictor(req: Request, res: Response): Promise<void> {
  try {
    const { meetingsPerWeek, conversionRate, averagePremiumPerSale, productType } = req.body;

    const product = await getActiveProduct(productType);
    if (!product) {
      sendError(res, 'CONFIG_MISSING', 'No active product config found', 500);
      return;
    }

    const config = await getActiveConfig();
    const weeksPerMonth = 4.33;
    const meetingsPerMonth = Math.round(meetingsPerWeek * weeksPerMonth);
    const expectedPolicies = Math.floor(meetingsPerWeek * weeksPerMonth * conversionRate);
    const expectedPremium = expectedPolicies * averagePremiumPerSale;
    const expectedFYC = expectedPremium * product.fyCommissionRate;

    const bonusRate = getBonusRate(config, expectedPremium * 12);
    const expectedIncentive = expectedFYC + (bonusRate > 0 ? expectedFYC * bonusRate : 0);

    const funnelData = [
      { stage: 'Meetings / Month', value: meetingsPerMonth },
      { stage: 'Qualified Prospects', value: Math.max(expectedPolicies, Math.round(meetingsPerMonth * Math.max(conversionRate, 0.35))) },
      { stage: 'Policies', value: expectedPolicies },
    ];

    sendSuccess(res, {
      expectedPolicies,
      expectedPremium,
      expectedFYC,
      expectedIncentive,
      funnelData,
      product: { name: product.name, fyCommissionRate: product.fyCommissionRate },
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Activity prediction failed', 500);
  }
}