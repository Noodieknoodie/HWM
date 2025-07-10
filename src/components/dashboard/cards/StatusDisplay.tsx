// src/components/dashboard/cards/StatusDisplay.tsx
import React from 'react';

interface StatusDisplayProps {
  status: string;
  period: string;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({ status, period }) => {
  const statusConfig: { [key: string]: { text: string; color: string } } = {
    Paid: { text: `Paid for ${period}`, color: "text-green-600" },
    "Payment Due": { text: `Payment Due for ${period}`, color: "text-amber-600" },
    Due: { text: `Payment Due for ${period}`, color: "text-amber-600" },
    Overdue: { text: `Overdue for ${period}`, color: "text-red-600" },
  };
  
  const config = statusConfig[status] || { text: `${status} for ${period}`, color: "text-gray-800" };

  return <p className={`text-2xl font-bold truncate leading-tight ${config.color}`}>{config.text}</p>;
};