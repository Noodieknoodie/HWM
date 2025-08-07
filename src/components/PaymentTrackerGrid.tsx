interface QuarterlyPageData {
  provider_name: string;
  provider_client_count: number;
  provider_actual_total: number;
  provider_expected_total: number;
  provider_variance: number;
  clients_posted: number;
  total_clients: number;
  provider_posted_display: string;
  client_id: number;
  display_name: string;
  payment_schedule: string;
  fee_type: string;
  percent_rate: number | null;
  flat_rate: number | null;
  quarterly_rate: number;
  client_expected: number;
  client_actual: number;
  client_variance: number;
  client_variance_percent: number | null;
  variance_status: string;
  payment_count: number;
  expected_payment_count: number;
  payment_status_display: string;
  fully_posted: number;
  has_notes: number;
  quarterly_notes: string | null;
  posted_count: number;
  is_posted: boolean;
  applied_year: number;
  quarter: number;
  row_type: 'client';
}

interface ProviderGroup<T> {
  provider_name: string;
  clients: T[];
  isExpanded: boolean;
  providerData?: T;
}

interface PaymentTrackerGridProps {
  groups: ProviderGroup<QuarterlyPageData>[];
  year: number;
  quarter: number;
}

function getQuarterMonths(quarter: number): string[] {
  const monthsByQuarter = {
    1: ['JAN', 'FEB', 'MAR'],
    2: ['APR', 'MAY', 'JUN'],
    3: ['JUL', 'AUG', 'SEP'],
    4: ['OCT', 'NOV', 'DEC']
  };
  return monthsByQuarter[quarter as 1 | 2 | 3 | 4] || [];
}

function getPaymentStatusForMonth(
  client: QuarterlyPageData, 
  monthIndex: number,
  currentDate: Date,
  year: number,
  quarter: number
): { status: 'paid' | 'missing' | 'expected' | 'none', amount: number } {
  const isMonthly = client.payment_schedule === 'monthly';
  
  if (!isMonthly) {
    return { status: 'none', amount: 0 };
  }
  
  // Use actual amount if payments were made, otherwise use 0 for display
  const actualMonthlyAmount = client.client_actual > 0 
    ? Math.round(client.client_actual / client.payment_count)
    : 0;
  const [paidCount] = client.payment_status_display
    .split('/')
    .map(n => parseInt(n) || 0);
  
  const monthEnd = new Date(year, (quarter - 1) * 3 + monthIndex + 1, 0);
  const gracePeriodEnd = new Date(monthEnd);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);
  
  if (currentDate > gracePeriodEnd) {
    if (monthIndex < paidCount) {
      return { status: 'paid', amount: actualMonthlyAmount };
    } else {
      return { status: 'missing', amount: 0 };
    }
  }
  
  if (monthIndex < paidCount) {
    return { status: 'paid', amount: actualMonthlyAmount };
  } else {
    return { status: 'expected', amount: 0 };
  }
}

function getQuarterlyPaymentStatus(
  client: QuarterlyPageData,
  currentDate: Date,
  year: number,
  quarter: number
): 'paid' | 'expected' | 'missing' {
  const quarterEnd = new Date(year, quarter * 3 - 1, 0);
  const gracePeriodEnd = new Date(quarterEnd);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);
  
  if (client.payment_count > 0) {
    return 'paid';
  }
  
  if (currentDate > gracePeriodEnd) {
    return 'missing';
  }
  
  return 'expected';
}

function formatAmount(val: number): string {
  if (val === 0) return '$0';
  if (val >= 1000) {
    return `$${(val / 1000).toFixed(1)}k`;
  }
  return `$${val}`;
}

function PaymentStatusIndicator({ 
  status, 
  amount,
  label
}: { 
  status: 'paid' | 'missing' | 'expected' | 'none';
  amount: number;
  label: string;
}) {
  const getStatusStyles = () => {
    switch (status) {
      case 'paid':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          indicator: 'bg-green-500',
          statusText: formatAmount(amount)
        };
      case 'missing':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-600',
          indicator: 'bg-red-500',
          statusText: 'Missing'
        };
      case 'expected':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-600',
          indicator: 'bg-amber-500',
          statusText: 'Pending'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-400',
          indicator: 'bg-gray-300',
          statusText: '—'
        };
    }
  };
  
  const styles = getStatusStyles();
  
  return (
    <div>
      <div className={`${styles.bg} ${styles.border} border rounded-lg p-3 transition-all hover:shadow-sm`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
          <div className={`w-2 h-2 rounded-full ${styles.indicator}`} />
        </div>
        <div className={`text-sm font-semibold ${styles.text}`}>
          {styles.statusText}
        </div>
      </div>
    </div>
  );
}

function ClientPaymentRow({ 
  client, 
  months,
  year,
  quarter
}: {
  client: QuarterlyPageData;
  months: string[];
  year: number;
  quarter: number;
}) {
  const currentDate = new Date();
  const isQuarterly = client.payment_schedule === 'quarterly';
  
  if (isQuarterly) {
    const status = getQuarterlyPaymentStatus(client, currentDate, year, quarter);
    const styleConfig = {
      paid: {
        bg: 'bg-green-50 border-green-200 text-green-700',
        displayText: formatAmount(client.client_actual || client.client_expected)
      },
      missing: {
        bg: 'bg-red-50 border-red-200 text-red-600',
        displayText: 'Missing Payment'
      },
      expected: {
        bg: 'bg-amber-50 border-amber-200 text-amber-600',
        displayText: 'Payment Pending'
      }
    };
    
    const config = styleConfig[status];
    
    return (
      <div className="grid grid-cols-4 gap-4 p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center">
          <p className="text-sm font-medium text-gray-900 truncate">{client.display_name}</p>
        </div>
        <div className="col-span-3">
          <div className={`${config.bg} border rounded-lg px-4 py-3 text-center transition-all hover:shadow-sm`}>
            <div className="text-xs font-medium uppercase tracking-wider mb-1">Q{quarter} Payment</div>
            <div className="text-lg font-bold">{config.displayText}</div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-4 gap-4 p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center">
        <p className="text-sm font-medium text-gray-900 truncate">{client.display_name}</p>
      </div>
      {months.map((month, idx) => {
        const { status, amount } = getPaymentStatusForMonth(client, idx, currentDate, year, quarter);
        return (
          <PaymentStatusIndicator
            key={month}
            status={status}
            amount={amount}
            label={month}
          />
        );
      })}
    </div>
  );
}

export function PaymentTrackerGrid({ groups, year, quarter }: PaymentTrackerGridProps) {
  const months = getQuarterMonths(quarter);
  
  // Calculate summary stats
  const stats = groups.reduce((acc, g) => ({
    total: acc.total + g.clients.length,
    collected: acc.collected + g.clients.filter(c => c.payment_count >= c.expected_payment_count).length,
    partial: acc.partial + g.clients.filter(c => c.payment_count > 0 && c.payment_count < c.expected_payment_count).length,
    missing: acc.missing + g.clients.filter(c => c.payment_count === 0 && c.variance_status === 'no_payment').length,
    totalExpected: acc.totalExpected + (g.providerData?.provider_expected_total || 0),
    totalReceived: acc.totalReceived + (g.providerData?.provider_actual_total || 0)
  }), { total: 0, collected: 0, partial: 0, missing: 0, totalExpected: 0, totalReceived: 0 });
  
  const collectionRate = stats.totalExpected > 0 
    ? ((stats.totalReceived / stats.totalExpected) * 100).toFixed(1)
    : '0.0';
  
  return (
    <div className="p-6">
      {/* Summary Stats Bar */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-8">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Collection Progress</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{collectionRate}%</p>
            </div>
            <div className="border-l border-gray-300 pl-8">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status Breakdown</p>
              <div className="flex gap-4 mt-1">
                <span className="text-sm">
                  <span className="font-semibold text-green-600">{stats.collected}</span>
                  <span className="text-gray-500"> complete</span>
                </span>
                <span className="text-sm">
                  <span className="font-semibold text-amber-600">{stats.partial}</span>
                  <span className="text-gray-500"> partial</span>
                </span>
                <span className="text-sm">
                  <span className="font-semibold text-red-600">{stats.missing}</span>
                  <span className="text-gray-500"> missing</span>
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Clients</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
        </div>
      </div>
      
      {/* Provider Groups */}
      <div className="space-y-6">
        {groups.map(provider => {
          // Always show all providers in tracker view
          
          const providerStats = {
            collected: provider.clients.filter(c => c.payment_count > 0).length,
            total: provider.clients.length
          };
          
          return (
            <div key={provider.provider_name} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Provider Header */}
              <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                      {provider.provider_name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {providerStats.collected} of {providerStats.total} clients paid
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Expected / Received</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatAmount(provider.providerData?.provider_expected_total || 0)} / {formatAmount(provider.providerData?.provider_actual_total || 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Column Headers */}
              <div className="grid grid-cols-4 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wider">Client</div>
                {months.map(month => (
                  <div key={month} className="text-xs font-medium text-gray-600 uppercase tracking-wider text-center">
                    {month}
                  </div>
                ))}
              </div>
              
              {/* Client List */}
              <div className="divide-y divide-gray-100">
                {provider.clients.map(client => (
                  <ClientPaymentRow
                    key={client.client_id}
                    client={client}
                    months={months}
                    year={year}
                    quarter={quarter}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}