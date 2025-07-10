// src/hooks/useClientDashboard.ts
import { useEffect, useState } from 'react';
import { useDataApiClient } from '../api/client';
import { getErrorMessage } from '../utils/errorUtils';

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
  num_people: number | null;
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
  current_period_display: string;
  current_quarter: number;
  current_quarter_payments: number;
  expected_payments_per_quarter: number;
  
  // Fee rates (already scaled)
  monthly_rate: number | null;
  quarterly_rate: number | null;
  annual_rate: number | null;
  
  // Expected fee and status
  expected_fee: number | null;
  payment_status: 'Paid' | 'Due';
  
  // Contact info
  contact_name: string | null;
  phone: string | null;
  physical_address: string | null;
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
          setError(getErrorMessage(err, 'Failed to load dashboard data'));
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

  // Return the flat dashboard data directly - no transformation needed
  return { 
    dashboardData, 
    recentPayments, 
    loading, 
    error 
  };
}