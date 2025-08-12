// frontend/src/components/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import useAppStore from '@/stores/useAppStore';
import ClientSearch from './ClientSearch';
import { useDataApiClient } from '@/context/ApiContext';

interface Client {
  client_id: number;
  display_name: string;
  full_name: string;
  provider_name?: string;
  payment_status?: 'Due' | 'Paid';
}

const Sidebar: React.FC = () => {
  const selectedClient = useAppStore((state) => state.selectedClient);
  const setSelectedClient = useAppStore((state) => state.setSelectedClient);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showByProvider, setShowByProvider] = useState(false);
  
  const dataApiClient = useDataApiClient();
  
  // Load clients on mount
  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await dataApiClient.getClients();
        const clientList = Array.isArray(data) ? data : [];
        setClients(clientList);
        
        // Auto-select first client if none selected
        if (!selectedClient && clientList.length > 0) {
          setSelectedClient(clientList[0]);
        }
      } catch (err: any) {
        console.error('Error loading clients:', err);
        setError(err.error?.message || 'Failed to load clients');
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
  
  // Simple gray dot for items with pending entries (Due status)
  const StatusIcon: React.FC<{ status?: 'Due' | 'Paid' }> = ({ status }) => {
    // Only show gray dot for items with pending entries (Due status)
    if (status === 'Due') {
      return (
        <span className="w-2 h-2 bg-gray-400 rounded-full inline-block"></span>
      );
    }
    // Return nothing for Paid status (all caught up)
    return null;
  };
  
  if (error) {
    return (
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col fixed left-0 top-0 bottom-0 z-30 pt-14">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Clients</h2>
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
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col fixed left-0 top-0 bottom-0 z-30 pt-14">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Clients</h2>
        <ClientSearch clients={clients} isLoading={isLoading} />
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-medium text-gray-800">View by Provider</span>
          <button 
            className={`h-5 w-10 rounded-full relative transition-colors ${showByProvider ? 'bg-blue-600' : 'bg-gray-200'}`}
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
                  <div className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 rounded-md mb-1">
                    {provider}
                  </div>
                )}
                {providerClients.map(client => (
                  <button
                    key={client.client_id}
                    className={`w-full flex items-center py-2.5 px-3 mb-1 text-left rounded-md transition-all duration-200 ${
                      selectedClient?.client_id === client.client_id 
                        ? 'bg-blue-50 border border-blue-200 shadow-sm font-semibold text-blue-900 transform scale-[1.02]' 
                        : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm border border-transparent'
                    }`}
                    onClick={() => setSelectedClient(client)}
                  >
                    {selectedClient?.client_id === client.client_id && (
                      <svg className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    <span className="truncate flex-grow">{client.display_name}</span>
                    <span className="ml-2 flex-shrink-0">
                      <StatusIcon status={client.payment_status} />
                    </span>
                  </button>
                ))}
              </div>
            ))}
            
            {clients.length === 0 && (
              <div className="p-4 text-center text-gray-700">
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