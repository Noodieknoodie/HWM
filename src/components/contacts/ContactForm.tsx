// src/components/contacts/ContactForm.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Contact, ContactFormData } from '../../types/contact';

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => Promise<void>;
  contact: Contact | null;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  isOpen,
  onClose,
  onSave,
  contact,
}) => {
  const [formData, setFormData] = useState<ContactFormData>({
    contact_type: 'Primary',
    contact_name: '',
    phone: '',
    email: '',
    fax: '',
    physical_address: '',
    mailing_address: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<ContactFormData>>({});

  useEffect(() => {
    if (contact) {
      setFormData({
        contact_type: contact.contact_type,
        contact_name: contact.contact_name,
        phone: contact.phone,
        email: contact.email,
        fax: contact.fax || '',
        physical_address: contact.physical_address,
        mailing_address: contact.mailing_address || '',
      });
    } else {
      setFormData({
        contact_type: 'Primary',
        contact_name: '',
        phone: '',
        email: '',
        fax: '',
        physical_address: '',
        mailing_address: '',
      });
    }
    setErrors({});
  }, [contact]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactFormData> = {};
    
    if (!formData.contact_name.trim()) {
      newErrors.contact_name = 'Contact name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.physical_address.trim()) {
      newErrors.physical_address = 'Physical address is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      // Error is handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="fixed inset-0 z-[60] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">
                {contact ? 'Edit Contact' : 'Add New Contact'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => handleChange('contact_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.contact_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {errors.contact_name && (
                    <p className="mt-1 text-xs text-red-600">{errors.contact_name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="contact_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Type
                  </label>
                  <select
                    id="contact_type"
                    value={formData.contact_type}
                    onChange={(e) => handleChange('contact_type', e.target.value as Contact['contact_type'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  >
                    <option value="Primary">Primary</option>
                    <option value="Authorized">Authorized</option>
                    <option value="Provider">Provider</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="fax" className="block text-sm font-medium text-gray-700 mb-1">
                    Fax
                  </label>
                  <input
                    type="tel"
                    id="fax"
                    value={formData.fax}
                    onChange={(e) => handleChange('fax', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
                
                <div className="col-span-2">
                  <label htmlFor="physical_address" className="block text-sm font-medium text-gray-700 mb-1">
                    Physical Address *
                  </label>
                  <input
                    type="text"
                    id="physical_address"
                    value={formData.physical_address}
                    onChange={(e) => handleChange('physical_address', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.physical_address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {errors.physical_address && (
                    <p className="mt-1 text-xs text-red-600">{errors.physical_address}</p>
                  )}
                </div>
                
                <div className="col-span-2">
                  <label htmlFor="mailing_address" className="block text-sm font-medium text-gray-700 mb-1">
                    Mailing Address
                  </label>
                  <input
                    type="text"
                    id="mailing_address"
                    value={formData.mailing_address}
                    onChange={(e) => handleChange('mailing_address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave blank if same as physical address"
                    disabled={saving}
                  />
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
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : (contact ? 'Update' : 'Add')} Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};