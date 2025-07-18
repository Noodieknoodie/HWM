// Export utilities for HWM application

export interface ExportOptions {
  format: 'csv' | 'excel';
  filename: string;
}

export interface QuarterlySummaryData {
  provider: string;
  client: string;
  paymentSchedule: string;
  feeType: string;
  rate: number;  // Changed to number
  expected: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: string;
}

export interface AnnualSummaryData {
  provider: string;
  client: string;
  paymentSchedule: string;
  annualRate: number;  // Changed to number
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
}

export interface PaymentHistoryData {
  clientName: string;
  provider: string;
  paymentSchedule: string;
  currentRate: number;  // Changed to number
  payments: Array<{
    date: string | number;  // Can be string for CSV or number for Excel
    period: string;
    paymentMethod: string;
    amount: number;
    aum?: number;
    expectedFee: number;
    variance?: number;
    variancePercent?: number;
    status?: string;
  }>;
}

// CSV Export utilities
export function exportToCSV(data: any[], filename: string) {
  let csv = '';
  
  if (data.length === 0) {
    downloadFile('No data to export', `${filename}.csv`, 'text/csv');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  csv += headers.join(',') + '\n';

  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Handle values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    });
    csv += values.join(',') + '\n';
  });

  downloadFile(csv, `${filename}.csv`, 'text/csv');
}

// Quarterly Summary CSV formatter
export function formatQuarterlySummaryCSV(data: QuarterlySummaryData[], periods: string[]): string {
  let csv = '';
  
  periods.forEach((period, index) => {
    if (index > 0) csv += '\n';
    
    csv += `=== ${period.toUpperCase().replace('-', ' ')} PAYMENT SUMMARY ===\n`;
    csv += 'Provider,Client,Payment Schedule,Fee Type,Rate,Expected,Actual,Variance,Variance %,Status\n';
    
    const periodData = data; // Period filtering happens at data fetch level
    
    // Group by provider
    const providers = [...new Set(periodData.map(d => d.provider))];
    
    providers.forEach(provider => {
      const providerData = periodData.filter(d => d.provider === provider);
      const totals = {
        expected: providerData.reduce((sum, d) => sum + d.expected, 0),
        actual: providerData.reduce((sum, d) => sum + d.actual, 0),
        variance: providerData.reduce((sum, d) => sum + d.variance, 0)
      };
      
      csv += `${provider},,,,,` +
        `$${totals.expected.toFixed(0)},` +
        `$${totals.actual.toFixed(0)},` +
        `$${totals.variance.toFixed(0)},` +
        `${((totals.variance / totals.expected) * 100).toFixed(2)}%,\n`;
      
      providerData.forEach(row => {
        csv += `,${row.client},${row.paymentSchedule},${row.feeType},${row.rate.toFixed(2)}%,` +
          `$${row.expected.toFixed(0)},` +
          `$${row.actual.toFixed(0)},` +
          `$${row.variance.toFixed(0)},` +
          `${row.variancePercent.toFixed(2)}%,` +
          `${row.status}\n`;
      });
    });
  });
  
  return csv;
}

// Client Payment History CSV formatter
export function formatPaymentHistoryCSV(data: PaymentHistoryData[], options: {
  includeDetails: boolean;
  includeVariance: boolean;
  includeAum: boolean;
}): string {
  let csv = '';
  
  data.forEach((client, index) => {
    if (index > 0) csv += '\n';
    
    csv += `=== PAYMENT HISTORY: ${client.clientName} ===\n`;
    csv += `Provider: ${client.provider} | Payment Schedule: ${client.paymentSchedule} | Current Rate: ${client.currentRate.toFixed(2)}%\n\n`;
    
    // Build headers based on options
    let headers = 'Date,Period,Payment Method,Amount';
    if (options.includeAum) headers += ',AUM';
    headers += ',Expected Fee';
    if (options.includeVariance) headers += ',Variance,Variance %,Status';
    csv += headers + '\n';
    
    // Add payment rows
    client.payments.forEach(payment => {
      let row = `${payment.date},${payment.period},${payment.paymentMethod},$${payment.amount.toFixed(2)}`;
      if (options.includeAum) row += `,${payment.aum ? '$' + payment.aum.toFixed(0) : 'N/A'}`;
      row += `,$${payment.expectedFee.toFixed(2)}`;
      if (options.includeVariance && payment.variance !== undefined) {
        row += `,$${payment.variance.toFixed(2)},${payment.variancePercent?.toFixed(2)}%,${payment.status}`;
      }
      csv += row + '\n';
    });
  });
  
  return csv;
}

// Excel export placeholder (would need a library like xlsx)
export function exportToExcel(data: any[], filename: string) {
  // For now, just export as CSV
  console.warn('Excel export not yet implemented, exporting as CSV instead');
  exportToCSV(data, filename);
}

// Helper to download file
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}