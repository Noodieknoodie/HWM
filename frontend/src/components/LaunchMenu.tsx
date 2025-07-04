// frontend/src/components/LaunchMenu.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Module {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  enabled: boolean;
}

const LaunchMenu: React.FC = () => {
  const navigate = useNavigate();
  
  const modules: Module[] = [
    {
      id: 'payments',
      name: '401k Payments',
      description: 'Track and manage client 401k payment records',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.65 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.65-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      path: '/payments',
      enabled: true,
    },
    {
      id: 'contracts',
      name: 'Contracts',
      description: 'Manage client contracts and fee structures',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      path: '/contracts',
      enabled: false,
    },
    {
      id: 'reports',
      name: 'Reports',
      description: 'Generate financial reports and analytics',
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      path: '/reports',
      enabled: false,
    },
  ];
  
  const handleModuleClick = (module: Module) => {
    if (module.enabled) {
      navigate(module.path);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px]">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to 401k Payment Tracker</h2>
        <p className="text-lg text-gray-600">Select a module to get started</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {modules.map((module) => (
          <button
            key={module.id}
            onClick={() => handleModuleClick(module)}
            disabled={!module.enabled}
            className={`group relative rounded-lg p-6 ${
              module.enabled
                ? 'bg-white hover:bg-gray-50 shadow-md hover:shadow-lg transition-all cursor-pointer'
                : 'bg-gray-100 cursor-not-allowed opacity-60'
            }`}
          >
            <div className={`${module.enabled ? 'text-blue-600' : 'text-gray-400'} mb-4`}>
              {module.icon}
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${
              module.enabled ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {module.name}
            </h3>
            <p className={`text-sm ${
              module.enabled ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {module.description}
            </p>
            {!module.enabled && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-100 bg-opacity-90">
                <span className="text-gray-600 font-medium">Coming Soon</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LaunchMenu;