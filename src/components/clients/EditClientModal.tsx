// src/components/clients/EditClientModal.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Alert } from '../Alert';
import { useDataApiClient } from '../../api/client';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    client_id: number;
    display_name: string;
    full_name: string;
    ima_signed_date?: string | null;
  };
  onSuccess?: () => void;
}

interface ClientFormData {
  display_name: string;
  full_name: string;
  ima_signed_date: string;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({
  isOpen,
  onClose,
  client,
  onSuccess,
}) => {
  const dataApiClient = useDataApiClient();
  const [formData, setFormData] = useState<ClientFormData>({
    display_name: '',
    full_name: '',
    ima_signed_date: '',
  });
  const [originalData, setOriginalData] = useState<ClientFormData>({
    display_name: '',
    full_name: '',
    ima_signed_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<ClientFormData>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (client && isOpen) {
      const initialData = {
        display_name: client.display_name || '',
        full_name: client.full_name || '',
        ima_signed_date: client.ima_signed_date || '',
      };
      setFormData(initialData);
      setOriginalData(initialData);
      setErrors({});
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [client, isOpen]);

  if (!isOpen) return null;

  const hasChanges = () => {
    return (
      formData.display_name !== originalData.display_name ||
      formData.full_name !== originalData.full_name ||
      formData.ima_signed_date !== originalData.ima_signed_date
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ClientFormData> = {};
    
    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    }
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    
    // IMA signed date is optional, but validate format if provided
    if (formData.ima_signed_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.ima_signed_date)) {
      newErrors.ima_signed_date = 'Invalid date format (YYYY-MM-DD)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    setErrorMessage(null);
    
    try {
      // Prepare update data
      const updateData: any = {
        display_name: formData.display_name.trim(),
        full_name: formData.full_name.trim(),
      };
      
      // Only include ima_signed_date if it has a value
      if (formData.ima_signed_date) {
        updateData.ima_signed_date = formData.ima_signed_date;
      } else {
        updateData.ima_signed_date = null;
      }
      
      await dataApiClient.updateClient(client.client_id, updateData);
      
      setSuccessMessage('Client updated successfully');
      
      // Clear success message and close after a delay
      setTimeout(() => {
        setSuccessMessage(null);
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error updating client:', err);
      setErrorMessage(err?.error?.message || 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleClose = () => {
    if (hasChanges() && !saving) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={handleClose} />
      
      {/* Modal Content */}
      <div className="fixed inset-0 z-[60] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">
                Edit Client
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              {successMessage && (
                <Alert variant="success" message={successMessage} className="mb-4" />
              )}
              
              {errorMessage && (
                <Alert variant="error" message={errorMessage} className="mb-4" />
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => handleChange('display_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.display_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {errors.display_name && (
                    <p className="mt-1 text-xs text-red-600">{errors.display_name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.full_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {errors.full_name && (
                    <p className="mt-1 text-xs text-red-600">{errors.full_name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="ima_signed_date" className="block text-sm font-medium text-gray-700 mb-1">
                    IMA Signed Date
                  </label>
                  <input
                    type="date"
                    id="ima_signed_date"
                    value={formData.ima_signed_date}
                    onChange={(e) => handleChange('ima_signed_date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.ima_signed_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {errors.ima_signed_date && (
                    <p className="mt-1 text-xs text-red-600">{errors.ima_signed_date}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Date when the Investment Management Agreement was signed
                  </p>
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving || !hasChanges()}
                >
                  {saving ? 'Saving...' : 'Update Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};