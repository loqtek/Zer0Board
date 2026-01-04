"use client";

import { ReactNode, memo, useMemo, useEffect, CSSProperties, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Widget } from "@/lib/api";
import { X, Settings2 } from "lucide-react";

interface WidgetWrapperProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
  onDuplicate?: () => void;
  children: ReactNode;
}

export const WidgetWrapper = memo(function WidgetWrapper({
  widget,
  isEditMode,
  onDelete,
  onConfigure,
  onDuplicate,
  children,
}: WidgetWrapperProps) {
  const themeType = widget.config?.themeType || "default";
  const customCSS = widget.config?.customCSS || "";
  const [isMounted, setIsMounted] = useState(() => typeof window !== "undefined");

  // Helper function to convert hex to rgba
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

  // Get theme classes and inline styles based on theme type
  const { themeClasses, themeStyles } = useMemo(() => {
    const classes: string[] = [];
    const styles: CSSProperties = {};
    
    if (themeType === "glass" || themeType === "clear") {
      // Override Card's default background and border with !important
      classes.push("!bg-transparent", "!border-transparent");
      
      if (isMounted && typeof window !== "undefined") {
        try {
          const root = document.documentElement;
          const cardBg = getComputedStyle(root).getPropertyValue("--card-bg").trim();
          const cardBorder = getComputedStyle(root).getPropertyValue("--card-border").trim();
          
          if (themeType === "glass") {
            // Frosted glass effect: semi-transparent with strong blur
            classes.push("!backdrop-blur-lg", "!shadow-lg");
            
            // Convert colors to rgba with opacity
            if (cardBg) {
              styles.backgroundColor = cardBg.startsWith("#") 
                ? hexToRgba(cardBg, 0.2)
                : cardBg.includes("rgb") 
                  ? cardBg.replace(/rgb\(([^)]+)\)/, "rgba($1, 0.2)")
                  : `rgba(${cardBg}, 0.2)`;
            }
            
            if (cardBorder) {
              styles.borderColor = cardBorder.startsWith("#")
                ? hexToRgba(cardBorder, 0.4)
                : cardBorder.includes("rgb")
                  ? cardBorder.replace(/rgb\(([^)]+)\)/, "rgba($1, 0.4)")
                  : `rgba(${cardBorder}, 0.4)`;
            }
            
            styles.backdropFilter = "blur(16px)";
            styles.WebkitBackdropFilter = "blur(16px)";
          } else if (themeType === "clear") {
            // Clear with slight blur for readability
            classes.push("!backdrop-blur-sm");
            
            styles.backgroundColor = "transparent";
            
            if (cardBorder) {
              styles.borderColor = cardBorder.startsWith("#")
                ? hexToRgba(cardBorder, 0.2)
                : cardBorder.includes("rgb")
                  ? cardBorder.replace(/rgb\(([^)]+)\)/, "rgba($1, 0.2)")
                  : `rgba(${cardBorder}, 0.2)`;
            }
            
            styles.backdropFilter = "blur(4px)";
            styles.WebkitBackdropFilter = "blur(4px)";
          }
        } catch (error) {
          console.error("Error computing theme styles:", error);
        }
      }
    }
    
    return {
      themeClasses: classes.join(" "),
      themeStyles: styles,
    };
  }, [themeType, isMounted]);

  // Generate unique ID for this widget to scope custom CSS
  const widgetId = `widget-${widget.id}`;

  // Debug: Log theme application
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Widget ${widget.id}] Theme:`, {
        themeType,
        themeClasses,
        themeStyles,
        hasCustomCSS: !!customCSS,
      });
    }
  }, [widget.id, themeType, themeClasses, themeStyles, customCSS]);

  // Inject custom CSS into a style tag
  useEffect(() => {
    if (!customCSS) {
      // Remove style tag if CSS is cleared
      const existingStyle = document.getElementById(`custom-css-${widget.id}`);
      if (existingStyle) {
        existingStyle.remove();
      }
      return;
    }
    
    // Remove existing style tag for this widget
    const existingStyle = document.getElementById(`custom-css-${widget.id}`);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style tag with scoped CSS
    const styleTag = document.createElement("style");
    styleTag.id = `custom-css-${widget.id}`;
    styleTag.textContent = `
      [data-widget-id="${widgetId}"] {
        ${customCSS}
      }
    `;
    document.head.appendChild(styleTag);

    // Cleanup function
    return () => {
      const style = document.getElementById(`custom-css-${widget.id}`);
      if (style) {
        style.remove();
      }
    };
  }, [customCSS, widget.id, widgetId]);

  // Merge custom CSS with theme styles
  const mergedStyles = useMemo(() => {
    return { ...themeStyles };
  }, [themeStyles]);

  return (
    <Card 
      className={`relative flex h-full w-full flex-col overflow-hidden min-h-[100px] min-w-[100px] ${themeClasses}`}
      style={mergedStyles}
      data-widget-id={widgetId}
    >
      {/* Header - Entire header is draggable */}
      {isEditMode && (
        <div className="drag-handle relative flex h-8 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--muted)]/30 px-3 cursor-move">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex gap-1 flex-shrink-0">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]"></div>
            </div>
            <span className="text-xs font-medium text-[var(--text-muted)] truncate">
              {widget.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onConfigure && (
              <Button
                variant="ghost"
                size="sm"
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onConfigure();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                className="h-6 w-6 p-0 hover:bg-[var(--primary)]/20 hover:text-[var(--primary)] z-10"
                title="Configure widget"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            )}
          <Button
            variant="ghost"
            size="sm"
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            onClick={(e) => {
              e.stopPropagation();
                e.preventDefault();
              onDelete();
            }}
              onTouchStart={(e) => {
                e.stopPropagation();
            }}
            className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-500 z-10"
            title="Delete widget"
          >
              <X className="h-3.5 w-3.5" />
          </Button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4 text-[var(--foreground)]" style={{ color: "var(--foreground)" }}>
        {children}
      </div>
    </Card>
  );
});

