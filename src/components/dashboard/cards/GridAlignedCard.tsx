// src/components/dashboard/cards/GridAlignedCard.tsx
import React from 'react';

interface GridAlignedCardProps {
  title: string;
  mainValue: React.ReactNode;
  mainValueLabel?: string;
  details: { label: string; value: React.ReactNode }[];
  action?: React.ReactNode;
}

export const GridAlignedCard: React.FC<GridAlignedCardProps> = ({ 
  title, 
  mainValue, 
  mainValueLabel, 
  details,
  action 
}) => {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm flex flex-col h-full relative hover:shadow-md transition-shadow duration-300">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-sm text-gray-600">{title}</h3>
        {action && (
          <div className="ml-2">
            {action}
          </div>
        )}
      </div>
      <div className="min-h-[4rem] flex flex-col justify-center border-b pb-3 mb-3">
        {mainValueLabel && <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{mainValueLabel}</p>}
        {typeof mainValue === "string" ? (
          <p className="text-xl font-bold text-gray-800 break-words leading-tight">{mainValue}</p>
        ) : (
          mainValue
        )}
      </div>
      <div className="flex-grow space-y-2 text-sm">
        {details.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex justify-between items-start gap-3">
            <span className="text-gray-500 text-xs whitespace-nowrap flex-shrink-0">{item.label}</span>
            <span className="font-medium text-right text-xs leading-relaxed">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};