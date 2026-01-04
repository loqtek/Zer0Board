"use client";

import { useMemo, useState, useEffect } from "react";
import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { getWeather } from "@/lib/services/weather";
import type { WeatherData } from "@/lib/types/services/weather";

interface WeatherWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

export function WeatherWidget({ widget, isEditMode, onDelete, onConfigure }: WeatherWidgetProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 200, height: 100 });
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitRaw = widget.config?.unit;
  const unit = typeof unitRaw === "string" && (unitRaw === "celsius" || unitRaw === "fahrenheit") ? unitRaw : "fahrenheit";
  const locationRaw = widget.config?.location;
  const location = typeof locationRaw === "string" ? locationRaw : "";
  const latitudeRaw = widget.config?.latitude;
  const latitude = typeof latitudeRaw === "number" ? latitudeRaw : undefined;
  const longitudeRaw = widget.config?.longitude;
  const longitude = typeof longitudeRaw === "number" ? longitudeRaw : undefined;
  const showDetails = widget.config?.showDetails !== false;
  const showTemperature = widget.config?.showTemperature !== false;
  const showCondition = widget.config?.showCondition !== false;
  const showLocation = widget.config?.showLocation !== false;
  
  // Text styling config
  const fontSizeRaw = widget.config?.fontSize;
  const fontWeightRaw = widget.config?.fontWeight;
  const lineHeightRaw = widget.config?.lineHeight;
  const letterSpacingRaw = widget.config?.letterSpacing;
  const textColorRaw = widget.config?.textColor;
  const textAlignRaw = widget.config?.textAlign;
  const textTransformRaw = widget.config?.textTransform;
  
  const textStyle = {
    fontSize: typeof fontSizeRaw === "number" || typeof fontSizeRaw === "string" ? `${fontSizeRaw}px` : undefined,
    fontWeight: typeof fontWeightRaw === "string" ? fontWeightRaw : undefined,
    lineHeight: typeof lineHeightRaw === "string" || typeof lineHeightRaw === "number" ? lineHeightRaw : undefined,
    letterSpacing: typeof letterSpacingRaw === "number" || typeof letterSpacingRaw === "string" ? `${letterSpacingRaw}px` : undefined,
    color: typeof textColorRaw === "string" ? textColorRaw : undefined,
    textAlign: typeof textAlignRaw === "string" ? textAlignRaw : undefined,
    textTransform: typeof textTransformRaw === "string" ? textTransformRaw : undefined,
  };

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

  useEffect(() => {
    const fetchWeather = async () => {
      if (!latitude || !longitude) {
        setError("Location not configured");
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const data = await getWeather(latitude, longitude, unit);
        if (data) {
          data.location = location;
          setWeatherData(data);
        } else {
          setError("Failed to fetch weather");
        }
      } catch (err) {
        setError("Error loading weather");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude, unit, location]);

  const fontSize = useMemo(() => {
    // Use custom fontSize if provided, otherwise calculate based on container
    if (widget.config?.fontSize) {
      return widget.config.fontSize;
    }
    const baseSize = Math.min(containerSize.width / 10, containerSize.height / 4);
    return Math.max(12, Math.min(baseSize, 48));
  }, [containerSize, widget.config?.fontSize]);

  if (isLoading && !weatherData) {
    return (
      <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure}>
        <div
          ref={setContainerRef}
          className="flex h-full w-full flex-col items-center justify-center text-center text-[var(--foreground)]"
          style={{ color: "var(--foreground)" }}
        >
          <div className="text-sm opacity-60">Loading weather...</div>
        </div>
      </WidgetWrapper>
    );
  }

  if (error && !weatherData) {
    return (
      <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure}>
        <div
          ref={setContainerRef}
          className="flex h-full w-full flex-col items-center justify-center text-center text-[var(--foreground)]"
          style={{ color: "var(--foreground)" }}
        >
          <div className="text-sm text-red-500">{error}</div>
        </div>
      </WidgetWrapper>
    );
  }

  const data = weatherData || {
    temperature: 72,
    condition: "Sunny",
    location: location || "New York, NY",
    humidity: 65,
    windSpeed: 8,
    windDirection: 0,
    unit,
  };
  
  const displayTemp = unit === "celsius" 
    ? `${data.temperature}°C`
    : `${data.temperature}°F`;

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure}>
      <div
        ref={setContainerRef}
        className="flex h-full w-full flex-col items-center justify-center text-center text-[var(--foreground)]"
        style={{ 
          color: textStyle.color || "var(--foreground)",
          textAlign: (textStyle.textAlign || "center") as "left" | "center" | "right" | "justify",
        }}
      >
        {showTemperature && (
          <div 
            className="font-bold" 
            style={{ 
              fontSize: textStyle.fontSize || `${(typeof fontSize === "number" ? fontSize : 14) * 1.5}px`,
              fontWeight: textStyle.fontWeight || "bold",
              lineHeight: textStyle.lineHeight,
              letterSpacing: textStyle.letterSpacing,
              textTransform: textStyle.textTransform,
            }}
          >
            {displayTemp}
          </div>
        )}
        {showCondition && (
          <div 
            className="mt-2 opacity-80" 
            style={{ 
              fontSize: textStyle.fontSize ? `${parseInt(textStyle.fontSize) * 0.53}px` : `${(typeof fontSize === "number" ? fontSize : 14) * 0.8}px`,
              fontWeight: textStyle.fontWeight || "normal",
              lineHeight: textStyle.lineHeight,
              letterSpacing: textStyle.letterSpacing,
              textTransform: textStyle.textTransform,
            }}
          >
            {data.condition}
          </div>
        )}
        {showLocation && (
          <div 
            className="mt-1 opacity-60" 
            style={{ 
              fontSize: textStyle.fontSize ? `${parseInt(textStyle.fontSize) * 0.4}px` : `${(typeof fontSize === "number" ? fontSize : 14) * 0.6}px`,
              fontWeight: textStyle.fontWeight || "normal",
              lineHeight: textStyle.lineHeight,
              letterSpacing: textStyle.letterSpacing,
              textTransform: textStyle.textTransform,
            }}
          >
            {data.location}
          </div>
        )}
        {showDetails && (
          <div 
            className="mt-4 flex gap-4 text-xs opacity-50"
            style={{
              fontSize: textStyle.fontSize ? `${parseInt(textStyle.fontSize) * 0.27}px` : undefined,
              fontWeight: textStyle.fontWeight || "normal",
              lineHeight: textStyle.lineHeight,
              letterSpacing: textStyle.letterSpacing,
              textTransform: textStyle.textTransform,
            }}
          >
            <div>H: {data.humidity}%</div>
            <div>W: {data.windSpeed} {unit === "celsius" ? "km/h" : "mph"}</div>
          </div>
        )}
        <div className="mt-2 text-[8px] opacity-30">
          via Open-Meteo
        </div>
      </div>
    </WidgetWrapper>
  );
}
