//src/App.tsx
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useDataApiClient } from './api/client'
import { useAuth } from './auth/useAuth'
import PageLayout from './components/PageLayout'
import Payments from './pages/Payments'
// import Documents from './pages/Documents'
import Summary from './pages/Summary'
// import Contacts from './pages/Contacts'
// import Contracts from './pages/Contracts'
import ErrorBoundary from './components/ErrorBoundary'
import Export from './pages/Export'

function AppContent() {
  const { user, loading } = useAuth();
  const dataApiClient = useDataApiClient();
  
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