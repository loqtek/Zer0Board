"use client";

import { useState, useEffect } from "react";
import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { Mail, Inbox, AlertCircle } from "lucide-react";
import { fetchEmails } from "@/lib/services/email";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";
import type { EmailMessage } from "@/lib/types/services/email";

interface EmailWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
  onDuplicate?: () => void;
}

export function EmailWidget({ widget, isEditMode, onDelete, onConfigure, onDuplicate }: EmailWidgetProps) {
  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => settingsApi.listIntegrations(),
  });

  // Widget customization options
  const emailIntegrationIdRaw = widget.config?.emailIntegrationId;
  const emailIntegrationId = typeof emailIntegrationIdRaw === "number" ? emailIntegrationIdRaw : undefined;
  const maxEmailsRaw = widget.config?.maxEmails;
  const maxEmails = typeof maxEmailsRaw === "number" ? maxEmailsRaw : 10;
  const showPreview = widget.config?.showPreview !== false;
  const previewLengthRaw = widget.config?.previewLength;
  const previewLength = typeof previewLengthRaw === "number" ? previewLengthRaw : 50;
  const refreshIntervalRaw = widget.config?.refreshInterval;
  const refreshInterval = typeof refreshIntervalRaw === "number" ? refreshIntervalRaw : 300; // 5 minutes default

  const emailIntegration = integrations?.find(
    (i) => i.id === emailIntegrationId && i.service === "email" && i.is_active
  );

  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!emailIntegrationId || !emailIntegration) {
      setError("Email integration not configured");
      return;
    }

    const fetchEmailData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchEmails(emailIntegrationId, maxEmails);
        setEmails(data.emails);
        setUnreadCount(data.unread_count);
      } catch (err) {
        console.error("Error fetching emails:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch emails");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmailData();

    // Set up refresh interval
    const interval = setInterval(fetchEmailData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [emailIntegrationId, emailIntegration, maxEmails, refreshInterval]);

  const truncatePreview = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (!emailIntegrationId || !emailIntegration) {
    return (
      <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure} onDuplicate={onDuplicate}>
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <div className="text-center">
            <Mail className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-[var(--text-muted)] mb-2">Email Integration</p>
            <p className="text-xs text-[var(--text-muted)]">
              Configure an email account in Settings → Integrations
            </p>
          </div>
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure} onDuplicate={onDuplicate}>
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[var(--foreground)]" />
            <h3 className="font-semibold text-[var(--foreground)]">
              {emailIntegration.config?.username || "Email"}
            </h3>
          </div>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-[var(--text-muted)]">Loading emails...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-sm text-red-500">{error}</div>
            </div>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Inbox className="h-8 w-8 text-[var(--text-muted)] mb-2" />
            <p className="text-sm text-[var(--text-muted)]">No emails</p>
          </div>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto">
            {emails.map((email, index) => (
              <div
                key={email.id || index}
                className={`rounded border border-[var(--border)] bg-[var(--muted)]/30 p-2 hover:bg-[var(--muted)]/50 transition-colors cursor-pointer ${
                  email.unread ? "border-l-4 border-l-blue-500" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {email.from_name || email.from}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate font-semibold">
                      {email.subject}
                    </p>
                    {showPreview && email.preview && (
                      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                        {truncatePreview(email.preview, previewLength)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                    {email.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-[var(--text-muted)] text-center">
          {emailIntegration.config?.host || "Email"} • {emails.length} emails
        </p>
      </div>
    </WidgetWrapper>
  );
}
