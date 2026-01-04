"use client";

import { useEffect, useRef } from "react";
import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { BarChart3 } from "lucide-react";

// Extend TradingView types
type TradingViewWidgetConfig = Record<string, unknown>;

interface TradingViewWidgetConstructor {
  new (config: TradingViewWidgetConfig): unknown;
}

declare global {
  interface Window {
    TradingView?: {
      widget?: TradingViewWidgetConstructor;
    };
  }
}

interface TradingViewWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

type WidgetType = "symbol-overview" | "mini-chart" | "ticker-tape" | "market-overview";

export function TradingViewWidget({
  widget,
  isEditMode,
  onDelete,
  onConfigure,
}: TradingViewWidgetProps) {
  const widgetUrl = widget.config?.widgetUrl;
  const symbol = widget.config?.symbol || "NASDAQ:AAPL";
  const widgetType = (widget.config?.widgetType || "symbol-overview") as WidgetType;
  const height = widget.config?.height || 400;
  const width = widget.config?.width || "100%";
  const theme = widget.config?.theme || "light";
  const locale = widget.config?.locale || "en";

  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || isEditMode) return;

    // Load TradingView widget script if not already loaded
    if (!scriptLoadedRef.current) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        createWidget();
      };
      document.body.appendChild(script);
    } else {
      createWidget();
    }

    function createWidget() {
      if (!containerRef.current || !window.TradingView) return;

      // Clear container
      containerRef.current.innerHTML = "";

      const widgetConfig: TradingViewWidgetConfig = {
        autosize: true,
        symbol: symbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: theme,
        style: "1",
        locale: locale,
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: `tradingview_${widget.id}`,
      };

      // Configure based on widget type
      if (widgetType === "symbol-overview") {
        new window.TradingView.widget({
          ...widgetConfig,
          width: width,
          height: height,
          symbol: symbol,
          interval: "D",
          range: "1M",
          hide_side_toolbar: false,
          allow_symbol_change: true,
          save_image: false,
          calendar: false,
          studies: ["Volume@tv-basicstudies"],
          show_popup_button: true,
          popup_width: "1000",
          popup_height: "650",
        });
      } else if (widgetType === "mini-chart") {
        new window.TradingView.widget({
          ...widgetConfig,
          width: width,
          height: height,
          symbol: symbol,
          interval: "D",
          range: "1D",
          hide_side_toolbar: true,
          hide_legend: false,
          save_image: false,
        });
      } else if (widgetType === "ticker-tape") {
        new window.TradingView.widget({
          symbols: [
            ["Apple", "AAPL"],
            ["Google", "GOOGL"],
            ["Microsoft", "MSFT"],
            ["Amazon", "AMZN"],
            ["Tesla", "TSLA"],
          ],
          showSymbolLogo: true,
          colorTheme: theme,
          isTransparent: false,
          displayMode: "adaptive",
          locale: locale,
          container_id: `tradingview_${widget.id}`,
        });
      } else if (widgetType === "market-overview") {
        new window.TradingView.widget({
          colorTheme: theme,
          dateRange: "12M",
          showChart: true,
          locale: locale,
          largeChartUrl: "",
          isTransparent: false,
          showSymbolLogo: true,
          showFloatingTooltip: false,
          width: width,
          height: height,
          plotLineColorGrowing: "#2962FF",
          plotLineColorFalling: "#2962FF",
          gridLineColor: "rgba(42, 46, 57, 0.06)",
          scaleFontColor: "rgba(120, 123, 134, 1)",
          belowLineFillColorGrowing: "rgba(41, 98, 255, 0.12)",
          belowLineFillColorFalling: "rgba(41, 98, 255, 0.12)",
          belowLineFillColorGrowingBottom: "rgba(41, 98, 255, 0)",
          belowLineFillColorFallingBottom: "rgba(41, 98, 255, 0)",
          symbolActiveColor: "rgba(41, 98, 255, 0.12)",
          tabs: [
            {
              title: "Indices",
              symbols: [
                { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
                { s: "FOREXCOM:NSXUSD", d: "US 100" },
                { s: "FOREXCOM:DJI", d: "Dow 30" },
                { s: "INDEX:NKY", d: "Nikkei 225" },
                { s: "INDEX:DEU30", d: "DAX" },
                { s: "FOREXCOM:UKXGBP", d: "UK 100" },
              ],
              originalTitle: "Indices",
            },
            {
              title: "Commodities",
              symbols: [
                { s: "CME_MINI:ES1!", d: "E-Mini S&P" },
                { s: "CME:6E1!", d: "Euro" },
                { s: "COMEX:GC1!", d: "Gold" },
                { s: "NYMEX:CL1!", d: "Crude Oil" },
                { s: "NYMEX:NG1!", d: "Natural Gas" },
                { s: "CBOT:ZC1!", d: "Corn" },
              ],
              originalTitle: "Commodities",
            },
            {
              title: "Bonds",
              symbols: [
                { s: "CME:GE1!", d: "Eurodollar" },
                { s: "CBOT:ZB1!", d: "T-Bond" },
                { s: "CBOT:UB1!", d: "Ultra T-Bond" },
                { s: "EUREX:FGBL1!", d: "Euro Bund" },
                { s: "EUREX:FBTP1!", d: "Euro BTP" },
                { s: "EUREX:FGBM1!", d: "Euro BOBL" },
              ],
              originalTitle: "Bonds",
            },
            {
              title: "Forex",
              symbols: [
                { s: "FX:EURUSD", d: "EUR/USD" },
                { s: "FX:GBPUSD", d: "GBP/USD" },
                { s: "FX:USDJPY", d: "USD/JPY" },
                { s: "FX:USDCHF", d: "USD/CHF" },
                { s: "FX:AUDUSD", d: "AUD/USD" },
                { s: "FX:USDCAD", d: "USD/CAD" },
              ],
              originalTitle: "Forex",
            },
          ],
          container_id: `tradingview_${widget.id}`,
        });
      }
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [widget.id, symbol, widgetType, height, width, theme, locale, isEditMode]);

  if (!widgetUrl && !symbol) {
    return (
      <WidgetWrapper
        widget={widget}
        isEditMode={isEditMode}
        onDelete={onDelete}
        onConfigure={onConfigure}
      >
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-[var(--text-muted)] mb-2">
              TradingView Widget
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Configure symbol or widget URL in settings
            </p>
          </div>
        </div>
      </WidgetWrapper>
    );
  }

  // If custom widget URL is provided, use iframe
  if (widgetUrl) {
    return (
      <WidgetWrapper
        widget={widget}
        isEditMode={isEditMode}
        onDelete={onDelete}
        onConfigure={onConfigure}
      >
        <div className="flex h-full w-full">
          <iframe
            src={widgetUrl}
            className="w-full h-full border-0"
            title="TradingView Widget"
            allow="clipboard-write"
          />
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper
      widget={widget}
      isEditMode={isEditMode}
      onDelete={onDelete}
      onConfigure={onConfigure}
    >
      <div className="flex h-full w-full">
        <div
          ref={containerRef}
          id={`tradingview_${widget.id}`}
          className="w-full h-full"
          style={{ minHeight: `${height}px` }}
        />
      </div>
    </WidgetWrapper>
  );
}

