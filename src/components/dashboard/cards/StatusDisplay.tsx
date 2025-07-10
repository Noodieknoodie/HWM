// src/components/dashboard/cards/StatusDisplay.tsx
import React from 'react';

interface StatusDisplayProps {
  status: string;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({ status }) => {
  const statusConfig: { [key: string]: { text: string; color: string } } = {
    Paid: { text: "PAID", color: "text-green-600" },
    "Payment Due": { text: "PAYMENT DUE", color: "text-amber-600" },
    Due: { text: "PAYMENT DUE", color: "text-amber-600" },
    Overdue: { text: "OVERDUE", color: "text-red-600" },
  };
  
  const config = statusConfig[status] || { text: status.toUpperCase(), color: "text-gray-800" };

  return <p className={`text-xl font-bold break-words leading-tight ${config.color}`}>{config.text}</p>;
};