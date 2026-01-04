"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { TrendingUp, BarChart3, Activity, AreaChart, AlertCircle } from "lucide-react";
import { fetchApiData } from "@/lib/services/api-data";
import type { ApiDataPoint } from "@/lib/types/services/api-data";

interface GraphWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
  onDuplicate?: () => void;
}

export function GraphWidget({ widget, isEditMode, onDelete, onConfigure, onDuplicate }: GraphWidgetProps) {
  const titleRaw = widget.config?.title;
  const title = typeof titleRaw === "string" ? titleRaw : "Data Graph";
  const chartType = widget.config?.chartType || (widget.type === "metric" ? "metric" : "line");
  const useManualData = widget.config?.useManualData === true || !widget.config?.apiUrl;
  const manualDataPointsRaw = widget.config?.dataPoints;
  const manualDataPoints = Array.isArray(manualDataPointsRaw) ? manualDataPointsRaw : [65, 70, 68, 75, 80, 78, 85];
  
  // API configuration
  const apiUrlRaw = widget.config?.apiUrl;
  const apiUrl = typeof apiUrlRaw === "string" ? apiUrlRaw : undefined;
  const apiMethodRaw = widget.config?.apiMethod;
  const apiMethod = typeof apiMethodRaw === "string" ? apiMethodRaw : "GET";
  const apiHeadersRaw = widget.config?.apiHeaders;
  const apiHeaders = typeof apiHeadersRaw === "string" ? apiHeadersRaw : undefined;
  const apiBodyRaw = widget.config?.apiBody;
  const apiBody = typeof apiBodyRaw === "string" ? apiBodyRaw : undefined;
  const dataPathRaw = widget.config?.dataPath;
  const dataPath = typeof dataPathRaw === "string" ? dataPathRaw : undefined;
  const xFieldRaw = widget.config?.xField;
  const xField = typeof xFieldRaw === "string" ? xFieldRaw : undefined;
  const yFieldRaw = widget.config?.yField;
  const yField = typeof yFieldRaw === "string" ? yFieldRaw : undefined;
  const refreshIntervalRaw = widget.config?.refreshInterval;
  const refreshInterval = typeof refreshIntervalRaw === "number" ? refreshIntervalRaw : 0;

  const [apiData, setApiData] = useState<ApiDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevDepsRef = useRef<string>("");

  // Fetch data from API
  useEffect(() => {
    if (useManualData || !apiUrl) {
      return;
    }

    const depsStr = `${apiUrl}|${apiMethod}|${apiHeaders}|${apiBody}|${dataPath}|${xField}|${yField}`;
    if (depsStr === prevDepsRef.current) {
      return;
    }
    prevDepsRef.current = depsStr;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await fetchApiData(
          apiUrl,
          apiMethod,
          apiHeaders,
          apiBody,
          dataPath,
          xField,
          yField
        );
        
        if (result.error) {
          setError(result.error);
          setApiData([]);
        } else {
          setApiData(result.data);
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setApiData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up refresh interval if configured
    let interval: NodeJS.Timeout | null = null;
    if (refreshInterval > 0) {
      interval = setInterval(fetchData, refreshInterval * 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [apiUrl, apiMethod, apiHeaders, apiBody, dataPath, xField, yField, refreshInterval, useManualData]);

  // Prepare data points for display
  const dataPoints = useMemo(() => {
    if (useManualData) {
      return manualDataPoints.map((value: number, index: number) => ({
        x: index + 1,
        y: value,
        label: String(index + 1),
      }));
    }
    return apiData;
  }, [useManualData, manualDataPoints, apiData]);

  // Calculate chart dimensions
  const maxValue = useMemo(() => {
    if (dataPoints.length === 0) return 100;
    return Math.max(...dataPoints.map((p: ApiDataPoint) => p.y), 100);
  }, [dataPoints]);

  const minValue = useMemo(() => {
    if (dataPoints.length === 0) return 0;
    return Math.min(...dataPoints.map((p: ApiDataPoint) => p.y), 0);
  }, [dataPoints]);

  const chartHeight = 120;
  const valueRange = maxValue - minValue || 1;

  // Render metric display
  if (chartType === "metric") {
    const currentValue = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].y : 0;
    const previousValue = dataPoints.length > 1 ? dataPoints[dataPoints.length - 2].y : currentValue;
    const change = currentValue - previousValue;
    const changePercent = previousValue !== 0 ? ((change / previousValue) * 100).toFixed(1) : "0";

    return (
      <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure} onDuplicate={onDuplicate}>
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[var(--foreground)]" />
            <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
          </div>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-sm text-[var(--text-muted)]">Loading...</div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <div className="text-sm text-red-500">{error}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[var(--foreground)]">
                    {typeof currentValue === "number" ? currentValue.toLocaleString() : currentValue}
                  </div>
                  {dataPoints.length > 1 && (
                    <div className={`text-sm mt-2 ${change >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {change >= 0 ? "↑" : "↓"} {Math.abs(change).toLocaleString()} ({changePercent}%)
                    </div>
                  )}
                </div>
              </div>
              {!useManualData && (
                <p className="text-xs text-[var(--text-muted)] text-center">
                  Last updated: {new Date().toLocaleTimeString()}
                </p>
              )}
            </>
          )}
        </div>
      </WidgetWrapper>
    );
  }

  // Render chart types
  const getChartIcon = () => {
    switch (chartType) {
      case "line":
        return <TrendingUp className="h-5 w-5 text-[var(--foreground)]" />;
      case "bar":
        return <BarChart3 className="h-5 w-5 text-[var(--foreground)]" />;
      case "area":
        return <AreaChart className="h-5 w-5 text-[var(--foreground)]" />;
      default:
        return <BarChart3 className="h-5 w-5 text-[var(--foreground)]" />;
    }
  };

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure} onDuplicate={onDuplicate}>
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          {getChartIcon()}
          <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
        </div>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-[var(--text-muted)]">Loading data...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-sm text-red-500">{error}</div>
              <div className="text-xs text-[var(--text-muted)] mt-2">Check API configuration</div>
            </div>
          </div>
        ) : dataPoints.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-[var(--text-muted)]">No data available</div>
          </div>
        ) : (
          <>
            <div className="flex-1 flex items-end justify-center gap-1 bg-[var(--muted)]/30 rounded border border-[var(--border)] p-4 relative overflow-hidden">
              {chartType === "line" || chartType === "area" ? (
                // Line/Area chart
                <svg className="w-full h-full absolute inset-0" viewBox={`0 0 ${dataPoints.length * 40} ${chartHeight + 20}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polyline
                    points={dataPoints.map((p: ApiDataPoint, i: number) => `${i * 40 + 20},${chartHeight + 10 - ((p.y - minValue) / valueRange) * chartHeight}`).join(" ")}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                  {chartType === "area" && (
                    <polygon
                      points={`20,${chartHeight + 10} ${dataPoints.map((p: ApiDataPoint, i: number) => `${i * 40 + 20},${chartHeight + 10 - ((p.y - minValue) / valueRange) * chartHeight}`).join(" ")} ${dataPoints.length * 40 - 20},${chartHeight + 10}`}
                      fill="url(#areaGradient)"
                    />
                  )}
                  {dataPoints.map((p: ApiDataPoint, i: number) => (
                    <circle
                      key={i}
                      cx={i * 40 + 20}
                      cy={chartHeight + 10 - ((p.y - minValue) / valueRange) * chartHeight}
                      r="3"
                      fill="var(--primary)"
                    />
                  ))}
                </svg>
              ) : (
                // Bar chart
                dataPoints.map((point: ApiDataPoint, index: number) => {
                  const height = ((point.y - minValue) / valueRange) * chartHeight;
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center justify-end gap-1 max-w-[40px]"
                    >
                      <div
                        className="w-full rounded-t bg-[var(--primary)] transition-all hover:opacity-80"
                        style={{ height: `${Math.max(height, 4)}px` }}
                        title={`${point.label || point.x}: ${point.y}`}
                      />
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Min: {minValue.toLocaleString()}</span>
              <span className="text-[var(--text-muted)]">Max: {maxValue.toLocaleString()}</span>
            </div>
            {!useManualData && (
              <p className="text-xs text-[var(--text-muted)] text-center">
                {apiUrl ? `Connected to API • ${dataPoints.length} data points` : "Using manual data"}
              </p>
            )}
          </>
        )}
      </div>
    </WidgetWrapper>
  );
}
