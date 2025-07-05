// frontend/src/hooks/usePayments.ts
import { useState, useEffect } from 'react';
import { useApiClient } from '@/api/client';

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
  variance_amount?: number;
  variance_percent?: number;
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
  const apiClient = useApiClient();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { page = 1, limit = 50, year = null } = options;

  useEffect(() => {
    if (!clientId) return;
    
    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const queryParams = new URLSearchParams({
          client_id: clientId.toString(),
          page: page.toString(),
          limit: limit.toString(),
        });
        
        if (year !== null) {
          queryParams.append('year', year.toString());
        }
        
        const response = await apiClient.request<Payment[]>(
          `/api/payments?${queryParams.toString()}`
        );
        setPayments(response);
      } catch (err: any) {
        setError(err?.error?.message || 'Failed to fetch payments');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPayments();
  }, [clientId, page, limit, year]);
  
  const createPayment = async (data: PaymentCreateData) => {
    try {
      const response = await apiClient.createPayment(data);
      // Refresh payments list
      if (clientId) {
        const queryParams = new URLSearchParams({
          client_id: clientId.toString(),
          page: page.toString(),
          limit: limit.toString(),
        });
        if (year !== null) {
          queryParams.append('year', year.toString());
        }
        const updatedPayments = await apiClient.request<Payment[]>(
          `/api/payments?${queryParams.toString()}`
        );
        setPayments(updatedPayments);
      }
      return response;
    } catch (err: any) {
      throw new Error(err?.error?.message || 'Failed to create payment');
    }
  };
  
  const updatePayment = async (paymentId: number, data: PaymentUpdateData) => {
    try {
      const response = await apiClient.updatePayment(paymentId, data);
      // Refresh payments list
      if (clientId) {
        const queryParams = new URLSearchParams({
          client_id: clientId.toString(),
          page: page.toString(),
          limit: limit.toString(),
        });
        if (year !== null) {
          queryParams.append('year', year.toString());
        }
        const updatedPayments = await apiClient.request<Payment[]>(
          `/api/payments?${queryParams.toString()}`
        );
        setPayments(updatedPayments);
      }
      return response;
    } catch (err: any) {
      throw new Error(err?.error?.message || 'Failed to update payment');
    }
  };
  
  const deletePayment = async (paymentId: number) => {
    try {
      await apiClient.deletePayment(paymentId);
      // Refresh payments list
      if (clientId) {
        const queryParams = new URLSearchParams({
          client_id: clientId.toString(),
          page: page.toString(),
          limit: limit.toString(),
        });
        if (year !== null) {
          queryParams.append('year', year.toString());
        }
        const updatedPayments = await apiClient.request<Payment[]>(
          `/api/payments?${queryParams.toString()}`
        );
        setPayments(updatedPayments);
      }
    } catch (err: any) {
      throw new Error(err?.error?.message || 'Failed to delete payment');
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