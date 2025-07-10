// src/types/contact.ts

export interface Contact {
  contact_id?: number; // Optional for new contacts
  client_id: number;
  contact_type: 'Primary' | 'Authorized' | 'Provider';
  contact_name: string;
  phone: string;
  email: string;
  fax: string | null;
  physical_address: string;
  mailing_address: string | null;
}

export interface ContactFormData {
  contact_type: 'Primary' | 'Authorized' | 'Provider';
  contact_name: string;
  phone: string;
  email: string;
  fax: string;
  physical_address: string;
  mailing_address: string;
}