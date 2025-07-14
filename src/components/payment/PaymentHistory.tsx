// frontend/src/components/payment/PaymentHistory.tsx
import React, { useState, useMemo } from 'react';
import { Payment } from '@/hooks/usePayments';
import { formatCurrency } from '@/utils/formatters';
import { formatPeriodDisplay } from '@/utils/periodFormatting';

interface PaymentHistoryProps {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  onEdit: (payment: Payment) => void;
  onDelete: (paymentId: number) => void;
  selectedYear: number | null;
  onYearChange: (year: number | null) => void;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  payments,
  loading,
  error,
  onEdit,
  onDelete,
  selectedYear,
  onYearChange,
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Get unique years from payments for filter
  const availableYears = useMemo(() => {
    const years = new Set(payments.map(p => p.applied_year));
    return Array.from(years).sort((a, b) => b - a);
  }, [payments]);
  
  const formatPeriod = (payment: Payment) => {
    return formatPeriodDisplay(payment.applied_period, payment.applied_year, payment.applied_period_type as 'monthly' | 'quarterly');
  };
  
  const shouldShowVarianceIndicator = (variancePercent: number | null | undefined) => {
    return variancePercent !== null && variancePercent !== undefined && Math.abs(variancePercent) > 10;
  };
  
  const handleDelete = async (paymentId: number) => {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }
    
    setDeletingId(paymentId);
    try {
      await onDelete(paymentId);
    } finally {
      setDeletingId(null);
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
          {availableYears.length > 0 && (
            <select
              value={selectedYear || ''}
              onChange={(e) => onYearChange(e.target.value ? Number(e.target.value) : null)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      
      {payments.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedYear ? `No payments recorded for ${selectedYear}` : 'Get started by recording a new payment above.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AUM
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.payment_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.received_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.provider_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPeriod(payment)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(payment.actual_fee)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(payment.expected_fee)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {payment.variance_amount !== undefined && payment.variance_amount !== null ? (
                      <span className="text-gray-900">
                        {formatCurrency(payment.variance_amount)}
                        {payment.variance_percent !== undefined && payment.variance_percent !== null && (
                          <span className="text-xs ml-1">
                            ({payment.variance_percent.toFixed(1)}%)
                          </span>
                        )}
                        {shouldShowVarianceIndicator(payment.variance_percent) && (
                          <span className="text-amber-500 ml-1">•</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(payment.total_assets)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {payment.has_files && (
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600"
                          title="Has attached files"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(payment)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(payment.payment_id)}
                        disabled={deletingId === payment.payment_id}
                        className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        {deletingId === payment.payment_id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;