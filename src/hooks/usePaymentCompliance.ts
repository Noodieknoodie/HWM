// src/hooks/usePaymentCompliance.ts
import { useState, useEffect } from 'react';
import { useDataApiClient } from '@/api/client';
import { getErrorMessage } from '@/utils/errorUtils';

export interface CompliancePeriod {
  client_id: number;
  display_name: string;
  year: number;
  period: number;
  period_display: string;
  payment_id: number | null;
  received_date: string | null;
  actual_fee: number | null;
  expected_fee: number | null;
  variance_amount: number | null;
  variance_percent: number | null;
  variance_status: string;
  payment_schedule: string;
}

export interface ComplianceStats {
  totalPeriods: number;
  paidPeriods: number;
  missingPeriods: number;
  complianceRate: number;
  totalExpected: number;
  totalPaid: number;
  totalVariance: number;
}

export interface ComplianceYear {
  year: number;
  periods: CompliancePeriod[];
  stats: {
    totalPeriods: number;
    paidPeriods: number;
    missingPeriods: number;
    complianceRate: number;
  };
}

export function usePaymentCompliance(clientId: number | null) {
  const dataApiClient = useDataApiClient();
  const [data, setData] = useState<CompliancePeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    
    const fetchComplianceData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all periods from comprehensive_payment_summary
        const response = await dataApiClient.request(
          `comprehensive_payment_summary?$filter=client_id eq ${clientId}&$orderby=year desc,period desc`
        );
        
        setData(Array.isArray(response) ? response : []);
      } catch (err: any) {
        setError(getErrorMessage(err, 'Failed to fetch compliance data'));
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchComplianceData();
  }, [clientId]);

  // Calculate overall stats
  const overallStats: ComplianceStats = {
    totalPeriods: data.length,
    paidPeriods: data.filter(p => p.payment_id !== null).length,
    missingPeriods: data.filter(p => p.payment_id === null).length,
    complianceRate: data.length > 0 
      ? (data.filter(p => p.payment_id !== null).length / data.length) * 100 
      : 0,
    totalExpected: data.reduce((sum, p) => sum + (p.expected_fee || 0), 0),
    totalPaid: data.reduce((sum, p) => sum + (p.actual_fee || 0), 0),
    totalVariance: data.reduce((sum, p) => sum + (p.variance_amount || 0), 0),
  };

  // Group by year
  const groupedByYear: ComplianceYear[] = data.reduce((acc, period) => {
    const existingYear = acc.find(y => y.year === period.year);
    
    if (existingYear) {
      existingYear.periods.push(period);
    } else {
      acc.push({
        year: period.year,
        periods: [period],
        stats: {
          totalPeriods: 0,
          paidPeriods: 0,
          missingPeriods: 0,
          complianceRate: 0,
        },
      });
    }
    
    return acc;
  }, [] as ComplianceYear[]);

  // Calculate stats for each year
  groupedByYear.forEach(yearGroup => {
    yearGroup.stats = {
      totalPeriods: yearGroup.periods.length,
      paidPeriods: yearGroup.periods.filter(p => p.payment_id !== null).length,
      missingPeriods: yearGroup.periods.filter(p => p.payment_id === null).length,
      complianceRate: yearGroup.periods.length > 0
        ? (yearGroup.periods.filter(p => p.payment_id !== null).length / yearGroup.periods.length) * 100
        : 0,
    };
    
    // Sort periods within year
    yearGroup.periods.sort((a, b) => b.period - a.period);
  });

  // Sort years descending
  groupedByYear.sort((a, b) => b.year - a.year);

  return {
    data,
    groupedByYear,
    overallStats,
    loading,
    error,
  };
}