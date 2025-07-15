// src/components/dashboard/cards/CurrentStatusCard.tsx
import React from 'react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatCurrency, formatDateMMDDYY } from '../../../utils/formatters';
import { GridAlignedCard } from './GridAlignedCard';

interface CurrentStatusCardProps {
  dashboardData: DashboardViewData;
}

export const CurrentStatusCard: React.FC<CurrentStatusCardProps> = ({ dashboardData }) => {
  const isPaid = dashboardData.payment_status === 'Paid';
  
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
        <div>
          <p className="text-xl font-bold text-gray-800 break-words leading-tight">
            {dashboardData.current_period_display || '--'}
          </p>
          {!isPaid && (
            <p className="text-sm text-gray-500 mt-1">Awaiting Entry</p>
          )}
        </div>
      }
      details={details}
    />
  );
};