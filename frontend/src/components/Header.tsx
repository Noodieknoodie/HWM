// frontend/src/components/Header.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import useAppStore from '../stores/useAppStore';

const Header: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { selectedClient, toggleDocumentViewer } = useAppStore();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">401k Payment Tracker</h1>
            
            <nav className="ml-10 flex space-x-8">
              <Link
                to="/"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                  isActive('/') 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Home
              </Link>
              <Link
                to="/payments"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                  isActive('/payments') 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Payments
              </Link>
              <Link
                to="/documents"
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                  isActive('/documents') 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Documents
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {selectedClient && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Current Client: <span className="font-medium">{selectedClient.display_name}</span>
                </span>
                <button
                  onClick={toggleDocumentViewer}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Documents
                </button>
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-700">{user?.userDetails}</span>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;