// src/pages/Summary.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  ChevronLeft
} from 'lucide-react';
import { dataApiClient } from '@/api/client';
import Alert from '@/components/Alert';

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
  applied_year: number;
  applied_period: number;
  applied_period_type: string;
  quarter: number;
  payment_id: number;
  received_date: string;
  actual_fee: number;
  expected_fee: number | null;
  total_assets: number | null;
  method: string;
  posted_to_hwm: boolean;
  calculated_expected_fee: number | null;
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

interface ClientNote {
  client_id: number;
  year: number;
  quarter: number;
  notes: string;
}

interface DashboardClient {
  client_id: number;
  display_name: string;
  payment_schedule: string;
  fee_type: string;
  monthly_rate: number | null;
  quarterly_rate: number | null;
  annual_rate: number | null;
}

const Summary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // URL parameters
  const currentYear = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const currentQuarter = parseInt(searchParams.get('quarter') || Math.ceil((new Date().getMonth() + 1) / 3).toString());
  const viewMode = searchParams.get('view') || 'quarterly';
  
  // Data state
  const [providerGroups, setProviderGroups] = useState<ProviderGroup[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
  const [paymentDetails, setPaymentDetails] = useState<Map<number, QuarterlySummaryDetail[]>>(new Map());
  const [clientNotes, setClientNotes] = useState<Map<string, string>>(new Map());
  const [editingNote, setEditingNote] = useState<{ clientId: number; note: string } | null>(null);
  const [dashboardData, setDashboardData] = useState<Map<number, DashboardClient>>(new Map());

  // Calculate current billable period (billing in arrears)
  const getBillablePeriod = () => {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    
    // For quarterly view
    if (viewMode === 'quarterly') {
      const currentQ = Math.ceil(month / 3);
      if (currentQ === 1) {
        return { year: today.getFullYear() - 1, quarter: 4 };
      }
      return { year: today.getFullYear(), quarter: currentQ - 1 };
    }
    
    // For annual view
    if (month <= 3) { // Q1 - show previous year
      return { year: today.getFullYear() - 1 };
    }
    return { year: today.getFullYear() };
  };

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

  // Load dashboard data for rate information
  const loadDashboardData = async (clientIds: number[]) => {
    const dashboardMap = new Map<number, DashboardClient>();
    
    for (const clientId of clientIds) {
      try {
        const data = await dataApiClient.getDashboardData(clientId);
        if (data) {
          dashboardMap.set(clientId, {
            client_id: data.client_id,
            display_name: data.display_name,
            payment_schedule: data.payment_schedule,
            fee_type: data.fee_type,
            monthly_rate: data.monthly_rate,
            quarterly_rate: data.quarterly_rate,
            annual_rate: data.annual_rate
          });
        }
      } catch (err) {
        console.error(`Failed to load dashboard data for client ${clientId}:`, err);
      }
    }
    
    setDashboardData(dashboardMap);
  };

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data: QuarterlySummaryData[] = [];
      
      if (viewMode === 'quarterly') {
        data = await dataApiClient.getQuarterlySummaryByProvider(currentYear, currentQuarter);
      } else {
        // For annual view, get all quarters
        const allQuarters = await Promise.all([
          dataApiClient.getQuarterlySummaryByProvider(currentYear, 1),
          dataApiClient.getQuarterlySummaryByProvider(currentYear, 2),
          dataApiClient.getQuarterlySummaryByProvider(currentYear, 3),
          dataApiClient.getQuarterlySummaryByProvider(currentYear, 4)
        ]);
        data = allQuarters.flat();
      }

      // Get unique client IDs and load dashboard data
      const clientIds = [...new Set(data.map(d => d.client_id))];
      await loadDashboardData(clientIds);

      // Group by provider
      const groupedData = data.reduce((acc, item) => {
        const provider = acc.find(p => p.provider_name === item.provider_name);
        if (provider) {
          const existingClient = provider.clients.find(c => c.client_id === item.client_id);
          if (existingClient && viewMode === 'annual') {
            // For annual view, we need to aggregate quarterly data
            existingClient.actual_total += item.actual_total;
            existingClient.expected_total = (existingClient.expected_total || 0) + (item.expected_total || 0);
            existingClient.variance = existingClient.actual_total - (existingClient.expected_total || 0);
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

      // Load notes for quarterly view
      if (viewMode === 'quarterly') {
        const notesMap = new Map<string, string>();
        
        for (const clientId of clientIds) {
          try {
            const notes = await dataApiClient.getQuarterlyNote(clientId, currentYear, currentQuarter);
            if (notes && notes.length > 0 && notes[0].notes) {
              notesMap.set(`${clientId}-${currentYear}-${currentQuarter}`, notes[0].notes);
            }
          } catch (err) {
            console.error(`Failed to load notes for client ${clientId}:`, err);
          }
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
          const details = await dataApiClient.getQuarterlySummaryDetail(clientId, currentYear, currentQuarter);
          setPaymentDetails(prev => new Map(prev).set(clientId, details));
        } catch (err) {
          console.error(`Failed to load payment details for client ${clientId}:`, err);
        }
      }
    }
    
    setExpandedClients(newExpanded);
  };

  // Format payment detail line
  const formatPaymentLine = (payment: QuarterlySummaryDetail) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const period = payment.applied_period_type === 'monthly' 
      ? months[payment.applied_period - 1]
      : `Q${payment.applied_period}`;
      
    const amount = Math.round(payment.actual_fee);
    const date = new Date(payment.received_date).toLocaleDateString('en-US', 
      { month: '2-digit', day: '2-digit' }
    );
    
    return `${period}: $${amount.toLocaleString()} paid ${date} via ${payment.method}`;
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

  // Format rate display
  const formatRate = (client: QuarterlySummaryData) => {
    const dashboardClient = dashboardData.get(client.client_id);
    if (!dashboardClient) return '';
    
    const rate = viewMode === 'quarterly' 
      ? dashboardClient.quarterly_rate 
      : dashboardClient.annual_rate;
    
    if (!rate) return '';
    
    if (client.fee_type === 'percentage') {
      return `${rate}%`;
    } else {
      return `$${rate.toLocaleString()}`;
    }
  };

  // Get variance icon
  const getVarianceIcon = (variance: number | null, expected: number | null) => {
    if (variance === null || expected === null || expected === 0) return null;
    
    const variancePercent = Math.abs(variance / expected) * 100;
    
    if (Math.abs(variance) < 1) {
      return <Check className="inline w-4 h-4 text-green-600 ml-1" />;
    } else if (variancePercent <= 15) {
      return <AlertTriangle className="inline w-4 h-4 text-amber-600 ml-1" />;
    } else {
      return <AlertCircle className="inline w-4 h-4 text-red-600 ml-1" />;
    }
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
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-gray-600">Loading summary data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
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
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
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
                  ) : (
                    <>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round(provider.clients.filter(c => c.quarter === 1).reduce((sum, c) => sum + c.actual_total, 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round(provider.clients.filter(c => c.quarter === 2).reduce((sum, c) => sum + c.actual_total, 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round(provider.clients.filter(c => c.quarter === 3).reduce((sum, c) => sum + c.actual_total, 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round(provider.clients.filter(c => c.quarter === 4).reduce((sum, c) => sum + c.actual_total, 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Math.round(provider.total_actual).toLocaleString()}
                      </td>
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
                          <td className="px-4 py-3 text-right">
                            {client.variance !== null ? (
                              <>
                                ${Math.round(client.variance).toLocaleString()}
                                {getVarianceIcon(client.variance, client.expected_total)}
                              </>
                            ) : '--'}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {client.payment_count}/{client.expected_payment_count}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                const details = paymentDetails.get(client.client_id);
                                if (details && details.length > 0) {
                                  updatePostedStatus(details[0].payment_id, !client.fully_posted);
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
                      ) : (
                        <>
                          <td className="px-4 py-3 text-right">
                            {/* Q1 data */}
                            ${Math.round(client.actual_total).toLocaleString()}
                            {client.payment_count > 0 ? (
                              <Check className="inline w-4 h-4 text-green-600 ml-1" />
                            ) : (
                              <AlertTriangle className="inline w-4 h-4 text-amber-600 ml-1" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {/* Q2 data - would need separate API call */}
                            $0
                          </td>
                          <td className="px-4 py-3 text-right">
                            {/* Q3 data - would need separate API call */}
                            $0
                          </td>
                          <td className="px-4 py-3 text-right">
                            {/* Q4 data - would need separate API call */}
                            $0
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ${Math.round(client.actual_total).toLocaleString()}
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