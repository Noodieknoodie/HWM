// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import PageLayout from './components/PageLayout'
import Payments from './pages/Payments'
import Documents from './pages/Documents'
import Summary from './pages/Summary'
import Contacts from './pages/Contacts'
import Contracts from './pages/Contracts'
import Export from './pages/Export'
import ErrorBoundary from './components/ErrorBoundary'

function AppContent() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Loading...
          </h1>
          <p className="text-gray-600">
            Verifying authentication
          </p>
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
        <Route index element={<Navigate to="/Payments" replace />} />
        <Route path="Payments" element={<Payments />} />
        <Route path="Summary" element={<Summary />} />
        <Route path="Contacts" element={<Contacts />} />
        <Route path="Contracts" element={<Contracts />} />
        <Route path="Export" element={<Export />} />
        <Route path="Documents" element={<Documents />} />
        <Route path="*" element={<Navigate to="/Payments" replace />} />
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