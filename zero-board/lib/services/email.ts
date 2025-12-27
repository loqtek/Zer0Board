/**
 * Email service for fetching emails from IMAP integrations
 */

import { settingsApi } from "@/lib/api";

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

/**
 * Fetch emails from an email integration
 */
export async function fetchEmails(
  integrationId: number,
  limit: number = 10
): Promise<EmailData> {
  try {
    const data = await settingsApi.fetchEmailIntegration(integrationId, limit);
    return {
      emails: data.emails || [],
      unread_count: data.unread_count || 0,
    };
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
}

