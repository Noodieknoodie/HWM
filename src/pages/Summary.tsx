import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useAppStore from '@/stores/useAppStore';
import { 
  ChevronRight, 
  ChevronDown, 
  Square, 
  CheckSquare,
  Download,
  FileText,
  ChevronLeft,
  FileSpreadsheet,
  FileDown,
  Plus,
  X
} from 'lucide-react';
import { dataApiClient } from '@/api/client';
import { apiCache, cacheKeys } from '@/utils/cache';
import { Alert } from '@/components/Alert';
interface QuarterlyPageData {
  // Provider-level fields
  provider_name: string;
  provider_client_count: number;
  provider_actual_total: number;
  provider_expected_total: number;
  provider_variance: number;
  clients_posted: number;
  total_clients: number;
  provider_posted_display: string; // e.g., "2/3"
  
  // Client-level fields
  client_id: number;
  display_name: string;
  payment_schedule: string;
  fee_type: string;
  percent_rate: number | null;
  flat_rate: number | null;
  quarterly_rate: number; // Pre-calculated rate for display
  client_expected: number;
  client_actual: number;
  client_variance: number;
  client_variance_percent: number | null;
  variance_status: string;
  payment_count: number;
  expected_payment_count: number;
  payment_status_display: string; // e.g., "2/3"
  fully_posted: number;
  has_notes: number;
  quarterly_notes: string | null;
  posted_count: number;
  is_posted: boolean; // Simple boolean marker from the companion table
  
  // Period identifiers
  applied_year: number;
  quarter: number;
  
  row_type: 'client'; // Always 'client' for now
}

interface AnnualPageData {
  // Provider-level fields
  provider_name: string;
  provider_client_count: number;
  provider_q1_total: number;
  provider_q2_total: number;
  provider_q3_total: number;
  provider_q4_total: number;
  provider_annual_total: number;
  
  // Client-level fields
  client_id: number;
  display_name: string;
  payment_schedule: string;
  fee_type: string;
  percent_rate: number | null;
  flat_rate: number | null;
  annual_rate: number; // Pre-calculated annual rate
  q1_actual: number;
  q2_actual: number;
  q3_actual: number;
  q4_actual: number;
  q1_payments: number;
  q2_payments: number;
  q3_payments: number;
  q4_payments: number;
  client_annual_total: number;
  client_annual_expected: number;
  client_annual_variance: number;
  client_annual_variance_percent: number | null;
  fully_posted: number;
  total_payments: number;
  total_expected_payments: number;
  
  // Period identifier
  applied_year: number;
  
  row_type: 'client'; // Always 'client' for now
}

interface ProviderGroup<T> {
  provider_name: string;
  clients: T[];
  isExpanded: boolean;
  // Provider-level totals (from first client in group)
  providerData?: T;
}

interface QuarterlySummaryDetail {
  provider_name: string;
  client_id: number;
  display_name: string;
  payment_schedule: string;
  fee_type: string;
  percent_rate: number | null;
  flat_rate: number | null;
  year: number;
  quarter: number;
  period: number;  // Changed from applied_period to match DB view
  period_type: string;  // Changed from applied_period_type to match DB view
  payment_id: number | null; // NULL for missing payments
  received_date: string | null;
  actual_fee: number;
  expected_fee: number | null;
  total_assets: number | null;
  method: string | null;
  variance_status: string | null;
}

const Summary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const defaultYear = (() => {
    const currentMonth = now.getMonth() + 1;
    const currentQ = Math.ceil(currentMonth / 3);
    if (currentQ === 1) {
      return now.getFullYear() - 1;
    }
    return now.getFullYear();
  })();
  const currentYear = parseInt(searchParams.get('year') || defaultYear.toString());
  const defaultQuarter = (() => {
    const currentMonth = now.getMonth() + 1;
    const currentQ = Math.ceil(currentMonth / 3);
    if (currentQ === 1) {
      return 4;
    }
    return currentQ - 1;
  })();
  const currentQuarter = parseInt(searchParams.get('quarter') || defaultQuarter.toString());
  const viewMode = searchParams.get('view') || 'quarterly';
  const [quarterlyGroups, setQuarterlyGroups] = useState<ProviderGroup<QuarterlyPageData>[]>([]);
  const [annualGroups, setAnnualGroups] = useState<ProviderGroup<AnnualPageData>[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
  const [paymentDetails, setPaymentDetails] = useState<Map<number, QuarterlySummaryDetail[]>>(new Map());
  const [notePopover, setNotePopover] = useState<{ clientId: number; note: string; position: { top: number; left: number } } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const navigateQuarter = (direction: 'prev' | 'next') => {
    let newQuarter = currentQuarter;
    let newYear = currentYear;
    
    if (direction === 'prev') {
      if (currentQuarter === 1) {
        newQuarter = 4;
        newYear--;
      } else {
        newQuarter--;
      }
    } else {
      if (currentQuarter === 4) {
        newQuarter = 1;
        newYear++;
      } else {
        newQuarter++;
      }
    }
    
    setSearchParams({ year: newYear.toString(), quarter: newQuarter.toString(), view: viewMode });
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    const newYear = direction === 'prev' ? currentYear - 1 : currentYear + 1;
    setSearchParams({ year: newYear.toString(), view: viewMode });
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'quarterly' ? 'annual' : 'quarterly';
    if (newMode === 'quarterly') {
      setSearchParams({ year: currentYear.toString(), quarter: currentQuarter.toString(), view: newMode });
    } else {
      setSearchParams({ year: currentYear.toString(), view: newMode });
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (viewMode === 'quarterly') {
        const data = await dataApiClient.getQuarterlyPageData(currentYear, currentQuarter) as QuarterlyPageData[];
        const grouped = data.reduce((acc, row) => {
          let group = acc.find(g => g.provider_name === row.provider_name);
          if (!group) {
            group = {
              provider_name: row.provider_name,
              clients: [],
              isExpanded: true,
              providerData: row
            };
            acc.push(group);
          }
          group.clients.push(row);
          return acc;
        }, [] as ProviderGroup<QuarterlyPageData>[]);
        
        setQuarterlyGroups(grouped);

        setLoading(false);
      } else {
        const data = await dataApiClient.getAnnualPageData(currentYear) as AnnualPageData[];
        const grouped = data.reduce((acc, row) => {
          let group = acc.find(g => g.provider_name === row.provider_name);
          if (!group) {
            group = {
              provider_name: row.provider_name,
              clients: [],
              isExpanded: true,
              providerData: row
            };
            acc.push(group);
          }
          group.clients.push(row);
          return acc;
        }, [] as ProviderGroup<AnnualPageData>[]);
        
        setAnnualGroups(grouped);

        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load summary data:', err);
      setError('Failed to load summary data. Please try again.');
      setLoading(false);
    }
  }, [currentYear, currentQuarter, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!showExportMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showExportMenu]);
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && notePopover) {
        setNotePopover(null);
      }
    };

    if (notePopover) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [notePopover]);
  const toggleProvider = (providerName: string) => {
    if (viewMode === 'quarterly') {
      setQuarterlyGroups(prev => prev.map(provider => 
        provider.provider_name === providerName 
          ? { ...provider, isExpanded: !provider.isExpanded }
          : provider
      ));
    } else {
      setAnnualGroups(prev => prev.map(provider => 
        provider.provider_name === providerName 
          ? { ...provider, isExpanded: !provider.isExpanded }
          : provider
      ));
    }
  };
  const toggleClient = async (clientId: number) => {
    const newExpanded = new Set(expandedClients);
    
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
      if (viewMode === 'quarterly' && !paymentDetails.has(clientId)) {
        try {
          const cacheKey = cacheKeys.paymentDetails(clientId, currentYear, currentQuarter);
          const cached = apiCache.get<QuarterlySummaryDetail[]>(cacheKey);
          if (cached) {
            setPaymentDetails(prev => new Map(prev).set(clientId, cached));
          } else {
            const details = await dataApiClient.getQuarterlySummaryDetail(clientId, currentYear, currentQuarter) as QuarterlySummaryDetail[];
            apiCache.set(cacheKey, details, 5 * 60 * 1000);
            
            setPaymentDetails(prev => new Map(prev).set(clientId, details));
          }
        } catch (err) {}
      }
    }
    
    setExpandedClients(newExpanded);
  };
  const formatPaymentLine = (payment: QuarterlySummaryDetail) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const period = payment.period_type === 'monthly' 
      ? months[payment.period - 1]
      : `Q${payment.period}`;
      
    if (!payment.payment_id) {
      return `${period}: Missing Payment`;
    }
      
    const amount = Math.round(payment.actual_fee);
    const date = new Date(payment.received_date!).toLocaleDateString('en-US', 
      { month: '2-digit', day: '2-digit' }
    );
    
    return `${period}: $${amount.toLocaleString()} paid ${date} via ${payment.method}`;
  };
  const updatePostedStatus = async (clientId: number, currentStatus: boolean) => {
    try {
      await dataApiClient.updateClientQuarterMarker(clientId, currentYear, currentQuarter, !currentStatus);

      setQuarterlyGroups(prev => prev.map(provider => {
        const updatedClients = provider.clients.map(client => 
          client.client_id === clientId 
            ? { ...client, is_posted: !currentStatus }
            : client
        );
        const postedCount = updatedClients.filter(c => c.is_posted).length;
        const updatedProviderData = provider.providerData ? {
          ...provider.providerData,
          clients_posted: postedCount,
          provider_posted_display: `${postedCount}/${updatedClients.length}`
        } : undefined;
        
        return {
          ...provider,
          clients: updatedClients,
          providerData: updatedProviderData
        };
      }));
    } catch (err) {}
  };
  const saveNotePopover = async () => {
    if (!notePopover) return;
    
    try {
      await dataApiClient.updateQuarterlyNote(
        notePopover.clientId, 
        currentYear, 
        currentQuarter, 
        notePopover.note
      );
      setQuarterlyGroups(prev => prev.map(provider => ({
        ...provider,
        clients: provider.clients.map(client => 
          client.client_id === notePopover.clientId 
            ? { ...client, quarterly_notes: notePopover.note, has_notes: notePopover.note ? 1 : 0 }
            : client
        )
      })));
      
      setNotePopover(null);
    } catch (err) {}
  };
  const handleNoteClick = (e: React.MouseEvent, clientId: number, currentNote: string | null) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setNotePopover({
      clientId,
      note: currentNote || '',
      position: {
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX
      }
    });
  };
  const handleExport = async (format: 'csv' | 'excel') => {
    setShowExportMenu(false);
    
    try {
      const Papa = (await import('papaparse')).default;
      const XLSX = format === 'excel' ? await import('xlsx') : null;
      const exportRows: any[] = [];
      const title = viewMode === 'quarterly' 
        ? `Q${currentQuarter} ${currentYear} Payment Summary`
        : `${currentYear} Annual Payment Summary`;
      const headers = viewMode === 'quarterly'
        ? ['Client', 'Frequency', 'Quarterly Rate', 'Expected', 'Actual', 'Variance', 'Posted', 'Notes']
        : ['Client', 'Frequency', 'Annual Rate', 'Q1 ' + currentYear, 'Q2 ' + currentYear, 'Q3 ' + currentYear, 'Q4 ' + currentYear, 'Total'];
      const groups = viewMode === 'quarterly' ? quarterlyGroups : annualGroups;
      
      groups.forEach(provider => {
        const providerData = provider.providerData;
        if (!providerData) return;
        const providerRow: any = {
          Client: provider.provider_name.toUpperCase(),
          Frequency: '',
        };
        
        if (viewMode === 'quarterly') {
          const qData = providerData as QuarterlyPageData;
          providerRow['Quarterly Rate'] = '';
          providerRow.Expected = qData.provider_expected_total.toFixed(2);
          providerRow.Actual = qData.provider_actual_total.toFixed(2);
          providerRow.Variance = qData.provider_variance.toFixed(2);
          providerRow.Posted = qData.clients_posted === qData.total_clients ? 'Y' : 'N';
          providerRow.Notes = '';
        } else {
          const aData = providerData as AnnualPageData;
          providerRow['Annual Rate'] = '';
          providerRow['Q1 ' + currentYear] = aData.provider_q1_total.toFixed(2);
          providerRow['Q2 ' + currentYear] = aData.provider_q2_total.toFixed(2);
          providerRow['Q3 ' + currentYear] = aData.provider_q3_total.toFixed(2);
          providerRow['Q4 ' + currentYear] = aData.provider_q4_total.toFixed(2);
          providerRow.Total = aData.provider_annual_total.toFixed(2);
        }
        
        exportRows.push(providerRow);
        provider.clients.forEach(client => {
          const clientRow: any = {
            Client: `  ${client.display_name}`,
            Frequency: client.payment_schedule === 'monthly' ? 'Monthly' : 'Quarterly',
          };
          
          if (viewMode === 'quarterly') {
            const qClient = client as QuarterlyPageData;
            const rateDisplay = qClient.fee_type === 'percentage' 
              ? `${qClient.quarterly_rate}%`
              : `$${qClient.quarterly_rate.toLocaleString()}`;
            
            clientRow['Quarterly Rate'] = rateDisplay;
            clientRow.Expected = qClient.client_expected.toFixed(2);
            clientRow.Actual = qClient.client_actual.toFixed(2);
            clientRow.Variance = qClient.client_variance.toFixed(2);
            clientRow.Posted = qClient.is_posted ? 'Y' : 'N';
            clientRow.Notes = qClient.quarterly_notes || '';
          } else {
            const aClient = client as AnnualPageData;
            const rateDisplay = aClient.fee_type === 'percentage' 
              ? `${aClient.annual_rate}%`
              : `$${aClient.annual_rate.toLocaleString()}`;
            
            clientRow['Annual Rate'] = rateDisplay;
            clientRow['Q1 ' + currentYear] = aClient.q1_actual.toFixed(2);
            clientRow['Q2 ' + currentYear] = aClient.q2_actual.toFixed(2);
            clientRow['Q3 ' + currentYear] = aClient.q3_actual.toFixed(2);
            clientRow['Q4 ' + currentYear] = aClient.q4_actual.toFixed(2);
            clientRow.Total = aClient.client_annual_total.toFixed(2);
          }
          
          exportRows.push(clientRow);
        });
      });
      const filename = viewMode === 'quarterly' 
        ? `summary-${currentYear}-Q${currentQuarter}`
        : `summary-${currentYear}-annual`;
      
      if (format === 'csv') {
        const csv = Papa.unparse(exportRows, { header: true });
        const blob = new Blob([title + '\n\n' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
      } else if (format === 'excel' && XLSX) {
        const titleRow: any = {};
        headers.forEach((header, index) => {
          titleRow[header] = index === 0 ? title : '';
        });
        
        const allRows = [titleRow, ...exportRows];
        const ws = XLSX.utils.json_to_sheet(allRows, { header: headers, skipHeader: false });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Summary');
        XLSX.writeFile(wb, `${filename}.xlsx`);
      }
    } catch (err) {
      setError('Export failed. Please make sure required libraries are installed.');
    }
  };
  const totals = (() => {
    if (viewMode === 'quarterly') {
      return quarterlyGroups.reduce((acc, provider) => {
        const data = provider.providerData;
        if (data) {
          return {
            expected: acc.expected + data.provider_expected_total,
            actual: acc.actual + data.provider_actual_total,
            variance: acc.variance + data.provider_variance
          };
        }
        return acc;
      }, { expected: 0, actual: 0, variance: 0 });
    } else {
      return annualGroups.reduce((acc, provider) => {
        const data = provider.providerData;
        if (data) {
          return {
            expected: acc.expected + provider.clients.reduce((sum, c) => sum + c.client_annual_expected, 0),
            actual: acc.actual + data.provider_annual_total,
            variance: acc.variance + provider.clients.reduce((sum, c) => sum + c.client_annual_variance, 0)
          };
        }
        return acc;
      }, { expected: 0, actual: 0, variance: 0 });
    }
  })();

  const collectionRate = totals.expected > 0 ? (totals.actual / totals.expected * 100) : 0;
  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-72 animate-pulse" />
        </div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
            <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
            <div className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-28 h-10 bg-gray-200 rounded animate-pulse" />
            <div className="w-24 h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
              <div className="h-7 bg-gray-300 rounded w-32 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="h-5 bg-gray-300 rounded w-40 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse ml-auto" />
            </div>
          </div>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="border-b border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-5 bg-gray-200 rounded animate-pulse" style={{ width: `${120 + Math.random() * 80}px` }} />
                </div>
                <div className="grid grid-cols-4 gap-4 flex-1">
                  <div className="h-5 bg-gray-200 rounded w-16 animate-pulse ml-auto" />
                  <div className="h-5 bg-gray-200 rounded w-20 animate-pulse ml-auto" />
                  <div className="h-5 bg-gray-200 rounded w-16 animate-pulse ml-auto" />
                  <div className="h-5 bg-gray-200 rounded w-16 animate-pulse ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const providerGroups = viewMode === 'quarterly' ? quarterlyGroups : annualGroups;

  // Handle empty state (no data available)
  if (!loading && providerGroups.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {viewMode === 'quarterly' ? 'Quarterly' : 'Annual'} Payment Summary
          </h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No payment data available for {viewMode === 'quarterly' ? `Q${currentQuarter} ${currentYear}` : currentYear}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <Alert variant="error" message={error} className="mb-4" />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {viewMode === 'quarterly' ? 'Quarterly' : 'Annual'} Payment Summary
        </h1>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {viewMode === 'quarterly' ? (
            <>
              <button 
                onClick={() => navigateQuarter('prev')}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-lg font-medium">
                Q{currentQuarter} {currentYear}
              </div>
              <button 
                onClick={() => navigateQuarter('next')}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => navigateYear('prev')}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-lg font-medium">
                {currentYear}
              </div>
              <button 
                onClick={() => navigateYear('next')}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleViewMode}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
          >
            {viewMode === 'quarterly' ? 'Year View' : 'Quarter View'}
          </button>
          <div className="relative export-menu-container">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Download as CSV
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Download as Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Expected</h3>
          <p className="text-2xl font-bold text-gray-900">
            ${totals.expected.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Received</h3>
          <p className="text-2xl font-bold text-gray-900">
            ${totals.actual.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-1">Collection Rate</h3>
          <p className="text-2xl font-bold text-gray-900">
            {collectionRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="w-full">
          <thead className="border-b border-gray-200">
            <tr className="text-left text-sm font-medium text-gray-600">
              <th className="px-4 py-3" style={{ width: '300px' }}>Provider / Client</th>
              <th className="px-4 py-3" style={{ width: '100px' }}>Frequency</th>
              <th className="px-4 py-3" style={{ width: '120px' }}>
                {viewMode === 'quarterly' ? 'Quarterly Rate' : 'Annual Rate'}
              </th>
              {viewMode === 'quarterly' ? (
                <>
                  <th className="px-4 py-3 text-right" style={{ width: '100px' }}>Expected</th>
                  <th className="px-4 py-3 text-right" style={{ width: '100px' }}>Actual</th>
                  <th className="px-4 py-3 text-right" style={{ width: '100px' }}>Variance</th>
                  <th className="px-4 py-3 text-center" style={{ width: '100px' }}>Posted to HWM</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 text-right" style={{ width: '100px' }}>Q1 {currentYear}</th>
                  <th className="px-4 py-3 text-right" style={{ width: '100px' }}>Q2 {currentYear}</th>
                  <th className="px-4 py-3 text-right" style={{ width: '100px' }}>Q3 {currentYear}</th>
                  <th className="px-4 py-3 text-right" style={{ width: '100px' }}>Q4 {currentYear}</th>
                  <th className="px-4 py-3 text-right" style={{ width: '100px' }}>Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {providerGroups.map((provider) => (
              <React.Fragment key={provider.provider_name}>
                {/* Provider Row */}
                <tr className="bg-gray-50 border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <button
                      onClick={() => toggleProvider(provider.provider_name)}
                      className="flex items-center gap-2 hover:text-blue-600"
                    >
                      {provider.isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {provider.provider_name.toUpperCase()} <span className="text-sm text-gray-500 ml-1">({provider.clients.length})</span>
                    </button>
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  {viewMode === 'quarterly' && provider.providerData ? (
                    <>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round((provider.providerData as QuarterlyPageData).provider_expected_total).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round((provider.providerData as QuarterlyPageData).provider_actual_total).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round((provider.providerData as QuarterlyPageData).provider_variance).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          // Calculate posted count from actual client is_posted values
                          const posted = provider.clients.filter(c => (c as QuarterlyPageData).is_posted).length;
                          const total = provider.clients.length;
                          const percentage = total > 0 ? (posted / total) * 100 : 0;
                          
                          // Show fraction with a visual indicator
                          let indicator = '';
                          let colorClass = '';
                          
                          if (percentage === 100) {
                            indicator = '✓';
                            colorClass = 'text-green-600';
                          } else if (percentage >= 75) {
                            indicator = '●';
                            colorClass = 'text-green-600';
                          } else if (percentage >= 50) {
                            indicator = '●';
                            colorClass = 'text-yellow-600';
                          } else if (percentage >= 25) {
                            indicator = '●';
                            colorClass = 'text-orange-600';
                          } else {
                            indicator = '●';
                            colorClass = 'text-red-600';
                          }
                          
                          return (
                            <span className="text-sm">
                              {posted}/{total} <span className={colorClass}>{indicator}</span>
                            </span>
                          );
                        })()}
                      </td>
                    </>
                  ) : viewMode === 'annual' && provider.providerData ? (
                    <>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round((provider.providerData as AnnualPageData).provider_q1_total).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round((provider.providerData as AnnualPageData).provider_q2_total).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round((provider.providerData as AnnualPageData).provider_q3_total).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round((provider.providerData as AnnualPageData).provider_q4_total).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round((provider.providerData as AnnualPageData).provider_annual_total).toLocaleString()}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                    </>
                  )}
                </tr>

                {/* Client Rows */}
                {provider.isExpanded && provider.clients.map((client) => (
                  <React.Fragment key={client.client_id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 pl-10">
                        <div className="flex items-center gap-2">
                          {viewMode === 'quarterly' && (
                            <button
                              onClick={() => toggleClient(client.client_id)}
                              className="p-1"
                            >
                              {expandedClients.has(client.client_id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Get the store instance and navigate
                              const store = useAppStore.getState();
                              store.setSelectedClient({
                                client_id: client.client_id,
                                display_name: client.display_name,
                                full_name: '', // These fields aren't in summary data
                                provider_name: provider.provider_name
                              });
                              navigate('/Payments');
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {client.display_name}
                          </button>
                          {viewMode === 'quarterly' && (
                            <button
                              onClick={(e) => handleNoteClick(e, client.client_id, (client as QuarterlyPageData).quarterly_notes)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title={(client as QuarterlyPageData).has_notes ? "Edit note" : "Add note"}
                            >
                              {(client as QuarterlyPageData).has_notes ? (
                                <FileText className="w-4 h-4 text-gray-600" />
                              ) : (
                                <Plus className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {client.payment_schedule === 'monthly' ? 'Monthly' : 'Quarterly'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {viewMode === 'quarterly' ? (
                          (client as QuarterlyPageData).fee_type === 'percentage' 
                            ? `${(client as QuarterlyPageData).quarterly_rate}%`
                            : `$${(client as QuarterlyPageData).quarterly_rate.toLocaleString()}`
                        ) : (
                          (client as AnnualPageData).fee_type === 'percentage' 
                            ? `${(client as AnnualPageData).annual_rate}%`
                            : `$${(client as AnnualPageData).annual_rate.toLocaleString()}`
                        )}
                      </td>
                      {viewMode === 'quarterly' ? (
                        <>
                          <td className="px-4 py-3 text-right">
                            ${Math.round((client as QuarterlyPageData).client_expected).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            ${Math.round((client as QuarterlyPageData).client_actual).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            ${Math.round((client as QuarterlyPageData).client_variance).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => updatePostedStatus(client.client_id, (client as QuarterlyPageData).is_posted)}
                            >
                              {(client as QuarterlyPageData).is_posted ? (
                                <CheckSquare className="w-5 h-5 text-green-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-right">
                            ${Math.round((client as AnnualPageData).q1_actual).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            ${Math.round((client as AnnualPageData).q2_actual).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            ${Math.round((client as AnnualPageData).q3_actual).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            ${Math.round((client as AnnualPageData).q4_actual).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ${Math.round((client as AnnualPageData).client_annual_total).toLocaleString()}
                          </td>
                        </>
                      )}
                    </tr>

                    {/* Payment Details (Quarterly View Only) */}
                    {viewMode === 'quarterly' && expandedClients.has(client.client_id) && paymentDetails.has(client.client_id) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-2 bg-gray-50">
                          <div className="pl-16 space-y-1 text-sm text-gray-600">
                            {paymentDetails.get(client.client_id)?.map((payment, idx) => {
                              // console.log(`Rendering payment ${idx} for client ${client.client_id}:`, payment);
                              return (
                              <div key={idx}>
                                └─ {formatPaymentLine(payment)}
                              </div>
                              );
                            })}
                            {!!((client as QuarterlyPageData).has_notes) && (client as QuarterlyPageData).quarterly_notes ? (
                              <div className="mt-2">
                                └─ Note: "{(client as QuarterlyPageData).quarterly_notes}"
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* DEPRECATED: Old notes rows removed - now using inline popover */}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Note Popover */}
      {notePopover && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setNotePopover(null)}
          />
          <div
            className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
            style={{ 
              top: notePopover.position.top, 
              left: notePopover.position.left,
              minWidth: '300px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Note</h4>
              <button
                onClick={() => setNotePopover(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <textarea
              value={notePopover.note}
              onChange={(e) => setNotePopover({ ...notePopover, note: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
              rows={3}
              placeholder="Add a note..."
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setNotePopover(null)}
                className="px-3 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={saveNotePopover}
                className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Summary;