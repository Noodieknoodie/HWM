// Token exchange utility with retry logic
export async function exchangeTeamsTokenForApiToken(
  teamsToken: string,
  retries = 3
): Promise<string> {
  const exchangeUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:7071/api/exchangeToken'
    : import.meta.env.VITE_TOKEN_EXCHANGE_URL || '/api/exchangeToken';

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(exchangeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: teamsToken })
      });

      if (response.ok) {
        const data = await response.json();
        return data.access_token;
      }

      // Handle specific error cases
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 401) {
        // Teams token is invalid/expired - no point retrying
        throw new Error('Teams authentication expired. Please refresh the page.');
      }
      
      if (response.status === 400) {
        // Bad request - likely invalid token format
        throw new Error('Invalid authentication token format.');
      }

      // For 5xx errors, retry with exponential backoff
      if (response.status >= 500 && attempt < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.warn(`Token exchange failed (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      lastError = new Error(errorData.error || `Token exchange failed with status ${response.status}`);
    } catch (error) {
      // Network error - retry with backoff
      if (attempt < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.warn(`Network error during token exchange (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        lastError = error as Error;
        continue;
      }
      lastError = error as Error;
    }
  }

  throw lastError || new Error('Token exchange failed after all retries');
}