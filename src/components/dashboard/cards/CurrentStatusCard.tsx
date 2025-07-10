// src/components/dashboard/cards/CurrentStatusCard.tsx
import React from 'react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatCurrency, formatDateMMDDYY } from '../../../utils/formatters';
import { GridAlignedCard } from './GridAlignedCard';
import { StatusDisplay } from './StatusDisplay';

interface CurrentStatusCardProps {
  dashboardData: DashboardViewData;
}

export const CurrentStatusCard: React.FC<CurrentStatusCardProps> = ({ dashboardData }) => {
  const status = dashboardData.payment_status === 'Paid' ? 'Paid' : 'Payment Due';
  
  const details = [
    { 
      label: "Expected Payment", 
      value: formatCurrency(dashboardData.expected_fee) || '--'
    },
    { 
      label: "Last Payment Date", 
      value: dashboardData.last_payment_date ? formatDateMMDDYY(dashboardData.last_payment_date) : '--'
    },
    { 
      label: "Last Payment Amount", 
      value: dashboardData.last_payment_amount ? formatCurrency(dashboardData.last_payment_amount) : '--'
    },
  ];

  return (
    <GridAlignedCard
      title="Current Status"
      mainValue={
        <StatusDisplay 
          status={status} 
          period={dashboardData.current_period_display || ''} 
        />
      }
      details={details}
    />
  );
};