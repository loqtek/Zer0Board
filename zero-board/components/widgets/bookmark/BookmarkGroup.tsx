"use client";

import { BookmarkGroupData } from "../BookmarkWidget";
import { BookmarkItem } from "./BookmarkItem";
import { useMemo } from "react";

interface BookmarkGroupProps {
  group: BookmarkGroupData;
  defaultBorderColor?: string;
  defaultTextColor?: string;
  themeType?: string;
}

export function BookmarkGroup({
  group,
  defaultBorderColor,
  defaultTextColor,
  themeType = "default",
}: BookmarkGroupProps) {
  const borderColor = group.borderColor || defaultBorderColor || "var(--border)";
  const textColor = group.textColor || defaultTextColor || "var(--foreground)";

  // Get background color based on theme type
  const backgroundColor = useMemo(() => {
    if (typeof window === "undefined") return "var(--card-bg)";
    
    try {
      const root = document.documentElement;
      const cardBg = getComputedStyle(root).getPropertyValue("--card-bg").trim();
      
      if (themeType === "glass") {
        // Semi-transparent for glass effect
        if (cardBg.startsWith("#")) {
          const hex = cardBg.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          return `rgba(${r}, ${g}, ${b}, 0.2)`;
        }
        return cardBg.includes("rgb") 
          ? cardBg.replace(/rgb\(([^)]+)\)/, "rgba($1, 0.2)")
          : `rgba(${cardBg}, 0.2)`;
      } else if (themeType === "clear") {
        return "transparent";
      }
      return "var(--card-bg)";
    } catch {
      return "var(--card-bg)";
    }
  }, [themeType]);

  // Safety check for bookmarks
  if (!group.bookmarks || group.bookmarks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Group Name - Homerarr-style outlined box */}
      {group.name && (
        <div
          className="px-3 py-2 rounded-md border-2 font-semibold text-sm"
          style={{
            borderColor: borderColor,
            color: textColor,
            backgroundColor: backgroundColor,
          }}
        >
          {group.name}
        </div>
      )}

      {/* Bookmarks Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {group.bookmarks
          .filter((bookmark) => bookmark && bookmark.id)
          .map((bookmark) => (
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              borderColor={borderColor}
              textColor={textColor}
              themeType={themeType}
            />
          ))}
      </div>
    </div>
  );
}

