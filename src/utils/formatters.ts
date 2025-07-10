// src/utils/formatters.ts

/**
 * Currency formatter - for displaying dollar amounts
 */
export function formatCurrency(amount: number | null | undefined, decimals: number = 2): string {
  if (amount === null || amount === undefined) return '--';
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  return formatter.format(amount);
}

/**
 * Date formatter - for displaying dates in MM/YY format
 */
export function formatDateMMYY(date: string | null | undefined): string {
  if (!date) return '--';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '--';
  
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear()).slice(-2);
  
  return `${month}/${year}`;
}

/**
 * Date formatter - for displaying dates in MM/DD/YY format
 */
export function formatDateMMDDYY(date: string | null | undefined): string {
  if (!date) return '--';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '--';
  
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = String(dateObj.getFullYear()).slice(-2);
  
  return `${month}/${day}/${year}`;
}

/**
 * Rate formatter - for displaying percentage or flat fee rates
 */
export function formatRate(rate: number | null | undefined, feeType: 'percentage' | 'flat' | null): string {
  if (rate === null || rate === undefined) return '--';
  
  if (feeType === 'percentage') {
    // Rates are already scaled (e.g., 0.07 for 0.07%)
    return `${rate.toFixed(2)}%`;
  } else if (feeType === 'flat') {
    // Flat fees are dollar amounts
    return formatCurrency(rate, 0);
  }
  
  return '--';
}

/**
 * Combined rates formatter - for displaying all three rates in one line
 */
export function formatCombinedRates(
  monthlyRate: number | null | undefined,
  quarterlyRate: number | null | undefined,
  annualRate: number | null | undefined,
  feeType: 'percentage' | 'flat' | null
): string {
  const monthly = formatRate(monthlyRate, feeType);
  const quarterly = formatRate(quarterlyRate, feeType);
  const annual = formatRate(annualRate, feeType);
  
  // If all are missing, return single dash
  if (monthly === '--' && quarterly === '--' && annual === '--') {
    return '--';
  }
  
  return `${monthly} / ${quarterly} / ${annual}`;
}

/**
 * Phone formatter - for displaying phone numbers
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '--';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX if we have 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Return as-is if not standard format
  return phone;
}

/**
 * Number formatter - for participant counts
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '--';
  return num.toString();
}