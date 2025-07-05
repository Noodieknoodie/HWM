// frontend/src/hooks/useClientDashboard.ts
import { useEffect, useState } from 'react';
import { useApiClient } from '../api/client';

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
  total_ytd_payments: number;
  avg_quarterly_payment: number;
  last_recorded_assets: number;
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

export interface DashboardResponse {
  client: DashboardClient;
  contract: DashboardContract;
  payment_status: DashboardPaymentStatus;
  compliance: DashboardCompliance;
  recent_payments: DashboardPayment[];
  metrics: DashboardMetrics;
  quarterly_summaries: QuarterlySummary[];
}

export function useClientDashboard(clientId: number | null) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiClient = useApiClient();

  useEffect(() => {
    if (!clientId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.getDashboard(clientId);
        if (!cancelled) {
          setData(response as DashboardResponse);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.error?.message || 'Failed to load dashboard data');
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

  return { data, loading, error };
}