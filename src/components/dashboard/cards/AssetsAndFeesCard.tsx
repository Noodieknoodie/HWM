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
  
  // Format composite rates display
  const compositeRates = `${formatRate(dashboardData.monthly_rate)} / ${formatRate(dashboardData.quarterly_rate)} / ${formatRate(dashboardData.annual_rate)}`;
  
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
      label: "Composite Rates", 
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