"use client";

import { useState, useMemo } from "react";
import { Widget } from "@/lib/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { useContainerSize } from "@/hooks/useContainerSize";
import { useWidgetUpdate } from "@/hooks/useWidgetUpdate";

interface NoteWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

export function NoteWidget({ widget, isEditMode, onDelete, onConfigure }: NoteWidgetProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const { containerSize } = useContainerSize(containerRef, setContainerRef);
  const [content, setContent] = useState(widget.config?.content || "");
  const updateMutation = useWidgetUpdate(widget.board_id, widget.id);

  const themeType = widget.config?.themeType || "default";

  const fontSize = useMemo(() => {
    const baseSize = Math.min(containerSize.width / 20, containerSize.height / 8);
    return Math.max(12, Math.min(baseSize, 18));
  }, [containerSize]);

  const handleBlur = () => {
    if (content !== widget.config?.content) {
      updateMutation.mutate({ ...widget.config, content });
    }
  };

  // Helper function to convert hex to rgba (similar to WidgetWrapper)
  const hexToRgba = (hex: string, alpha: number): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
  };

  // Get textarea styling based on theme
  const textareaStyle = useMemo(() => {
    const style: React.CSSProperties = { fontSize: `${fontSize}px` };
    
    if (themeType === "clear") {
      // Transparent background to match clear theme
      style.backgroundColor = "transparent";
      if (typeof window !== "undefined") {
        try {
          const root = document.documentElement;
          const inputBorder = getComputedStyle(root).getPropertyValue("--input-border").trim();
          if (inputBorder) {
            style.borderColor = inputBorder.startsWith("#")
              ? hexToRgba(inputBorder, 0.2)
              : inputBorder.includes("rgb")
                ? inputBorder.replace(/rgb\(([^)]+)\)/, "rgba($1, 0.2)")
                : `rgba(${inputBorder}, 0.2)`;
          }
        } catch {
          style.borderColor = "rgba(128, 128, 128, 0.2)";
        }
      }
    } else if (themeType === "glass") {
      // Semi-transparent with blur to match glass theme
      if (typeof window !== "undefined") {
        try {
          const root = document.documentElement;
          const inputBg = getComputedStyle(root).getPropertyValue("--input-bg").trim();
          const inputBorder = getComputedStyle(root).getPropertyValue("--input-border").trim();
          
          if (inputBg) {
            style.backgroundColor = inputBg.startsWith("#")
              ? hexToRgba(inputBg, 0.15)
              : inputBg.includes("rgb")
                ? inputBg.replace(/rgb\(([^)]+)\)/, "rgba($1, 0.15)")
                : `rgba(${inputBg}, 0.15)`;
          }
          
          if (inputBorder) {
            style.borderColor = inputBorder.startsWith("#")
              ? hexToRgba(inputBorder, 0.3)
              : inputBorder.includes("rgb")
                ? inputBorder.replace(/rgb\(([^)]+)\)/, "rgba($1, 0.3)")
                : `rgba(${inputBorder}, 0.3)`;
          }
        } catch {
          style.backgroundColor = "rgba(255, 255, 255, 0.1)";
          style.borderColor = "rgba(128, 128, 128, 0.3)";
        }
      }
      style.backdropFilter = "blur(8px)";
      style.WebkitBackdropFilter = "blur(8px)";
    }
    
    return style;
  }, [fontSize, themeType]);

  const textareaClassName = themeType === "clear" || themeType === "glass"
    ? "flex-1 resize-none rounded border p-2 text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
    : "flex-1 resize-none rounded border border-[var(--input-border)] bg-[var(--input-bg)] p-2 text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure}>
      <div
        ref={setContainerRef}
        className="flex h-full w-full flex-col text-[var(--foreground)]"
        style={{ color: "var(--foreground)" }}
      >
        <h3
          className="mb-2 font-semibold opacity-60"
          style={{ fontSize: `${fontSize * 0.9}px` }}
        >
          Notes
        </h3>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          placeholder="Write your notes here..."
          className={textareaClassName}
          style={textareaStyle}
          disabled={!isEditMode}
        />
      </div>
    </WidgetWrapper>
  );
}

