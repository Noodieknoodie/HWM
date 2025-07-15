// src/pages/Summary.tsx
import React, { useState, useEffect, useCallback } from ‘react’;
import { Link, useSearchParams } from ‘react-router-dom’;
import {
ChevronRight,
ChevronDown,
Check,
AlertTriangle,
AlertCircle,
Square,
CheckSquare,
Download,
FileText,
ChevronLeft,
FileSpreadsheet,
FileDown
} from ‘lucide-react’;
import { dataApiClient } from ‘@/api/client’;
import Alert from ‘@/components/Alert’;

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
provider_posted_display: string; // e.g., “2/3”

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
payment_status_display: string; // e.g., “2/3”
fully_posted: number;
has_notes: number;
quarterly_notes: string | null;
posted_count: number;
is_posted: boolean; // Simple boolean marker from the companion table

// Period identifiers
applied_year: number;
quarter: number;

row_type: ‘client’; // Always ‘client’ for now
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

row_type: ‘client’; // Always ‘client’ for now
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
// If we’re in Q1, we bill for Q4 of previous year
if (currentQ === 1) {
return now.getFullYear() - 1;
}
return now.getFullYear();
})();
const currentYear = parseInt(searchParams.get(‘year’) || defaultYear.toString());

// Arrears logic: default to previous quarter (billing is for the quarter that just ended)
const defaultQuarter = (() => {
const currentMonth = now.getMonth() + 1; // 1-12
const currentQ = Math.ceil(currentMonth / 3); // 1-4
if (currentQ === 1) {
// If we’re in Q1, we bill for Q4 of previous year
return 4;
}
return currentQ - 1;
})();
const currentQuarter = parseInt(searchParams.get(‘quarter’) || defaultQuarter.toString());
const viewMode = searchParams.get(‘view’) || ‘quarterly’;

// Data state
const [quarterlyGroups, setQuarterlyGroups] = useState<ProviderGroup<QuarterlyPageData>[]>([]);
const [annualGroups, setAnnualGroups] = useState<ProviderGroup<AnnualPageData>[]>([]);
const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
const [paymentDetails, setPaymentDetails] = useState<Map<number, QuarterlySummaryDetail[]>>(new Map());
const [editingNote, setEditingNote] = useState<{ clientId: number; note: string } | null>(null);
const [showExportMenu, setShowExportMenu] = useState(false);

// Navigation functions
const navigateQuarter = (direction: ‘prev’ | ‘next’) => {
let newQuarter = currentQuarter;
let newYear = currentYear;

```
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
```

};

const navigateYear = (direction: ‘prev’ | ‘next’) => {
const newYear = direction === ‘prev’ ? currentYear - 1 : currentYear + 1;
setSearchParams({ year: newYear.toString(), view: viewMode });
};

const toggleViewMode = () => {
const newMode = viewMode === ‘quarterly’ ? ‘annual’ : ‘quarterly’;
if (newMode === ‘quarterly’) {
setSearchParams({ year: currentYear.toString(), quarter: currentQuarter.toString(), view: newMode });
} else {
setSearchParams({ year: currentYear.toString(), view: newMode });
}
};

// Load data using the new page-ready views
const loadData = useCallback(async () => {
setLoading(true);
setError(null);

```
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
```

}, [currentYear, currentQuarter, viewMode]);

useEffect(() => {
loadData();
}, [loadData]);

// Close export menu when clicking outside
useEffect(() => {
const handleClickOutside = (event: MouseEvent) => {
const target = event.target as HTMLElement;
if (!target.closest(’.export-menu-container’)) {
setShowExportMenu(false);
}
};

```
if (showExportMenu) {
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}
```

}, [showExportMenu]);

// Toggle provider expansion
const toggleProvider = (providerName: string) => {
if (viewMode === ‘quarterly’) {
setQuarterlyGroups(prev => prev.map(provider =>
provider.provider_name === providerName
? { …provider, isExpanded: !provider.isExpanded }
: provider
));
} else {
setAnnualGroups(prev => prev.map(provider =>
provider.provider_name === providerName
? { …provider, isExpanded: !provider.isExpanded }
: provider
));
}
};

// Toggle client expansion
const toggleClient = async (clientId: number) => {
const newExpanded = new Set(expandedClients);

```
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
```

};

// Format payment detail line
const formatPaymentLine = (payment: QuarterlySummaryDetail) => {
const months = [‘Jan’, ‘Feb’, ‘Mar’, ‘Apr’, ‘May’, ‘Jun’, ‘Jul’, ‘Aug’, ‘Sep’, ‘Oct’, ‘Nov’, ‘Dec’];

```
const period = payment.applied_period_type === 'monthly' 
  ? months[payment.applied_period - 1]
  : `Q${payment.applied_period}`;
  
if (!payment.payment_id) {
  return `${period}: Missing Payment`;
}
  
const amount = Math.round(payment.actual_fee);
const date = new Date(payment.received_date!).toLocaleDateString('en-US', 
  { month: '2-digit', day: '2-digit' }
);

return `${period}: $${amount.toLocaleString()} paid ${date} via ${payment.method}`;
```

};

// Update posted status - simple toggle for internal marking
const updatePostedStatus = async (clientId: number, currentStatus: boolean) => {
try {
await dataApiClient.updateClientQuarterMarker(clientId, currentYear, currentQuarter, !currentStatus);
await loadData(); // Reload to update the display
} catch (err) {
console.error(‘Failed to update posted status:’, err);
}
};

// Save note
const saveNote = async () => {
if (!editingNote) return;

```
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
```

};

// Handle export
const handleExport = async (format: ‘csv’ | ‘excel’) => {
setShowExportMenu(false);

```
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
```

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
if (viewMode === ‘quarterly’) {
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
<div className="p-6">
<div className="text-center py-12">
<h2 className="text-xl font-medium text-gray-600">Loading summary data…</h2>
</div>
</div>
);
}

const providerGroups = viewMode === ‘quarterly’ ? quarterlyGroups : annualGroups;

return (
<div className="p-6 max-w-7xl mx-auto">
{error && (
<Alert type="error" className="mb-4">
{error}
</Alert>
)}

```
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
              <th className="px-4 py-3 text-center" style={{ width: '80px' }}>Status</th>
              <th className="px-4 py-3 text-center" style={{ width: '80px' }}>Posted</th>
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
                  {provider.provider_name.toUpperCase()} ({provider.clients.length} clients)
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
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-center">
                    {(provider.providerData as QuarterlyPageData).provider_posted_display} ☑
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
                      <Link
                        to={`/client/${client.client_id}`}
                        className="text-blue-600 hover:text-blue-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {client.display_name}
                      </Link>
                      {viewMode === 'quarterly' && (client as QuarterlyPageData).has_notes && (
                        <button
                          onClick={() => setEditingNote({ 
                            clientId: client.client_id, 
                            note: (client as QuarterlyPageData).quarterly_notes || '' 
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
                        {getVarianceIndicator((client as QuarterlyPageData).client_variance_percent)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        ${Math.round((client as QuarterlyPageData).client_variance).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {(client as QuarterlyPageData).payment_status_display}
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
                        {(client as AnnualPageData).q1_payments > 0 && (
                          <Check className="inline w-4 h-4 text-green-600 ml-1" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        ${Math.round((client as AnnualPageData).q2_actual).toLocaleString()}
                        {(client as AnnualPageData).q2_payments > 0 && (
                          <Check className="inline w-4 h-4 text-green-600 ml-1" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        ${Math.round((client as AnnualPageData).q3_actual).toLocaleString()}
                        {(client as AnnualPageData).q3_payments > 0 && (
                          <Check className="inline w-4 h-4 text-green-600 ml-1" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        ${Math.round((client as AnnualPageData).q4_actual).toLocaleString()}
                        {(client as AnnualPageData).q4_payments > 0 && (
                          <Check className="inline w-4 h-4 text-green-600 ml-1" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round((client as AnnualPageData).client_annual_total).toLocaleString()}
                        {getVarianceIndicator((client as AnnualPageData).client_annual_variance_percent)}
                      </td>
                    </>
                  )}
                </tr>

                {/* Payment Details (Quarterly View Only) */}
                {viewMode === 'quarterly' && expandedClients.has(client.client_id) && paymentDetails.has(client.client_id) && (
                  <tr>
                    <td colSpan={8} className="px-4 py-2 bg-gray-50">
                      <div className="pl-16 space-y-1 text-sm text-gray-600">
                        {paymentDetails.get(client.client_id)?.map((payment, idx) => (
                          <div key={idx}>
                            └─ {formatPaymentLine(payment)}
                          </div>
                        ))}
                        {(client as QuarterlyPageData).has_notes && (client as QuarterlyPageData).quarterly_notes && (
                          <div className="mt-2">
                            └─ Note: "{(client as QuarterlyPageData).quarterly_notes}"
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}

                {/* Notes section for quarterly view - inline editing like v1 */}
                {viewMode === 'quarterly' && (client as QuarterlyPageData).has_notes && !expandedClients.has(client.client_id) && (
                  <tr>
                    <td colSpan={8} className="px-4 py-2">
                      <div className="ml-7">
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
                    </td>
                  </tr>
                )}
                
                {/* Add note button for quarterly view without notes */}
                {viewMode === 'quarterly' && !(client as QuarterlyPageData).has_notes && !expandedClients.has(client.client_id) && (
                  <tr>
                    <td colSpan={8} className="px-4 py-2">
                      <div className="ml-7">
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
    </div>
  );
};

export default Summary;
