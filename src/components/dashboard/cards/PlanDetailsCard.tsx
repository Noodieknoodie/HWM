// src/components/dashboard/cards/PlanDetailsCard.tsx
import React from 'react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatDateMMYY, formatNumber } from '../../../utils/formatters';
import { GridAlignedCard } from './GridAlignedCard';

interface PlanDetailsCardProps {
  dashboardData: DashboardViewData;
}

export const PlanDetailsCard: React.FC<PlanDetailsCardProps> = ({ dashboardData }) => {
  const details = [
    { 
      label: "Contract #", 
      value: dashboardData.contract_number || '--' 
    },
    { 
      label: "Participants", 
      value: dashboardData.num_people ? `${formatNumber(dashboardData.num_people)}` : '--'
    },
    { 
      label: "Client Since", 
      value: formatDateMMYY(dashboardData.ima_signed_date) 
    },
  ];

  return (
    <GridAlignedCard
      title="Plan Details"
      mainValueLabel="Provider"
      mainValue={dashboardData.provider_name || '--'}
      details={details}
    />
  );
};