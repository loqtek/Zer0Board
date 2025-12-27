"use client";

import { Bookmark } from "../BookmarkWidget";
import { ExternalLink } from "lucide-react";
import { useMemo } from "react";

interface BookmarkItemProps {
  bookmark: Bookmark;
  borderColor?: string;
  textColor?: string;
  themeType?: string;
}

export function BookmarkItem({ bookmark, borderColor, textColor, themeType = "default" }: BookmarkItemProps) {
  const handleClick = () => {
    if (bookmark.url) {
      window.open(bookmark.url, "_blank", "noopener,noreferrer");
    }
  };

  const displayIcon = bookmark.icon || "🔗";
  // Check if icon is a URL (starts with http/https) or an emoji
  const isEmoji = !displayIcon.startsWith("http://") && !displayIcon.startsWith("https://") && !displayIcon.startsWith("data:");

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

  return (
    <button
      onClick={handleClick}
      className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
      style={{
        border: `2px solid ${borderColor || "var(--border)"}`,
        color: textColor || "var(--foreground)",
        backgroundColor: backgroundColor,
      }}
    >
      {/* Icon/Logo */}
      <div className="flex items-center justify-center w-14 h-14 text-2xl mb-1">
        {isEmoji ? (
          <span className="text-4xl">{displayIcon}</span>
        ) : (
          <img
            src={displayIcon}
            alt={bookmark.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback to emoji if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const fallback = document.createElement("span");
              fallback.textContent = "🔗";
              fallback.className = "text-4xl";
              target.parentElement?.appendChild(fallback);
            }}
          />
        )}
      </div>

      {/* Name */}
      <span
        className="text-xs font-medium text-center line-clamp-2 max-w-full px-1"
        style={{ color: textColor || "var(--foreground)" }}
      >
        {bookmark.name}
      </span>

      {/* External link indicator */}
      <ExternalLink
        className="absolute top-2 right-2 w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity"
        style={{ color: textColor || "var(--foreground)" }}
      />
    </button>
  );
}

