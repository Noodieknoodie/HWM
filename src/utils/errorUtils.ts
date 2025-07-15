// frontend/src/utils/errorUtils.ts

/**
 * Maps SQL constraint violation errors to user-friendly messages
 * @param error - The error object from the API
 * @returns User-friendly error message if constraint error found, null otherwise
 */
export function mapSqlConstraintError(error: any): string | null {
  // Check if this is an Azure API error with a message
  const errorMessage = error?.error?.message || error?.message || '';
  
  // Map constraint names to user-friendly messages
  const constraintMappings: Record<string, string> = {
    'CK_payments_positive_amounts': 'Payment amount must be positive',
    'CK_payments_no_future_dates': 'Payment date cannot be in the future',
    'CK_payments_valid_year': 'Invalid payment year (must be 2018 or later)',
    'FK_payments_clients': 'Cannot delete client with existing payments',
    'CK_contracts_positive_rates': 'Contract rate must be positive',
    'CK_contracts_valid_schedule': 'Invalid payment schedule',
    'chk_applied_period': 'Invalid payment period'
  };

  // Check if the error message contains any of our known constraints
  for (const [constraint, friendlyMessage] of Object.entries(constraintMappings)) {
    if (errorMessage.includes(constraint)) {
      return friendlyMessage;
    }
  }

  return null;
}

/**
 * Extract error message from Azure data-api standardized error format
 */
export function getErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
  // First check for SQL constraint errors
  const constraintError = mapSqlConstraintError(error);
  if (constraintError) {
    return constraintError;
  }

  // Azure data-api error format: {error: {code: string, message: string}}
  if (error?.error?.message && typeof error.error.message === 'string') {
    return error.error.message;
  }
  
  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Default message
  return defaultMessage;
}

// TEST CHECKLIST:
// □ Enter $0 payment - should show "Payment amount must be positive"
// □ Enter negative payment - should show "Payment amount must be positive"
// □ Select tomorrow's date - should show "Payment date cannot be in the future"
// □ Year dropdown should not show years before 2018
// □ Try to save with all valid data - should work normally