// src/components/dashboard/cards/PlanDetailsCard.tsx
import React from 'react';
import { Building2 } from 'lucide-react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatDateMMYY, formatNumber } from '../../../utils/formatters';
import { DashboardCard } from './DashboardCard';

interface PlanDetailsCardProps {
  dashboardData: DashboardViewData;
}

export const PlanDetailsCard: React.FC<PlanDetailsCardProps> = ({ dashboardData }) => {
  return (
    <DashboardCard icon={Building2} title="Plan Details">
      {/* Row 1: Provider */}
      <div className="text-base font-medium text-gray-900">
        {dashboardData.provider_name || '--'}
      </div>
      
      {/* Row 2: Contract */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Contract</span>
        <span className="text-sm text-gray-900">{dashboardData.contract_number || '--'}</span>
      </div>
      
      {/* Row 3: Participants */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Participants</span>
        <span className="text-sm font-medium text-gray-900">
          {formatNumber(dashboardData.num_people)}
        </span>
      </div>
      
      {/* Row 4: Client Since */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Client Since</span>
        <span className="text-sm text-gray-900">
          {formatDateMMYY(dashboardData.ima_signed_date)}
        </span>
      </div>
    </DashboardCard>
  );
};