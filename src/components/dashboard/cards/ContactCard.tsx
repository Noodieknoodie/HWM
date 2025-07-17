// src/components/dashboard/cards/ContactCard.tsx
import React, { useState } from 'react';
import { DashboardViewData } from '../../../hooks/useClientDashboard';
import { formatPhone } from '../../../utils/formatters';
import { GridAlignedCard } from './GridAlignedCard';
import { ContactsModal } from '../../contacts/ContactsModal';

interface ContactCardProps {
  dashboardData: DashboardViewData;
}

export const ContactCard: React.FC<ContactCardProps> = ({ dashboardData }) => {
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
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
    <>
      <GridAlignedCard
        title="Contact"
        mainValueLabel="Primary Contact"
        mainValue={dashboardData.contact_name || '--'}
        details={details}
        action={
          <button
            onClick={() => setIsContactsModalOpen(true)}
            className="px-3 py-1 text-xs font-medium text-blue-600 bg-white border border-blue-600 rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Manage
          </button>
        }
      />
      
      {dashboardData.client_id && (
        <ContactsModal
          isOpen={isContactsModalOpen}
          onClose={() => setIsContactsModalOpen(false)}
          clientId={dashboardData.client_id}
          clientName={dashboardData.display_name || 'Client'}
        />
      )}
    </>
  );
};