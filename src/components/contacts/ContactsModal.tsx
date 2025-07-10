// src/components/contacts/ContactsModal.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useContacts } from '../../hooks/useContacts';
import { ContactsTable } from './ContactsTable';
import { ContactForm } from './ContactForm';
import { Contact, ContactFormData } from '../../types/contact';
import { Alert } from '../Alert';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
}) => {
  const { contacts, loading, error, createContact, updateContact, deleteContact } = useContacts(clientId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = () => {
    setEditingContact(null);
    setIsFormOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const handleSave = async (formData: ContactFormData) => {
    try {
      if (editingContact) {
        await updateContact(editingContact.contact_id!, {
          ...formData,
          fax: formData.fax || null,
          mailing_address: formData.mailing_address || null,
        });
        setSuccessMessage('Contact updated successfully');
      } else {
        await createContact({
          client_id: clientId,
          ...formData,
          fax: formData.fax || null,
          mailing_address: formData.mailing_address || null,
        });
        setSuccessMessage('Contact added successfully');
      }
      setIsFormOpen(false);
      setEditingContact(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Error is handled by the hook
      console.error('Error saving contact:', err);
    }
  };

  const handleDelete = async (contactId: number) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await deleteContact(contactId);
        setSuccessMessage('Contact deleted successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error('Error deleting contact:', err);
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingContact(null);
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Manage Contacts - {clientName}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {successMessage && (
                <Alert variant="success" message={successMessage} className="mb-4" />
              )}
              
              {error && (
                <Alert variant="error" message={error} className="mb-4" />
              )}
              
              {loading ? (
                <div className="text-center py-8">Loading contacts...</div>
              ) : (
                <ContactsTable
                  contacts={contacts}
                  onAdd={handleAdd}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Contact Form Modal */}
      {isFormOpen && (
        <ContactForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          onSave={handleSave}
          contact={editingContact}
        />
      )}
    </>
  );
};