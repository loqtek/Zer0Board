"use client";

import { Widget } from "@/lib/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { BookmarkItem } from "./bookmark/BookmarkItem";
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
  const groups: BookmarkGroupData[] = (config.groups || []).filter((g: any) => g && g.id);
  const themeType = config.themeType || "default";

  const defaultBorderColor = config.defaultBorderColor || "var(--border)";
  const defaultTextColor = config.defaultTextColor || "var(--foreground)";

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
            {groups.map((group) => (
              <BookmarkGroup
                key={group.id || `group-${Math.random()}`}
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

