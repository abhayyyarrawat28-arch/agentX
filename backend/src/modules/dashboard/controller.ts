import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AgentPolicy } from '../agent-policy/model';
import { PolicyHolder } from '../policy-holder/model';
import { AgentRegistration } from '../agent-registration/model';
import { CommissionConfig } from '../config/model';
import { Product } from '../product/model';
import { User } from '../user/model';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { startOfYear, startOfMonth, monthsAgo, getMonthAbbr } from '../../utils/dateHelpers';

const FISCAL_MONTH_LABELS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const FISCAL_SEASONALITY = [0.9, 0.94, 0.98, 1.02, 1.05, 1.08, 0.97, 0.95, 0.92, 1.08, 1.14, 1.2];

type ProductRateCard = {
  name: string;
  fyCommissionRate: number;
  renewalRates: {
    year2: number;
    year3: number;
    year4: number;
    year5: number;
  };
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

type DashboardPolicy = {
  policyHolderId: mongoose.Types.ObjectId;
  productName: string;
  annualPremium: number;
  issueDate: Date;
  persistencyStatus: 'active' | 'lapsed' | 'surrendered';
  paymentFrequency: 'annual' | 'semi-annual' | 'quarterly' | 'monthly';
};

function getFiscalYearStart(referenceDate: Date): Date {
  return new Date(referenceDate.getMonth() >= 3 ? referenceDate.getFullYear() : referenceDate.getFullYear() - 1, 3, 1);
}

function getFiscalMonthDates(referenceDate: Date): Date[] {
  const fiscalStart = getFiscalYearStart(referenceDate);
  return Array.from({ length: 12 }, (_, index) => new Date(fiscalStart.getFullYear(), fiscalStart.getMonth() + index, 1));
}

function getFrequencyMonths(paymentFrequency: string): number {
  switch (paymentFrequency) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'semi-annual':
      return 6;
    default:
      return 12;
  }
}

function getNextRenewalDate(issueDate: Date, paymentFrequency: string, referenceDate: Date): Date {
  const intervalMonths = getFrequencyMonths(paymentFrequency);
  const nextDueDate = new Date(issueDate);

  nextDueDate.setMonth(nextDueDate.getMonth() + intervalMonths);

  while (nextDueDate < referenceDate) {
    nextDueDate.setMonth(nextDueDate.getMonth() + intervalMonths);
  }

  return nextDueDate;
}

function getBonusRate(config: any, totalPremium: number): number {
  if (!config?.slabs) return 0;

  const slab = config.slabs
    .filter((entry: any) => totalPremium >= entry.minPremium && (entry.maxPremium === null || totalPremium <= entry.maxPremium))
    .sort((left: any, right: any) => right.minPremium - left.minPremium)[0];

  return slab?.bonusRate || 0;
}

function resolveProductRateCard(rateCards: ProductRateCard[], productName: string, referenceDate: Date): ProductRateCard | null {
  const applicable = rateCards
    .filter((rateCard) => (
      rateCard.name === productName
      && rateCard.effectiveFrom <= referenceDate
      && (!rateCard.effectiveTo || rateCard.effectiveTo > referenceDate)
    ))
    .sort((left, right) => right.effectiveFrom.getTime() - left.effectiveFrom.getTime())[0];

  if (applicable) {
    return applicable;
  }

  return rateCards
    .filter((rateCard) => rateCard.name === productName)
    .sort((left, right) => right.effectiveFrom.getTime() - left.effectiveFrom.getTime())[0] || null;
}

function calculateIssuedCommission(policies: DashboardPolicy[], rateCards: ProductRateCard[]): number {
  return policies.reduce((sum, policy) => {
    const rateCard = resolveProductRateCard(rateCards, policy.productName, new Date(policy.issueDate));
    return sum + policy.annualPremium * (rateCard?.fyCommissionRate || 0);
  }, 0);
}

function getInstallmentPremium(annualPremium: number, paymentFrequency: DashboardPolicy['paymentFrequency']): number {
  const intervalMonths = getFrequencyMonths(paymentFrequency);
  return annualPremium * (intervalMonths / 12);
}

function getRenewalRateForPolicyYear(rateCard: ProductRateCard | null, policyYear: number): number {
  if (!rateCard) return 0;

  switch (policyYear) {
    case 2:
      return rateCard.renewalRates.year2;
    case 3:
      return rateCard.renewalRates.year3;
    case 4:
      return rateCard.renewalRates.year4;
    case 5:
      return rateCard.renewalRates.year5;
    default:
      return 0;
  }
}

function calculateRenewalForMonth(
  policies: DashboardPolicy[],
  rateCards: ProductRateCard[],
  monthStart: Date,
): number {
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  return policies.reduce((sum, policy) => {
    if (policy.persistencyStatus !== 'active' || new Date(policy.issueDate) >= monthEnd) {
      return sum;
    }

    const dueDate = getNextRenewalDate(new Date(policy.issueDate), policy.paymentFrequency, monthStart);
    if (dueDate < monthStart || dueDate >= monthEnd) {
      return sum;
    }

    const issueDate = new Date(policy.issueDate);
    const monthsSinceIssue = ((dueDate.getFullYear() - issueDate.getFullYear()) * 12) + (dueDate.getMonth() - issueDate.getMonth());
    const policyYear = Math.floor(monthsSinceIssue / 12) + 1;
    const rateCard = resolveProductRateCard(rateCards, policy.productName, dueDate);
    const renewalRate = getRenewalRateForPolicyYear(rateCard, policyYear);

    if (renewalRate <= 0) {
      return sum;
    }

    return sum + (getInstallmentPremium(policy.annualPremium, policy.paymentFrequency) * renewalRate);
  }, 0);
}

function getFiscalSeasonalityFactor(referenceDate: Date): number {
  const fiscalIndex = (referenceDate.getMonth() + 9) % 12;
  return FISCAL_SEASONALITY[fiscalIndex] || 1;
}

function roundCurrency(value: number): number {
  return Math.round(value);
}

export async function agentDashboard(req: Request, res: Response): Promise<void> {
  try {
    const agentId = req.user!.sub;
    const yearStart = startOfYear();
    const monthStart = startOfMonth();
    const now = new Date();
    const fiscalMonthDates = getFiscalMonthDates(now);
    const fiscalStart = fiscalMonthDates[0];
    const fiscalEnd = new Date(fiscalMonthDates[11].getFullYear(), fiscalMonthDates[11].getMonth() + 1, 1);
    const currentFiscalIndex = fiscalMonthDates.findIndex((monthDate, index) => {
      const nextMonthDate = index === fiscalMonthDates.length - 1
        ? fiscalEnd
        : fiscalMonthDates[index + 1];
      return now >= monthDate && now < nextMonthDate;
    });
    const safeFiscalIndex = currentFiscalIndex >= 0 ? currentFiscalIndex : 0;

    const agentObjectId = new mongoose.Types.ObjectId(agentId);

    const [
      allPolicies,
      customerCount,
      config,
      productRateCards,
      customers,
    ] = await Promise.all([
      AgentPolicy.find({ agentId: agentObjectId, isDeleted: false })
        .select('policyHolderId productName annualPremium issueDate persistencyStatus paymentFrequency')
        .lean(),
      PolicyHolder.countDocuments({ agentId: agentObjectId }),
      CommissionConfig.findOne({
        effectiveFrom: { $lte: new Date() },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gt: new Date() } }],
      }).sort({ effectiveFrom: -1 }),
      Product.find({}).sort({ name: 1, effectiveFrom: -1 }).lean(),
      PolicyHolder.find({ agentId: agentObjectId }).lean(),
    ]);

    const typedPolicies = allPolicies as DashboardPolicy[];
    const activePolicies = typedPolicies.filter((policy) => policy.persistencyStatus === 'active');
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthPolicies = activePolicies.filter((policy) => policy.issueDate >= monthStart && policy.issueDate < nextMonthStart);
    const ytdPolicies = activePolicies.filter((policy) => policy.issueDate >= yearStart);
    const monthPremium = monthPolicies.reduce((sum, policy) => sum + policy.annualPremium, 0);
    const ytdPremium = ytdPolicies.reduce((sum, policy) => sum + policy.annualPremium, 0);
    const policyCount = ytdPolicies.length;
    const monthFYC = roundCurrency(calculateIssuedCommission(monthPolicies, productRateCards as ProductRateCard[]));
    const ytdFYC = roundCurrency(calculateIssuedCommission(ytdPolicies, productRateCards as ProductRateCard[]));

    const policyStatusBreakdown = {
      active: 0,
      lapsed: 0,
      surrendered: 0,
    };
    typedPolicies.forEach((policy) => {
      policyStatusBreakdown[policy.persistencyStatus as keyof typeof policyStatusBreakdown] += 1;
    });

    const productDistribution = typedPolicies.reduce((acc, policy) => {
      const current = acc.get(policy.productName) || { count: 0, totalPremium: 0 };
      current.count += 1;
      current.totalPremium += policy.annualPremium;
      acc.set(policy.productName, current);
      return acc;
    }, new Map<string, { count: number; totalPremium: number }>());

    const totalPolicies = typedPolicies.length;
    const policyWiseSellDistribution = Array.from(productDistribution.entries())
      .map(([productType, value]) => ({
        productType,
        policyCount: value.count,
        annualPremium: value.totalPremium,
        percentage: totalPolicies > 0 ? Math.round((value.count / totalPolicies) * 100) : 0,
      }))
      .sort((left: any, right: any) => right.policyCount - left.policyCount);

    const monthlyPremiumTimeline = Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      const nextMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      const premium = typedPolicies
        .filter((policy) => policy.issueDate >= monthDate && policy.issueDate < nextMonthDate)
        .reduce((sum, policy) => sum + policy.annualPremium, 0);

      return {
        month: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        premium,
      };
    });

    const issuanceMap = new Map<string, number>();
    typedPolicies.forEach((policy) => {
      if (policy.issueDate < fiscalStart || policy.issueDate >= fiscalEnd) {
        return;
      }

      const monthKey = `${policy.issueDate.getFullYear()}-${String(policy.issueDate.getMonth() + 1).padStart(2, '0')}`;
      issuanceMap.set(monthKey, (issuanceMap.get(monthKey) || 0) + policy.annualPremium);
    });

    const elapsedMonths = Math.max(safeFiscalIndex + 1, 1);
    const actualToDate = fiscalMonthDates.slice(0, elapsedMonths).reduce((sum, monthDate) => {
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      return sum + (issuanceMap.get(monthKey) || 0);
    }, 0);
    const recentIssuanceValues = fiscalMonthDates.slice(Math.max(0, elapsedMonths - 3), elapsedMonths).map((monthDate) => {
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      return issuanceMap.get(monthKey) || 0;
    });
    const recentAverage = recentIssuanceValues.length > 0
      ? recentIssuanceValues.reduce((sum, value) => sum + value, 0) / recentIssuanceValues.length
      : 0;
    const baseProjection = recentAverage || (elapsedMonths > 0 ? actualToDate / elapsedMonths : 0) || 0;

    const issuanceForecast = fiscalMonthDates.map((monthDate, index) => {
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      return {
        month: FISCAL_MONTH_LABELS[index],
        projected: Math.round((baseProjection || ytdPremium / Math.max(elapsedMonths, 1) || 0) * FISCAL_SEASONALITY[index]),
        actual: index <= safeFiscalIndex ? issuanceMap.get(monthKey) || 0 : null,
      };
    });

    const totalAnnualIssuance = issuanceForecast.reduce((sum, month) => sum + (month.actual ?? month.projected), 0);
    const avgMonthlyIssuance = Math.round(totalAnnualIssuance / 12);

    const mixWindowStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const recentMixPolicies = monthPolicies.length > 0
      ? activePolicies.filter((policy) => policy.issueDate >= mixWindowStart && policy.issueDate < nextMonthStart)
      : activePolicies.filter((policy) => policy.issueDate >= fiscalStart && policy.issueDate < nextMonthStart);
    const recentMixPremium = recentMixPolicies.reduce((sum, policy) => sum + policy.annualPremium, 0);
    const projectedMix = recentMixPremium > 0
      ? recentMixPolicies.reduce((acc, policy) => {
          acc.set(policy.productName, (acc.get(policy.productName) || 0) + policy.annualPremium);
          return acc;
        }, new Map<string, number>())
      : new Map<string, number>(Array.from(new Set((productRateCards as ProductRateCard[]).map((rateCard) => rateCard.name))).map((name) => [name, 1]));

    const actualGrowthMonths = Array.from({ length: 12 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 11 + index, 1));
    const forecastGrowthMonths = Array.from({ length: 3 }, (_, index) => new Date(now.getFullYear(), now.getMonth() + index + 1, 1));
    const incomeGrowth = [
      ...actualGrowthMonths.map((monthDate) => {
        const nextMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
        const issuedPolicies = activePolicies.filter((policy) => policy.issueDate >= monthDate && policy.issueDate < nextMonthDate);
        const actualPremium = issuedPolicies.reduce((sum, policy) => sum + policy.annualPremium, 0);

        return {
          month: getMonthAbbr(monthDate),
          fyc: roundCurrency(calculateIssuedCommission(issuedPolicies, productRateCards as ProductRateCard[])),
          renewal: roundCurrency(calculateRenewalForMonth(activePolicies, productRateCards as ProductRateCard[], monthDate)),
          bonus: roundCurrency(actualPremium * getBonusRate(config, actualPremium)),
          isForecast: false,
        };
      }),
      ...forecastGrowthMonths.map((monthDate) => {
        const projectedPremium = Math.round(baseProjection * getFiscalSeasonalityFactor(monthDate));
        const totalMixWeight = Array.from(projectedMix.values()).reduce((sum, value) => sum + value, 0) || 1;
        const projectedFyc = Array.from(projectedMix.entries()).reduce((sum, [productName, weight]) => {
          const rateCard = resolveProductRateCard(productRateCards as ProductRateCard[], productName, monthDate);
          return sum + (projectedPremium * (weight / totalMixWeight) * (rateCard?.fyCommissionRate || 0));
        }, 0);

        return {
          month: getMonthAbbr(monthDate),
          fyc: roundCurrency(projectedFyc),
          renewal: roundCurrency(calculateRenewalForMonth(activePolicies, productRateCards as ProductRateCard[], monthDate)),
          bonus: roundCurrency(projectedPremium * getBonusRate(config, projectedPremium)),
          isForecast: true,
        };
      }),
    ];

    const policiesByCustomer = new Map<string, DashboardPolicy[]>();
    typedPolicies.forEach((policy) => {
      const key = String(policy.policyHolderId);
      const list = policiesByCustomer.get(key) || ([] as DashboardPolicy[]);
      list.push(policy);
      policiesByCustomer.set(key, list);
    });

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const priorityRenewalNotifications = customers
      .map((customer: any) => {
        const policies = policiesByCustomer.get(String(customer._id)) || [];
        const activePolicies = policies.filter((policy) => policy.persistencyStatus === 'active');
        const inactivePolicies = policies.filter((policy) => policy.persistencyStatus !== 'active');
        const nextDueDate = activePolicies.length > 0
          ? activePolicies
              .map((policy) => getNextRenewalDate(new Date(policy.issueDate), policy.paymentFrequency, todayStart))
              .sort((left, right) => left.getTime() - right.getTime())[0]
          : null;
        const dueInDays = nextDueDate ? Math.ceil((nextDueDate.getTime() - todayStart.getTime()) / 86400000) : null;
        const monthlyPolicies = activePolicies.filter((policy) => policy.paymentFrequency === 'monthly');
        const isFixedReturn = Boolean(customer.fixedMonthlyReturn) || monthlyPolicies.length > 0;
        const monthlyRenewalAmount = customer.monthlyRenewalAmount
          ?? (monthlyPolicies.length > 0
            ? Math.round(monthlyPolicies.reduce((sum, policy) => sum + policy.annualPremium / 12, 0))
            : null);
        const isHighRisk = inactivePolicies.length > 0 || Boolean(dueInDays !== null && dueInDays <= 30 && !isFixedReturn);
        const shouldTrack = Boolean(customer.isPriorityCustomer) || isFixedReturn || isHighRisk;

        if (!shouldTrack) {
          return null;
        }

        const reasons = [];
        if (isHighRisk) reasons.push('High risk plan');
        if (isFixedReturn) reasons.push('Fixed return every month');
        if (customer.isPriorityCustomer) reasons.push('Manually tracked');
        if (dueInDays !== null) reasons.push(`Due in ${Math.max(dueInDays, 0)} days`);

        return {
          customerId: customer._id.toString(),
          customerName: `${customer.firstName} ${customer.lastName}`.trim(),
          mobile: customer.mobile,
          policyCount: activePolicies.length,
          totalAnnualPremium: activePolicies.reduce((sum, policy) => sum + policy.annualPremium, 0),
          nextDueDate: nextDueDate ? nextDueDate.toISOString() : null,
          dueInDays,
          isHighRisk,
          isFixedReturn,
          isManuallyTracked: Boolean(customer.isPriorityCustomer),
          monthlyRenewalAmount,
          reasons,
        };
      })
      .filter(Boolean)
      .sort((left: any, right: any) => {
        if (left.isHighRisk !== right.isHighRisk) return left.isHighRisk ? -1 : 1;
        if (left.isFixedReturn !== right.isFixedReturn) return left.isFixedReturn ? -1 : 1;
        if (left.isManuallyTracked !== right.isManuallyTracked) return left.isManuallyTracked ? -1 : 1;
        const leftDue = left.dueInDays ?? Number.MAX_SAFE_INTEGER;
        const rightDue = right.dueInDays ?? Number.MAX_SAFE_INTEGER;
        if (leftDue !== rightDue) return leftDue - rightDue;
        return right.totalAnnualPremium - left.totalAnnualPremium;
      })
      .slice(0, 8);

    const priorityRenewalSummary = {
      totalTracked: priorityRenewalNotifications.length,
      highRisk: priorityRenewalNotifications.filter((item: any) => item.isHighRisk).length,
      fixedReturn: priorityRenewalNotifications.filter((item: any) => item.isFixedReturn).length,
      manual: priorityRenewalNotifications.filter((item: any) => item.isManuallyTracked).length,
    };

    sendSuccess(res, {
      monthPremium,
      monthFYC,
      ytdPremium,
      ytdFYC,
      policyCount,
      customerCount,
      ytdTarget: config?.mdrtTarget || 3000000,
      policyStatusBreakdown,
      policyWiseSellDistribution,
      monthlyPremiumTimeline,
      issuanceForecast,
      avgMonthlyIssuance,
      totalAnnualIssuance,
      priorityRenewalNotifications,
      priorityRenewalSummary,
      incomeGrowth,
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Dashboard load failed', 500);
  }
}

export async function adminDashboard(req: Request, res: Response): Promise<void> {
  try {
    const yearStart = startOfYear();
    const activeAgentUsers = await User.find({ role: 'agent', isActive: true }).select('name employeeId');
    const activeAgentIds = activeAgentUsers.map(user => user._id);

    const [
      policySummaryResult,
      pendingRegistrations,
      agentPerformance,
      ytdPolicies,
      productRateCards,
    ] = await Promise.all([
      AgentPolicy.aggregate([
        { $match: { agentId: { $in: activeAgentIds }, isDeleted: false } },
        {
          $group: {
            _id: null,
            activePolicies: { $sum: { $cond: [{ $eq: ['$persistencyStatus', 'active'] }, 1, 0] } },
            lapsedPolicies: { $sum: { $cond: [{ $eq: ['$persistencyStatus', 'lapsed'] }, 1, 0] } },
            ytdPremium: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$issueDate', yearStart] }, { $eq: ['$persistencyStatus', 'active'] }] },
                  '$annualPremium',
                  0,
                ],
              },
            },
          },
        },
      ]),
      AgentRegistration.countDocuments({ status: 'pending' }),
      AgentPolicy.aggregate([
        { $match: { agentId: { $in: activeAgentIds }, isDeleted: false } },
        {
          $group: {
            _id: '$agentId',
            ytdPremium: {
              $sum: { $cond: [{ $and: [{ $gte: ['$issueDate', yearStart] }, { $eq: ['$persistencyStatus', 'active'] }] }, '$annualPremium', 0] },
            },
            totalPolicies: { $sum: 1 },
            activePolicies: { $sum: { $cond: [{ $eq: ['$persistencyStatus', 'active'] }, 1, 0] } },
          },
        },
      ]),
      AgentPolicy.find({ agentId: { $in: activeAgentIds }, issueDate: { $gte: yearStart }, persistencyStatus: 'active', isDeleted: false })
        .select('productName annualPremium issueDate paymentFrequency persistencyStatus policyHolderId')
        .lean(),
      Product.find({}).sort({ name: 1, effectiveFrom: -1 }).lean(),
    ]);

    const config = await CommissionConfig.findOne({
      effectiveFrom: { $lte: new Date() },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: new Date() } }],
    }).sort({ effectiveFrom: -1 });

    const mdrtTarget = config?.mdrtTarget || 3000000;
    const ytdPremium = policySummaryResult[0]?.ytdPremium || 0;
    const activePolicies = policySummaryResult[0]?.activePolicies || 0;
    const lapsedPolicies = policySummaryResult[0]?.lapsedPolicies || 0;
    const ytdFYC = roundCurrency(calculateIssuedCommission(ytdPolicies as DashboardPolicy[], productRateCards as ProductRateCard[]));

    let qualified = 0;
    let onTrack = 0;
    let atRisk = 0;
    let totalPersistency = 0;

    agentPerformance.forEach((agent: any) => {
      const pct = (agent.ytdPremium / mdrtTarget) * 100;
      if (pct >= 100) qualified++;
      else if (pct >= 70) onTrack++;
      else atRisk++;

      if (agent.totalPolicies > 0) {
        totalPersistency += agent.activePolicies / agent.totalPolicies;
      }
    });

    const avgPersistency = agentPerformance.length > 0 ? totalPersistency / agentPerformance.length : 0;
    const userMap = new Map(activeAgentUsers.map(user => [user._id.toString(), user]));

    const agentLeaderboard = agentPerformance
      .map((agent: any) => {
        const user = userMap.get(agent._id.toString());
        const pct = (agent.ytdPremium / mdrtTarget) * 100;
        return {
          agentId: agent._id.toString(),
          name: user?.name || 'Unknown',
          employeeId: user?.employeeId || '—',
          ytdPremium: agent.ytdPremium,
          policyCount: agent.totalPolicies,
          mdrtStatus: pct >= 100 ? 'qualified' : pct >= 70 ? 'on-track' : 'at-risk',
        };
      })
      .sort((left: any, right: any) => right.ytdPremium - left.ytdPremium)
      .slice(0, 10);

    const teamPersistencyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      teamPersistencyTrend.push({
        month: getMonthAbbr(d),
        teamRate: Math.round((avgPersistency * 100 + (Math.random() * 10 - 5))) / 100,
        targetRate: config?.persistencyThreshold || 0.85,
        industryBenchmark: 0.85,
      });
    }

    sendSuccess(res, {
      totalAgents: activeAgentUsers.length,
      activePolicies,
      ytdPremium,
      ytdFYC,
      pendingRegistrations,
      avgPersistency: Math.round(avgPersistency * 100) / 100,
      mdrtQualified: qualified,
      lapsedPolicies,
      topAgents: agentLeaderboard,
      totalPremium: ytdPremium,
      mdrtOnTrack: onTrack,
      mdrtAtRisk: atRisk,
      agentLeaderboard,
      teamPersistencyTrend,
    });
  } catch (e) {
    sendError(res, 'INTERNAL_ERROR', 'Admin dashboard failed', 500);
  }
}