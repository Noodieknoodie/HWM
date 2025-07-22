// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthUnified } from './auth/useAuthUnified'
import { useEffect } from 'react'
import { useDataApiClient } from './api/client'
import PageLayout from './components/PageLayout'
import Payments from './pages/Payments'
// import Documents from './pages/Documents'
import Summary from './pages/Summary'
// import Contacts from './pages/Contacts'
// import Contracts from './pages/Contracts'
import Export from './pages/Export'
import ErrorBoundary from './components/ErrorBoundary'

function AppContent() {
  const { user, loading, isTeams } = useAuthUnified();
  const dataApiClient = useDataApiClient();
  
  // Set Teams token when available
  useEffect(() => {
    if (isTeams && user) {
      // Extract token from user details if stored there
      // For now, we need to get it directly from Teams SDK
      import('@microsoft/teams-js').then(({ authentication }) => {
        authentication.getAuthToken()
          .then(token => dataApiClient.setToken(token))
          .catch(err => console.error('Failed to get Teams token:', err));
      });
    }
  }, [isTeams, user, dataApiClient]);
  
  // Pre-cache client list when user is authenticated
  useEffect(() => {
    if (user && !loading) {
      // Fire and forget - don't wait for it
      dataApiClient.getClients().catch(() => {
        // Silently fail - sidebar will load it anyway
      });
    }
  }, [user, loading]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          {/* Logo/Brand area */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              HWM 401k Tracker
            </h1>
            <p className="text-gray-600">Hohimer Wealth Management</p>
          </div>

          {/* Loading animation */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            {/* Outer ring */}
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            
            {/* Spinning gradient ring */}
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            
            {/* Inner pulse */}
            <div className="absolute inset-4 bg-blue-600 rounded-full animate-pulse opacity-20"></div>
            
            {/* Center dot */}
            <div className="absolute inset-8 bg-blue-600 rounded-full"></div>
          </div>

          {/* Loading text with fade animation */}
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900 animate-pulse">
              Authenticating...
            </p>
            <p className="text-sm text-gray-500">
              Connecting to Microsoft Azure
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center space-x-2 mt-6">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
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
  
  return (
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