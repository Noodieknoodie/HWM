// src/hooks/usePeriods.ts
import { useState, useEffect } from 'react';
import { useDataApiClient } from '@/api/client';
import { getErrorMessage } from '@/utils/errorUtils';

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
    if (!clientId) {
      setPeriods([]);
      setLoading(false);
      setError(null);
      return;
    }
    
    const fetchPeriods = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await dataApiClient.getAvailablePeriods(clientId);
        setPeriods(Array.isArray(response) ? response : []);
      } catch (err: any) {
        setError(getErrorMessage(err, 'Failed to fetch periods'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchPeriods();
  }, [clientId, dataApiClient]);
  
  // Transform to match expected format
  // Filter to prevent years that would violate database constraints
  const currentYear = new Date().getFullYear();
  const formattedPeriods = periods
    .filter(p => p.year >= 2018 && p.year <= currentYear + 1)
    .map(p => ({
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