// src/components/dashboard/cards/CurrentStatusCard.tsx
import React from 'react';
import { DollarSign } from 'lucide-react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatCurrency, formatDateMMDDYY } from '../../../utils/formatters';
import { DashboardCard } from './DashboardCard';

interface CurrentStatusCardProps {
  dashboardData: DashboardViewData;
}

export const CurrentStatusCard: React.FC<CurrentStatusCardProps> = ({ dashboardData }) => {
  const isPaid = dashboardData.payment_status === 'Paid';
  
  return (
    <DashboardCard icon={DollarSign} title="Current Status">
      {/* Row 1: Period + Status */}
      <div className="flex justify-between items-center">
        <span className="text-base font-medium text-gray-900">
          {dashboardData.current_period_display}
        </span>
        <span className={`text-base font-bold ${isPaid ? 'text-green-600' : 'text-amber-600'}`}>
          {isPaid ? 'PAID' : 'DUE'}
        </span>
      </div>
      
      {/* Row 2: Expected Fee */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Expected</span>
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency(dashboardData.expected_fee)}
        </span>
      </div>
      
      {/* Row 3: Last Payment Date */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Last Paid</span>
        <span className="text-sm text-gray-900">
          {dashboardData.last_payment_date ? formatDateMMDDYY(dashboardData.last_payment_date) : '--'}
        </span>
      </div>
      
      {/* Row 4: Last Payment Amount */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Last Amount</span>
        <span className="text-sm text-gray-900">
          {dashboardData.last_payment_amount ? formatCurrency(dashboardData.last_payment_amount) : '--'}
        </span>
      </div>
    </DashboardCard>
  );
};