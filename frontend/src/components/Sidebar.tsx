// frontend/src/components/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import useAppStore from '@/stores/useAppStore';
import ClientSearch from './ClientSearch';
import { useApiClient } from '@/api/client';

interface Client {
  client_id: number;
  display_name: string;
  full_name: string;
  provider_name?: string;
  compliance_status?: 'green' | 'yellow';
}

const Sidebar: React.FC = () => {
  const selectedClient = useAppStore((state) => state.selectedClient);
  const setSelectedClient = useAppStore((state) => state.setSelectedClient);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showByProvider, setShowByProvider] = useState(false);
  
  const apiClient = useApiClient();
  
  // Load clients on mount
  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiClient.getClients();
        setClients(data as Client[]);
      } catch (err: any) {
        console.error('Error loading clients:', err);
        setError(err?.error?.message || 'Failed to load clients');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClients();
  }, []);
  
  // Group clients by provider
  const groupClientsByProvider = (): [string, Client[]][] => {
    if (!showByProvider) {
      return [['All', clients]];
    }
    
    return Object.entries(
      clients.reduce((acc, client) => {
        const provider = client.provider_name || 'No Provider';
        if (!acc[provider]) acc[provider] = [];
        acc[provider].push(client);
        return acc;
      }, {} as Record<string, Client[]>)
    ).sort((a, b) => a[0].localeCompare(b[0]));
  };
  
  const groupedClients = groupClientsByProvider();
  
  // Get the status icon based on compliance status (binary: green or yellow)
  const StatusIcon: React.FC<{ status?: 'green' | 'yellow' }> = ({ status }) => {
    if (status === 'green') {
      return (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-green-500"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      );
    } else {
      // Default to yellow for 'Due' status
      return (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="text-yellow-500"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      );
    }
  };
  
  if (error) {
    return (
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-dark-700 mb-4">Clients</h2>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">{typeof error === 'string' ? error : 'Failed to load clients'}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full lg:relative lg:translate-x-0 transition-transform duration-300">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-dark-700 mb-4">Clients</h2>
        <ClientSearch clients={clients} isLoading={isLoading} />
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-medium text-dark-600">View by Provider</span>
          <button 
            className={`h-5 w-10 rounded-full relative transition-colors ${showByProvider ? 'bg-primary-600' : 'bg-gray-200'}`}
            onClick={() => setShowByProvider(!showByProvider)}
            disabled={isLoading}
          >
            <div 
              className={`absolute w-3 h-3 rounded-full bg-white top-1 transition-all ${
                showByProvider ? 'right-1' : 'left-1'
              }`}
            ></div>
          </button>
        </div>
      </div>
      
      <div className="p-2 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {groupedClients.map(([provider, providerClients]) => (
              <div key={provider} className="mb-2">
                {showByProvider && (
                  <div className="px-3 py-2 text-xs font-semibold text-dark-500 bg-light-200 rounded-md mb-1">
                    {provider}
                  </div>
                )}
                {providerClients.map(client => (
                  <button
                    key={client.client_id}
                    className={`w-full flex items-center py-2 px-3 mb-1 text-left rounded transition-colors ${
                      selectedClient?.client_id === client.client_id 
                        ? 'bg-gray-100 border-l-4 border-primary-600 font-medium text-dark-700' 
                        : 'text-dark-600 hover:bg-light-200'
                    }`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <span className="truncate flex-grow">{client.display_name}</span>
                    <span className="ml-2 flex-shrink-0">
                      <StatusIcon status={client.compliance_status} />
                    </span>
                  </button>
                ))}
              </div>
            ))}
            
            {clients.length === 0 && (
              <div className="p-4 text-center text-dark-500">
                No clients available
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;