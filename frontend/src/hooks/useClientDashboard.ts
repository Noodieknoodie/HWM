// frontend/src/hooks/useClientDashboard.ts
import { useEffect, useState } from 'react';
import { useDataApiClient } from '../api/client';

// Dashboard Types (matching backend models)
export interface DashboardClient {
  client_id: number;
  display_name: string;
  full_name: string;
  ima_signed_date: string | null;
}

export interface DashboardContract {
  contract_id: number;
  provider_name: string;
  fee_type: 'percentage' | 'flat';
  percent_rate: number | null;
  flat_rate: number | null;
  payment_schedule: 'monthly' | 'quarterly';
}

export interface DashboardPaymentStatus {
  status: 'Paid' | 'Due';
  current_period: string;
  current_period_number: number;
  current_year: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  expected_fee: number;
}

export interface DashboardCompliance {
  status: 'compliant';
  color: 'green' | 'yellow';
  reason: string;
}

export interface DashboardPayment {
  payment_id: number;
  received_date: string;
  actual_fee: number;
  total_assets: number;
  applied_period: number;
  applied_year: number;
  applied_period_type: 'monthly' | 'quarterly';
  period_display: string;
  variance_amount: number | null;
  variance_percent: number | null;
  variance_status: 'exact' | 'acceptable' | 'warning' | 'alert' | null;
}

export interface DashboardMetrics {
  total_ytd_payments: number | null;
  avg_quarterly_payment: number;
  last_recorded_assets: number | null;
  next_payment_due: string | null;
}

export interface QuarterlySummary {
  quarter: number;
  year: number;
  total_payments: number;
  payment_count: number;
  avg_payment: number;
  expected_total: number;
}

// Data directly from SQL views - no aggregation needed
export interface ClientData {
  client_id: number;
  display_name: string;
  full_name: string;
  ima_signed_date: string | null;
}

export interface PaymentStatusData {
  client_id: number;
  payment_schedule: string;
  fee_type: string;
  flat_rate: number | null;
  percent_rate: number | null;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  current_period: number;
  current_year: number;
  last_recorded_assets: number | null;
  expected_fee: number | null;
  payment_status: 'Paid' | 'Due';
}

export interface MetricsData {
  client_id: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  total_ytd_payments: number | null;
  last_recorded_assets: number | null;
}

export interface FeeReferenceData {
  client_id: number;
  monthly_fee: number | null;
  quarterly_fee: number | null;
  annual_fee: number | null;
}

export function useClientDashboard(clientId: number | null) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [feeReference, setFeeReference] = useState<FeeReferenceData | null>(null);
  const [recentPayments, setRecentPayments] = useState<DashboardPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataApiClient = useDataApiClient();

  useEffect(() => {
    if (!clientId) {
      setClient(null);
      setPaymentStatus(null);
      setMetrics(null);
      setFeeReference(null);
      setRecentPayments([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await dataApiClient.getDashboardData(clientId);
        if (!cancelled) {
          setClient(data.client);
          setPaymentStatus(data.paymentStatus);
          setMetrics(data.metrics);
          setFeeReference(data.feeReference);
          setRecentPayments(data.recentPayments);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.error?.message || 'Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // Return data in a structure that matches the old interface for compatibility
  const data = client && paymentStatus ? {
    client,
    contract: {
      contract_id: 0, // These fields come from paymentStatus now
      provider_name: '',
      fee_type: paymentStatus.fee_type as 'percentage' | 'flat',
      percent_rate: paymentStatus.percent_rate,
      flat_rate: paymentStatus.flat_rate,
      payment_schedule: paymentStatus.payment_schedule as 'monthly' | 'quarterly'
    },
    payment_status: {
      status: paymentStatus.payment_status,
      current_period: `${paymentStatus.current_period}`,
      current_period_number: paymentStatus.current_period,
      current_year: paymentStatus.current_year,
      last_payment_date: paymentStatus.last_payment_date,
      last_payment_amount: paymentStatus.last_payment_amount,
      expected_fee: paymentStatus.expected_fee || 0
    },
    compliance: {
      status: 'compliant' as const,
      color: paymentStatus.payment_status === 'Paid' ? 'green' : 'yellow' as 'green' | 'yellow',
      reason: paymentStatus.payment_status === 'Paid' ? 'All payments up to date' : 'Payment due'
    },
    recent_payments: recentPayments,
    metrics: metrics ? {
      ...metrics,
      avg_quarterly_payment: 0,
      next_payment_due: null
    } : {
      total_ytd_payments: null,
      avg_quarterly_payment: 0,
      last_recorded_assets: null,
      next_payment_due: null
    },
    quarterly_summaries: [],
    feeReference
  } : null;

  return { data, loading, error };
}