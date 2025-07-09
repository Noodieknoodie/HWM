// src/components/dashboard/cards/AssetsAndFeesCard.tsx
import React from 'react';
import { TrendingUp } from 'lucide-react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatCurrency } from '../../../utils/formatters';
import { DashboardCard } from './DashboardCard';

interface AssetsAndFeesCardProps {
  dashboardData: DashboardViewData;
}

export const AssetsAndFeesCard: React.FC<AssetsAndFeesCardProps> = ({ dashboardData }) => {
  const isPercentage = dashboardData.fee_type === 'percentage';
  
  // Format rate with 2 decimals max
  const formatRate = (rate: number | null) => {
    if (!rate) return '--';
    if (isPercentage) {
      return `${rate.toFixed(2)}%`;
    }
    return formatCurrency(rate, 0);
  };
  
  return (
    <DashboardCard icon={TrendingUp} title="Assets & Fees">
      {/* Row 1: AUM */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">AUM</span>
        <span className="text-base font-medium text-gray-900">
          {dashboardData.aum ? formatCurrency(dashboardData.aum, 0) : 'N/A'}
          {dashboardData.aum_source === 'estimated' && <span className="text-xs text-gray-500 ml-1">(estimated)</span>}
        </span>
      </div>
      
      {/* Row 2: Fee Type */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Type</span>
        <span className="text-sm text-gray-900">
          {isPercentage ? 'Percentage' : 'Flat'}
        </span>
      </div>
      
      {/* Row 3: Schedule */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Schedule</span>
        <span className="text-sm text-gray-900">
          {dashboardData.payment_schedule === 'monthly' ? 'Monthly' : 'Quarterly'}
        </span>
      </div>
      
      {/* Row 4: Rates as inline pills */}
      <div className="flex gap-2">
        <div className="flex-1 text-center py-1 px-2 bg-gray-50 rounded text-xs">
          <span className="text-gray-500">M:</span> <span className="font-medium">{formatRate(dashboardData.monthly_rate)}</span>
        </div>
        <div className="flex-1 text-center py-1 px-2 bg-gray-50 rounded text-xs">
          <span className="text-gray-500">Q:</span> <span className="font-medium">{formatRate(dashboardData.quarterly_rate)}</span>
        </div>
        <div className="flex-1 text-center py-1 px-2 bg-gray-50 rounded text-xs">
          <span className="text-gray-500">A:</span> <span className="font-medium">{formatRate(dashboardData.annual_rate)}</span>
        </div>
      </div>
    </DashboardCard>
  );
};