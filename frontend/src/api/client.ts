// frontend/src/api/client.ts

// Azure Static Web Apps data-api provides consistent REST endpoints
const DATA_API_BASE = '/data-api/rest';

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
    const response = await fetch(`${DATA_API_BASE}/${entity}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let error: AzureApiError;
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
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    // Azure data-api returns results in a value array
    return data.value || data;
  }

  // Client entity methods
  async getClients() {
    return this.request('clients_by_provider');
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

  // Payment entity methods - using payment_variance view for rich data
  async getPayments(clientId: number, year?: number) {
    let filter = `client_id eq ${clientId}`;
    if (year) {
      filter += ` and applied_year eq ${year}`;
    }
    return this.request(`payment_variance?$filter=${filter}&$orderby=received_date desc`);
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

  // Period methods - using available_payment_periods view
  async getAvailablePeriods(clientId: number) {
    return this.request(`available_payment_periods?$filter=client_id eq ${clientId} and is_paid eq 0`);
  }

  // Dashboard data - composed from multiple views
  async getDashboardData(clientId: number) {
    // Fetch all required data in parallel
    const [client, paymentStatus, metrics, feeReference, recentPayments] = await Promise.all([
      this.request(`clients?$filter=client_id eq ${clientId}`),
      this.request(`client_payment_status?$filter=client_id eq ${clientId}`),
      this.request(`client_metrics?$filter=client_id eq ${clientId}`),
      this.request(`client_fee_reference?$filter=client_id eq ${clientId}`),
      this.request(`payment_variance?$filter=client_id eq ${clientId}&$orderby=received_date desc&$top=10`)
    ]);

    return {
      client: Array.isArray(client) ? client[0] : client,
      paymentStatus: Array.isArray(paymentStatus) ? paymentStatus[0] : paymentStatus,
      metrics: Array.isArray(metrics) ? metrics[0] : metrics,
      feeReference: Array.isArray(feeReference) ? feeReference[0] : feeReference,
      recentPayments: Array.isArray(recentPayments) ? recentPayments : [recentPayments]
    };
  }

  // Quarterly summary data
  async getQuarterlySummaries(clientId: number, year?: number) {
    let filter = `client_id eq ${clientId}`;
    if (year) {
      filter += ` and year eq ${year}`;
    }
    return this.request(`quarterly_totals?$filter=${filter}&$orderby=year desc,quarter desc`);
  }
}

// Create a singleton instance
export const dataApiClient = new DataApiClient();

// Hook to get the API client instance
export function useDataApiClient() {
  return dataApiClient;
}