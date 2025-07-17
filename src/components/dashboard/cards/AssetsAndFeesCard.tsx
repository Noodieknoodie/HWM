// src/components/dashboard/cards/AssetsAndFeesCard.tsx
import React, { useState } from 'react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatCurrency, formatRate } from '../../../utils/formatters';
import { GridAlignedCard } from './GridAlignedCard';
import { EditContractModal } from '../../contracts/EditContractModal';

interface AssetsAndFeesCardProps {
  dashboardData: DashboardViewData;
}

export const AssetsAndFeesCard: React.FC<AssetsAndFeesCardProps> = ({ dashboardData }) => {
  const [isEditContractModalOpen, setIsEditContractModalOpen] = useState(false);
  const isPercentage = dashboardData.fee_type === 'percentage';
  
  // Format composite rates display as inline pills
  const compositeRates = (
    <div className="flex gap-1 flex-wrap">
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        M: {formatRate(dashboardData.monthly_rate, dashboardData.fee_type)}
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        Q: {formatRate(dashboardData.quarterly_rate, dashboardData.fee_type)}
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        A: {formatRate(dashboardData.annual_rate, dashboardData.fee_type)}
      </span>
    </div>
  );
  
  const details = [
    { 
      label: "Frequency", 
      value: dashboardData.payment_schedule === 'monthly' ? 'Monthly' : 'Quarterly' 
    },
    { 
      label: "Fee Type", 
      value: isPercentage ? 'Percentage' : 'Flat' 
    },
    { 
      label: "Rates", 
      value: compositeRates 
    },
  ];
  
  // Format AUM with asterisk if estimated
  const aumDisplay = dashboardData.aum ? (
    <span className={dashboardData.aum_source === 'estimated' ? 'text-gray-500 italic' : ''}>
      {formatCurrency(dashboardData.aum, 0)}
      {dashboardData.aum_source === 'estimated' && <span className="text-gray-400 ml-1">*</span>}
    </span>
  ) : (
    <span className="text-gray-400">N/A</span>
  );

  return (
    <>
      <GridAlignedCard
        title="Assets & Fees"
        mainValueLabel="AUM"
        mainValue={aumDisplay}
        details={details}
        action={
          <button
            onClick={() => setIsEditContractModalOpen(true)}
            className="px-3 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Edit Contract
          </button>
        }
      />
      
      {dashboardData.contract_id && (
        <EditContractModal
          isOpen={isEditContractModalOpen}
          onClose={() => setIsEditContractModalOpen(false)}
          contract={{
            contract_id: dashboardData.contract_id,
            client_id: dashboardData.client_id,
            provider_name: dashboardData.provider_name || '',
            contract_number: dashboardData.contract_number,
            contract_start_date: dashboardData.contract_start_date || '',
            fee_type: dashboardData.fee_type,
            percentage_fee_rate: dashboardData.percentage_fee_rate,
            flat_fee_rate: dashboardData.flat_fee_rate,
            payment_schedule: dashboardData.payment_schedule
          }}
          onSuccess={() => {
            setIsEditContractModalOpen(false);
            // Dashboard will refresh automatically via useClientDashboard hook
          }}
        />
      )}
    </>
  );
};