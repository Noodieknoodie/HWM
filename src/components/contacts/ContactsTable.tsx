// src/components/contacts/ContactsTable.tsx
import React from 'react';
import { Plus, Edit, Trash, Phone, Mail, MapPin } from 'lucide-react';
import { Contact } from '../../types/contact';
import { formatPhone } from '../../utils/formatters';

interface ContactsTableProps {
  contacts: Contact[];
  onAdd: () => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: number) => void;
}

export const ContactsTable: React.FC<ContactsTableProps> = ({
  contacts,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const getContactTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Primary':
        return 'bg-blue-100 text-blue-700';
      case 'Authorized':
        return 'bg-green-100 text-green-700';
      case 'Provider':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-600">Manage all contact types for this client</p>
        <button
          onClick={onAdd}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 gap-2"
        >
          <Plus size={16} /> Add Contact
        </button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No contacts found. Click "Add Contact" to create one.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.contact_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {contact.contact_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getContactTypeBadgeClass(contact.contact_type)}`}>
                      {contact.contact_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Phone size={12} className="text-gray-400" />
                        {formatPhone(contact.phone)}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail size={12} className="text-gray-400" />
                        <a href={`mailto:${contact.email}`} className="text-indigo-600 hover:text-indigo-900">
                          {contact.email}
                        </a>
                      </div>
                      {contact.fax && (
                        <div className="text-sm text-gray-500">
                          Fax: {formatPhone(contact.fax)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2 text-sm text-gray-900">
                      <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p>{contact.physical_address}</p>
                        {contact.mailing_address && contact.mailing_address !== contact.physical_address && (
                          <p className="text-gray-500 text-xs mt-1">
                            Mailing: {contact.mailing_address}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => onEdit(contact)}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                        title="Edit contact"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(contact.contact_id!)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete contact"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};