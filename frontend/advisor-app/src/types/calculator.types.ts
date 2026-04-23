export interface ForwardCalcInput {
  policiesSold: number;
  averageAnnualPremium: number;
  productType: string;
  persistencyRate: number;
}

export interface ForwardCalcResult {
  totalAnnualPremium: number;
  firstYearCommission: number;
  renewalIncome: number[];
  renewalTotal: number;
  bonusEarnings: number;
  annualBonusEarnings: number;
  bonusRate: number;
  totalCumulativeIncome: number;
  activePolicies: number[];
  chartData: {
    year: string;
    income: number;
    newBusinessIncome: number;
    renewalIncome: number;
    bonusIncome: number;
    activePolicies: number;
  }[];
  product: { name: string; fyCommissionRate: number };
}

export interface ReverseCalcInput {
  targetIncome: number;
  incomePeriod: 'monthly' | 'quarterly';
  productType?: string;
  conversionRate?: number;
}

export interface ReverseCalcResult {
  annualTarget: number;
  requiredPremium: number;
  requiredPolicies: number;
  requiredWeekly: number;
  requiredDaily: number;
  incomePerRupee: number;
  resolvedAverageAnnualPremium: number;
  unrealistic: boolean;
  requiredMeetings?: number;
  meetingsPerWeek?: number;
  product?: { name: string; fyCommissionRate: number };
}

export interface MDRTResult {
  ytdPremium: number;
  mdrtTarget: number;
  percentAchieved: number;
  remaining: number;
  runRate: number;
  daysLeft: number;
  daysToQualify: number | null;
  estimatedQualificationDate: string | null;
  mdrtStatus: 'qualified' | 'on-track' | 'at-risk';
}

export interface ActivityPredictorInput {
  meetingsPerWeek: number;
  conversionRate: number;
  averagePremiumPerSale: number;
  productType: string;
}

export interface ActivityPredictorResult {
  expectedPolicies: number;
  expectedPremium: number;
  expectedFYC: number;
  expectedIncentive: number;
  funnelData: { stage: string; value: number }[];
}
