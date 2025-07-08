// frontend/src/pages/Payments.tsx
import React, { useState } from 'react';
import useAppStore from '@/stores/useAppStore';
import { useClientDashboard } from '@/hooks/useClientDashboard';
import { usePayments, Payment, PaymentCreateData, PaymentUpdateData } from '@/hooks/usePayments';
import ContractCard from '@/components/dashboard/ContractCard';
import PaymentInfoCard from '@/components/dashboard/PaymentInfoCard';
import ComplianceCard from '@/components/dashboard/ComplianceCard';
import PaymentForm from '@/components/payment/PaymentForm';
import PaymentHistory from '@/components/payment/PaymentHistory';
import ErrorBoundary from '@/components/ErrorBoundary';

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.error) return error.error;
  if (error?.message) return error.message;
  return 'An error occurred';
};

const Payments: React.FC = () => {
  const selectedClient = useAppStore((state) => state.selectedClient);
  const documentViewerOpen = useAppStore((state) => state.documentViewerOpen);
  const { data: dashboardData, loading, error } = useClientDashboard(selectedClient?.client_id || null);
  
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
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{getErrorMessage(error)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard cards */}
          <div className={`grid gap-6 ${
            documentViewerOpen 
              ? 'lg:grid-cols-2' 
              : 'lg:grid-cols-3'
          } grid-cols-1`}>
            <ErrorBoundary>
              <ContractCard 
                contract={dashboardData?.contract || null} 
                loading={loading}
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <PaymentInfoCard 
                paymentStatus={dashboardData?.payment_status || null}
                metrics={dashboardData?.metrics || null}
                loading={loading}
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <ComplianceCard 
                compliance={dashboardData?.compliance || null}
                paymentStatus={dashboardData?.payment_status || null}
                contract={dashboardData?.contract || null}
                loading={loading}
              />
            </ErrorBoundary>
          </div>

          {/* Payment Form and History - Fixed TypeScript error */}
          <div className="space-y-6">
            <ErrorBoundary>
              <PaymentForm
                clientId={selectedClient.client_id}
                contractId={dashboardData?.contract?.contract_id || null}
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
            </ErrorBoundary>
            
            <ErrorBoundary>
              <PaymentHistory
                payments={payments}
                loading={paymentsLoading}
                error={paymentsError}
                onEdit={setEditingPayment}
                onDelete={deletePayment}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
              />
            </ErrorBoundary>
          </div>
        </>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                No client selected
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please select a client from the sidebar to view payment information.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;