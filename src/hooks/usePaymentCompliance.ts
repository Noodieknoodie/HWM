// src/hooks/usePaymentCompliance.ts
import { useState, useEffect } from 'react';
import { useDataApiClient } from '@/context/ApiContext';
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
    if (!clientId) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }
    
    const fetchComplianceData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First get the active contract to find start date
        const contracts = await dataApiClient.getClientContracts(clientId) as any[];
        const activeContract = contracts.find(c => c.is_active === true || c.is_active === 1);
        
        if (!activeContract || !activeContract.contract_start_date) {
          throw new Error('No active contract found for client');
        }
        
        const contract = activeContract;
        
        // Parse contract start date
        const startDate = new Date(contract.contract_start_date);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        const startQuarter = Math.ceil(startMonth / 3);
        
        // Build filter based on payment schedule
        let dateFilter = '';
        if (contract.payment_schedule === 'monthly') {
          // For monthly, filter by year and period
          dateFilter = ` and (year gt ${startYear} or (year eq ${startYear} and period ge ${startMonth}))`;
        } else {
          // For quarterly, filter by year and quarter
          dateFilter = ` and (year gt ${startYear} or (year eq ${startYear} and period ge ${startQuarter}))`;
        }
        
        // Fetch with date filter
        const response = await dataApiClient.request(
          `comprehensive_payment_summary?$filter=client_id eq ${clientId}${dateFilter}&$orderby=year desc,period desc`
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
  }, [clientId, dataApiClient]);

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