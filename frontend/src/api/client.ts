// frontend/src/api/client.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export class ApiClient {
  async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include', // Include auth cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: {
            code: 'UNKNOWN_ERROR',
            message: `Request failed with status ${response.status}`,
          },
        };
      }
      throw errorData;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Client methods
  async getClients() {
    return this.request('/clients');
  }

  async getClient(id: number) {
    return this.request(`/clients/${id}`);
  }

  async createClient(data: any) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: number, data: any) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: number) {
    return this.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Contract methods
  async getClientContracts(clientId: number) {
    return this.request(`/contracts/client/${clientId}`);
  }

  async createContract(data: any) {
    return this.request('/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContract(id: number, data: any) {
    return this.request(`/contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Payment methods
  async getPayments(clientId: number) {
    return this.request(`/payments?client_id=${clientId}`);
  }

  async createPayment(data: any) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePayment(id: number, data: any) {
    return this.request(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePayment(id: number) {
    return this.request(`/payments/${id}`, {
      method: 'DELETE',
    });
  }

  // Period methods
  async getAvailablePeriods(clientId: number, contractId: number) {
    return this.request(`/periods?client_id=${clientId}&contract_id=${contractId}`);
  }

  // Dashboard methods
  async getDashboard(clientId: number) {
    return this.request(`/dashboard/${clientId}`);
  }
}

// Create a singleton instance
export const apiClient = new ApiClient();

// Hook to get the API client instance
export function useApiClient() {
  return apiClient;
}