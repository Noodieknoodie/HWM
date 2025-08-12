// src/hooks/useContacts.ts
import { useState, useEffect, useCallback } from 'react';
import { useDataApiClient } from '../context/ApiContext';
import { Contact } from '../types/contact';
import { getErrorMessage } from '../utils/errorUtils';

interface UseContactsResult {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  refreshContacts: () => Promise<void>;
  createContact: (data: Omit<Contact, 'contact_id'>) => Promise<void>;
  updateContact: (contactId: number, data: Partial<Contact>) => Promise<void>;
  deleteContact: (contactId: number) => Promise<void>;
}

export function useContacts(clientId: number | null): UseContactsResult {
  const apiClient = useDataApiClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!clientId) {
      setContacts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getContacts(clientId);
      setContacts(data);
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [apiClient, clientId]);

  const createContact = useCallback(async (data: Omit<Contact, 'contact_id'>) => {
    if (!clientId) return;
    
    try {
      setError(null);
      await apiClient.createContact({ ...data, client_id: clientId });
      await fetchContacts();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, [apiClient, clientId, fetchContacts]);

  const updateContact = useCallback(async (contactId: number, data: Partial<Contact>) => {
    try {
      setError(null);
      await apiClient.updateContact(contactId, data);
      await fetchContacts();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, [apiClient, fetchContacts]);

  const deleteContact = useCallback(async (contactId: number) => {
    try {
      setError(null);
      await apiClient.deleteContact(contactId);
      await fetchContacts();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, [apiClient, fetchContacts]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    refreshContacts: fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  };
}