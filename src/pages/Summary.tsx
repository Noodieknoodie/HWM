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
  FileSpreadsheet,
  FileDown
} from 'lucide-react';
import { dataApiClient } from '@/api/client';
import { Alert } from '@/components/Alert';

interface QuarterlySummaryData {
  provider_name: string;
  client_id: number;
  display_name: string;
  payment_schedule: string;
  fee_type: string;
  percent_rate: number | null;
  flat_rate: number | null;
  applied_year: number;
  quarter: number;
  payment_count: number;
  actual_total: number;
  expected_total: number | null;
  posted_count: number;
  last_aum: number | null;
  expected_payment_count: number;
  variance: number | null;
  variance_percent: number | null;
  variance_status: string | null;
  fully_posted: number;
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

interface ProviderGroup {
  provider_name: string;
  clients: QuarterlySummaryData[];
  total_expected: number;
  total_actual: number;
  total_variance: number;
  posted_clients: number;
  total_clients: number;
  isExpanded: boolean;
}


// Removed DashboardClient interface - using data from quarterly summary instead


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
  const [providerGroups, setProviderGroups] = useState<ProviderGroup[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
  const [paymentDetails, setPaymentDetails] = useState<Map<number, QuarterlySummaryDetail[]>>(new Map());
  const [clientNotes, setClientNotes] = useState<Map<string, string>>(new Map());
  const [editingNote, setEditingNote] = useState<{ clientId: number; note: string } | null>(null);
  // Removed dashboardData state - rates are already in quarterly summary data
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [rawQuarterlyData, setRawQuarterlyData] = useState<QuarterlySummaryData[]>([]);


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

  // Removed loadDashboardData - rates are already in quarterly summary data

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data: QuarterlySummaryData[] = [];
      
      if (viewMode === 'quarterly') {
        data = await dataApiClient.getQuarterlySummaryByProvider(currentYear, currentQuarter) as QuarterlySummaryData[];
      } else {
        // For annual view, get all quarters
        const allQuarters = await Promise.all([
          dataApiClient.getQuarterlySummaryByProvider(currentYear, 1),
          dataApiClient.getQuarterlySummaryByProvider(currentYear, 2),
          dataApiClient.getQuarterlySummaryByProvider(currentYear, 3),
          dataApiClient.getQuarterlySummaryByProvider(currentYear, 4)
        ]);
        data = (allQuarters as QuarterlySummaryData[][]).flat();
        
        // Remove duplicate entries for clients with no payments (they appear in each quarter query)
        const seenNoPaymentClients = new Set<number>();
        data = data.filter(item => {
          if (item.applied_year === null && item.quarter === null) {
            if (seenNoPaymentClients.has(item.client_id)) {
              return false; // Skip duplicate
            }
            seenNoPaymentClients.add(item.client_id);
          }
          return true;
        });
      }
      
      // Process data to handle clients without payments (they have null year/quarter)
      data = data.map(item => {
        if (item.applied_year === null && item.quarter === null) {
          // This is a client with no payments - set the year/quarter to current
          return {
            ...item,
            applied_year: currentYear,
            quarter: viewMode === 'quarterly' ? currentQuarter : 1,
            payment_count: 0,
            actual_total: 0,
            posted_count: 0,
            fully_posted: 0,
            variance_status: 'no_payment'
          };
        }
        return item;
      });
      
      // Store raw data for export
      setRawQuarterlyData(data);

      // Removed dashboard data loading - rates are already in quarterly summary data

      // Group by provider
      const groupedData = data.reduce((acc, item) => {
        const provider = acc.find(p => p.provider_name === item.provider_name);
        if (provider) {
          const existingClient = provider.clients.find(c => c.client_id === item.client_id);
          if (existingClient && viewMode === 'annual') {
            // For annual view, we need to aggregate quarterly data
            existingClient.actual_total += item.actual_total;
            existingClient.payment_count += item.payment_count;
            existingClient.expected_payment_count += item.expected_payment_count;
            existingClient.posted_count += item.posted_count;
            existingClient.fully_posted = existingClient.payment_count === existingClient.posted_count ? 1 : 0;
          } else if (!existingClient) {
            provider.clients.push(item);
          }
        } else {
          acc.push({
            provider_name: item.provider_name,
            clients: [item],
            total_expected: 0,
            total_actual: 0,
            total_variance: 0,
            posted_clients: 0,
            total_clients: 0,
            isExpanded: true
          });
        }
        return acc;
      }, [] as ProviderGroup[]);

      // For annual view, calculate expected totals
      if (viewMode === 'annual') {
        groupedData.forEach(provider => {
          provider.clients.forEach(client => {
            // Calculate annual expected from rate data in the summary
            if (client.fee_type === 'flat' && client.flat_rate) {
              client.expected_total = client.flat_rate * 12;
            } else if (client.fee_type === 'percentage' && client.percent_rate) {
              // For percentage, we need to sum quarterly expected totals
              client.expected_total = data
                .filter(d => d.client_id === client.client_id)
                .reduce((sum, d) => sum + (d.expected_total || 0), 0);
            }
            client.variance = client.actual_total - (client.expected_total || 0);
            client.variance_percent = client.expected_total ? 
              ((client.actual_total - client.expected_total) / client.expected_total * 100) : null;
          });
        });
      }

      // Calculate provider totals
      groupedData.forEach(provider => {
        provider.total_actual = provider.clients.reduce((sum, client) => sum + client.actual_total, 0);
        provider.total_expected = provider.clients.reduce((sum, client) => sum + (client.expected_total || 0), 0);
        provider.total_variance = provider.total_actual - provider.total_expected;
        provider.posted_clients = provider.clients.filter(c => c.fully_posted).length;
        provider.total_clients = provider.clients.length;
      });

      // Sort providers by name
      groupedData.sort((a, b) => a.provider_name.localeCompare(b.provider_name));
      
      setProviderGroups(groupedData);

      // Load notes for quarterly view - FIXED N+1 QUERY PROBLEM
      if (viewMode === 'quarterly') {
        const notesMap = new Map<string, string>();
        
        try {
          // Single batch call instead of N individual calls
          const allNotes = await dataApiClient.getQuarterlyNotesBatch(currentYear, currentQuarter) as Array<{
            client_id: number;
            notes: string | null;
          }>;
          
          // Process all notes at once
          allNotes.forEach(note => {
            if (note.notes) {
              notesMap.set(`${note.client_id}-${currentYear}-${currentQuarter}`, note.notes);
            }
          });
        } catch (err) {
          console.error('Failed to load quarterly notes batch:', err);
        }
        
        setClientNotes(notesMap);
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
    setProviderGroups(prev => prev.map(provider => 
      provider.provider_name === providerName 
        ? { ...provider, isExpanded: !provider.isExpanded }
        : provider
    ));
  };

  // Toggle client expansion
  const toggleClient = async (clientId: number) => {
    const newExpanded = new Set(expandedClients);
    
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
      
      // Load payment details if not already loaded
      if (!paymentDetails.has(clientId)) {
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
      
      setClientNotes(prev => new Map(prev).set(
        `${editingNote.clientId}-${currentYear}-${currentQuarter}`,
        editingNote.note
      ));
      
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
      providerGroups.forEach(provider => {
        // Provider row
        const providerRow: any = {
          Client: provider.provider_name.toUpperCase(),
          Frequency: '',
        };
        
        if (viewMode === 'quarterly') {
          providerRow['Quarterly Rate'] = '';
          providerRow.Expected = provider.total_expected.toFixed(2);
          providerRow.Actual = provider.total_actual.toFixed(2);
          providerRow.Variance = provider.total_variance.toFixed(2);
          providerRow.Status = `${provider.posted_clients}/${provider.total_clients}`;
          providerRow.Posted = provider.posted_clients === provider.total_clients ? 'Y' : 'N';
          providerRow.Notes = '';
        } else {
          providerRow['Annual Rate'] = '';
          // For annual view, calculate quarterly totals from the original data
          let q1Total = 0, q2Total = 0, q3Total = 0, q4Total = 0;
          
          // Get all quarterly data for this provider's clients
          provider.clients.forEach(client => {
            // We need to look back at the original data to get quarterly breakdown
            const clientQuarterlyData = rawQuarterlyData.filter(d => 
              d.client_id === client.client_id && 
              d.provider_name === provider.provider_name
            );
            
            clientQuarterlyData.forEach(qData => {
              switch(qData.quarter) {
                case 1: q1Total += qData.actual_total; break;
                case 2: q2Total += qData.actual_total; break;
                case 3: q3Total += qData.actual_total; break;
                case 4: q4Total += qData.actual_total; break;
              }
            });
          });
          
          providerRow['Q1 ' + currentYear] = q1Total.toFixed(2);
          providerRow['Q2 ' + currentYear] = q2Total.toFixed(2);
          providerRow['Q3 ' + currentYear] = q3Total.toFixed(2);
          providerRow['Q4 ' + currentYear] = q4Total.toFixed(2);
          providerRow.Total = provider.total_actual.toFixed(2);
        }
        
        exportRows.push(providerRow);
        
        // Client rows
        provider.clients.forEach(client => {
          const clientRow: any = {
            Client: `  ${client.display_name}`,
            Frequency: client.payment_schedule === 'monthly' ? 'Monthly' : 'Quarterly',
          };
          
          // Get rate display
          const rateDisplay = formatRate(client);
          
          if (viewMode === 'quarterly') {
            clientRow['Quarterly Rate'] = rateDisplay;
            clientRow.Expected = client.expected_total?.toFixed(2) || '';
            clientRow.Actual = client.actual_total.toFixed(2);
            clientRow.Variance = client.variance?.toFixed(2) || '';
            clientRow.Status = `${client.payment_count}/${client.expected_payment_count}`;
            clientRow.Posted = client.fully_posted ? 'Y' : 'N';
            clientRow.Notes = clientNotes.get(`${client.client_id}-${currentYear}-${currentQuarter}`) || '';
          } else {
            clientRow['Annual Rate'] = rateDisplay;
            // For annual view, get quarterly breakdown from raw data
            const clientQuarterlyData = rawQuarterlyData.filter(d => 
              d.client_id === client.client_id && 
              d.provider_name === provider.provider_name
            );
            
            let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
            clientQuarterlyData.forEach(qData => {
              switch(qData.quarter) {
                case 1: q1 = qData.actual_total; break;
                case 2: q2 = qData.actual_total; break;
                case 3: q3 = qData.actual_total; break;
                case 4: q4 = qData.actual_total; break;
              }
            });
            
            clientRow['Q1 ' + currentYear] = q1.toFixed(2);
            clientRow['Q2 ' + currentYear] = q2.toFixed(2);
            clientRow['Q3 ' + currentYear] = q3.toFixed(2);
            clientRow['Q4 ' + currentYear] = q4.toFixed(2);
            clientRow.Total = client.actual_total.toFixed(2);
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

  // Format rate display
  const formatRate = (client: QuarterlySummaryData) => {
    if (client.fee_type === 'percentage' && client.percent_rate) {
      // Convert decimal to percentage and multiply by period
      const rate = viewMode === 'quarterly' 
        ? client.percent_rate * 100 * 3  // 3 months for quarterly
        : client.percent_rate * 100 * 12; // 12 months for annual
      return `${rate.toFixed(4)}%`;
    } else if (client.fee_type === 'flat' && client.flat_rate) {
      const rate = viewMode === 'quarterly'
        ? client.flat_rate * 3  // 3 months for quarterly
        : client.flat_rate * 12; // 12 months for annual
      return `$${rate.toLocaleString()}`;
    }
    return '';
  };

  // Show amber dot for variance >10%
  const getVarianceIndicator = (variancePercent: number | null | undefined) => {
    if (variancePercent !== null && variancePercent !== undefined && Math.abs(variancePercent) > 10) {
      return <span className="text-amber-500 ml-1">•</span>;
    }
    return null;
  };

  // Calculate totals
  const totals = providerGroups.reduce((acc, provider) => ({
    expected: acc.expected + provider.total_expected,
    actual: acc.actual + provider.total_actual,
    variance: acc.variance + provider.total_variance
  }), { expected: 0, actual: 0, variance: 0 });

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
                  <th className="px-4 py-3 text-center" style={{ width: '80px' }}>Status</th>
                  <th className="px-4 py-3 text-center" style={{ width: '80px' }}>Posted</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 text-right" style={{ width: '100px' }}>Q1 2025</th>
                  <th className="px-4 py-3 text-right" style={{ width: '100px' }}>Q2 2025</th>
                  <th className="px-4 py-3 text-right" style={{ width: '100px' }}>Q3 2025</th>
                  <th className="px-4 py-3 text-right" style={{ width: '100px' }}>Q4 2025</th>
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
                      {provider.provider_name.toUpperCase()} ({provider.total_clients} clients)
                    </button>
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  {viewMode === 'quarterly' ? (
                    <>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round(provider.total_expected).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round(provider.total_actual).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round(provider.total_variance).toLocaleString()}
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-center">
                        {provider.posted_clients}/{provider.total_clients} ☑
                      </td>
                    </>
                  ) : (() => {
                    // Calculate quarterly totals for provider from raw data
                    const providerQuarterlyTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
                    
                    provider.clients.forEach(client => {
                      const clientQuarterlyData = rawQuarterlyData.filter(d => 
                        d.client_id === client.client_id && 
                        d.provider_name === provider.provider_name
                      );
                      
                      clientQuarterlyData.forEach(qData => {
                        if (qData.quarter >= 1 && qData.quarter <= 4) {
                          providerQuarterlyTotals[qData.quarter] += qData.actual_total;
                        }
                      });
                    });
                    
                    return (
                      <>
                        <td className="px-4 py-3 text-right font-medium">
                          ${Math.round(providerQuarterlyTotals[1]).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ${Math.round(providerQuarterlyTotals[2]).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ${Math.round(providerQuarterlyTotals[3]).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ${Math.round(providerQuarterlyTotals[4]).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ${Math.round(provider.total_actual).toLocaleString()}
                        </td>
                      </>
                    );
                  })()}
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
                          <Link
                            to={`/Payments?client=${client.client_id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {client.display_name}
                          </Link>
                          {viewMode === 'quarterly' && clientNotes.has(`${client.client_id}-${currentYear}-${currentQuarter}`) && (
                            <button
                              onClick={() => setEditingNote({ 
                                clientId: client.client_id, 
                                note: clientNotes.get(`${client.client_id}-${currentYear}-${currentQuarter}`) || '' 
                              })}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <FileText className="w-4 h-4 text-gray-600" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {client.payment_schedule === 'monthly' ? 'Monthly' : 'Quarterly'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatRate(client)}
                      </td>
                      {viewMode === 'quarterly' ? (
                        <>
                          <td className="px-4 py-3 text-right">
                            {client.expected_total ? 
                              `$${Math.round(client.expected_total).toLocaleString()}` : 
                              'Unknown'
                            }
                          </td>
                          <td className="px-4 py-3 text-right">
                            ${Math.round(client.actual_total).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-right text-gray-900">
                                {client.variance !== null ? 
                                  `$${Math.round(client.variance).toLocaleString()}` : 
                                  '--'}
                              </span>
                              {getVarianceIndicator(client.variance_percent)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {client.payment_count}/{client.expected_payment_count}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                const details = paymentDetails.get(client.client_id);
                                if (details && details.length > 0) {
                                  // Find a payment with actual payment_id (not missing)
                                  const actualPayment = details.find(d => d.payment_id !== null);
                                  if (actualPayment && actualPayment.payment_id !== null) {
                                    updatePostedStatus(actualPayment.payment_id, !client.fully_posted);
                                  }
                                }
                              }}
                            >
                              {client.fully_posted ? (
                                <CheckSquare className="w-5 h-5 text-green-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </td>
                        </>
                      ) : (() => {
                        // For annual view, get quarterly breakdown from raw data
                        const clientQuarterlyData = rawQuarterlyData.filter(d => 
                          d.client_id === client.client_id && 
                          d.provider_name === provider.provider_name
                        );
                        
                        const quarterlyTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
                        const quarterlyPayments: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
                        
                        clientQuarterlyData.forEach(qData => {
                          if (qData.quarter >= 1 && qData.quarter <= 4) {
                            quarterlyTotals[qData.quarter] = qData.actual_total;
                            quarterlyPayments[qData.quarter] = qData.payment_count;
                          }
                        });
                        
                        return (
                          <>
                            <td className="px-4 py-3">
                              <span className={`text-right ${quarterlyPayments[1] > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                ${Math.round(quarterlyTotals[1]).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-right ${quarterlyPayments[2] > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                ${Math.round(quarterlyTotals[2]).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-right ${quarterlyPayments[3] > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                ${Math.round(quarterlyTotals[3]).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-right ${quarterlyPayments[4] > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                ${Math.round(quarterlyTotals[4]).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              ${Math.round(client.actual_total).toLocaleString()}
                            </td>
                          </>
                        );
                      })()}
                    </tr>

                    {/* Payment Details (Quarterly View Only) */}
                    {viewMode === 'quarterly' && expandedClients.has(client.client_id) && paymentDetails.has(client.client_id) && (
                      <tr>
                        <td colSpan={8} className="px-4 py-2 bg-gray-50">
                          <div className="pl-16 space-y-1 text-sm text-gray-600">
                            {paymentDetails.get(client.client_id)?.map((payment, idx) => {
                              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              const period = payment.applied_period_type === 'monthly' 
                                ? months[payment.applied_period - 1]
                                : `Q${payment.applied_period}`;
                              
                              return (
                                <div key={idx}>
                                  └─ {period}: {payment.payment_id === null ? (
                                    <span className="text-gray-400">
                                      ${Math.round(payment.expected_fee || 0).toLocaleString()}
                                    </span>
                                  ) : (
                                    <span>
                                      ${Math.round(payment.actual_fee).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {clientNotes.has(`${client.client_id}-${currentYear}-${currentQuarter}`) && (
                              <div className="mt-2">
                                └─ Note: "{clientNotes.get(`${client.client_id}-${currentYear}-${currentQuarter}`)}"
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Note Edit Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Edit Note</h3>
            <textarea
              className="w-full h-32 p-3 border border-gray-300 rounded-md"
              value={editingNote.note}
              onChange={(e) => setEditingNote({ ...editingNote, note: e.target.value })}
              placeholder="Enter note..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingNote(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Summary;