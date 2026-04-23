import { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboard.service';
import { formatCurrency } from '../../utils/formatCurrency';
import StatCard from '../../components/ui/StatCard';
import MDRTRingChart from '../../components/charts/MDRTRingChart';
import PolicyStatusDonutChart from '../../components/charts/PolicyStatusDonutChart';
import IncomeGrowthAreaChart from '../../components/charts/IncomeGrowthAreaChart';
import MonthlyPremiumChart from '../../components/charts/MonthlyPremiumChart';
import IssuanceForecastChart from '../../components/charts/IssuanceForecastChart';
import PolicyWiseSellDistributionChart from '../../components/charts/PolicyWiseSellDistributionChart';
import PriorityRenewalList from '../../components/charts/PriorityRenewalList';

type DashboardScope = 'mtd' | 'ytd';

export default function AgentDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scope, setScope] = useState<DashboardScope>('ytd');

  useEffect(() => {
    dashboardService.getAgentDashboard()
      .then(res => setData(res.data.data))
      .catch(err => setError(err.response?.data?.error?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading dashboard...</div></div>;
  if (error) return <div className="bg-error-container text-error p-4 rounded-lg">{error} <button onClick={() => window.location.reload()} className="underline ml-2">Retry</button></div>;
  if (!data) return null;

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);
  const totalDaysInYear = Math.round((nextYearStart.getTime() - yearStart.getTime()) / 86400000);
  const updatedAt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).format(now);
  const currentMonthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(now);
  const monthTarget = data.ytdTarget ? data.ytdTarget / 12 : 0;
  const monthFYC = data.monthFYC ?? 0;
  const scopedPremium = scope === 'mtd' ? data.monthPremium : data.ytdPremium;
  const scopedFYC = scope === 'mtd' ? monthFYC : data.ytdFYC;
  const scopedTarget = scope === 'mtd' ? monthTarget : data.ytdTarget;
  const scopedProgress = scopedTarget ? (scopedPremium / scopedTarget) * 100 : 0;
  const scopedRemaining = Math.max(0, scopedTarget - scopedPremium);
  const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
  const daysLeftInYear = totalDaysInYear - Math.floor((Date.now() - yearStart.getTime()) / 86400000);
  const scopeLabel = scope === 'mtd' ? 'MTD' : 'YTD';
  const scopeStatus = scopedPremium >= scopedTarget ? 'qualified' : scopedPremium >= scopedTarget * 0.7 ? 'on-track' : 'at-risk';
  const monthlyPremiumTimeline = scope === 'mtd' ? (data.monthlyPremiumTimeline || []).slice(-6) : (data.monthlyPremiumTimeline || []);
  const incomeGrowthData = scope === 'mtd' ? (data.incomeGrowth || []).slice(-6) : (data.incomeGrowth || []);
  const currentQuarterStart = Math.floor(now.getMonth() / 3) * 3;
  const issuanceForecastData = scope === 'mtd'
    ? (data.issuanceForecast || []).slice(currentQuarterStart, currentQuarterStart + 3)
    : (data.issuanceForecast || []);

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Agent dashboard</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">Performance Summary</h1>
          <p className="page-subtitle">Track premium production, issuance outlook, sell distribution, and renewal-priority accounts in one operating view.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`data-chip ${scope === 'mtd' ? 'data-chip-active' : ''}`} aria-pressed={scope === 'mtd'} onClick={() => setScope('mtd')}>
            MTD
          </button>
          <button type="button" className={`data-chip ${scope === 'ytd' ? 'data-chip-active' : ''}`} aria-pressed={scope === 'ytd'} onClick={() => setScope('ytd')}>
            YTD
          </button>
          <span className="data-chip">{data.priorityRenewalSummary?.highRisk || 0} high-risk renewals</span>
          <span className="surface-note">Updated as of: {updatedAt}</span>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={`${scopeLabel} Premium`} value={formatCurrency(scopedPremium)} icon="💰" subtext={scope === 'mtd' ? `${currentMonthLabel} production` : 'Current financial year'} />
        <StatCard label={`${scopeLabel} FYC Earned`} value={formatCurrency(scopedFYC)} icon="📈" />
        <StatCard label={scope === 'mtd' ? 'Monthly Target Pace' : 'YTD Target Pace'} value={`${scopedProgress.toFixed(0)}%`} icon="🎯" progressValue={scopedProgress} subtext={`Target: ${formatCurrency(scopedTarget)}`} />
        <StatCard label="Priority Renewals" value={String(data.priorityRenewalSummary?.totalTracked || 0)} icon="🔔" subtext={`${data.priorityRenewalSummary?.fixedReturn || 0} fixed-return accounts`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MDRTRingChart
          title={scope === 'mtd' ? 'Monthly Target Pace' : 'MDRT Progress'}
          tagLabel={scope === 'mtd' ? currentMonthLabel : 'YTD'}
          percentAchieved={scopedProgress}
          ytdPremium={scopedPremium}
          mdrtTarget={scopedTarget}
          remaining={scopedRemaining}
          estimatedQualificationDate={null}
          mdrtStatus={scopeStatus}
          daysLeft={scope === 'mtd' ? daysLeftInMonth : daysLeftInYear}
        />
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div>
              <IssuanceForecastChart
                data={issuanceForecastData}
                avgMonthlyIssuance={data.avgMonthlyIssuance}
                totalAnnualIssuance={data.totalAnnualIssuance}
                tagLabel={scope === 'mtd' ? 'Current Quarter' : 'Projected vs Actual'}
              />
            </div>
            <PolicyWiseSellDistributionChart data={data.policyWiseSellDistribution || []} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PolicyStatusDonutChart data={data.policyStatusBreakdown} />
        <div className="lg:col-span-2">
          <IncomeGrowthAreaChart data={incomeGrowthData} tagLabel={scope === 'mtd' ? 'Last 6 Months' : 'Rolling Timeline'} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PriorityRenewalList data={data.priorityRenewalNotifications || []} />
        <div className="lg:col-span-2">
          <MonthlyPremiumChart data={monthlyPremiumTimeline} tagLabel={scope === 'mtd' ? 'Last 6 Months' : '12 Months'} />
        </div>
      </div>
    </div>
  );
}