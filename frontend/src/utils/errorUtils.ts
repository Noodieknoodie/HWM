// frontend/src/utils/errorUtils.ts

/**
 * Safely extracts an error message string from various error formats
 * Prevents React rendering errors from non-string error values
 */
export function getErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle null/undefined
  if (!error) {
    return defaultMessage;
  }
  
  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle our API error format: {error: {code, message}}
  if (error?.error) {
    // If error.error.message is a string, use it
    if (typeof error.error.message === 'string') {
      return error.error.message;
    }
    
    // If error.error.message is another nested error object
    if (error.error.message?.error?.message) {
      return getErrorMessage(error.error.message, defaultMessage);
    }
    
    // If error.error has a code but no proper message
    if (error.error.code) {
      return `Error: ${error.error.code}`;
    }
  }
  
  // Handle direct {message: string} format
  if (typeof error.message === 'string') {
    return error.message;
  }
  
  // Handle {code, message} where message might be an object
  if (error.message && typeof error.message === 'object') {
    return getErrorMessage(error.message, defaultMessage);
  }
  
  // If we can't extract a proper message, return default
  return defaultMessage;
}