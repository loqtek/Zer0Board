"use client";

import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { BookmarkGroup } from "./bookmark/BookmarkGroup";

interface BookmarkWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

export interface Bookmark {
  id: string;
  name: string;
  url: string;
  icon?: string;
}

export interface BookmarkGroupData {
  id: string;
  name: string;
  bookmarks: Bookmark[];
  borderColor?: string;
  textColor?: string;
}

export function BookmarkWidget({ widget, isEditMode, onDelete, onConfigure }: BookmarkWidgetProps) {
  const config = widget.config || {};
  const groupsArray = config.groups;
  const groups: BookmarkGroupData[] = Array.isArray(groupsArray)
    ? groupsArray.filter((g: unknown): g is BookmarkGroupData => {
        if (!g || typeof g !== "object") return false;
        const group = g as Record<string, unknown>;
        return (
          typeof group.id === "string" &&
          typeof group.name === "string" &&
          Array.isArray(group.bookmarks)
        );
      })
    : [];
  const themeType = typeof config.themeType === "string" ? config.themeType : "default";

  const defaultBorderColor = typeof config.defaultBorderColor === "string" ? config.defaultBorderColor : "var(--border)";
  const defaultTextColor = typeof config.defaultTextColor === "string" ? config.defaultTextColor : "var(--foreground)";

  return (
    <WidgetWrapper
      widget={widget}
      isEditMode={isEditMode}
      onDelete={onDelete}
      onConfigure={onConfigure}
    >
      <div className="flex-1 overflow-auto p-4">
        {groups.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
            No bookmarks yet. Click configure to add bookmarks.
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group, index) => (
              <BookmarkGroup
                key={group.id || `group-${index}`}
                group={group}
                defaultBorderColor={defaultBorderColor}
                defaultTextColor={defaultTextColor}
                themeType={themeType}
              />
            ))}
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}

