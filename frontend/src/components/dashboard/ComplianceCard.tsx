// frontend/src/components/dashboard/ComplianceCard.tsx
import React from 'react';
import { DashboardCompliance, DashboardPaymentStatus, DashboardContract } from '../../hooks/useClientDashboard';

interface ComplianceCardProps {
  compliance: DashboardCompliance | null;
  paymentStatus: DashboardPaymentStatus | null;
  contract: DashboardContract | null;
  loading: boolean;
}

export default function ComplianceCard({ compliance, paymentStatus, contract, loading }: ComplianceCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="flex items-center mb-4">
          <div className="h-12 w-12 bg-gray-200 rounded-full mr-4"></div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
        <div className="mt-6">
          <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!compliance || !paymentStatus || !contract) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
        <p className="text-gray-500">No compliance information available</p>
      </div>
    );
  }

  // Calculate fee reference amounts
  const calculateFeeReference = () => {
    let monthlyFee = 0;
    let quarterlyFee = 0;
    let annualFee = 0;

    if (contract.fee_type === 'flat' && contract.flat_rate) {
      if (contract.payment_schedule === 'monthly') {
        monthlyFee = contract.flat_rate;
        quarterlyFee = contract.flat_rate * 3;
        annualFee = contract.flat_rate * 12;
      } else {
        quarterlyFee = contract.flat_rate;
        monthlyFee = contract.flat_rate / 3;
        annualFee = contract.flat_rate * 4;
      }
    } else if (contract.fee_type === 'percentage' && contract.percent_rate !== null && contract.percent_rate !== undefined) {
      // For percentage fees, we show the rate, not calculated amounts
      return {
        monthly: `${(contract.percent_rate * 100).toFixed(2)}%`,
        quarterly: `${(contract.percent_rate * 100).toFixed(2)}%`,
        annual: `${(contract.percent_rate * 100).toFixed(2)}%`
      };
    }

    return {
      monthly: `$${monthlyFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      quarterly: `$${quarterlyFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      annual: `$${annualFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    };
  };

  const feeReference = calculateFeeReference();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
      
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
            compliance.color === 'green' ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            {compliance.color === 'green' ? (
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div className="ml-4">
            <p className={`text-lg font-semibold ${
              compliance.color === 'green' ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {compliance.color === 'green' ? 'Up to Date' : 'Payment Due'}
            </p>
            <p className="text-sm text-gray-500">{compliance.reason}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Current Period:</span>
            <span className="text-sm font-semibold text-gray-900 bg-white px-2 py-1 rounded">
              {paymentStatus.current_period}
            </span>
          </div>
        </div>

        {contract && (
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Schedule:</span>
              <span className="font-medium text-gray-900 capitalize">{contract.payment_schedule}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fee Type:</span>
              <span className="font-medium text-gray-900 capitalize">{contract.fee_type}</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Fee Reference</h4>
        <div className="bg-gray-50 rounded-lg p-3">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="text-gray-600 py-1">Monthly:</td>
                <td className="text-right font-medium text-gray-900">{feeReference.monthly}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-1">Quarterly:</td>
                <td className="text-right font-medium text-gray-900">{feeReference.quarterly}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-1">Annual:</td>
                <td className="text-right font-medium text-gray-900">{feeReference.annual}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}