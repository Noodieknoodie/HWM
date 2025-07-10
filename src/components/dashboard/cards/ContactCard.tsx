// src/components/dashboard/cards/ContactCard.tsx
import React from 'react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatPhone } from '../../../utils/formatters';
import { GridAlignedCard } from './GridAlignedCard';

interface ContactCardProps {
  dashboardData: DashboardViewData;
}

export const ContactCard: React.FC<ContactCardProps> = ({ dashboardData }) => {
  // Format address for display
  const formatAddress = (address: string | null | undefined) => {
    if (!address) return '--';
    
    // Split address by comma and clean up
    const parts = address.split(',').map(part => part.trim());
    
    if (parts.length === 0) return '--';
    
    // Return formatted address as JSX with line breaks
    return (
      <div className="text-right text-xs leading-relaxed">
        {parts.map((part, index) => (
          <div key={index}>{part}</div>
        ))}
      </div>
    );
  };
  
  const details = [
    { 
      label: "Phone", 
      value: formatPhone(dashboardData.phone) || '--'
    },
    { 
      label: "Address", 
      value: formatAddress(dashboardData.physical_address)
    },
  ];

  return (
    <GridAlignedCard
      title="Contact"
      mainValueLabel="Primary Contact"
      mainValue={dashboardData.contact_name || '--'}
      details={details}
    />
  );
};