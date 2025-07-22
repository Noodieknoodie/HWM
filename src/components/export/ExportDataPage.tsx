"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FileText, FileSpreadsheet, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { CommandMultiSelect } from "@/components/ui/command-multi-select"
import { useDataApiClient } from "@/api/client"
import { 
  exportToCSV, 
  exportToExcel, 
  formatQuarterlySummaryCSV, 
  formatPaymentHistoryCSV,
  cleanNumber,
  type QuarterlySummaryData,
  type PaymentHistoryData 
} from "@/utils/exportUtils"

type ExportState = {
  [key: string]: boolean
}

interface Client {
  client_id: number;
  display_name: string;
  provider_name: string;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

const quarters = [
  { value: "1", label: "Q1" },
  { value: "2", label: "Q2" },
  { value: "3", label: "Q3" },
  { value: "4", label: "Q4" },
]

const quarterlyPeriods = years.flatMap((year) =>
  quarters.map((quarter) => ({
    value: `${year}-${quarter.value}`,
    label: `${quarter.label} ${year}`,
    year: parseInt(year),
    quarter: parseInt(quarter.value)
  })),
)

export default function ExportDataPage() {
  const apiClient = useDataApiClient();
  const [loading, setLoading] = useState<ExportState>({})
  const [clients, setClients] = useState<Client[]>([]);
  const [clientOptions, setClientOptions] = useState<Array<{ value: string; label: string; provider: string }>>([]);

  // State for Quarterly Summary
  const [startPeriod, setStartPeriod] = useState(`${currentYear}-3`)
  const [endPeriod, setEndPeriod] = useState(`${currentYear}-4`)

  // State for Annual Summary
  const [selectedYears, setSelectedYears] = useState<string[]>([String(currentYear)])

  // State for Client Payment History
  const [clientSelectionType, setClientSelectionType] = useState("all")
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [dateRangeType, setDateRangeType] = useState("allTime")
  const [date, setDate] = useState<DateRange | undefined>(undefined)
  const [includeDetails, setIncludeDetails] = useState(true)
  const [includeVariance, setIncludeVariance] = useState(false)
  const [includeAum, setIncludeAum] = useState(true)

  // Fetch clients on mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientData = await apiClient.getClients() as Client[];
        setClients(clientData);
        
        // Transform to options for MultiSelect
        const options = clientData.map((client: Client) => ({
          value: String(client.client_id),
          label: client.display_name,
          provider: client.provider_name || 'Unknown'
        }));
        setClientOptions(options);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      }
    };
    fetchClients();
  }, []);

  // Export Quarterly Summary
  const handleQuarterlyExport = async (format: 'csv' | 'excel') => {
    const key = `quarterly-${format}`;
    setLoading((prev) => ({ ...prev, [key]: true }));
    
    try {
      // Parse periods
      const start = quarterlyPeriods.find(p => p.value === startPeriod);
      const end = quarterlyPeriods.find(p => p.value === endPeriod);
      
      if (!start || !end) return;
      
      // Fetch data for each period
      const periods: string[] = [];
      const allData: QuarterlySummaryData[] = [];
      
      // Iterate through periods
      for (let year = start.year; year <= end.year; year++) {
        const startQ = year === start.year ? start.quarter : 1;
        const endQ = year === end.year ? end.quarter : 4;
        
        for (let quarter = startQ; quarter <= endQ; quarter++) {
          periods.push(`Q${quarter} ${year}`);
          
          // Fetch data for this quarter
          const data = await apiClient.getQuarterlyPageData(year, quarter) as any[];
          
          // Transform to export format
          const transformed = data.map((row: any) => ({
            provider: row.provider_name,
            client: row.display_name,
            paymentSchedule: row.payment_schedule || 'N/A',
            feeType: row.fee_type || 'N/A',
            rate: cleanNumber(row.quarterly_rate),  // Already in correct format from DB
            expected: cleanNumber(row.client_expected || 0),
            actual: cleanNumber(row.client_actual || 0),
            variance: cleanNumber(row.client_variance || 0),
            variancePercent: cleanNumber(row.client_variance_percent || 0),
            status: row.variance_status || 'N/A'
          }));
          
          allData.push(...transformed);
        }
      }
      
      if (format === 'csv') {
        const csv = formatQuarterlySummaryCSV(allData, periods);
        const filename = `quarterly_summary_${startPeriod}_to_${endPeriod}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        exportToExcel(allData, `quarterly_summary_${startPeriod}_to_${endPeriod}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Export Annual Summary
  const handleAnnualExport = async (format: 'csv' | 'excel') => {
    if (selectedYears.length === 0) {
      alert('Please select at least one year to export');
      return;
    }
    
    const key = `annual-${format}`;
    setLoading((prev) => ({ ...prev, [key]: true }));
    
    try {
      const allData: any[] = [];
      
      for (const year of selectedYears) {
        const yearNum = parseInt(year);
        const data = await apiClient.getAnnualPageData(yearNum) as any[];
        
        // Transform to export format
        const transformed = data.map((row: any) => ({
          year: year,
          provider: row.provider_name,
          client: row.display_name,
          paymentSchedule: row.payment_schedule || 'N/A',
          annualRate: cleanNumber(row.annual_rate),  // Already in correct format from DB
          q1: cleanNumber(row.q1_actual || 0),
          q2: cleanNumber(row.q2_actual || 0),
          q3: cleanNumber(row.q3_actual || 0),
          q4: cleanNumber(row.q4_actual || 0),
          total: cleanNumber(row.client_annual_total || 0)
        }));
        
        allData.push(...transformed);
      }
      
      if (format === 'csv') {
        exportToCSV(allData, `annual_summary_${selectedYears.join('_')}`);
      } else {
        exportToExcel(allData, `annual_summary_${selectedYears.join('_')}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Export Client Payment History
  const handleClientExport = async (format: 'csv' | 'excel') => {
    const key = `client-${format}`;
    setLoading((prev) => ({ ...prev, [key]: true }));
    
    try {
      const clientIds = clientSelectionType === 'all' 
        ? clients.map(c => c.client_id)
        : selectedClients.map(id => parseInt(id));
      
      const historyData: PaymentHistoryData[] = [];
      
      for (const clientId of clientIds) {
        const client = clients.find(c => c.client_id === clientId);
        if (!client) continue;
        
        // Get client's payment history
        const payments = await apiClient.getPayments(clientId) as any[];
        const contractData = await apiClient.getClientContracts(clientId) as any[];
        const currentContract = contractData[0]; // Assume first is current
        
        const transformed: PaymentHistoryData = {
          clientName: client.display_name,
          provider: client.provider_name,
          paymentSchedule: currentContract?.payment_schedule || 'N/A',
          currentRate: currentContract?.fee_type === 'percentage'  // lowercase!
            ? cleanNumber(currentContract.percent_rate * 100)  // Convert to display percentage
            : cleanNumber(currentContract?.flat_rate || 0),
          payments: payments.map((payment: any) => ({
            date: new Date(payment.received_date).toLocaleDateString('en-US'),
            period: payment.period_display || `${payment.applied_period} ${payment.applied_year}`,
            paymentMethod: payment.method || 'N/A',
            amount: cleanNumber(payment.actual_fee),
            aum: includeAum ? cleanNumber(payment.display_aum) : undefined,
            expectedFee: cleanNumber(payment.expected_fee || 0),
            variance: includeVariance ? cleanNumber(payment.variance_amount) : undefined,  // Use DB field
            variancePercent: includeVariance ? cleanNumber(payment.variance_percent) : undefined,  // Use DB field
            status: includeVariance ? payment.variance_status : undefined
          }))
        };
        
        historyData.push(transformed);
      }
      
      if (format === 'csv') {
        const csv = formatPaymentHistoryCSV(historyData, {
          includeDetails,
          includeVariance,
          includeAum
        });
        const filename = `payment_history_${format}_${Date.now()}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // For Excel, flatten the data
        const flatData = historyData.flatMap(client => 
          client.payments.map(payment => ({
            clientName: client.clientName,
            provider: client.provider,
            paymentSchedule: client.paymentSchedule,
            currentRate: client.currentRate,
            ...payment
          }))
        );
        exportToExcel(flatData, `payment_history_${Date.now()}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Export System Data
  const handleSystemExport = async (type: string, format: 'csv' | 'excel') => {
    const key = `${type}-${format}`;
    setLoading((prev) => ({ ...prev, [key]: true }));
    
    try {
      let data: any[] = [];
      let filename = '';
      
      switch (type) {
        case 'contracts':
          // Fetch all contracts
          const contractPromises = clients.map(client => 
            apiClient.getClientContracts(client.client_id)
              .then(contracts => (contracts as any[]).map((c: any) => ({
                ...c,
                client_name: client.display_name,
                provider: client.provider_name
              })))
          );
          const allContracts = await Promise.all(contractPromises);
          data = allContracts.flat();
          filename = 'contracts';
          break;
          
        case 'clients':
          data = clients;
          filename = 'clients';
          break;
          
        case 'contacts':
          // Fetch all contacts
          const contactPromises = clients.map(client => 
            apiClient.getContacts(client.client_id)
              .then(contacts => (contacts as any[]).map((c: any) => ({
                ...c,
                client_name: client.display_name
              })))
          );
          const allContacts = await Promise.all(contactPromises);
          data = allContacts.flat();
          filename = 'contacts';
          break;
      }
      
      if (format === 'csv') {
        exportToCSV(data, filename);
      } else {
        exportToExcel(data, filename);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const ExportActions = ({ baseKey, onExport }: { baseKey: string; onExport: (format: 'csv' | 'excel') => void }) => (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button
        variant="outline"
        onClick={() => onExport('csv')}
        disabled={loading[`${baseKey}-csv`]}
        className="w-full sm:w-auto"
      >
        {loading[`${baseKey}-csv`] ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        Export to CSV
      </Button>
      <Button
        variant="outline"
        onClick={() => onExport('excel')}
        disabled={loading[`${baseKey}-excel`]}
        className="w-full sm:w-auto"
      >
        {loading[`${baseKey}-excel`] ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="mr-2 h-4 w-4" />
        )}
        Export to Excel
      </Button>
    </div>
  )

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Export Center</h1>
          <p className="mt-2 text-lg text-muted-foreground">Generate and download reports and raw system data.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_450px] gap-8">
          {/* Main content column */}
          <div className="space-y-12">
            {/* Section: Summary Reports */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 mb-6">
                Summary Reports
              </h2>
              <div className="space-y-8">
                {/* Quarterly Summary */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-6">
                    <h3 className="font-medium text-lg mb-4">Quarterly Summary</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Start Period</Label>
                        <Select value={startPeriod} onValueChange={setStartPeriod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a period" />
                          </SelectTrigger>
                          <SelectContent>
                            {quarterlyPeriods.map((p) => (
                              <SelectItem key={`start-${p.value}`} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>End Period</Label>
                        <Select value={endPeriod} onValueChange={setEndPeriod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a period" />
                          </SelectTrigger>
                          <SelectContent>
                            {quarterlyPeriods.map((p) => (
                              <SelectItem key={`end-${p.value}`} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 border-t">
                    <ExportActions baseKey="quarterly" onExport={handleQuarterlyExport} />
                  </div>
                </div>
                {/* Annual Summary */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-6">
                    <h3 className="font-medium text-lg mb-4">Annual Summary</h3>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label>Select Year(s)</Label>
                        <span className="text-sm text-gray-500">
                          {selectedYears.length === 0 ? 'None selected' : `${selectedYears.length} selected`}
                        </span>
                      </div>
                      <ToggleGroup
                        type="multiple"
                        value={selectedYears}
                        onValueChange={setSelectedYears}
                        className="flex flex-wrap justify-start gap-2"
                      >
                        {years.map((year) => (
                          <ToggleGroupItem key={year} value={year} aria-label={`Toggle ${year}`} className="min-w-[60px]">
                            {year}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 border-t">
                    <ExportActions baseKey="annual" onExport={handleAnnualExport} />
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Detail Reports */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 mb-6">
                Detail Reports
              </h2>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6">
                  <h3 className="font-medium text-lg mb-6">Client Payment History</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <div className="space-y-2">
                        <Label>Clients</Label>
                        <RadioGroup
                          value={clientSelectionType}
                          onValueChange={setClientSelectionType}
                          className="flex items-center space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="allClients" />
                            <Label htmlFor="allClients" className="font-normal">
                              All Clients
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="select" id="selectClients" />
                            <Label htmlFor="selectClients" className="font-normal">
                              Select Clients
                            </Label>
                          </div>
                        </RadioGroup>
                        {clientSelectionType === "select" && (
                          <div className="pt-2">
                            <CommandMultiSelect
                              options={clientOptions}
                              selected={selectedClients}
                              onChange={setSelectedClients}
                              placeholder="Select clients..."
                              searchPlaceholder="Search clients..."
                              emptyMessage="No clients found."
                              groupBy="provider"
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Date Range</Label>
                        <RadioGroup
                          value={dateRangeType}
                          onValueChange={setDateRangeType}
                          className="flex items-center space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="allTime" id="allTime" />
                            <Label htmlFor="allTime" className="font-normal">
                              All Time
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="custom" />
                            <Label htmlFor="custom" className="font-normal">
                              Custom
                            </Label>
                          </div>
                        </RadioGroup>
                        {dateRangeType === "custom" && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="date"
                                variant={"outline"}
                                className="w-full justify-start text-left font-normal mt-2"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                  date.to ? (
                                    `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`
                                  ) : (
                                    format(date.from, "LLL dd, y")
                                  )
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>Include in Report</Label>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="details"
                            checked={includeDetails}
                            onCheckedChange={(c: boolean) => setIncludeDetails(c)}
                          />
                          <Label htmlFor="details" className="font-normal">
                            Payment details
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="variance"
                            checked={includeVariance}
                            onCheckedChange={(c: boolean) => setIncludeVariance(c)}
                          />
                          <Label htmlFor="variance" className="font-normal">
                            Variance analysis
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="aum" checked={includeAum} onCheckedChange={(c: boolean) => setIncludeAum(c)} />
                          <Label htmlFor="aum" className="font-normal">
                            AUM data
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 border-t">
                  <ExportActions baseKey="client" onExport={handleClientExport} />
                </div>
              </div>
            </section>
          </div>

          {/* Right column - System Data - Vertically Centered */}
          <div className="xl:sticky xl:top-1/2 xl:-translate-y-1/2 h-fit">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 mb-6">System Data</h2>
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4">
                  <div className="flow-root">
                    <div className="-m-2 divide-y divide-slate-100">
                      {[
                        { name: "Contracts", count: clients.length * 2, key: "contracts" },
                        { name: "Clients", count: clients.length, key: "clients" },
                        { name: "Contacts", count: clients.length * 3, key: "contacts" },
                      ].map((item) => (
                        <div key={item.key} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium text-base">{item.name}</span>
                            <span className="text-sm text-muted-foreground">{item.count} records</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSystemExport(item.key, 'csv')}
                              disabled={loading[`${item.key}-csv`]}
                              className="flex-1"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              CSV
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSystemExport(item.key, 'excel')}
                              disabled={loading[`${item.key}-excel`]}
                              className="flex-1"
                            >
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Excel
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}