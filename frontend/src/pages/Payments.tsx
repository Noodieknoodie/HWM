// frontend/src/pages/Payments.tsx
import React, { useState } from 'react';
import useAppStore from '@/stores/useAppStore';
import { useClientDashboard } from '@/hooks/useClientDashboard';
import { usePayments, Payment } from '@/hooks/usePayments';
import ContractCard from '@/components/dashboard/ContractCard';
import PaymentInfoCard from '@/components/dashboard/PaymentInfoCard';
import ComplianceCard from '@/components/dashboard/ComplianceCard';
import PaymentForm from '@/components/payment/PaymentForm';
import PaymentHistory from '@/components/payment/PaymentHistory';

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
      <div className="border-b border-gray-200 pb-5">
        <h2 className="text-2xl font-bold text-gray-900">401k Payments</h2>
        <p className="mt-2 text-sm text-gray-600">
          Track and manage client payment records
        </p>
      </div>
      
      {selectedClient ? (
        <>
          {/* Client name header */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">
              {selectedClient.display_name}
            </h3>
            <button
              onClick={() => useAppStore.getState().toggleDocumentViewer()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {documentViewerOpen ? 'Hide' : 'View'} Documents
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
                    <p>{error}</p>
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
            <ContractCard 
              contract={dashboardData?.contract || null} 
              loading={loading}
            />
            <PaymentInfoCard 
              paymentStatus={dashboardData?.payment_status || null}
              metrics={dashboardData?.metrics || null}
              loading={loading}
            />
            <ComplianceCard 
              compliance={dashboardData?.compliance || null}
              paymentStatus={dashboardData?.payment_status || null}
              contract={dashboardData?.contract || null}
              loading={loading}
            />
          </div>

          {/* Payment Form and History */}
          <div className="space-y-6">
            <PaymentForm
              clientId={selectedClient.client_id}
              contractId={dashboardData?.contract?.contract_id || null}
              editingPayment={editingPayment}
              onSubmit={async (data) => {
                if (editingPayment) {
                  await updatePayment(editingPayment.payment_id, data);
                } else {
                  await createPayment(data);
                }
                setEditingPayment(null);
              }}
              onCancel={() => setEditingPayment(null)}
            />
            
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