// src/components/dashboard/cards/ContactCard.tsx
import React from 'react';
import { Phone } from 'lucide-react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatPhone } from '../../../utils/formatters';
import { DashboardCard } from './DashboardCard';

interface ContactCardProps {
  dashboardData: DashboardViewData;
}

export const ContactCard: React.FC<ContactCardProps> = ({ dashboardData }) => {
  // Get city, state from address
  const getCityState = (address: string | null | undefined) => {
    if (!address) return '--';
    const parts = address.split(',').map(part => part.trim());
    if (parts.length >= 3) {
      return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
    }
    return parts[parts.length - 1] || '--';
  };
  
  return (
    <DashboardCard icon={Phone} title="Contact">
      {/* Row 1: Contact Name */}
      <div className="text-base font-medium text-gray-900">
        {dashboardData.contact_name || '--'}
      </div>
      
      {/* Row 2: Phone */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Phone</span>
        <span className="text-sm text-gray-900">{formatPhone(dashboardData.phone)}</span>
      </div>
      
      {/* Row 3: Location */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Location</span>
        <span className="text-sm text-gray-900">{getCityState(dashboardData.physical_address)}</span>
      </div>
      
      {/* Row 4: Empty for consistency */}
      <div className="text-xs text-gray-500">{'\u00A0'}</div>
    </DashboardCard>
  );
};