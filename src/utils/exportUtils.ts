// Export utilities for HWM application

// Helper to clean numbers to 2 decimal places and handle floating point artifacts
// Note: Converts null/undefined to 0 for CSV/Excel compatibility
// This is intentional - we want clean numeric exports, not empty cells
export const cleanNumber = (num: number | null | undefined): number => {
  if (num === null || num === undefined) return 0;
  return Math.round(num * 100) / 100;  // Avoids 4532.789999999 type issues
};

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
    
    // Add all detail rows with provider column
    periodData.forEach(row => {
      csv += `${row.provider},${row.client},${row.paymentSchedule},${row.feeType},${row.rate.toFixed(2)},` +
        `${row.expected.toFixed(2)},` +
        `${row.actual.toFixed(2)},` +
        `${row.variance.toFixed(2)},` +
        `${row.variancePercent.toFixed(2)},` +
        `${row.status}\n`;
    });
    
    // Add provider summary section
    csv += '\n';
    csv += 'PROVIDER SUMMARY\n';
    csv += 'Provider,Total Expected,Total Actual,Total Variance,Variance %\n';
    
    const providers = [...new Set(periodData.map(d => d.provider))];
    let grandTotals = { expected: 0, actual: 0, variance: 0 };
    
    providers.forEach(provider => {
      const providerData = periodData.filter(d => d.provider === provider);
      const totals = {
        expected: providerData.reduce((sum, d) => sum + d.expected, 0),
        actual: providerData.reduce((sum, d) => sum + d.actual, 0),
        variance: providerData.reduce((sum, d) => sum + d.variance, 0)
      };
      
      grandTotals.expected += totals.expected;
      grandTotals.actual += totals.actual;
      grandTotals.variance += totals.variance;
      
      csv += `${provider},` +
        `${totals.expected.toFixed(2)},` +
        `${totals.actual.toFixed(2)},` +
        `${totals.variance.toFixed(2)},` +
        `${totals.expected !== 0 ? ((totals.variance / totals.expected) * 100).toFixed(2) : '0.00'}\n`;
    });
    
    // Add grand total row
    csv += `TOTAL,` +
      `${grandTotals.expected.toFixed(2)},` +
      `${grandTotals.actual.toFixed(2)},` +
      `${grandTotals.variance.toFixed(2)},` +
      `${grandTotals.expected !== 0 ? ((grandTotals.variance / grandTotals.expected) * 100).toFixed(2) : '0.00'}\n`;
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
    csv += `Provider: ${client.provider} | Payment Schedule: ${client.paymentSchedule} | Current Rate: ${client.currentRate.toFixed(2)}\n\n`;
    
    // Build headers based on options
    let headers = 'Date,Period,Payment Method,Amount';
    if (options.includeAum) headers += ',AUM';
    headers += ',Expected Fee';
    if (options.includeVariance) headers += ',Variance,Variance %,Status';
    csv += headers + '\n';
    
    // Add payment rows
    client.payments.forEach(payment => {
      let row = `${payment.date},${payment.period},${payment.paymentMethod},${payment.amount.toFixed(2)}`;
      if (options.includeAum) row += `,${payment.aum ? payment.aum.toFixed(2) : ''}`;
      row += `,${payment.expectedFee.toFixed(2)}`;
      if (options.includeVariance && payment.variance !== undefined) {
        row += `,${payment.variance.toFixed(2)},${payment.variancePercent?.toFixed(2)},${payment.status}`;
      }
      csv += row + '\n';
    });
  });
  
  return csv;
}

// Excel export with xlsx library
export async function exportToExcel(data: any[], filename: string) {
  const XLSX = await import('xlsx');
  
  // Create worksheet from JSON data
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Get column headers
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  
  // Apply number formatting to specific columns
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      
      if (cell && typeof cell.v === 'number') {
        const header = headers[C];
        
        // Apply percentage format for rate columns
        if (header && (header.toLowerCase().includes('rate') || header.toLowerCase().includes('percent'))) {
          cell.z = '0.00%';
          cell.t = 'n';
        }
        // Apply currency format for money columns
        else if (header && (
          header.toLowerCase().includes('amount') || 
          header.toLowerCase().includes('fee') || 
          header.toLowerCase().includes('total') ||
          header.toLowerCase().includes('variance') ||
          header.toLowerCase().includes('expected') ||
          header.toLowerCase().includes('actual') ||
          header.toLowerCase().includes('aum') ||
          header.toLowerCase().includes('assets')
        )) {
          cell.z = '$#,##0.00';
          cell.t = 'n';
        }
        // Default number format with 2 decimals
        else {
          cell.z = '0.00';
          cell.t = 'n';
        }
      }
    }
  }
  
  // Create workbook and append sheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  
  // Write file
  XLSX.writeFile(wb, `${filename}.xlsx`);
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