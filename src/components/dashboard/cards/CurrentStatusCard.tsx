// src/components/dashboard/cards/CurrentStatusCard.tsx
import React, { useState } from 'react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatCurrency, formatDateMMDDYY } from '../../../utils/formatters';
import { GridAlignedCard } from './GridAlignedCard';
import { PaymentComplianceModal } from '../../compliance/PaymentComplianceModal';

interface CurrentStatusCardProps {
  dashboardData: DashboardViewData;
}

export const CurrentStatusCard: React.FC<CurrentStatusCardProps> = ({ dashboardData }) => {
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
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
    <>
      <GridAlignedCard
        title="Current Status"
        mainValueLabel="Payment Period"
        mainValue={
          <div>
            <p className="text-xl font-bold text-gray-800 break-words leading-tight">
              {dashboardData.current_period_display || '--'}
            </p>
            {!isPaid && (
              <p className="text-sm text-red-600 mt-1">Awaiting Entry</p>
            )}
          </div>
        }
        details={details}
        action={
          <button
            onClick={() => setIsComplianceModalOpen(true)}
            className="px-3 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            View Compliance
          </button>
        }
      />
      
      {dashboardData.client_id && (
        <PaymentComplianceModal
          isOpen={isComplianceModalOpen}
          onClose={() => setIsComplianceModalOpen(false)}
          clientId={dashboardData.client_id}
          clientName={dashboardData.display_name || 'Client'}
        />
      )}
    </>
  );
};