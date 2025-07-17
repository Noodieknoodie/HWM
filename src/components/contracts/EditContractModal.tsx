// src/components/contracts/EditContractModal.tsx
import React, { useState, useEffect } from 'react';
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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ContractFormData, string>>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        contract_number: '',
        provider_name: '',
        contract_start_date: '',
        fee_type: 'percentage',
        percent_rate: '',
        flat_rate: '',
        payment_schedule: 'monthly',
      });
      setErrors({});
      setSuccessMessage(null);
      setErrorMessage(null);
      setShowConfirmation(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ContractFormData, string>> = {};
    
    if (!formData.provider_name.trim()) {
      newErrors.provider_name = 'Provider name is required';
    }
    
    if (!formData.contract_start_date) {
      newErrors.contract_start_date = 'Contract start date is required';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }
    
    setSaving(true);
    setErrorMessage(null);
    
    try {
      // First delete the old contract
      await dataApiClient.request(`contracts/contract_id/${currentContract.contract_id}`, {
        method: 'DELETE',
      });
      
      // Then create the new contract
      const newContractData = {
        client_id: clientId,
        contract_number: formData.contract_number.trim() || null,
        provider_name: formData.provider_name.trim(),
        contract_start_date: formData.contract_start_date,
        fee_type: formData.fee_type,
        percent_rate: formData.fee_type === 'percentage' ? parseFloat(formData.percent_rate) : null,
        flat_rate: formData.fee_type === 'flat' ? parseFloat(formData.flat_rate) : null,
        payment_schedule: formData.payment_schedule,
        num_people: null, // Will be set separately if needed
        notes: null, // Will be set separately if needed
      };
      
      await dataApiClient.createContract(newContractData);
      
      setSuccessMessage('Contract replaced successfully');
      
      // Clear success message and close after a delay
      setTimeout(() => {
        setSuccessMessage(null);
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error replacing contract:', err);
      setErrorMessage(err?.error?.message || 'Failed to replace contract');
      setShowConfirmation(false);
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

  const formatRate = (rate: number | null, feeType: string): string => {
    if (!rate) return 'N/A';
    return feeType === 'percentage' ? `${rate}%` : `$${rate.toLocaleString()}`;
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
                Replace Contract - {clientName}
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
              
              {/* Current Contract Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
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
                    <span className="ml-2 font-medium">
                      {formatRate(
                        currentContract.fee_type === 'percentage' ? currentContract.percent_rate : currentContract.flat_rate,
                        currentContract.fee_type
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment Schedule:</span>
                    <span className="ml-2 font-medium capitalize">{currentContract.payment_schedule}</span>
                  </div>
                </div>
              </div>
              
              {/* Confirmation Message */}
              {showConfirmation && !saving && (
                <Alert 
                  variant="warning" 
                  message="Are you sure you want to replace the current contract? This action cannot be undone. Click 'Replace Contract' again to confirm."
                  className="mb-4"
                />
              )}
              
              {/* New Contract Form */}
              <form onSubmit={handleSubmit}>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">New Contract Details</h4>
                
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
                    <label htmlFor="contract_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Start Date *
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
                    />
                    {errors.contract_start_date && (
                      <p className="mt-1 text-xs text-red-600">{errors.contract_start_date}</p>
                    )}
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
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      showConfirmation && !saving
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    disabled={saving}
                  >
                    {saving ? 'Replacing...' : showConfirmation ? 'Confirm Replace' : 'Replace Contract'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};