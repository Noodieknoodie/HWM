// src/pages/Summary.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronDown, 
  Square, 
  CheckSquare,
  Download,
  FileText,
  ChevronLeft,
  FileSpreadsheet
} from 'lucide-react';
import { dataApiClient } from '@/api/client';
import { Alert } from '@/components/Alert';

// Interfaces for the new page-ready views
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
  applied_period: number;
  applied_period_type: string;
  payment_id: number | null; // NULL for missing payments
  received_date: string | null;
  actual_fee: number;
  expected_fee: number | null;
  total_assets: number | null;
  method: string | null;
  posted_to_hwm: boolean;
  variance_status: string | null;
}

const Summary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // URL parameters with arrears logic
  const now = new Date();
  const defaultYear = (() => {
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentQ = Math.ceil(currentMonth / 3); // 1-4
    // If we're in Q1, we bill for Q4 of previous year
    if (currentQ === 1) {
      return now.getFullYear() - 1;
    }
    return now.getFullYear();
  })();
  const currentYear = parseInt(searchParams.get('year') || defaultYear.toString());
  
  // Arrears logic: default to previous quarter (billing is for the quarter that just ended)
  const defaultQuarter = (() => {
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentQ = Math.ceil(currentMonth / 3); // 1-4
    if (currentQ === 1) {
      // If we're in Q1, we bill for Q4 of previous year
      return 4;
    }
    return currentQ - 1;
  })();
  const currentQuarter = parseInt(searchParams.get('quarter') || defaultQuarter.toString());
  const viewMode = searchParams.get('view') || 'quarterly';
  
  // Data state
  const [quarterlyGroups, setQuarterlyGroups] = useState<ProviderGroup<QuarterlyPageData>[]>([]);
  const [annualGroups, setAnnualGroups] = useState<ProviderGroup<AnnualPageData>[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
  const [paymentDetails, setPaymentDetails] = useState<Map<number, QuarterlySummaryDetail[]>>(new Map());
  const [editingNote, setEditingNote] = useState<{ clientId: number; note: string } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Navigation functions
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

  // Load data using the new page-ready views
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (viewMode === 'quarterly') {
        // Load quarterly data from the new view
        const data = await dataApiClient.getQuarterlyPageData(currentYear, currentQuarter) as QuarterlyPageData[];
        
        // Group by provider (data comes flat, we need to group for display)
        const grouped = data.reduce((acc, row) => {
          let group = acc.find(g => g.provider_name === row.provider_name);
          if (!group) {
            group = {
              provider_name: row.provider_name,
              clients: [],
              isExpanded: true,
              providerData: row // Store first row as provider data
            };
            acc.push(group);
          }
          group.clients.push(row);
          return acc;
        }, [] as ProviderGroup<QuarterlyPageData>[]);
        
        setQuarterlyGroups(grouped);
      } else {
        // Load annual data from the new view
        const data = await dataApiClient.getAnnualPageData(currentYear) as AnnualPageData[];
        
        // Group by provider
        const grouped = data.reduce((acc, row) => {
          let group = acc.find(g => g.provider_name === row.provider_name);
          if (!group) {
            group = {
              provider_name: row.provider_name,
              clients: [],
              isExpanded: true,
              providerData: row // Store first row as provider data
            };
            acc.push(group);
          }
          group.clients.push(row);
          return acc;
        }, [] as ProviderGroup<AnnualPageData>[]);
        
        setAnnualGroups(grouped);
      }
    } catch (err) {
      console.error('Failed to load summary data:', err);
      setError('Failed to load summary data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentQuarter, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showExportMenu]);

  // Toggle provider expansion
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

  // Toggle client expansion
  const toggleClient = async (clientId: number) => {
    const newExpanded = new Set(expandedClients);
    
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
      
      // Load payment details if not already loaded (only for quarterly view)
      if (viewMode === 'quarterly' && !paymentDetails.has(clientId)) {
        try {
          const details = await dataApiClient.getQuarterlySummaryDetail(clientId, currentYear, currentQuarter) as QuarterlySummaryDetail[];
          setPaymentDetails(prev => new Map(prev).set(clientId, details));
        } catch (err) {
          console.error(`Failed to load payment details for client ${clientId}:`, err);
        }
      }
    }
    
    setExpandedClients(newExpanded);
  };

  // Update posted status
  const updatePostedStatus = async (paymentId: number, posted: boolean) => {
    try {
      await dataApiClient.updatePayment(paymentId, { posted_to_hwm: posted });
      await loadData(); // Reload to update counts
    } catch (err) {
      console.error('Failed to update posted status:', err);
    }
  };

  // Save note
  const saveNote = async () => {
    if (!editingNote) return;
    
    try {
      await dataApiClient.updateQuarterlyNote(
        editingNote.clientId, 
        currentYear, 
        currentQuarter, 
        editingNote.note
      );
      
      // Reload data to get updated notes
      await loadData();
      setEditingNote(null);
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'excel') => {
    setShowExportMenu(false);
    
    try {
      const Papa = (await import('papaparse')).default;
      const XLSX = format === 'excel' ? await import('xlsx') : null;
      
      // Build export data
      const exportRows: any[] = [];
      
      // Add title row
      const title = viewMode === 'quarterly' 
        ? `Q${currentQuarter} ${currentYear} Payment Summary`
        : `${currentYear} Annual Payment Summary`;
      
      // Build header row based on view mode
      const headers = viewMode === 'quarterly'
        ? ['Client', 'Frequency', 'Quarterly Rate', 'Expected', 'Actual', 'Variance', 'Status', 'Posted', 'Notes']
        : ['Client', 'Frequency', 'Annual Rate', 'Q1 ' + currentYear, 'Q2 ' + currentYear, 'Q3 ' + currentYear, 'Q4 ' + currentYear, 'Total'];
      
      // Process provider groups
      const groups = viewMode === 'quarterly' ? quarterlyGroups : annualGroups;
      
      groups.forEach(provider => {
        const providerData = provider.providerData;
        if (!providerData) return;
        
        // Provider row
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
          providerRow.Status = qData.provider_posted_display;
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
        
        // Client rows
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
            clientRow.Status = qClient.payment_status_display;
            clientRow.Posted = qClient.fully_posted ? 'Y' : 'N';
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
      
      // Generate and download file
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
        // Add title as first row
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
      console.error('Export failed:', err);
      setError('Export failed. Please make sure required libraries are installed.');
    }
  };

  // Show amber dot for variance >10%
  const getVarianceIndicator = (variancePercent: number | null | undefined) => {
    if (variancePercent !== null && variancePercent !== undefined && Math.abs(variancePercent) > 10) {
      return <span className="text-amber-500 ml-1">•</span>;
    }
    return null;
  };

  // Calculate totals
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
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-600">Loading summary data...</h2>
        </div>
      </div>
    );
  }

  const providerGroups = viewMode === 'quarterly' ? quarterlyGroups : annualGroups;

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" message={error} className="mb-4" />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {viewMode === 'quarterly' ? 'Quarterly' : 'Annual'} Payment Summary
        </h1>
        <div className="h-1 w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-200 rounded-full"></div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center space-x-4">
          {viewMode === 'quarterly' ? (
            <>
              <button
                onClick={() => navigateQuarter('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Previous quarter"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-800">
                Q{currentQuarter} {currentYear}
              </h2>
              <button
                onClick={() => navigateQuarter('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Next quarter"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigateYear('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Previous year"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-800">
                {currentYear} Annual Summary
              </h2>
              <button
                onClick={() => navigateYear('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Next year"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleViewMode}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
          >
            Switch to {viewMode === 'quarterly' ? 'Annual' : 'Quarterly'} View
          </button>
          
          <div className="relative export-menu-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowExportMenu(!showExportMenu);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Export as CSV</span>
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Export as Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Totals Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-blue-100 text-sm font-medium">Expected Total</p>
            <p className="text-2xl font-bold">${totals.expected.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm font-medium">Actual Total</p>
            <p className="text-2xl font-bold">${totals.actual.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm font-medium">Variance</p>
            <p className="text-2xl font-bold">
              ${Math.abs(totals.variance).toLocaleString()}
              {totals.variance < 0 && <span className="text-red-300 text-lg ml-1">↓</span>}
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm font-medium">Collection Rate</p>
            <p className="text-2xl font-bold">{collectionRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Provider Groups */}
      <div className="space-y-4">
        {providerGroups.map(provider => (
          <div key={provider.provider_name} className="bg-white rounded-lg shadow">
            {/* Provider Header */}
            <div
              className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer border-b"
              onClick={() => toggleProvider(provider.provider_name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {provider.isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-800">
                    {provider.provider_name}
                  </h3>
                  <span className="text-sm text-gray-500">
                    ({provider.clients.length} {provider.clients.length === 1 ? 'client' : 'clients'})
                  </span>
                </div>
                
                {viewMode === 'quarterly' && provider.providerData && (
                  <div className="flex items-center space-x-6 text-sm">
                    <div>
                      <span className="text-gray-600">Expected:</span>
                      <span className="ml-2 font-semibold">
                        ${(provider.providerData as QuarterlyPageData).provider_expected_total.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Actual:</span>
                      <span className="ml-2 font-semibold">
                        ${(provider.providerData as QuarterlyPageData).provider_actual_total.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Posted:</span>
                      <span className="ml-2 font-semibold">
                        {(provider.providerData as QuarterlyPageData).provider_posted_display}
                      </span>
                    </div>
                  </div>
                )}
                
                {viewMode === 'annual' && provider.providerData && (
                  <div className="flex items-center space-x-6 text-sm">
                    <div>
                      <span className="text-gray-600">Annual Total:</span>
                      <span className="ml-2 font-semibold">
                        ${(provider.providerData as AnnualPageData).provider_annual_total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Client List */}
            {provider.isExpanded && (
              <div className="divide-y divide-gray-200">
                {provider.clients.map(client => (
                  <div key={client.client_id} className="hover:bg-gray-50 transition-colors">
                    {/* Client Row */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => viewMode === 'quarterly' && toggleClient(client.client_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {viewMode === 'quarterly' && (
                            expandedClients.has(client.client_id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )
                          )}
                          <Link
                            to={`/client/${client.client_id}`}
                            className="font-medium text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {client.display_name}
                          </Link>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {client.payment_schedule === 'monthly' ? 'Monthly' : 'Quarterly'}
                          </span>
                        </div>
                        
                        {viewMode === 'quarterly' ? (
                          <div className="flex items-center space-x-6 text-sm">
                            <div className="text-right">
                              <p className="text-gray-600">Rate</p>
                              <p className="font-semibold">
                                {(client as QuarterlyPageData).fee_type === 'percentage' 
                                  ? `${(client as QuarterlyPageData).quarterly_rate}%`
                                  : `$${(client as QuarterlyPageData).quarterly_rate.toLocaleString()}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-600">Expected</p>
                              <p className="font-semibold">
                                ${(client as QuarterlyPageData).client_expected.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-600">Actual</p>
                              <p className="font-semibold">
                                ${(client as QuarterlyPageData).client_actual.toLocaleString()}
                                {getVarianceIndicator((client as QuarterlyPageData).client_variance_percent)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-600">Status</p>
                              <p className="font-semibold">
                                {(client as QuarterlyPageData).payment_status_display}
                              </p>
                            </div>
                            <div className="flex items-center">
                              {(client as QuarterlyPageData).fully_posted ? (
                                <CheckSquare className="h-5 w-5 text-green-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-6 text-sm">
                            <div className="text-right">
                              <p className="text-gray-600">Rate</p>
                              <p className="font-semibold">
                                {(client as AnnualPageData).fee_type === 'percentage' 
                                  ? `${(client as AnnualPageData).annual_rate}%`
                                  : `$${(client as AnnualPageData).annual_rate.toLocaleString()}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-600">Q1</p>
                              <p className="font-semibold">
                                ${(client as AnnualPageData).q1_actual.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-600">Q2</p>
                              <p className="font-semibold">
                                ${(client as AnnualPageData).q2_actual.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-600">Q3</p>
                              <p className="font-semibold">
                                ${(client as AnnualPageData).q3_actual.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-600">Q4</p>
                              <p className="font-semibold">
                                ${(client as AnnualPageData).q4_actual.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-600">Total</p>
                              <p className="font-semibold">
                                ${(client as AnnualPageData).client_annual_total.toLocaleString()}
                                {getVarianceIndicator((client as AnnualPageData).client_annual_variance_percent)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Notes section for quarterly view */}
                      {viewMode === 'quarterly' && (client as QuarterlyPageData).has_notes && (
                        <div className="mt-3 ml-7">
                          {editingNote?.clientId === client.client_id ? (
                            <div className="flex items-start space-x-2">
                              <textarea
                                value={editingNote.note}
                                onChange={(e) => setEditingNote({ ...editingNote, note: e.target.value })}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                rows={2}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveNote();
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNote(null);
                                }}
                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div
                              className="text-sm text-gray-600 italic cursor-pointer hover:text-gray-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNote({
                                  clientId: client.client_id,
                                  note: (client as QuarterlyPageData).quarterly_notes || ''
                                });
                              }}
                            >
                              {(client as QuarterlyPageData).quarterly_notes || 'Click to add note...'}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Add note button for quarterly view without notes */}
                      {viewMode === 'quarterly' && !(client as QuarterlyPageData).has_notes && (
                        <div className="mt-3 ml-7">
                          {editingNote?.clientId === client.client_id ? (
                            <div className="flex items-start space-x-2">
                              <textarea
                                value={editingNote.note}
                                onChange={(e) => setEditingNote({ ...editingNote, note: e.target.value })}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                rows={2}
                                placeholder="Add a note..."
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveNote();
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNote(null);
                                }}
                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="text-sm text-gray-500 hover:text-gray-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNote({ clientId: client.client_id, note: '' });
                              }}
                            >
                              <FileText className="h-4 w-4 inline mr-1" />
                              Add note
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Payment Details (Quarterly View Only) */}
                    {viewMode === 'quarterly' && expandedClients.has(client.client_id) && (
                      <div className="bg-gray-50 px-4 pb-4">
                        {paymentDetails.get(client.client_id)?.map((payment, idx) => (
                          <div key={idx} className="ml-7 mt-2 p-3 bg-white rounded border border-gray-200">
                            <div className="flex justify-between items-center text-sm">
                              <div className="flex items-center space-x-4">
                                <span className="text-gray-600">
                                  {payment.payment_id ? (
                                    <>
                                      {new Date(payment.received_date!).toLocaleDateString()} - 
                                      {payment.method} - ${payment.actual_fee.toLocaleString()}
                                    </>
                                  ) : (
                                    <span className="text-red-600">Missing Payment</span>
                                  )}
                                </span>
                              </div>
                              {payment.payment_id && (
                                <button
                                  onClick={() => updatePostedStatus(payment.payment_id!, !payment.posted_to_hwm)}
                                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-800"
                                >
                                  {payment.posted_to_hwm ? (
                                    <CheckSquare className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                  <span>Posted</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Summary;