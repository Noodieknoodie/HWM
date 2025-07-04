// frontend/src/stores/useAppStore.ts
import { create } from 'zustand';

interface Client {
  client_id: number;
  display_name: string;
  full_name: string;
  provider_name?: string;
  compliance_status?: 'green' | 'yellow';
}

interface AppState {
  // Selected client
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  
  // Document viewer state
  documentViewerOpen: boolean;
  toggleDocumentViewer: () => void;
  setDocumentViewerOpen: (open: boolean) => void;
  
  // API base configuration
  apiBase: string;
  setApiBase: (url: string) => void;
}

const useAppStore = create<AppState>((set) => ({
  // Selected client
  selectedClient: null,
  setSelectedClient: (client) => set({ selectedClient: client }),
  
  // Document viewer state
  documentViewerOpen: false,
  toggleDocumentViewer: () => set((state) => ({ documentViewerOpen: !state.documentViewerOpen })),
  setDocumentViewerOpen: (open) => set({ documentViewerOpen: open }),
  
  // API base configuration
  apiBase: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  setApiBase: (url) => set({ apiBase: url }),
}));

export default useAppStore;