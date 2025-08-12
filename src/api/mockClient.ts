import { AzureApiError } from './client';
import { Contact } from '../types/contact';

// Load mock database on initialization
let mockDatabase: any = null;

async function loadMockDatabase() {
  if (!mockDatabase) {
    try {
      const response = await fetch('/mock-data/database.json');
      mockDatabase = await response.json();
    } catch (error) {
      console.error('Failed to load mock database:', error);
      throw error;
    }
  }
  return mockDatabase;
}

export class MockDataApiClient {
  private async getMockData() {
    return await loadMockDatabase();
  }

  async request<T>(
    entity: string,
    options: RequestInit = {}
  ): Promise<T> {
    const db = await this.getMockData();
    const method = options.method || 'GET';
    
    // Parse the entity string to understand what's being requested
    const parts = entity.split('/');
    const tableName = parts[0];
    const resourceId = parts[1];
    const queryParams = new URLSearchParams(entity.split('?')[1] || '');
    
    try {
      if (method === 'GET') {
        return this.handleGet<T>(db, tableName, resourceId, queryParams);
      } else if (method === 'POST') {
        return this.handlePost<T>(db, tableName, options.body);
      } else if (method === 'PATCH') {
        return this.handlePatch<T>(db, tableName, resourceId, options.body);
      } else if (method === 'DELETE') {
        return this.handleDelete<T>(db, tableName, resourceId);
      }
      
      throw new Error(`Unsupported method: ${method}`);
    } catch (error: any) {
      // Format error as Azure API error
      const apiError: AzureApiError = {
        error: {
          code: 'MOCK_DATA_ERROR',
          message: error.message || 'Mock data operation failed'
        }
      };
      throw apiError;
    }
  }

  private handleGet<T>(db: any, tableName: string, resourceId: string, queryParams: URLSearchParams): T {
    // Handle views first
    if (tableName.includes('_view') || tableName.includes('_data')) {
      const viewData = db.views[tableName];
      if (!viewData) {
        // If view doesn't exist in mock, try to construct from tables
        return this.constructViewData<T>(db, tableName, queryParams);
      }
      
      // Apply filters
      let result = [...viewData];
      
      // Handle $filter parameter
      const filter = queryParams.get('$filter');
      if (filter) {
        result = this.applyFilter(result, filter);
      }
      
      // Handle $orderby parameter
      const orderBy = queryParams.get('$orderby');
      if (orderBy) {
        result = this.applyOrderBy(result, orderBy);
      }
      
      // Handle $top parameter
      const top = queryParams.get('$top');
      if (top) {
        result = result.slice(0, parseInt(top));
      }
      
      return { value: result } as T;
    }
    
    // Handle table data
    const tableData = db.tables[tableName];
    if (!tableData) {
      throw new Error(`Table ${tableName} not found in mock database`);
    }
    
    // If specific ID requested
    if (resourceId) {
      const idField = this.getIdField(tableName);
      const item = tableData.find((row: any) => row[idField]?.toString() === resourceId);
      if (!item) {
        throw new Error(`Resource ${resourceId} not found in ${tableName}`);
      }
      return { value: [item] } as T;
    }
    
    // Return all data with filters applied
    let result = [...tableData];
    
    const filter = queryParams.get('$filter');
    if (filter) {
      result = this.applyFilter(result, filter);
    }
    
    const orderBy = queryParams.get('$orderby');
    if (orderBy) {
      result = this.applyOrderBy(result, orderBy);
    }
    
    const top = queryParams.get('$top');
    if (top) {
      result = result.slice(0, parseInt(top));
    }
    
    return { value: result } as T;
  }

  private handlePost<T>(_db: any, _tableName: string, body: any): T {
    // Mock doesn't actually persist, just return success
    const data = JSON.parse(body || '{}');
    return { value: [{ ...data, id: Math.random() }] } as T;
  }

  private handlePatch<T>(_db: any, _tableName: string, resourceId: string, body: any): T {
    // Mock doesn't actually persist, just return success
    const data = JSON.parse(body || '{}');
    return { value: [{ ...data, id: resourceId }] } as T;
  }

  private handleDelete<T>(_db: any, _tableName: string, _resourceId: string): T {
    // Mock doesn't actually persist, just return success
    return { value: [] } as T;
  }

  private getIdField(tableName: string): string {
    const idFields: Record<string, string> = {
      clients_all: 'client_id',
      contacts: 'contact_id',
      contracts: 'contract_id',
      payments: 'payment_id',
      quarterly_notes: 'client_id',
      payment_periods: 'period_type'
    };
    return idFields[tableName] || 'id';
  }

  private applyFilter(data: any[], filter: string): any[] {
    // Parse simple filters like "client_id eq 123" or "year eq 2024"
    const parts = filter.split(' ');
    if (parts.length >= 3) {
      const field = parts[0];
      const operator = parts[1];
      const value = parts.slice(2).join(' ').replace(/'/g, '');
      
      if (operator === 'eq') {
        return data.filter(item => item[field]?.toString() === value);
      } else if (operator === 'ne') {
        return data.filter(item => item[field]?.toString() !== value);
      } else if (operator === 'gt') {
        return data.filter(item => item[field] > value);
      } else if (operator === 'ge') {
        return data.filter(item => item[field] >= value);
      } else if (operator === 'lt') {
        return data.filter(item => item[field] < value);
      } else if (operator === 'le') {
        return data.filter(item => item[field] <= value);
      }
    }
    
    // Handle compound filters with 'and'
    if (filter.includes(' and ')) {
      const filters = filter.split(' and ');
      let result = data;
      for (const f of filters) {
        result = this.applyFilter(result, f.trim());
      }
      return result;
    }
    
    return data;
  }

  private applyOrderBy(data: any[], orderBy: string): any[] {
    const parts = orderBy.split(' ');
    const field = parts[0];
    const direction = parts[1]?.toLowerCase() || 'asc';
    
    return [...data].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (direction === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });
  }

  // Client entity methods
  async getClients() {
    return this.request('sidebar_clients_view');
  }

  async createClient(data: any) {
    return this.request('clients_all', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: number, data: any) {
    return this.request(`clients_all/client_id/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: number) {
    return this.request(`clients_all/client_id/${id}`, {
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

  // Payment entity methods
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

  // Period methods
  async getAvailablePeriods(clientId: number) {
    return this.request(`payment_form_periods_view?$filter=client_id eq ${clientId}`);
  }

  // Dashboard data
  async getDashboardData(clientId: number) {
    const response = await this.request(`dashboard_view?$filter=client_id eq ${clientId}`);
    return Array.isArray(response) ? response[0] : response;
  }
  
  // Payment form defaults
  async getPaymentDefaults(clientId: number) {
    const response = await this.request(`payment_form_defaults_view?$filter=client_id eq ${clientId}`);
    return Array.isArray(response) ? response[0] : response;
  }

  // Contact entity methods
  async getContacts(clientId: number): Promise<Contact[]> {
    const response = await this.request<{ value: Contact[] }>(`contacts?$filter=client_id eq ${clientId}`);
    return response.value;
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

  private constructViewData<T>(db: any, viewName: string, _queryParams: URLSearchParams): T {
    // Construct common views from table data
    if (viewName === 'sidebar_clients_view') {
      const clients = db.tables.clients_all || [];
      const contracts = db.tables.contracts || [];
      const payments = db.tables.payments || [];
      
      const result = clients.map((client: any) => {
        const contract = contracts.find((c: any) => c.client_id === client.client_id);
        const recentPayments = payments.filter((p: any) => p.client_id === client.client_id);
        const latestPayment = recentPayments.sort((a: any, b: any) => 
          new Date(b.received_date).getTime() - new Date(a.received_date).getTime()
        )[0];
        
        return {
          client_id: client.client_id,
          display_name: client.display_name,
          full_name: client.full_name,
          provider_name: contract?.provider_name || 'Unknown',
          payment_status: latestPayment ? 'Paid' : 'Due'
        };
      });
      
      return { value: result } as T;
    }
    
    if (viewName === 'dashboard_view') {
      const clients = db.tables.clients_all || [];
      const contracts = db.tables.contracts || [];
      
      const result = clients.map((client: any) => {
        const contract = contracts.find((c: any) => c.client_id === client.client_id);
        return {
          client_id: client.client_id,
          display_name: client.display_name,
          full_name: client.full_name,
          provider_name: contract?.provider_name || 'Unknown',
          fee_type: contract?.fee_type || 'unknown',
          percent_rate: contract?.percent_rate,
          flat_rate: contract?.flat_rate,
          payment_schedule: contract?.payment_schedule || 'unknown'
        };
      });
      
      return { value: result } as T;
    }
    
    // Return empty array for unimplemented views
    return { value: [] } as T;
  }
}