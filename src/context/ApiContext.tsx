import React, { createContext, useContext, useEffect, useState } from 'react';
import { DataApiClient } from '../api/client';
import { MockDataApiClient } from '../api/mockClient';
import { useAuth } from '../auth/useAuth';

// Organization domain to check for
const ORGANIZATION_DOMAIN = '@hohimerwealthmanagement.com';

interface ApiContextType {
  apiClient: DataApiClient | MockDataApiClient;
  isUsingMockData: boolean;
}

const ApiContext = createContext<ApiContextType | null>(null);

function isOrganizationalMember(userDetails: string | null): boolean {
  if (!userDetails) return false;
  
  // Check if email domain matches organization
  return userDetails.toLowerCase().includes(ORGANIZATION_DOMAIN.toLowerCase());
}

// Singleton instances
let realClient: DataApiClient | null = null;
let mockClient: MockDataApiClient | null = null;

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [apiClient, setApiClient] = useState<DataApiClient | MockDataApiClient>(() => {
    // Initialize with mock client by default (safer for non-org users)
    if (!mockClient) {
      mockClient = new MockDataApiClient();
    }
    return mockClient;
  });
  const [isUsingMockData, setIsUsingMockData] = useState(true);

  useEffect(() => {
    // For local development, always use real client
    if (window.location.hostname === 'localhost') {
      if (!realClient) {
        realClient = new DataApiClient();
      }
      setApiClient(realClient);
      setIsUsingMockData(false);
      console.log('[API Client] Using REAL data client for localhost development');
      return;
    }

    // Check if user is organizational member
    if (user) {
      if (isOrganizationalMember(user.userDetails)) {
        if (!realClient) {
          realClient = new DataApiClient();
        }
        setApiClient(realClient);
        setIsUsingMockData(false);
        console.log(`[API Client] Using REAL data client for organizational member: ${user.userDetails}`);
      } else {
        if (!mockClient) {
          mockClient = new MockDataApiClient();
        }
        setApiClient(mockClient);
        setIsUsingMockData(true);
        console.log(`[API Client] Using MOCK data client for non-organizational user: ${user.userDetails || 'anonymous'}`);
      }
    }
  }, [user]);

  return (
    <ApiContext.Provider value={{ apiClient, isUsingMockData }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApiContext() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApiContext must be used within an ApiProvider');
  }
  return context;
}

// Convenience hook to get just the client
export function useDataApiClient() {
  const { apiClient } = useApiContext();
  return apiClient;
}