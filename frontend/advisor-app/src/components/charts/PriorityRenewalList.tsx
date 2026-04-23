import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

interface PriorityRenewalListProps {
  data: Array<{
    customerId: string;
    customerName: string;
    mobile: string;
    policyCount: number;
    totalAnnualPremium: number;
    nextDueDate: string | null;
    dueInDays: number | null;
    isHighRisk: boolean;
    isFixedReturn: boolean;
    isManuallyTracked: boolean;
    monthlyRenewalAmount: number | null;
    reasons: string[];
  }>;
}

export default function PriorityRenewalList({ data }: PriorityRenewalListProps) {
  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <h3 className="chart-panel-title">Priority Customer Renewal Notification</h3>
        <span className="chart-panel-tag">High Risk + Fixed Return + Manual</span>
      </div>
      <div className="space-y-3">
        {data.length === 0 && <p className="text-sm text-gray-500">No renewal-priority customers are being tracked yet.</p>}
        {data.map((item) => (
          <div key={item.customerId} className="rounded-2xl border border-gray-100 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div>
                <Link to={`/customers/${item.customerId}`} className="font-semibold text-gray-900 hover:text-primary">
                  {item.customerName}
                </Link>
                <p className="text-xs text-gray-500 mt-1">{item.mobile} | {item.policyCount} active policies</p>
              </div>
              <div className="sm:text-right">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.totalAnnualPremium)}</p>
                <p className="text-xs text-gray-500 mt-1">{item.nextDueDate ? formatDate(item.nextDueDate) : 'Monthly cycle'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.isHighRisk && <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700">High Risk</span>}
              {item.isFixedReturn && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">Fixed Return</span>}
              {item.isManuallyTracked && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">Manual</span>}
              {item.dueInDays !== null && <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">Due in {Math.max(item.dueInDays, 0)} days</span>}
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-gray-500">Reasons</p>
                <p className="mt-1 text-gray-900">{item.reasons.join(' | ')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Monthly Renewal Amount</p>
                <p className="mt-1 text-gray-900">{item.monthlyRenewalAmount ? formatCurrency(item.monthlyRenewalAmount) : 'Not set'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}