// frontend/src/utils/errorUtils.ts

/**
 * Extract error message from Azure data-api standardized error format
 */
export function getErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
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