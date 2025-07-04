// frontend/src/App.tsx
import { BrowserRouter } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              HWM 401k Payment Tracker
            </h1>
            <p className="text-gray-600">
              Frontend foundation ready - Routes and components to be added in Sprint 6+
            </p>
          </div>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App