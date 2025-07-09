// src/components/dashboard/PaymentInfoCard.tsx
import { DashboardPaymentStatus, DashboardMetrics } from '../../hooks/useClientDashboard';
import { formatPeriodDisplay } from '../../utils/periodFormatting';

interface PaymentInfoCardProps {
  paymentStatus: DashboardPaymentStatus | null;
  metrics: DashboardMetrics | null;
  loading: boolean;
  aum?: number | null;
  aumSource?: 'recorded' | 'estimated' | null;
  paymentSchedule?: 'monthly' | 'quarterly';
}

export default function PaymentInfoCard({ paymentStatus, metrics, loading, aum, aumSource, paymentSchedule }: PaymentInfoCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="grid grid-cols-1 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-start">
              <div className="h-5 w-5 bg-gray-200 rounded mr-3 mt-0.5"></div>
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!paymentStatus || !metrics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
        <p className="text-gray-500">No payment information available</p>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Icons for each metric
  const DollarIcon = () => (
    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const ChartIcon = () => (
    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  const StatusIcon = () => (
    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
      
      <div className="space-y-4">
        <div className="flex items-start">
          <DollarIcon />
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-500">AUM</p>
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(aum !== undefined ? aum : metrics.last_recorded_assets)}
              </p>
              {aumSource && (
                <span className="text-xs text-gray-500">
                  ({aumSource})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start">
          <DollarIcon />
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-500">Expected Fee</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(paymentStatus.expected_fee)}</p>
          </div>
        </div>

        <div className="flex items-start">
          <CalendarIcon />
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-500">Last Payment</p>
            <p className="text-sm text-gray-900">{formatDate(paymentStatus.last_payment_date)}</p>
          </div>
        </div>

        <div className="flex items-start">
          <DollarIcon />
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-500">Last Payment Amount</p>
            <p className="text-sm text-gray-900">{formatCurrency(paymentStatus.last_payment_amount)}</p>
          </div>
        </div>

        <div className="flex items-start">
          <CalendarIcon />
          <div className="ml-3 flex-1">
            <p className="text-xs font-medium text-gray-500">Current Period</p>
            <p className="text-sm font-semibold text-gray-900 bg-blue-50 px-2 py-1 rounded inline-block">
              {paymentSchedule ? formatPeriodDisplay(
                paymentStatus.current_period_number, 
                paymentStatus.current_year, 
                paymentSchedule
              ) : paymentStatus.current_period}
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <StatusIcon />
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-500">Payment Status</p>
            <p className={`text-sm font-semibold ${paymentStatus.status === 'Paid' ? 'text-green-600' : 'text-yellow-600'}`}>
              {paymentStatus.status}
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <ChartIcon />
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-500">YTD Payments</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(metrics.total_ytd_payments)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}