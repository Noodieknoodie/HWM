// src/hooks/useClientDashboard.ts
import { useEffect, useState } from 'react';
import { useDataApiClient } from '../api/client';

// New consolidated dashboard view data
export interface DashboardViewData {
  // Client info
  client_id: number;
  display_name: string;
  full_name: string;
  ima_signed_date: string | null;
  
  // Contract info
  contract_id: number;
  contract_number: string | null;
  provider_name: string;
  payment_schedule: 'monthly' | 'quarterly';
  fee_type: 'percentage' | 'flat';
  percent_rate: number | null;
  flat_rate: number | null;
  
  // AUM and estimation
  aum: number | null;
  aum_estimated: number | null;
  aum_source: 'recorded' | 'estimated' | null;
  
  // Payment info
  last_payment_date: string | null;
  last_payment_amount: number | null;
  total_ytd_payments: number | null;
  
  // Current period
  current_period: number;
  current_year: number;
  
  // Fee rates (already scaled)
  monthly_rate: number | null;
  quarterly_rate: number | null;
  annual_rate: number | null;
  
  // Expected fee and status
  expected_fee: number | null;
  payment_status: 'Paid' | 'Due';
}

// Dashboard Types (matching backend models)
export interface DashboardClient {
  client_id: number;
  display_name: string;
  full_name: string;
  ima_signed_date: string | null;
}

export interface DashboardContract {
  contract_id: number;
  contract_number: string | null;
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

// Legacy interfaces - kept for backward compatibility
// These map the new dashboard_view data to the old structure

export function useClientDashboard(clientId: number | null) {
  const [dashboardData, setDashboardData] = useState<DashboardViewData | null>(null);
  const [recentPayments, setRecentPayments] = useState<DashboardPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataApiClient = useDataApiClient();

  useEffect(() => {
    if (!clientId) {
      setDashboardData(null);
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
        // Fetch dashboard data and recent payments in parallel
        const [dashboard, payments] = await Promise.all([
          dataApiClient.getDashboardData(clientId),
          dataApiClient.getPayments(clientId)
        ]);
        
        if (!cancelled) {
          setDashboardData(dashboard);
          // Take only the 10 most recent payments for the dashboard
          setRecentPayments(Array.isArray(payments) ? payments.slice(0, 10) : []);
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

  // Transform to match the old interface structure for compatibility
  const data = dashboardData ? {
    client: {
      client_id: dashboardData.client_id,
      display_name: dashboardData.display_name,
      full_name: dashboardData.full_name,
      ima_signed_date: dashboardData.ima_signed_date
    },
    contract: {
      contract_id: dashboardData.contract_id,
      contract_number: dashboardData.contract_number,
      provider_name: dashboardData.provider_name,
      fee_type: dashboardData.fee_type,
      percent_rate: dashboardData.percent_rate,
      flat_rate: dashboardData.flat_rate,
      payment_schedule: dashboardData.payment_schedule
    },
    payment_status: {
      status: dashboardData.payment_status,
      current_period: `${dashboardData.current_period}`,
      current_period_number: dashboardData.current_period,
      current_year: dashboardData.current_year,
      last_payment_date: dashboardData.last_payment_date,
      last_payment_amount: dashboardData.last_payment_amount,
      expected_fee: dashboardData.expected_fee || 0
    },
    compliance: {
      status: 'compliant' as const,
      color: dashboardData.payment_status === 'Paid' ? 'green' : 'yellow' as 'green' | 'yellow',
      reason: dashboardData.payment_status === 'Paid' ? 'All payments up to date' : 'Payment due'
    },
    recent_payments: recentPayments,
    metrics: {
      total_ytd_payments: dashboardData.total_ytd_payments,
      avg_quarterly_payment: 0,
      last_recorded_assets: dashboardData.aum,  // Map aum to last_recorded_assets for now
      next_payment_due: null
    },
    quarterly_summaries: [],
    feeReference: {
      client_id: dashboardData.client_id,
      monthly_fee: dashboardData.monthly_rate,  // Now using rates instead of dollar amounts
      quarterly_fee: dashboardData.quarterly_rate,
      annual_fee: dashboardData.annual_rate
    },
    // New fields from dashboard_view
    aum: dashboardData.aum,
    aum_estimated: dashboardData.aum_estimated,
    aum_source: dashboardData.aum_source
  } : null;

  return { data, loading, error };
}