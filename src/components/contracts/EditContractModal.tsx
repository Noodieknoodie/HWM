// src/components/contracts/EditContractModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Alert } from '../Alert';
import { useDataApiClient } from '../../api/client';
import { DashboardContract } from '../../hooks/useClientDashboard';

interface EditContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
  currentContract: DashboardContract;
  onSuccess?: () => void;
}

interface ContractFormData {
  contract_number: string;
  provider_name: string;
  contract_start_date: string;
  fee_type: 'percentage' | 'flat';
  percent_rate: string;
  flat_rate: string;
  payment_schedule: 'monthly' | 'quarterly';
}

export const EditContractModal: React.FC<EditContractModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  currentContract,
  onSuccess,
}) => {
  const dataApiClient = useDataApiClient();
  const [mode, setMode] = useState<'view' | 'edit' | 'replace'>('view');
  const editSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const replaceSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState<ContractFormData>({
    contract_number: '',
    provider_name: '',
    contract_start_date: '',
    fee_type: 'percentage',
    percent_rate: '',
    flat_rate: '',
    payment_schedule: 'monthly',
  });
  const [saving, setSaving] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ContractFormData, string>>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode('view');
      setConfirmReplace(false);
      setErrors({});
      setSuccessMessage(null);
      setErrorMessage(null);
      
      // Initialize form with current contract data for edit mode
      const currentRate = currentContract.fee_type === 'percentage' 
        ? currentContract.percent_rate 
        : currentContract.flat_rate;
      
      setFormData({
        contract_number: currentContract.contract_number || '',
        provider_name: currentContract.provider_name,
        contract_start_date: '', // User must set new date for replace mode
        fee_type: currentContract.fee_type,
        percent_rate: currentContract.fee_type === 'percentage' ? String(currentRate ? currentRate * 100 : '') : '',
        flat_rate: currentContract.fee_type === 'flat' ? String(currentRate || '') : '',
        payment_schedule: currentContract.payment_schedule,
      });
    }
    
    // Cleanup function to clear timeouts on unmount or when modal closes
    return () => {
      if (editSuccessTimeoutRef.current) {
        clearTimeout(editSuccessTimeoutRef.current);
        editSuccessTimeoutRef.current = null;
      }
      if (replaceSuccessTimeoutRef.current) {
        clearTimeout(replaceSuccessTimeoutRef.current);
        replaceSuccessTimeoutRef.current = null;
      }
    };
  }, [isOpen, currentContract]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ContractFormData, string>> = {};
    
    if (!formData.provider_name.trim()) {
      newErrors.provider_name = 'Provider name is required';
    }
    
    if (mode === 'replace' && !formData.contract_start_date) {
      newErrors.contract_start_date = 'Contract start date is required for new contracts';
    }
    
    // Validate fee rates based on fee type
    if (formData.fee_type === 'percentage') {
      if (!formData.percent_rate) {
        newErrors.percent_rate = 'Percentage rate is required';
      } else {
        const rate = parseFloat(formData.percent_rate);
        if (isNaN(rate) || rate <= 0 || rate > 100) {
          newErrors.percent_rate = 'Rate must be between 0 and 100';
        }
      }
    } else {
      if (!formData.flat_rate) {
        newErrors.flat_rate = 'Flat rate is required';
      } else {
        const rate = parseFloat(formData.flat_rate);
        if (isNaN(rate) || rate <= 0) {
          newErrors.flat_rate = 'Rate must be greater than 0';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    setErrorMessage(null);
    
    try {
      // Simple PATCH to existing contract
      await dataApiClient.updateContract(currentContract.contract_id, {
        contract_number: formData.contract_number.trim() || null,
        provider_name: formData.provider_name.trim(),
        fee_type: formData.fee_type,
        percent_rate: formData.fee_type === 'percentage' ? parseFloat(formData.percent_rate) / 100 : null,
        flat_rate: formData.fee_type === 'flat' ? parseFloat(formData.flat_rate) : null,
        payment_schedule: formData.payment_schedule,
      });
      
      setSuccessMessage('Contract updated successfully');
      editSuccessTimeoutRef.current = setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.error?.message || 'Failed to update contract');
    } finally {
      setSaving(false);
    }
  };

  const handleReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    
    setSaving(true);
    setErrorMessage(null);
    
    try {
      // Create new active contract FIRST
      const newContractData = {
        client_id: clientId,
        contract_number: formData.contract_number.trim() || null,
        provider_name: formData.provider_name.trim(),
        contract_start_date: formData.contract_start_date,
        fee_type: formData.fee_type,
        percent_rate: formData.fee_type === 'percentage' ? parseFloat(formData.percent_rate) / 100 : null,
        flat_rate: formData.fee_type === 'flat' ? parseFloat(formData.flat_rate) : null,
        payment_schedule: formData.payment_schedule,
        num_people: null,
        notes: null,
        is_active: true,
      };
      
      await dataApiClient.createContract(newContractData);
      
      // Then deactivate old contract
      await dataApiClient.updateContract(currentContract.contract_id, {
        is_active: false
      });
      
      setSuccessMessage('New contract created successfully');
      replaceSuccessTimeoutRef.current = setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err?.error?.message || 'Failed to replace contract');
      setConfirmReplace(false);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ContractFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const formatRate = (contract: DashboardContract): string => {
    const rate = contract.fee_type === 'percentage' ? contract.percent_rate : contract.flat_rate;
    if (!rate) return 'N/A';
    return contract.fee_type === 'percentage' ? `${(rate * 100).toFixed(2)}%` : `$${rate.toLocaleString()}`;
  };


  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="fixed inset-0 z-[60] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">
                {mode === 'view' && `Manage Contract - ${clientName}`}
                {mode === 'edit' && `Edit Contract - ${clientName}`}
                {mode === 'replace' && `New Contract - ${clientName}`}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {successMessage && (
                <Alert variant="success" message={successMessage} className="mb-4" />
              )}
              
              {errorMessage && (
                <Alert variant="error" message={errorMessage} className="mb-4" />
              )}
              
              {/* View Mode */}
              {mode === 'view' && (
                <div>
                  {/* Current contract display */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Contract</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Contract Number:</span>
                        <span className="ml-2 font-medium">{currentContract.contract_number || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Provider:</span>
                        <span className="ml-2 font-medium">{currentContract.provider_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Fee Type:</span>
                        <span className="ml-2 font-medium capitalize">{currentContract.fee_type}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Rate:</span>
                        <span className="ml-2 font-medium">{formatRate(currentContract)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Payment Schedule:</span>
                        <span className="ml-2 font-medium capitalize">{currentContract.payment_schedule}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action selection */}
                  <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-4">What would you like to do?</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => setMode('edit')}
                        className="w-full text-left p-3 border rounded hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium">Fix a Mistake</div>
                        <div className="text-sm text-gray-500">Correct typos or wrong data entry</div>
                      </button>
                      <button
                        onClick={() => setMode('replace')}
                        className="w-full text-left p-3 border rounded hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium">Rate Changed</div>
                        <div className="text-sm text-gray-500">Create new contract going forward</div>
                      </button>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
              
              {/* Edit Mode */}
              {mode === 'edit' && (
                <form onSubmit={handleEdit}>
                  <Alert 
                    variant="warning" 
                    title="This will update ALL payments"
                    message="Changing the rate affects expected fees for every payment under this contract - past and future." 
                    className="mb-4"
                  />
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contract_number" className="block text-sm font-medium text-gray-700 mb-1">
                          Contract Number
                        </label>
                        <input
                          type="text"
                          id="contract_number"
                          value={formData.contract_number}
                          onChange={(e) => handleChange('contract_number', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={saving}
                          placeholder="Optional"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="provider_name" className="block text-sm font-medium text-gray-700 mb-1">
                          Provider Name *
                        </label>
                        <input
                          type="text"
                          id="provider_name"
                          value={formData.provider_name}
                          onChange={(e) => handleChange('provider_name', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.provider_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={saving}
                        />
                        {errors.provider_name && (
                          <p className="mt-1 text-xs text-red-600">{errors.provider_name}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fee Type *
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="fee_type"
                            value="percentage"
                            checked={formData.fee_type === 'percentage'}
                            onChange={(e) => handleChange('fee_type', e.target.value as 'percentage' | 'flat')}
                            className="mr-2"
                            disabled={saving}
                          />
                          Percentage
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="fee_type"
                            value="flat"
                            checked={formData.fee_type === 'flat'}
                            onChange={(e) => handleChange('fee_type', e.target.value as 'percentage' | 'flat')}
                            className="mr-2"
                            disabled={saving}
                          />
                          Flat Rate
                        </label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {formData.fee_type === 'percentage' ? (
                        <div>
                          <label htmlFor="percent_rate" className="block text-sm font-medium text-gray-700 mb-1">
                            Percentage Rate (%) *
                          </label>
                          <input
                            type="number"
                            id="percent_rate"
                            value={formData.percent_rate}
                            onChange={(e) => handleChange('percent_rate', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.percent_rate ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={saving}
                            step="0.01"
                            min="0"
                            max="100"
                          />
                          {errors.percent_rate && (
                            <p className="mt-1 text-xs text-red-600">{errors.percent_rate}</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label htmlFor="flat_rate" className="block text-sm font-medium text-gray-700 mb-1">
                            Flat Rate ($) *
                          </label>
                          <input
                            type="number"
                            id="flat_rate"
                            value={formData.flat_rate}
                            onChange={(e) => handleChange('flat_rate', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.flat_rate ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={saving}
                            step="0.01"
                            min="0"
                          />
                          {errors.flat_rate && (
                            <p className="mt-1 text-xs text-red-600">{errors.flat_rate}</p>
                          )}
                        </div>
                      )}
                      
                      <div>
                        <label htmlFor="payment_schedule" className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Schedule *
                        </label>
                        <select
                          id="payment_schedule"
                          value={formData.payment_schedule}
                          onChange={(e) => handleChange('payment_schedule', e.target.value as 'monthly' | 'quarterly')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={saving}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => setMode('view')}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={saving}
                    >
                      {saving ? 'Updating...' : 'Update Contract'}
                    </button>
                  </div>
                </form>
              )}
              
              {/* Replace Mode */}
              {mode === 'replace' && (
                <form onSubmit={handleReplace}>
                  {!confirmReplace ? (
                    <Alert 
                      variant="info" 
                      title="How this works"
                      message="A new contract will be created. Future payments will use the new rate. Past payments keep their original rates." 
                      className="mb-4"
                    />
                  ) : (
                    <Alert 
                      variant="warning" 
                      title="Confirm replacement"
                      message="The current contract will be deactivated. This cannot be undone." 
                      className="mb-4"
                    />
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="contract_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Effective Date *
                      </label>
                      <input
                        type="date"
                        id="contract_start_date"
                        value={formData.contract_start_date}
                        onChange={(e) => handleChange('contract_start_date', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.contract_start_date ? 'border-red-500' : 'border-gray-300'
                        }`}
                        disabled={saving}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      {errors.contract_start_date && (
                        <p className="mt-1 text-xs text-red-600">{errors.contract_start_date}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        New rates apply to payments on or after this date
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contract_number" className="block text-sm font-medium text-gray-700 mb-1">
                          Contract Number
                        </label>
                        <input
                          type="text"
                          id="contract_number"
                          value={formData.contract_number}
                          onChange={(e) => handleChange('contract_number', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={saving}
                          placeholder="Optional"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="provider_name" className="block text-sm font-medium text-gray-700 mb-1">
                          Provider Name *
                        </label>
                        <input
                          type="text"
                          id="provider_name"
                          value={formData.provider_name}
                          onChange={(e) => handleChange('provider_name', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.provider_name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={saving}
                        />
                        {errors.provider_name && (
                          <p className="mt-1 text-xs text-red-600">{errors.provider_name}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fee Type *
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="fee_type"
                            value="percentage"
                            checked={formData.fee_type === 'percentage'}
                            onChange={(e) => handleChange('fee_type', e.target.value as 'percentage' | 'flat')}
                            className="mr-2"
                            disabled={saving}
                          />
                          Percentage
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="fee_type"
                            value="flat"
                            checked={formData.fee_type === 'flat'}
                            onChange={(e) => handleChange('fee_type', e.target.value as 'percentage' | 'flat')}
                            className="mr-2"
                            disabled={saving}
                          />
                          Flat Rate
                        </label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {formData.fee_type === 'percentage' ? (
                        <div>
                          <label htmlFor="percent_rate" className="block text-sm font-medium text-gray-700 mb-1">
                            Percentage Rate (%) *
                          </label>
                          <input
                            type="number"
                            id="percent_rate"
                            value={formData.percent_rate}
                            onChange={(e) => handleChange('percent_rate', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.percent_rate ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={saving}
                            step="0.01"
                            min="0"
                            max="100"
                          />
                          {errors.percent_rate && (
                            <p className="mt-1 text-xs text-red-600">{errors.percent_rate}</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label htmlFor="flat_rate" className="block text-sm font-medium text-gray-700 mb-1">
                            Flat Rate ($) *
                          </label>
                          <input
                            type="number"
                            id="flat_rate"
                            value={formData.flat_rate}
                            onChange={(e) => handleChange('flat_rate', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors.flat_rate ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={saving}
                            step="0.01"
                            min="0"
                          />
                          {errors.flat_rate && (
                            <p className="mt-1 text-xs text-red-600">{errors.flat_rate}</p>
                          )}
                        </div>
                      )}
                      
                      <div>
                        <label htmlFor="payment_schedule" className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Schedule *
                        </label>
                        <select
                          id="payment_schedule"
                          value={formData.payment_schedule}
                          onChange={(e) => handleChange('payment_schedule', e.target.value as 'monthly' | 'quarterly')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={saving}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('view');
                        setConfirmReplace(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    {!confirmReplace ? (
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={saving}
                      >
                        Continue
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={saving}
                      >
                        {saving ? 'Replacing...' : 'Replace Contract'}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};