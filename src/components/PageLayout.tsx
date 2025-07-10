// frontend/src/components/PageLayout.tsx
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import useAppStore from '@/stores/useAppStore';

const PageLayout: React.FC = () => {
  const documentViewerOpen = useAppStore((state) => state.documentViewerOpen);
  const location = useLocation();
  
  // Show sidebar only on payments page
  const showSidebar = location.pathname === '/Payments';
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <Sidebar />}
        
        <main className={`flex-1 overflow-y-auto transition-all duration-300 ${documentViewerOpen ? 'mr-96' : ''}`}>
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
        
        {/* Document Viewer Placeholder */}
        {documentViewerOpen && (
          <div className="fixed right-0 top-14 h-[calc(100vh-3.5rem)] w-96 bg-white shadow-xl z-40 border-l border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Document Viewer</h3>
                <button
                  onClick={() => useAppStore.getState().setDocumentViewerOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center h-full pb-20">
              <p className="text-gray-500">Coming Soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageLayout;