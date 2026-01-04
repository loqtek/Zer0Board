"use client";

import { useState, useEffect, useMemo } from "react";
import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";

interface ClockWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

export function ClockWidget({ widget, isEditMode, onDelete, onConfigure }: ClockWidgetProps) {
  const [time, setTime] = useState(new Date());
  const format = widget.config?.format || "digital";
  const hourFormat = widget.config?.hourFormat || "24";
  const showTime = widget.config?.showTime !== false; // Default to true
  const showDate = widget.config?.showDate !== false; // Default to true
  const showSeconds = widget.config?.showSeconds === true; // Default to false
  const dateFormat = widget.config?.dateFormat || "long";
  const timezoneRaw = widget.config?.timezone;
  const timezone = typeof timezoneRaw === "string" ? timezoneRaw : Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Responsive sizing based on widget dimensions
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 200, height: 100 });

  // Always update every second to ensure smooth ticking
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!containerRef) return;
    
    const updateSize = () => {
      if (containerRef) {
        setContainerSize({
          width: containerRef.offsetWidth,
          height: containerRef.offsetHeight,
        });
      }
    };
    
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  const fontSize = useMemo(() => {
    const baseSize = Math.min(containerSize.width / 8, containerSize.height / 3);
    const sizeMultiplier = widget.config?.fontSize === "small" ? 0.7 : 
                          widget.config?.fontSize === "large" ? 1.3 : 1.0;
    return Math.max(16, Math.min(baseSize * sizeMultiplier, 72));
  }, [containerSize, widget.config?.fontSize]);

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: hourFormat === "12",
      timeZone: timezone,
    };
    
    if (showSeconds) {
      options.second = "2-digit";
    }
    
    return date.toLocaleTimeString("en-US", options);
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
    };

    switch (dateFormat) {
      case "short":
        options.month = "numeric";
        options.day = "numeric";
        options.year = "numeric";
        break;
      case "medium":
        options.month = "short";
        options.day = "numeric";
        options.year = "numeric";
        break;
      case "long":
        options.weekday = "long";
        options.year = "numeric";
        options.month = "long";
        options.day = "numeric";
        break;
      case "weekday":
        options.weekday = "long";
        break;
      case "date-only":
        options.month = "long";
        options.day = "numeric";
        options.year = "numeric";
        break;
      default:
        options.weekday = "long";
        options.year = "numeric";
        options.month = "long";
        options.day = "numeric";
    }

    return date.toLocaleDateString("en-US", options);
  };

  const renderAnalogClock = () => {
    const hours = time.getHours() % 12 || 12;
    const minutes = time.getMinutes();
    const seconds = showSeconds ? time.getSeconds() : 0;
    
    const hourAngle = (hours * 30) + (minutes * 0.5);
    const minuteAngle = minutes * 6;
    const secondAngle = seconds * 6;
    
    const clockSize = Math.max(80, Math.min(containerSize.width, containerSize.height) * 0.8);
    
    return (
      <div className="relative" style={{ width: clockSize, height: clockSize, minWidth: 80, minHeight: 80 }}>
        <svg width={clockSize} height={clockSize} className="absolute inset-0" style={{ color: "var(--foreground)" }}>
          {/* Clock face */}
          <circle
            cx={clockSize / 2}
            cy={clockSize / 2}
            r={clockSize / 2 - 5}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="opacity-30"
          />
          
          {/* Hour markers */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x1 = clockSize / 2 + (clockSize / 2 - 15) * Math.cos(angle);
            const y1 = clockSize / 2 + (clockSize / 2 - 15) * Math.sin(angle);
            const x2 = clockSize / 2 + (clockSize / 2 - 5) * Math.cos(angle);
            const y2 = clockSize / 2 + (clockSize / 2 - 5) * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth="2"
                className="opacity-40"
              />
            );
          })}
          
          {/* Hour hand */}
          <line
            x1={clockSize / 2}
            y1={clockSize / 2}
            x2={clockSize / 2 + (clockSize / 3) * Math.cos((hourAngle - 90) * (Math.PI / 180))}
            y2={clockSize / 2 + (clockSize / 3) * Math.sin((hourAngle - 90) * (Math.PI / 180))}
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          
          {/* Minute hand */}
          <line
            x1={clockSize / 2}
            y1={clockSize / 2}
            x2={clockSize / 2 + (clockSize / 2.5) * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
            y2={clockSize / 2 + (clockSize / 2.5) * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          
          {/* Second hand */}
          {showSeconds && (
            <line
              x1={clockSize / 2}
              y1={clockSize / 2}
              x2={clockSize / 2 + (clockSize / 2.2) * Math.cos((secondAngle - 90) * (Math.PI / 180))}
              y2={clockSize / 2 + (clockSize / 2.2) * Math.sin((secondAngle - 90) * (Math.PI / 180))}
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              className="opacity-60"
            />
          )}
          
          {/* Center dot */}
          <circle
            cx={clockSize / 2}
            cy={clockSize / 2}
            r="4"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  };

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure}>
      <div
        ref={setContainerRef}
        className="flex h-full w-full flex-col items-center justify-center text-[var(--foreground)]"
        style={{ fontSize: `${fontSize}px`, color: "var(--foreground)" }}
      >
        {format === "digital" ? (
          <div className="text-center">
            {showTime && (
              <div className="font-mono font-bold" style={{ fontSize: `${fontSize * 1.2}px` }}>
                {formatTime(time)}
              </div>
            )}
            {showDate && (
              <div
                className={showTime ? "mt-2 opacity-70" : ""}
                style={{ fontSize: showTime ? `${fontSize * 0.4}px` : `${fontSize * 1.2}px` }}
              >
                {formatDate(time)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            {showTime && renderAnalogClock()}
            {showDate && (
              <div
                className={showTime ? "mt-2 opacity-70" : ""}
                style={{ fontSize: showTime ? `${fontSize * 0.3}px` : `${fontSize * 1.2}px` }}
              >
                {formatDate(time)}
              </div>
            )}
          </div>
        )}
        {timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone && (
          <div className="mt-2 text-xs opacity-60">{timezone}</div>
        )}
      </div>
    </WidgetWrapper>
  );
}
