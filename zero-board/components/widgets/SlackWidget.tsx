"use client";

import { Widget } from "@/lib/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { MessageSquare, Hash } from "lucide-react";

interface SlackWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

export function SlackWidget({ widget, isEditMode, onDelete, onConfigure }: SlackWidgetProps) {
  const channel = widget.config?.channel || "general";
  const unreadCount = widget.config?.unreadCount || 3;
  const recentMessages = widget.config?.recentMessages || [
    { user: "Alice", message: "Hey team!", time: "1h ago" },
    { user: "Bob", message: "Great work on the project", time: "2h ago" },
  ];

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure}>
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[var(--foreground)]" />
            <div className="flex items-center gap-1">
              <Hash className="h-4 w-4 text-[var(--text-muted)]" />
              <h3 className="font-semibold text-[var(--foreground)]">{channel}</h3>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {recentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-8 w-8 text-[var(--text-muted)] mb-2" />
              <p className="text-sm text-[var(--text-muted)]">No messages</p>
            </div>
          ) : (
            recentMessages.map((msg: { text?: string; user?: string; ts?: string; [key: string]: unknown }, index: number) => (
              <div
                key={index}
                className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-2 hover:bg-[var(--muted)]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--foreground)]">
                      {msg.user}
                    </p>
                    <p className="text-sm text-[var(--foreground)] mt-1">
                      {msg.message}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                    {msg.time}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] text-center">
          Connect to Slack/Discord/Teams to get real-time messages
        </p>
      </div>
    </WidgetWrapper>
  );
}




