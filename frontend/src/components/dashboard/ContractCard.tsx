// frontend/src/components/dashboard/ContractCard.tsx
import React from 'react';
import { DashboardContract } from '../../hooks/useClientDashboard';

interface ContractCardProps {
  contract: DashboardContract | null;
  loading: boolean;
}

export default function ContractCard({ contract, loading }: ContractCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Details</h3>
        <p className="text-gray-500">No contract information available</p>
      </div>
    );
  }

  // Format fee display
  const formatFee = () => {
    if (contract.fee_type === 'percentage' && contract.percent_rate !== null) {
      return `${(contract.percent_rate * 100).toFixed(2)}%`;
    } else if (contract.fee_type === 'flat' && contract.flat_rate !== null) {
      return `$${contract.flat_rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return 'N/A';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Details</h3>
      
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-500">Contract Number</label>
          <p className="text-sm text-gray-900">{contract.contract_id}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-500">Plan Provider</label>
          <p className="text-sm text-gray-900">{contract.provider_name}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-500">Payment Frequency</label>
          <p className="text-sm text-gray-900 capitalize">{contract.payment_schedule}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-500">Fee Structure</label>
          <p className="text-sm text-gray-900 capitalize">{contract.fee_type}</p>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-500">Fee Amount</label>
          <p className="text-sm font-semibold text-gray-900">{formatFee()}</p>
        </div>
      </div>
    </div>
  );
}