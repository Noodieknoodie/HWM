// frontend/src/components/payment/PaymentForm.tsx
import React, { useState, useEffect } from 'react';
import { usePeriods } from '@/hooks/usePeriods';
import { Payment, PaymentCreateData, PaymentUpdateData } from '@/hooks/usePayments';
import { useClientDashboard } from '@/hooks/useClientDashboard';
import { getErrorMessage } from '@/utils/errorUtils';

interface PaymentFormProps {
  clientId: number;
  contractId: number | null;
  editingPayment: Payment | null;
  onSubmit: (data: PaymentCreateData | PaymentUpdateData) => Promise<void>;
  onCancel?: () => void;
}

const PAYMENT_METHODS = [
  { value: 'Auto - ACH', label: 'Auto - ACH' },
  { value: 'Auto - Check', label: 'Auto - Check' },
  { value: 'Invoice - Check', label: 'Invoice - Check' },
  { value: 'Wire Transfer', label: 'Wire Transfer' },
  { value: 'Check', label: 'Check' },
];

const PaymentForm: React.FC<PaymentFormProps> = ({
  clientId,
  contractId,
  editingPayment,
  onSubmit,
  onCancel,
}) => {
  const { periods, paymentSchedule, loading: periodsLoading } = usePeriods(clientId, contractId);
  const { data: dashboardData } = useClientDashboard(clientId);
  
  const [formData, setFormData] = useState({
    received_date: new Date().toISOString().split('T')[0],
    total_assets: '',
    actual_fee: '',
    method: 'Check',
    notes: '',
    period_selection: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  // Populate form when editing
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
    }
  }, [editingPayment]);
  
  // Calculate expected fee based on contract
  const calculateExpectedFee = () => {
    if (!dashboardData?.contract || !formData.total_assets) return null;
    
    const contract = dashboardData.contract;
    const assets = parseFloat(formData.total_assets);
    
    if (contract.fee_type === 'percentage' && contract.percent_rate) {
      return assets * contract.percent_rate;
    } else if (contract.fee_type === 'flat' && contract.flat_rate) {
      return contract.flat_rate;
    }
    
    return null;
  };
  
  const expectedFee = calculateExpectedFee();
  
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
    const [period, year] = periodParts.length === 2 ? periodParts : [0, 0];
    
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
      
      const data: PaymentCreateData | PaymentUpdateData = editingPayment ? {
        received_date: formData.received_date,
        total_assets: formData.total_assets ? parseFloat(formData.total_assets) : null,
        expected_fee: expectedFee,
        actual_fee: parseFloat(formData.actual_fee),
        method: formData.method,
        notes: formData.notes || null,
        applied_period_type: paymentSchedule,
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
        applied_period_type: paymentSchedule,
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
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
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
        
        {/* Notes */}
        <div>
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
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {editingPayment ? 'Cancel' : 'Clear'}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : (editingPayment ? 'Update Payment' : 'Record Payment')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;