/**
 * Email service for fetching emails from IMAP integrations
 */

import { settingsApi } from "@/lib/api";
import type { EmailMessage, EmailData } from "@/lib/types/services/email";
export type { EmailMessage, EmailData };

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

