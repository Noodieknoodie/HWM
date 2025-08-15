import { AlertCircle } from 'lucide-react';

export function DemoBanner() {
  const isDemoMode = sessionStorage.getItem('demoMode') === 'true';
  
  if (!isDemoMode) return null;
  
  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center flex items-center justify-center gap-2">
      <AlertCircle className="h-5 w-5" />
      <span className="font-medium">DEMO MODE - Using Sample Data</span>
      <span className="text-sm opacity-90">| This is not real client data</span>
    </div>
  );
}