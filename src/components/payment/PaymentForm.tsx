// src/components/payment/PaymentForm.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePeriods } from '@/hooks/usePeriods';
import { Payment, PaymentCreateData, PaymentUpdateData } from '@/hooks/usePayments';
import { useClientDashboard } from '@/hooks/useClientDashboard';
import { usePaymentDefaults } from '@/hooks/usePaymentDefaults';
import { getErrorMessage } from '@/utils/errorUtils';

interface PaymentFormProps {
  clientId: number;
  contractId: number | null;
  editingPayment: Payment | null;
  onSubmit: (data: PaymentCreateData | PaymentUpdateData) => Promise<void>;
  onCancel?: () => void;
  prefillPeriod?: {
    period: number;
    year: number;
    periodType: string;
  };
}

const PAYMENT_METHODS = [
  { value: 'Auto - ACH', label: 'Auto - ACH' },
  { value: 'Auto - Check', label: 'Auto - Check' },
  { value: 'Invoice - Check', label: 'Invoice - Check' },
  { value: 'Wire Transfer', label: 'Wire Transfer' },
  { value: 'Check', label: 'Check' },
];

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  const {
    clientId,
    contractId,
    editingPayment,
    onSubmit,
    onCancel,
    prefillPeriod,
  } = props;
  const { periods, loading: periodsLoading } = usePeriods(clientId);
  const { dashboardData } = useClientDashboard(clientId);
  const { defaults: paymentDefaults } = usePaymentDefaults(clientId);
  const formRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [formData, setFormData] = useState({
    received_date: new Date().toISOString().split('T')[0],
    total_assets: '',
    actual_fee: '',
    method: 'Check',
    notes: '',
    period_selection: prefillPeriod 
      ? `${prefillPeriod.year}-${prefillPeriod.period}`
      : '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  // Pre-fill AUM with suggested value when defaults are loaded
  useEffect(() => {
    if (!editingPayment && paymentDefaults?.suggested_aum && !formData.total_assets && !isDirty) {
      setFormData(prev => ({
        ...prev,
        total_assets: paymentDefaults.suggested_aum?.toString() || ''
      }));
    }
  }, [paymentDefaults, editingPayment, isDirty]);
  
  // Populate form when editing and handle focus/scroll
  useEffect(() => {
    if (editingPayment) {
      setFormData({
        received_date: editingPayment.received_date,
        total_assets: editingPayment.total_assets?.toString() || '',
        actual_fee: editingPayment.actual_fee.toString(),
        method: editingPayment.method || 'Check',
        notes: editingPayment.notes || '',
        period_selection: `${editingPayment.applied_period}-${editingPayment.applied_year}`,
      });
      
      // Scroll to form and focus first input
      scrollTimeoutRef.current = setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInputRef.current?.focus();
      }, 100);
    }
    
    // Cleanup function to clear timeout on unmount
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [editingPayment]);
  
  // Calculate expected fee based on contract - memoized for performance
  const expectedFee = useMemo(() => {
    if (!dashboardData || !formData.total_assets) return null;
    
    const assets = parseFloat(formData.total_assets);
    
    if (dashboardData.fee_type === 'percentage' && dashboardData.percent_rate) {
      // percent_rate is already scaled (e.g., 0.0007 for 0.07% monthly)
      // So just multiply by AUM to get dollar amount
      return assets * dashboardData.percent_rate;
    } else if (dashboardData.fee_type === 'flat' && dashboardData.flat_rate) {
      return dashboardData.flat_rate;
    }
    
    return null;
  }, [dashboardData, formData.total_assets]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!formData.period_selection) {
      setError('Please select a period');
      return;
    }
    
    if (!formData.actual_fee) {
      setError('Please enter the actual fee amount');
      return;
    }
    
    const periodParts = formData.period_selection.split('-').map(Number);
    const [year, period] = periodParts.length === 2 ? periodParts : [0, 0];
    
    if (!period || !year) {
      setError('Invalid period selection format');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Prevent form submission during periods loading
      if (periodsLoading) {
        setError('Please wait for periods to load');
        return;
      }
      
      if (!contractId) {
        setError('This client does not have an active contract. Please add a contract before recording payments.');
        return;
      }
      
      const data: PaymentCreateData | PaymentUpdateData = editingPayment ? {
        received_date: formData.received_date,
        total_assets: formData.total_assets ? parseFloat(formData.total_assets) : null,
        expected_fee: expectedFee,
        actual_fee: parseFloat(formData.actual_fee),
        method: formData.method,
        notes: formData.notes || null,
        applied_period_type: dashboardData?.payment_schedule || 'monthly',
        applied_period: period,
        applied_year: year,
      } : {
        contract_id: contractId || 0,
        client_id: clientId,
        received_date: formData.received_date,
        total_assets: formData.total_assets ? parseFloat(formData.total_assets) : null,
        expected_fee: expectedFee,
        actual_fee: parseFloat(formData.actual_fee),
        method: formData.method,
        notes: formData.notes || null,
        applied_period_type: dashboardData?.payment_schedule || 'monthly',
        applied_period: period,
        applied_year: year,
      };
      
      await onSubmit(data);
      
      // Reset form after successful submission
      if (!editingPayment) {
        setFormData({
          received_date: new Date().toISOString().split('T')[0],
          total_assets: '',
          actual_fee: '',
          method: 'Check',
          notes: '',
          period_selection: '',
        });
        setIsDirty(false);
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to save payment'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClear = () => {
    if (isDirty && !confirm('Are you sure you want to clear the form? Your changes will be lost.')) {
      return;
    }
    
    setFormData({
      received_date: new Date().toISOString().split('T')[0],
      total_assets: '',
      actual_fee: '',
      method: 'Check',
      notes: '',
      period_selection: '',
    });
    setIsDirty(false);
    setError(null);
    if (onCancel) onCancel();
  };
  
  return (
    <div 
      ref={formRef}
      className={`
        bg-white shadow-sm rounded-lg border p-6 transition-all duration-300
        ${editingPayment 
          ? 'border-blue-500 ring-4 ring-blue-100 shadow-lg' 
          : 'border-gray-200'
        }
      `}
    >
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {editingPayment ? 'Edit Payment' : 'Record New Payment'}
      </h3>
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Received Date */}
          <div>
            <label htmlFor="received_date" className="block text-sm font-medium text-gray-700">
              Received Date <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstInputRef}
              type="date"
              id="received_date"
              name="received_date"
              value={formData.received_date}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          {/* Payment Amount */}
          <div>
            <label htmlFor="actual_fee" className="block text-sm font-medium text-gray-700">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                id="actual_fee"
                name="actual_fee"
                value={formData.actual_fee}
                onChange={handleInputChange}
                required
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          {/* AUM */}
          <div>
            <label htmlFor="total_assets" className="block text-sm font-medium text-gray-700">
              AUM (Assets Under Management)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                id="total_assets"
                name="total_assets"
                value={formData.total_assets}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          {/* Payment Method */}
          <div>
            <label htmlFor="method" className="block text-sm font-medium text-gray-700">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              id="method"
              name="method"
              value={formData.method}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {PAYMENT_METHODS.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Applied Period */}
          <div>
            <label htmlFor="period_selection" className="block text-sm font-medium text-gray-700">
              Applied Period <span className="text-red-500">*</span>
            </label>
            <select
              id="period_selection"
              name="period_selection"
              value={formData.period_selection}
              onChange={handleInputChange}
              required
              disabled={periodsLoading || periods.length === 0}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select a period</option>
              {periods.map(period => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
            {periodsLoading && (
              <p className="mt-1 text-sm text-gray-500">Loading periods...</p>
            )}
            {!periodsLoading && periods.length === 0 && (
              <p className="mt-1 text-sm text-yellow-600">No available periods found</p>
            )}
          </div>
          
          {/* Expected Fee (display only) */}
          {expectedFee !== null && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Expected Fee
              </label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 rounded-md px-3 py-2 border border-gray-300">
                ${expectedFee.toFixed(2)}
              </div>
            </div>
          )}
        </div>
        
        {/* Notes and Actions Row */}
        <div className="flex gap-4">
          {/* Notes - takes up available space */}
          <div className="flex-1">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Optional notes about this payment"
            />
          </div>
          
          {/* Form Actions - fixed width */}
          <div className="flex flex-col justify-end space-y-2" style={{ minWidth: '160px' }}>
            <button
              type="button"
              onClick={handleClear}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              {editingPayment ? 'Cancel' : 'Clear'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-md text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (editingPayment ? 'Update Payment' : 'Record Payment')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;