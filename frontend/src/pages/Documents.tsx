// frontend/src/pages/Documents.tsx
import React from 'react';

const Documents: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
        <p className="mt-2 text-sm text-gray-600">
          View and manage client documents
        </p>
      </div>
      
      <div className="bg-white shadow rounded-lg p-12">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Document Management</h3>
          <p className="mt-1 text-sm text-gray-500">
            This feature is coming soon. Document viewing and management functionality will be added in a future update.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Documents;