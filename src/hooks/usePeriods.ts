// src/hooks/usePeriods.ts
import { useState, useEffect } from 'react';
import { useDataApiClient } from '@/api/client';

// Period data from payment_form_periods_view
export interface Period {
  client_id: number;
  year: number;
  period: number;
  display_text: string;
  is_paid: number;
}

export function usePeriods(clientId: number | null) {
  const dataApiClient = useDataApiClient();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    
    const fetchPeriods = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await dataApiClient.getAvailablePeriods(clientId);
        setPeriods(Array.isArray(response) ? response : []);
      } catch (err: any) {
        setError(err.error?.message || 'Failed to fetch periods');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPeriods();
  }, [clientId]);
  
  // Transform to match expected format
  const formattedPeriods = periods.map(p => ({
    value: `${p.year}-${p.period}`,
    label: p.display_text,
    period: p.period,
    year: p.year,
    period_type: p.display_text.includes('Q') ? 'quarterly' : 'monthly'
  }));
  
  return {
    periods: formattedPeriods,
    loading,
    error,
  };
}