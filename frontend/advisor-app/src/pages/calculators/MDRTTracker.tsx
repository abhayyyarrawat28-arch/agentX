import { useState, useEffect } from 'react';
import { calculatorService } from '../../services/calculator.service';
import { formatCurrency } from '../../utils/formatCurrency';
import MDRTRingChart from '../../components/charts/MDRTRingChart';

type MDRTView = 'qualificationProgress' | 'runRatePlan';

export default function MDRTTracker() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<MDRTView>('qualificationProgress');

  useEffect(() => {
    calculatorService.mdrtTracker()
      .then(res => setResult(res.data.data))
      .catch(err => setError(err.response?.data?.error?.message || 'Failed to load MDRT data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading MDRT tracker...</div>;
  if (error) return <div className="bg-error-container text-error p-4 rounded">{error}</div>;
  if (!result) return null;

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const nextYearStart = new Date(now.getFullYear() + 1, 0, 1);
  const totalDaysInYear = Math.round((nextYearStart.getTime() - yearStart.getTime()) / 86400000);
  const daysLeft = totalDaysInYear - Math.floor((Date.now() - yearStart.getTime()) / 86400000);
  const requiredDailyPace = result.daysLeft > 0 ? Math.ceil(result.remaining / result.daysLeft) : result.remaining;

  return (
    <div className="space-y-6">
      <section className="page-heading">
        <div>
          <p className="page-kicker">Calculator module</p>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] text-gray-900">MDRT Tracker</h1>
          <p className="page-subtitle">Monitor annual progress toward MDRT qualification, remaining premium needed, and the run rate required to close the gap.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`data-chip ${viewMode === 'qualificationProgress' ? 'data-chip-active' : ''}`} aria-pressed={viewMode === 'qualificationProgress'} onClick={() => setViewMode('qualificationProgress')}>
            Qualification Progress
          </button>
          <button type="button" className={`data-chip ${viewMode === 'runRatePlan' ? 'data-chip-active' : ''}`} aria-pressed={viewMode === 'runRatePlan'} onClick={() => setViewMode('runRatePlan')}>
            Run Rate Plan
          </button>
          <span className="surface-note">{daysLeft} days left</span>
        </div>
      </section>

      {viewMode === 'qualificationProgress' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MDRTRingChart
            percentAchieved={result.percentAchieved}
            ytdPremium={result.ytdPremium}
            mdrtTarget={result.mdrtTarget}
            remaining={result.remaining}
            estimatedQualificationDate={result.estimatedQualificationDate}
            mdrtStatus={result.mdrtStatus}
            daysLeft={daysLeft}
          />
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="stat-card"><p className="text-sm text-gray-500">YTD Premium</p><p className="text-xl font-bold text-gray-900">{formatCurrency(result.ytdPremium)}</p></div>
              <div className="stat-card"><p className="text-sm text-gray-500">MDRT Target</p><p className="text-xl font-bold text-gray-900">{formatCurrency(result.mdrtTarget)}</p></div>
              <div className="stat-card"><p className="text-sm text-gray-500">Remaining</p><p className="text-xl font-bold text-red-600">{formatCurrency(result.remaining)}</p></div>
              <div className="stat-card"><p className="text-sm text-gray-500">Daily Run Rate</p><p className="text-xl font-bold text-amber-600">{formatCurrency(result.runRate)}</p></div>
            </div>
            {result.daysToQualify !== null && (
              <div className="card">
                <h3 className="font-semibold mb-3 text-gray-900">Qualification Estimate</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Days to Qualify</span><span className="font-medium">{result.daysToQualify} days</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Days Left in Year</span><span className={`font-medium ${result.daysLeft < 90 ? 'text-red-600' : ''}`}>{result.daysLeft}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'runRatePlan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MDRTRingChart
            title="Run Rate Outlook"
            tagLabel="Annual Goal"
            percentAchieved={result.percentAchieved}
            ytdPremium={result.ytdPremium}
            mdrtTarget={result.mdrtTarget}
            remaining={result.remaining}
            estimatedQualificationDate={result.estimatedQualificationDate}
            mdrtStatus={result.mdrtStatus}
            daysLeft={daysLeft}
          />
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="stat-card"><p className="text-sm text-gray-500">Current Daily Run Rate</p><p className="text-xl font-bold text-gray-900">{formatCurrency(result.runRate)}</p></div>
              <div className="stat-card"><p className="text-sm text-gray-500">Required Daily Pace</p><p className="text-xl font-bold text-amber-600">{formatCurrency(requiredDailyPace)}</p></div>
              <div className="stat-card"><p className="text-sm text-gray-500">Days Left</p><p className="text-xl font-bold text-gray-900">{result.daysLeft}</p></div>
              <div className="stat-card"><p className="text-sm text-gray-500">Days to Qualify</p><p className="text-xl font-bold text-gray-900">{result.daysToQualify ?? '—'}</p></div>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-3 text-gray-900">Pace Guidance</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Remaining Premium</span><span className="font-medium">{formatCurrency(result.remaining)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Current Status</span><span className="font-medium capitalize">{String(result.mdrtStatus).replace('-', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Qualification Date</span><span className="font-medium">{result.estimatedQualificationDate ? new Date(result.estimatedQualificationDate).toLocaleDateString('en-IN') : 'Not projected'}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
