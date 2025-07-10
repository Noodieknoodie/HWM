// src/components/dashboard/cards/AssetsAndFeesCard.tsx
import React from 'react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatCurrency } from '../../../utils/formatters';
import { GridAlignedCard } from './GridAlignedCard';

interface AssetsAndFeesCardProps {
  dashboardData: DashboardViewData;
}

export const AssetsAndFeesCard: React.FC<AssetsAndFeesCardProps> = ({ dashboardData }) => {
  const isPercentage = dashboardData.fee_type === 'percentage';
  
  // Format rates for display
  const formatRate = (rate: number | null) => {
    if (!rate) return '--';
    if (isPercentage) {
      return `${rate.toFixed(2)}%`;
    }
    return formatCurrency(rate, 0);
  };
  
  // Format composite rates display as inline pills
  const compositeRates = (
    <div className="flex gap-1 flex-wrap">
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        M: {formatRate(dashboardData.monthly_rate)}
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        Q: {formatRate(dashboardData.quarterly_rate)}
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        A: {formatRate(dashboardData.annual_rate)}
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
  const aumDisplay = dashboardData.aum 
    ? `${formatCurrency(dashboardData.aum, 0)}${dashboardData.aum_source === 'estimated' ? '*' : ''}`
    : 'N/A';

  return (
    <GridAlignedCard
      title="Assets & Fees"
      mainValueLabel="AUM"
      mainValue={aumDisplay}
      details={details}
    />
  );
};