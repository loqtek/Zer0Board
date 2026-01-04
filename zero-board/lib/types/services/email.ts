/**
 * Email service types
 */

export interface EmailMessage {
  id: string;
  from: string;
  from_name: string;
  subject: string;
  preview: string;
  date: string | null;
  time: string;
  unread: boolean;
}

export interface EmailData {
  emails: EmailMessage[];
  unread_count: number;
}

