// src/components/ComingSoonPage.tsx
import React from 'react';

interface ComingSoonPageProps {
  title: string;
}

const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title }) => {
  return (
    <div className="bg-white shadow rounded-lg p-12">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">This feature is coming soon.</p>
      </div>
    </div>
  );
};

export default ComingSoonPage;