// src/components/dashboard/cards/PlanDetailsCard.tsx
import React, { useState } from 'react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatDateMonthYear, formatNumber } from '../../../utils/formatters';
import { GridAlignedCard } from './GridAlignedCard';
import { EditClientModal } from '../../clients/EditClientModal';

interface PlanDetailsCardProps {
  dashboardData: DashboardViewData;
}

export const PlanDetailsCard: React.FC<PlanDetailsCardProps> = ({ dashboardData }) => {
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  
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
      value: formatDateMonthYear(dashboardData.ima_signed_date) 
    },
  ];

  return (
    <>
      <GridAlignedCard
        title="Plan Details"
        mainValueLabel="Provider"
        mainValue={dashboardData.provider_name || '--'}
        details={details}
        action={
          <button
            onClick={() => setIsEditClientModalOpen(true)}
            className="px-3 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Edit Client
          </button>
        }
      />
      
      {dashboardData.client_id && (
        <EditClientModal
          isOpen={isEditClientModalOpen}
          onClose={() => setIsEditClientModalOpen(false)}
          client={{
            client_id: dashboardData.client_id,
            display_name: dashboardData.display_name || '',
            full_name: dashboardData.full_name || '',
            ima_signed_date: dashboardData.ima_signed_date
          }}
          onSuccess={() => {
            setIsEditClientModalOpen(false);
            // Dashboard will refresh automatically via useClientDashboard hook
          }}
        />
      )}
    </>
  );
};