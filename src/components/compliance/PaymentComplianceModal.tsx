// src/components/compliance/PaymentComplianceModal.tsx
import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, Download, AlertCircle, CheckCircle, ExternalLink, ChevronLeft } from 'lucide-react';
import { usePaymentCompliance } from '../../hooks/usePaymentCompliance';
import { Alert } from '../Alert';
import PaymentForm from '../payment/PaymentForm';
import { useDataApiClient } from '@/context/ApiContext';

interface PaymentComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
}

export const PaymentComplianceModal: React.FC<PaymentComplianceModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
}) => {
  const dataApiClient = useDataApiClient();
  // const { setActiveTab } = useAppStore();
  const { groupedByYear, overallStats, loading, error } = usePaymentCompliance(clientId);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState<{
    period: number;
    year: number;
    periodType: string;
  } | null>(null);

  if (!isOpen) return null;

  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const handleAddPayment = (period: number, year: number) => {
    // Get period type from first payment or contract
    const periodType = groupedByYear[0]?.periods[0]?.payment_schedule || 'monthly';
    
    setPaymentFormData({
      period,
      year,
      periodType
    });
    setShowPaymentForm(true);
  };

  const exportToCSV = () => {
    const headers = ['Year', 'Period', 'Period Display', 'Status', 'Received Date', 'Expected Fee', 'Actual Fee', 'Variance Amount', 'Variance %', 'Variance Status'];
    const rows = groupedByYear.flatMap(yearGroup => 
      yearGroup.periods.map(period => [
        period.year,
        period.period,
        period.period_display,
        period.payment_id ? 'Paid' : 'Missing',
        period.received_date || '',
        period.expected_fee?.toFixed(2) || '',
        period.actual_fee?.toFixed(2) || '',
        period.variance_amount?.toFixed(2) || '',
        period.variance_percent ? `${period.variance_percent.toFixed(1)}%` : '',
        period.variance_status || '',
      ])
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${clientName.replace(/\s+/g, '_')}_Payment_Compliance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getVarianceColor = (status: string) => {
    switch (status) {
      case 'exact': return 'text-green-600';      // Within $0.01
      case 'acceptable': return 'text-green-600';  // Within 5%
      case 'warning': return 'text-yellow-600';    // 5-15%
      case 'alert': return 'text-red-600';         // Over 15%
      case 'unknown': return 'text-gray-400';      // No expected fee
      case 'no_payment': return 'text-gray-400';   // Missing payment
      default: return 'text-gray-600';
    }
  };

  const getVarianceIcon = (status: string) => {
    switch (status) {
      case 'exact': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'acceptable': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'alert': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Payment Compliance - {clientName}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* Summary Statistics */}
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                  <p className={`text-2xl font-bold ${overallStats.complianceRate >= 90 ? 'text-green-600' : overallStats.complianceRate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {overallStats.complianceRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Periods</p>
                  <p className="text-2xl font-bold text-gray-900">{overallStats.totalPeriods}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid Periods</p>
                  <p className="text-2xl font-bold text-green-600">{overallStats.paidPeriods}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Missing Periods</p>
                  <p className="text-2xl font-bold text-red-600">{overallStats.missingPeriods}</p>
                </div>
              </div>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {showPaymentForm && paymentFormData ? (
                <div>
                  <button
                    onClick={() => {
                      setShowPaymentForm(false);
                      setPaymentFormData(null);
                    }}
                    className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to Compliance View
                  </button>
                  
                  <PaymentForm
                    clientId={clientId}
                    contractId={null} // Will be fetched by form
                    editingPayment={null}
                    prefillPeriod={{
                      period: paymentFormData.period,
                      year: paymentFormData.year,
                      periodType: paymentFormData.periodType
                    }}
                    onSubmit={async (data) => {
                      // Let parent handle submit
                      await dataApiClient.createPayment(data);
                      // Refresh compliance data
                      setShowPaymentForm(false);
                      setPaymentFormData(null);
                      // Trigger data refresh - reload the page to refresh data
                      window.location.reload();
                    }}
                    onCancel={() => {
                      setShowPaymentForm(false);
                      setPaymentFormData(null);
                    }}
                  />
                </div>
              ) : (
                <>
                  {error && (
                    <Alert variant="error" message={error} className="mb-4" />
                  )}
                  
                  {loading ? (
                    <div className="text-center py-8">Loading compliance data...</div>
                  ) : (
                    <div className="space-y-4">
                  {groupedByYear.map(yearGroup => (
                    <div key={yearGroup.year} className="border rounded-lg overflow-hidden">
                      {/* Year Header */}
                      <button
                        onClick={() => toggleYear(yearGroup.year)}
                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {expandedYears.has(yearGroup.year) ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          )}
                          <span className="font-medium text-gray-900">{yearGroup.year}</span>
                          <span className="text-sm text-gray-600">
                            ({yearGroup.stats.paidPeriods}/{yearGroup.stats.totalPeriods} paid - {yearGroup.stats.complianceRate.toFixed(1)}%)
                          </span>
                        </div>
                        {yearGroup.stats.missingPeriods > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {yearGroup.stats.missingPeriods} missing
                          </span>
                        )}
                      </button>
                      
                      {/* Year Details */}
                      {expandedYears.has(yearGroup.year) && (
                        <div className="bg-white">
                          <table className="min-w-full">
                            <thead className="bg-gray-50 border-y">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received Date</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {yearGroup.periods.map(period => (
                                <tr key={`${period.year}-${period.period}`} className={period.payment_id ? '' : 'bg-red-50'}>
                                  <td className="px-4 py-3 text-sm text-gray-900">{period.period_display}</td>
                                  <td className="px-4 py-3 text-sm">
                                    {period.payment_id ? (
                                      <span className="inline-flex items-center gap-1 text-green-700">
                                        <CheckCircle className="h-4 w-4" />
                                        Paid
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-red-700">
                                        <AlertCircle className="h-4 w-4" />
                                        Missing
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {period.received_date || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                                    {period.expected_fee ? `$${period.expected_fee.toFixed(2)}` : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                                    {period.actual_fee ? `$${period.actual_fee.toFixed(2)}` : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right">
                                    {period.variance_amount !== null && period.variance_percent !== null ? (
                                      <div className="flex items-center justify-end gap-2">
                                        <span className={getVarianceColor(period.variance_status)}>
                                          ${Math.abs(period.variance_amount).toFixed(2)} ({period.variance_percent.toFixed(1)}%)
                                        </span>
                                        {getVarianceIcon(period.variance_status)}
                                      </div>
                                    ) : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {!period.payment_id && (
                                      <button
                                        onClick={() => handleAddPayment(period.period, period.year)}
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Add Payment
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div>
                  <strong>Total Expected:</strong> ${overallStats.totalExpected.toFixed(2)} | 
                  <strong> Total Paid:</strong> ${overallStats.totalPaid.toFixed(2)} | 
                  <strong> Total Variance:</strong> <span className={overallStats.totalVariance < 0 ? 'text-red-600' : 'text-green-600'}>
                    ${Math.abs(overallStats.totalVariance).toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};