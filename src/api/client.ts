// frontend/src/api/client.ts

// Azure Static Web Apps data-api provides consistent REST endpoints
const DATA_API_BASE = '/data-api/rest';

// Import types
import { Contact } from '../types/contact';
import { apiCache, cacheKeys } from '../utils/cache';

// Azure's standardized error format
export interface AzureApiError {
  error: {
    code: string;
    message: string;
  };
}

export class DataApiClient {
  async request<T>(
    entity: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${DATA_API_BASE}/${entity}`;
    // console.log(`[DataApiClient] Requesting: ${url}`);
    
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let error: AzureApiError;
      const contentType = response.headers.get('content-type');
      
      // Check if we're getting HTML instead of JSON (common with 404s or auth redirects)
      if (contentType && contentType.includes('text/html')) {
        await response.text(); // Consume the response body
        // console.error(`[DataApiClient] Received HTML response instead of JSON from ${url}`);
        // console.error(`[DataApiClient] Status: ${response.status} ${response.statusText}`);
        // console.error(`[DataApiClient] First 500 chars of HTML:`, htmlContent.substring(0, 500));
        
        error = {
          error: {
            code: 'HTML_RESPONSE',
            message: `Expected JSON but received HTML. Status: ${response.status}. This usually means the data-api endpoint is not running or the URL is incorrect.`,
          },
        };
      } else {
        try {
          error = await response.json();
        } catch {
          error = {
            error: {
              code: 'REQUEST_FAILED',
              message: `Request failed with status ${response.status}`,
            },
          };
        }
      }
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    try {
      const data = await response.json();
      // console.log(`[DataApiClient] Response from ${url}:`, data);
      // Azure data-api returns results in a value array
      return data.value || data;
    } catch (e) {
      // console.error(`[DataApiClient] Failed to parse JSON response from ${url}:`, e);
      throw {
        error: {
          code: 'JSON_PARSE_ERROR',
          message: 'Failed to parse response as JSON',
        },
      };
    }
  }

  // Client entity methods
  async getClients() {
    return this.request('sidebar_clients_view');
  }

  async getClient(id: number) {
    return this.request(`clients?$filter=client_id eq ${id}`);
  }

  async createClient(data: any) {
    return this.request('clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: number, data: any) {
    return this.request(`clients/client_id/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: number) {
    return this.request(`clients/client_id/${id}`, {
      method: 'DELETE',
    });
  }

  // Contract entity methods
  async getClientContracts(clientId: number) {
    return this.request(`contracts?$filter=client_id eq ${clientId}`);
  }

  async createContract(data: any) {
    return this.request('contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContract(id: number, data: any) {
    return this.request(`contracts/contract_id/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Payment entity methods - using payment_history_view for rich data
  async getPayments(clientId: number, year?: number) {
    let filter = `client_id eq ${clientId}`;
    if (year) {
      filter += ` and applied_year eq ${year}`;
    }
    return this.request(`payment_history_view?$filter=${filter}&$orderby=received_date desc`);
  }

  async createPayment(data: any) {
    return this.request('payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePayment(id: number, data: any) {
    return this.request(`payments/payment_id/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePayment(id: number) {
    return this.request(`payments/payment_id/${id}`, {
      method: 'DELETE',
    });
  }

  // Period methods - using payment_form_periods_view
  async getAvailablePeriods(clientId: number) {
    return this.request(`payment_form_periods_view?$filter=client_id eq ${clientId}`);
  }

  // Dashboard data - single view for all dashboard data
  async getDashboardData(clientId: number) {
    const response = await this.request(`dashboard_view?$filter=client_id eq ${clientId}`);
    return Array.isArray(response) ? response[0] : response;
  }
  
  // Payment form defaults
  async getPaymentDefaults(clientId: number) {
    const response = await this.request(`payment_form_defaults_view?$filter=client_id eq ${clientId}`);
    return Array.isArray(response) ? response[0] : response;
  }

  // Quarterly summary data
  async getQuarterlySummaries(clientId: number, year?: number) {
    let filter = `client_id eq ${clientId}`;
    if (year) {
      filter += ` and applied_year eq ${year}`;
    }
    return this.request(`quarterly_summary_aggregated?$filter=${filter}&$orderby=applied_year desc,quarter desc`);
  }

  // Summary page data methods - LEGACY (keeping for compatibility)
  async getQuarterlySummaryByProvider(year: number, quarter: number) {
    // Use new aggregated view which shows all clients including those without payments
    return this.request(`quarterly_summary_aggregated?$filter=applied_year eq ${year} and quarter eq ${quarter}`);
  }

  async getAnnualSummaryByProvider(year: number) {
    // Use new yearly summaries view for annual data
    return this.request(`yearly_summaries_view?$filter=year eq ${year}`);
  }

  // NEW Summary page data methods using the page-ready views
  async getQuarterlyPageData(year: number, quarter: number) {
    // Returns complete quarterly data with provider aggregates and client details including notes
    return this.request(`quarterly_page_data?$filter=applied_year eq ${year} and quarter eq ${quarter}&$orderby=provider_name,display_name`);
  }

  async getAnnualPageData(year: number) {
    // Returns complete annual data with quarterly breakdowns and provider aggregates
    return this.request(`annual_page_data?$filter=applied_year eq ${year}&$orderby=provider_name,display_name`);
  }

  async getQuarterlySummaryDetail(clientId: number, year: number, quarter: number) {
    // Use comprehensive payment summary which includes missing payments (payment_id = NULL)
    return this.request(`comprehensive_payment_summary?$filter=client_id eq ${clientId} and year eq ${year} and quarter eq ${quarter}`);
  }

  // Quarterly notes methods
  async getQuarterlyNote(clientId: number, year: number, quarter: number) {
    return this.request(`quarterly_notes?$filter=client_id eq ${clientId} and year eq ${year} and quarter eq ${quarter}`);
  }

  // NEW: Batch method to get all quarterly notes for a period (WITH CACHING)
  async getQuarterlyNotesBatch(year: number, quarter: number) {
    const cacheKey = cacheKeys.quarterlyNotes(year, quarter);
    
    // Check cache first
    const cached = apiCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // If not cached, fetch from API
    const data = await this.request(`quarterly_notes_all_clients?$filter=year eq ${year} and quarter eq ${quarter}`);
    
    // Cache for 5 minutes (quarterly notes don't change often)
    apiCache.set(cacheKey, data, 5 * 60 * 1000);
    
    return data;
  }

  async updateQuarterlyNote(clientId: number, year: number, quarter: number, notes: string) {
    // First check if note exists
    const existing = await this.getQuarterlyNote(clientId, year, quarter);
    
    let result;
    if (existing && Array.isArray(existing) && existing.length > 0) {
      // Update existing note
      result = await this.request(`quarterly_notes/client_id/${clientId}/year/${year}/quarter/${quarter}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      });
    } else {
      // Create new note
      result = await this.request('quarterly_notes', {
        method: 'POST',
        body: JSON.stringify({ client_id: clientId, year, quarter, notes }),
      });
    }
    
    // Invalidate cache after update
    apiCache.clear(cacheKeys.quarterlyNotes(year, quarter));
    
    return result;
  }

  // Client quarter marker methods (for posted checkbox)
  async updateClientQuarterMarker(clientId: number, year: number, quarter: number, isPosted: boolean) {
    // First check if marker exists
    const existing = await this.request(`client_quarter_markers?$filter=client_id eq ${clientId} and year eq ${year} and quarter eq ${quarter}`);
    
    if (existing && Array.isArray(existing) && existing.length > 0) {
      // Update existing marker
      return await this.request(`client_quarter_markers/client_id/${clientId}/year/${year}/quarter/${quarter}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_posted: isPosted }),
      });
    } else {
      // Create new marker
      return await this.request('client_quarter_markers', {
        method: 'POST',
        body: JSON.stringify({ 
          client_id: clientId, 
          year, 
          quarter, 
          is_posted: isPosted 
        }),
      });
    }
  }

  // Contact Management
  async getContacts(clientId: number): Promise<Contact[]> {
    const response = await this.request<Contact[]>(`contacts?$filter=client_id eq ${clientId}&$orderby=contact_type,contact_name`);
    return response || [];
  }

  async createContact(data: Omit<Contact, 'contact_id'>): Promise<Contact> {
    const response = await this.request<Contact>('contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateContact(contactId: number, data: Partial<Contact>): Promise<Contact> {
    const response = await this.request<Contact>(`contacts/contact_id/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteContact(contactId: number): Promise<void> {
    await this.request(`contacts/contact_id/${contactId}`, {
      method: 'DELETE',
    });
  }
}

// Create a singleton instance
export const dataApiClient = new DataApiClient();

// Hook to get the API client instance
export function useDataApiClient() {
  return dataApiClient;
}
