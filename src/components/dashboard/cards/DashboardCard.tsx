// src/components/dashboard/cards/DashboardCard.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ 
  icon: Icon, 
  title, 
  children,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-5 h-full ${className}`}>
      <div className="flex items-center mb-4">
        <Icon className="w-4 h-4 text-gray-500 mr-2" />
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
      </div>
      
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
};