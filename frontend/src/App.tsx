// frontend/src/App.tsx
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/useAuth'

function AppContent() {
  const { user, signOut } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            HWM 401k Payment Tracker
          </h1>
          {user && (
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                Welcome, {user.name || user.email}
              </p>
              <button
                onClick={signOut}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Sign Out
              </button>
            </div>
          )}
          <p className="text-gray-600">
            Frontend foundation ready - Routes and components to be added in Sprint 6+
          </p>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App