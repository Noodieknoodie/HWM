// frontend/src/api/client.ts
import { useAuth } from '../auth/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export class ApiClient {
  private getAccessToken: () => Promise<string | null>;

  constructor(getAccessToken: () => Promise<string | null>) {
    this.getAccessToken = getAccessToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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
    return this.request('/api/clients');
  }

  async getClient(id: number) {
    return this.request(`/api/clients/${id}`);
  }

  async createClient(data: any) {
    return this.request('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: number, data: any) {
    return this.request(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: number) {
    return this.request(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Contract methods
  async getClientContracts(clientId: number) {
    return this.request(`/api/contracts/client/${clientId}`);
  }

  async createContract(data: any) {
    return this.request('/api/contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContract(id: number, data: any) {
    return this.request(`/api/contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Payment methods
  async getPayments(clientId: number) {
    return this.request(`/api/payments?client_id=${clientId}`);
  }

  async createPayment(data: any) {
    return this.request('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePayment(id: number, data: any) {
    return this.request(`/api/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePayment(id: number) {
    return this.request(`/api/payments/${id}`, {
      method: 'DELETE',
    });
  }

  // Period methods
  async getAvailablePeriods(clientId: number, paymentSchedule: string) {
    return this.request(`/api/periods?client_id=${clientId}&payment_schedule=${paymentSchedule}`);
  }

  // Dashboard methods
  async getDashboard(clientId: number) {
    return this.request(`/api/dashboard/${clientId}`);
  }
}

// Hook to get an authenticated API client instance
export function useApiClient() {
  const { getAccessToken } = useAuth();
  return new ApiClient(getAccessToken);
}