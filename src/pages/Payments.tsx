// frontend/src/pages/Payments.tsx
import React, { useState } from 'react';
import useAppStore from '@/stores/useAppStore';
import { useClientDashboard } from '@/hooks/useClientDashboard';
import { usePayments, Payment, PaymentCreateData, PaymentUpdateData } from '@/hooks/usePayments';
import { PlanDetailsCard } from '@/components/dashboard/cards/PlanDetailsCard';
import { CurrentStatusCard } from '@/components/dashboard/cards/CurrentStatusCard';
import { AssetsAndFeesCard } from '@/components/dashboard/cards/AssetsAndFeesCard';
import { ContactCard } from '@/components/dashboard/cards/ContactCard';
import PaymentForm from '@/components/payment/PaymentForm';
import PaymentHistory from '@/components/payment/PaymentHistory';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ErrorAlert, WarningAlert } from '@/components/Alert';

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.error) return error.error;
  if (error?.message) return error.message;
  return 'An error occurred';
};

const Payments: React.FC = () => {
  const selectedClient = useAppStore((state) => state.selectedClient);
  const documentViewerOpen = useAppStore((state) => state.documentViewerOpen);
  const { dashboardData, loading, error } = useClientDashboard(selectedClient?.client_id || null);
  
  // Payment form and history state
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  // Payment hooks
  const {
    payments,
    loading: paymentsLoading,
    error: paymentsError,
    createPayment,
    updatePayment,
    deletePayment,
  } = usePayments(selectedClient?.client_id || null, { year: selectedYear });
  
  return (
    <div className="space-y-6">
      {selectedClient ? (
        <>
          {/* Client name header - Updated to match Version A */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div>
                {selectedClient.full_name && (
                  <div className="text-sm text-dark-400 mb-1 uppercase tracking-wider">
                    {selectedClient.full_name}
                  </div>
                )}
                <h1 className="text-3xl font-bold text-dark-700">
                  {selectedClient.display_name}
                </h1>
                <div className="h-1 w-full mt-2 bg-gradient-to-r from-primary-600 to-primary-200 rounded-full"></div>
              </div>
            </div>
            <button
              onClick={() => useAppStore.getState().toggleDocumentViewer()}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-sm transition-all duration-200
                ${documentViewerOpen
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md'
                  : 'bg-white border border-light-400 text-dark-600 hover:bg-light-200 hover:border-primary-400'}
              `}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={documentViewerOpen ? 'text-white' : 'text-primary-500'}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span className="font-medium">{documentViewerOpen ? "Hide Documents" : "View Documents"}</span>
            </button>
          </div>

          {/* Error state */}
          {error && (
            <ErrorAlert message={getErrorMessage(error)} />
          )}

          {/* Dashboard cards - New 4-card layout with better spacing */}
          <div className={`grid gap-4 ${
            documentViewerOpen 
              ? 'lg:grid-cols-2 xl:grid-cols-2' 
              : 'lg:grid-cols-2 xl:grid-cols-4'
          } grid-cols-1 sm:grid-cols-2`}>
            {dashboardData && !loading && (
              <>
                <ErrorBoundary>
                  <PlanDetailsCard dashboardData={dashboardData} />
                </ErrorBoundary>
                <ErrorBoundary>
                  <CurrentStatusCard dashboardData={dashboardData} />
                </ErrorBoundary>
                <ErrorBoundary>
                  <AssetsAndFeesCard dashboardData={dashboardData} />
                </ErrorBoundary>
                <ErrorBoundary>
                  <ContactCard dashboardData={dashboardData} />
                </ErrorBoundary>
              </>
            )}
            {(loading || (!dashboardData && !error)) && (
              <>
                {/* Loading skeletons for 4 cards */}
                {[1, 2, 3, 4].map((index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm p-6 h-full animate-pulse">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-gray-200 rounded mr-3"></div>
                      <div className="h-6 w-32 bg-gray-200 rounded"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-5 w-full bg-gray-200 rounded"></div>
                      <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
                      <div className="h-5 w-1/2 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Payment Form and History - Fixed TypeScript error */}
          <div className="space-y-6 relative">
            {/* Overlay when editing */}
            {editingPayment && (
              <div className="fixed inset-0 bg-black bg-opacity-10 z-10 pointer-events-none" />
            )}
            
            <ErrorBoundary>
              <div className={editingPayment ? 'relative z-20' : ''}>
                <PaymentForm
                  clientId={selectedClient.client_id}
                  contractId={dashboardData?.contract_id || null}
                  editingPayment={editingPayment}
                  onSubmit={async (data) => {
                    if (editingPayment) {
                      await updatePayment(editingPayment.payment_id, data as PaymentUpdateData);
                    } else {
                      await createPayment(data as PaymentCreateData);
                    }
                    setEditingPayment(null);
                  }}
                  onCancel={() => setEditingPayment(null)}
                />
              </div>
            </ErrorBoundary>
            
            <ErrorBoundary>
              <div className={editingPayment ? 'opacity-50 pointer-events-none' : ''}>
                <PaymentHistory
                  payments={payments}
                  loading={paymentsLoading}
                  error={paymentsError}
                  onEdit={setEditingPayment}
                  onDelete={deletePayment}
                  selectedYear={selectedYear}
                  onYearChange={setSelectedYear}
                />
              </div>
            </ErrorBoundary>
          </div>
        </>
      ) : (
        <WarningAlert 
          title="No client selected" 
          message="Please select a client from the sidebar to view payment information." 
        />
      )}
    </div>
  );
};

export default Payments;