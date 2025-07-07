// frontend/src/hooks/usePeriods.ts
import { useState, useEffect } from 'react';
import { useApiClient } from '@/api/client';
import { getErrorMessage } from '@/utils/errorUtils';

export interface Period {
  value: string;
  label: string;
  period: number;
  year: number;
  period_type: string;
}

export interface PeriodsResponse {
  periods: Period[];
  payment_schedule: string;
}

export function usePeriods(clientId: number | null, contractId: number | null) {
  const apiClient = useApiClient();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [paymentSchedule, setPaymentSchedule] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !contractId) return;
    
    const fetchPeriods = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await apiClient.request<PeriodsResponse>(
          `/periods?client_id=${clientId}&contract_id=${contractId}`
        );
        setPeriods(response.periods);
        setPaymentSchedule(response.payment_schedule);
      } catch (err: any) {
        setError(getErrorMessage(err, 'Failed to fetch periods'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchPeriods();
  }, [clientId, contractId]);
  
  return {
    periods,
    paymentSchedule,
    loading,
    error,
  };
}