export interface EmailAccount {
  id: string;
  friendly_name: string;
  email_address: string;
  provider: string;
  connection_status: 'connected' | 'error' | 'disconnected';
  is_default_sender: boolean;
}

export interface EmailAttachment {
  part: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface Email {
  id: string;
  account_id: string;
  account_name: string;
  from: string;
  from_email: string;
  to: string[];
  cc?: string[];
  subject: string;
  preview: string;
  body?: string;
  date: string;
  is_read: boolean;
  folder: 'inbox' | 'sent' | 'archive' | 'trash';
  has_attachments?: boolean;
  attachments?: EmailAttachment[];
}
