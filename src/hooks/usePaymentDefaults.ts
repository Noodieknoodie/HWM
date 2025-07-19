// src/hooks/usePaymentDefaults.ts
import { useState, useEffect } from 'react';
import { useDataApiClient } from '@/api/client';
import { getErrorMessage } from '@/utils/errorUtils';

export interface PaymentDefaults {
  client_id: number;
  suggested_aum: number | null;
  current_period: number;
  current_year: number;
  payment_schedule: 'monthly' | 'quarterly';
  fee_type: 'percentage' | 'flat';
  percent_rate: number | null;
  flat_rate: number | null;
}

export function usePaymentDefaults(clientId: number | null) {
  const dataApiClient = useDataApiClient();
  const [defaults, setDefaults] = useState<PaymentDefaults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setDefaults(null);
      setLoading(false);
      setError(null);
      return;
    }
    
    const fetchDefaults = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await dataApiClient.getPaymentDefaults(clientId);
        setDefaults(response);
      } catch (err: any) {
        setError(getErrorMessage(err, 'Failed to fetch payment defaults'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchDefaults();
  }, [clientId, dataApiClient]);
  
  return { defaults, loading, error };
}