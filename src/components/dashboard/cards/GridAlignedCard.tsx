// src/components/dashboard/cards/GridAlignedCard.tsx
import React from 'react';

interface GridAlignedCardProps {
  title: string;
  mainValue: React.ReactNode;
  mainValueLabel?: string;
  details: { label: string; value: React.ReactNode }[];
}

export const GridAlignedCard: React.FC<GridAlignedCardProps> = ({ 
  title, 
  mainValue, 
  mainValueLabel, 
  details 
}) => {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 flex flex-col h-full">
      <h3 className="font-semibold text-sm mb-2 text-gray-500">{title}</h3>
      <div className="min-h-[4.5rem] flex flex-col justify-center border-b pb-3 mb-3">
        {mainValueLabel && <p className="text-xs text-gray-500 uppercase tracking-wider">{mainValueLabel}</p>}
        {typeof mainValue === "string" ? (
          <p className="text-2xl font-bold text-gray-800 truncate leading-tight">{mainValue}</p>
        ) : (
          mainValue
        )}
      </div>
      <div className="flex-grow space-y-1.5 text-sm">
        {details.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex justify-between items-start">
            <span className="text-gray-500 text-xs whitespace-nowrap mr-2">{item.label}</span>
            <span className="font-medium text-right">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};