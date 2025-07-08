// frontend/src/hooks/usePayments.ts
import { useState, useEffect } from 'react';
import { useDataApiClient } from '@/api/client';

export interface Payment {
  payment_id: number;
  contract_id: number;
  client_id: number;
  received_date: string;
  total_assets: number | null;
  expected_fee: number | null;
  actual_fee: number;
  method: string | null;
  notes: string | null;
  applied_period_type: string;
  applied_period: number;
  applied_year: number;
  // From joined data
  client_name?: string;
  provider_name?: string;
  fee_type?: string;
  percent_rate?: number | null;
  flat_rate?: number | null;
  payment_schedule?: string;
  has_files?: boolean;
  // From payment_variance_view
  variance_amount?: number | null;
  variance_percent?: number | null;
  variance_status?: string;
}

export interface PaymentCreateData {
  contract_id: number;
  client_id: number;
  received_date: string;
  total_assets: number | null;
  expected_fee: number | null;
  actual_fee: number;
  method: string | null;
  notes: string | null;
  applied_period_type: string;
  applied_period: number;
  applied_year: number;
}

export interface PaymentUpdateData {
  received_date?: string;
  total_assets?: number | null;
  expected_fee?: number | null;
  actual_fee?: number;
  method?: string | null;
  notes?: string | null;
  applied_period_type?: string;
  applied_period?: number;
  applied_year?: number;
}

export interface UsePaymentsOptions {
  page?: number;
  limit?: number;
  year?: number | null;
}

export function usePayments(clientId: number | null, options: UsePaymentsOptions = {}) {
  const dataApiClient = useDataApiClient();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { year = null } = options; // Azure handles pagination

  useEffect(() => {
    if (!clientId) return;
    
    let cancelled = false;
    
    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await dataApiClient.getPayments(clientId, year || undefined);
        
        if (!cancelled) {
          setPayments(Array.isArray(response) ? response : []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.error?.message || 'Failed to fetch payments');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    fetchPayments();
    
    return () => {
      cancelled = true;
    };
  }, [clientId, year, refreshKey]);
  
  const createPayment = async (data: PaymentCreateData) => {
    try {
      const response = await dataApiClient.createPayment(data);
      // Trigger refresh by updating key
      setRefreshKey(prev => prev + 1);
      return response;
    } catch (err: any) {
      throw new Error(err.error?.message || 'Failed to create payment');
    }
  };
  
  const updatePayment = async (paymentId: number, data: PaymentUpdateData) => {
    try {
      const response = await dataApiClient.updatePayment(paymentId, data);
      // Trigger refresh by updating key
      setRefreshKey(prev => prev + 1);
      return response;
    } catch (err: any) {
      throw new Error(err.error?.message || 'Failed to update payment');
    }
  };
  
  const deletePayment = async (paymentId: number) => {
    try {
      await dataApiClient.deletePayment(paymentId);
      // Trigger refresh by updating key
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      throw new Error(err.error?.message || 'Failed to delete payment');
    }
  };
  
  return {
    payments,
    loading,
    error,
    createPayment,
    updatePayment,
    deletePayment,
  };
}