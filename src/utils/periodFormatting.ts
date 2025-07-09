// src/utils/periodFormatting.ts

export function formatPeriodDisplay(
  period: number,
  year: number,
  paymentSchedule: 'monthly' | 'quarterly'
): string {
  if (paymentSchedule === 'monthly') {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[period - 1]} ${year}`;
  } else {
    return `Q${period} ${year}`;
  }
}