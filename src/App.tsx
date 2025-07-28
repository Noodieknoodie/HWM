//src/App.tsx
import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useDataApiClient } from './api/client'
import { useAuth } from './auth/useAuth'
import PageLayout from './components/PageLayout'
import ErrorBoundary from './components/ErrorBoundary'
import * as microsoftTeams from '@microsoft/teams-js'
import { isInTeams } from './teamsAuth'

// Lazy load all route components for code splitting
const Summary = lazy(() => import('./pages/Summary'))
const Payments = lazy(() => import('./pages/Payments'))
const Export = lazy(() => import('./pages/Export'))
// Uncomment these when re-enabling routes
// const Documents = lazy(() => import('./pages/Documents'))
// const Contacts = lazy(() => import('./pages/Contacts'))
// const Contracts = lazy(() => import('./pages/Contracts'))

function TeamsRedirect() {
  useEffect(() => {
    microsoftTeams.app.initialize().then(() => {
      setTimeout(() => {
        microsoftTeams.app.openLink('https://green-rock-024c27f1e.1.azurestaticapps.net');
      }, 1000);
    }).catch(() => {
      // If Teams SDK fails, try simple redirect
      window.open('https://green-rock-024c27f1e.1.azurestaticapps.net', '_blank');
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Opening HWM 401k Tracker...
        </h1>
        <p className="text-gray-600">
          Redirecting to your browser for the best experience
        </p>
        <div className="mt-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  // Check Teams context before any auth
  if (isInTeams()) {
    return <TeamsRedirect />;
  }
  
  const { user, loading } = useAuth();
  const dataApiClient = useDataApiClient();
  
  
  // Pre-cache client list AND summary data when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      // Fire and forget - don't wait for these
      Promise.all([
        // Pre-cache client list
        dataApiClient.getClients().catch(() => {}),
        
        // Pre-cache current quarter summary data
        (() => {
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentQ = Math.ceil(currentMonth / 3);
          const year = currentQ === 1 ? now.getFullYear() - 1 : now.getFullYear();
          const quarter = currentQ === 1 ? 4 : currentQ - 1;
          
          return dataApiClient.getQuarterlyPageData(year, quarter).catch(() => {});
        })()
      ]);
    }
  }, [user, loading]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          {/* Logo/Brand area */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              HWM
            </h1>
            <p className="text-gray-600 text-sm tracking-widest">401K TRACKER</p>
          </div>

          {/* Simple abstract loading animation */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            {/* Three orbiting dots */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 rounded-full"></div>
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDelay: '1s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-600 rounded-full"></div>
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDelay: '2s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-600 rounded-full"></div>
            </div>
            
            {/* Center shape morphing */}
            <div className="absolute inset-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full animate-pulse opacity-80"></div>
          </div>

          {/* Simple status text */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">
              Securing your session
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h1>
          <p className="text-gray-600">
            Please sign in with your Microsoft account
          </p>
        </div>
      </div>
    );
  }
  
  // Simple loading component for lazy-loaded routes
  const RouteLoader = () => (
    <div className="flex items-center justify-center h-64">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
  
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<PageLayout />}>
          <Route index element={<Navigate to="/Summary" replace />} />
          <Route path="Summary" element={<Summary />} />
          <Route path="Payments" element={<Payments />} />
          {/* <Route path="Contacts" element={<Contacts />} /> */}
          {/* <Route path="Contracts" element={<Contracts />} /> */}
          <Route path="Export" element={<Export />} />
          {/* <Route path="Documents" element={<Documents />} /> */}
          <Route path="*" element={<Navigate to="/Summary" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ 
        v7_startTransition: true,
        v7_relativeSplatPath: true 
      }}>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App