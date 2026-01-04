"use client";

import { useState, useEffect } from "react";
import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Globe,
  Building2,
} from "lucide-react";
import {
  getStockQuote,
  getStockOverview,
  getForexQuote,
} from "@/lib/services/stock-market";
import type { StockQuote, StockOverview, ForexQuote } from "@/lib/types/services/stock-market";

interface StockMarketWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

type MarketType = "stock" | "forex" | "crypto";
type DisplayTemplate = "compact" | "detailed" | "minimal" | "card";

export function StockMarketWidget({
  widget,
  isEditMode,
  onDelete,
  onConfigure,
}: StockMarketWidgetProps) {
  const apiKey = widget.config?.apiKey;
  const symbol = widget.config?.symbol || "AAPL";
  const marketType = (widget.config?.marketType || "stock") as MarketType;
  const template = (widget.config?.template || "compact") as DisplayTemplate;
  const refreshInterval = widget.config?.refreshInterval || 60; // 60 seconds default
  const fromCurrency = widget.config?.fromCurrency || "USD";
  const toCurrency = widget.config?.toCurrency || "EUR";

  const [quote, setQuote] = useState<StockQuote | ForexQuote | null>(null);
  const [overview, setOverview] = useState<StockOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    if (!apiKey) {
      setError("API key not configured");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (marketType === "forex") {
        const forexData = await getForexQuote(fromCurrency, toCurrency, apiKey);
        setQuote(forexData);
      } else {
        const stockData = await getStockQuote(symbol, apiKey);
        setQuote(stockData);

        // Fetch overview for detailed template
        if (template === "detailed" && stockData) {
          const overviewData = await getStockOverview(symbol, apiKey);
          setOverview(overviewData);
        }
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching market data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch market data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up refresh interval
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [apiKey, symbol, marketType, fromCurrency, toCurrency, template, refreshInterval]);

  if (!apiKey) {
    return (
      <WidgetWrapper
        widget={widget}
        isEditMode={isEditMode}
        onDelete={onDelete}
        onConfigure={onConfigure}
      >
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <div className="text-center">
            <DollarSign className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Stock Market
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Configure Alpha Vantage API key in widget settings
            </p>
          </div>
        </div>
      </WidgetWrapper>
    );
  }

  const isPositive =
    quote && "change" in quote ? quote.change >= 0 : false;
  const isForex = marketType === "forex";

  // Render based on template
  const renderCompact = () => {
    if (!quote) return null;

    if (isForex && "rate" in quote) {
      return (
        <div className="flex h-full flex-col justify-center gap-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                {quote.fromCurrency}/{quote.toCurrency}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Forex</p>
            </div>
            <Globe className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">
              {quote.rate.toFixed(4)}
            </p>
          </div>
        </div>
      );
    }

    if ("price" in quote) {
      return (
        <div className="flex h-full flex-col justify-center gap-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                {quote.symbol}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Stock Price</p>
            </div>
            <DollarSign className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--foreground)]">
              ${quote.price.toFixed(2)}
            </p>
            <div
              className={`flex items-center gap-1 mt-1 ${
                isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {isPositive ? "+" : ""}
                {quote.change.toFixed(2)} ({isPositive ? "+" : ""}
                {quote.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderMinimal = () => {
    if (!quote) return null;

    if (isForex && "rate" in quote) {
      return (
        <div className="flex h-full items-center justify-between p-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">
              {quote.fromCurrency}/{quote.toCurrency}
            </p>
            <p className="text-xl font-bold text-[var(--foreground)]">
              {quote.rate.toFixed(4)}
            </p>
          </div>
        </div>
      );
    }

    if ("price" in quote) {
      return (
        <div className="flex h-full items-center justify-between p-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">{quote.symbol}</p>
            <p className="text-xl font-bold text-[var(--foreground)]">
              ${quote.price.toFixed(2)}
            </p>
          </div>
          <div
            className={`text-sm font-medium ${
              isPositive ? "text-green-500" : "text-red-500"
            }`}
          >
            {isPositive ? "+" : ""}
            {quote.changePercent.toFixed(2)}%
          </div>
        </div>
      );
    }

    return null;
  };

  const renderDetailed = () => {
    if (!quote) return null;

    if (isForex && "rate" in quote) {
      return (
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                {quote.fromCurrency}/{quote.toCurrency}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Forex Exchange Rate</p>
            </div>
            <Globe className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-3xl font-bold text-[var(--foreground)] mb-2">
              {quote.rate.toFixed(4)}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[var(--text-muted)]">From:</span>{" "}
                <span className="text-[var(--foreground)]">{quote.fromCurrency}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">To:</span>{" "}
                <span className="text-[var(--foreground)]">{quote.toCurrency}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if ("price" in quote) {
      return (
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                {quote.symbol}
              </h3>
              {overview && (
                <p className="text-xs text-[var(--text-muted)]">{overview.name}</p>
              )}
            </div>
            <Building2 className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3">
            <div>
              <p className="text-3xl font-bold text-[var(--foreground)]">
                ${quote.price.toFixed(2)}
              </p>
              <div
                className={`flex items-center gap-1 mt-1 ${
                  isPositive ? "text-green-500" : "text-red-500"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {isPositive ? "+" : ""}
                  {quote.change.toFixed(2)} ({isPositive ? "+" : ""}
                  {quote.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-[var(--border)] pt-3">
              <div>
                <span className="text-[var(--text-muted)]">Open:</span>{" "}
                <span className="text-[var(--foreground)]">
                  ${quote.open.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">High:</span>{" "}
                <span className="text-green-500">${quote.high.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Low:</span>{" "}
                <span className="text-red-500">${quote.low.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Volume:</span>{" "}
                <span className="text-[var(--foreground)]">
                  {quote.volume.toLocaleString()}
                </span>
              </div>
            </div>
            {overview && (
              <div className="text-xs border-t border-[var(--border)] pt-3 space-y-1">
                {overview.sector && (
                  <div>
                    <span className="text-[var(--text-muted)]">Sector:</span>{" "}
                    <span className="text-[var(--foreground)]">{overview.sector}</span>
                  </div>
                )}
                {overview.marketCap && (
                  <div>
                    <span className="text-[var(--text-muted)]">Market Cap:</span>{" "}
                    <span className="text-[var(--foreground)]">
                      ${parseFloat(overview.marketCap).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderCard = () => {
    if (!quote) return null;

    if (isForex && "rate" in quote) {
      return (
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[var(--muted)]">
                <Globe className="h-5 w-5 text-[var(--foreground)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">
                  {quote.fromCurrency}/{quote.toCurrency}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">Forex</p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl font-bold text-[var(--foreground)] mb-2">
                {quote.rate.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if ("price" in quote) {
      return (
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[var(--muted)]">
                <BarChart3 className="h-5 w-5 text-[var(--foreground)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">
                  {quote.symbol}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">Stock</p>
              </div>
            </div>
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                isPositive
                  ? "bg-green-500/20 text-green-500"
                  : "bg-red-500/20 text-red-500"
              }`}
            >
              {isPositive ? "+" : ""}
              {quote.changePercent.toFixed(2)}%
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl font-bold text-[var(--foreground)] mb-2">
                ${quote.price.toFixed(2)}
              </p>
              <div
                className={`flex items-center justify-center gap-1 text-sm ${
                  isPositive ? "text-green-500" : "text-red-500"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {quote.change.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderContent = () => {
    switch (template) {
      case "minimal":
        return renderMinimal();
      case "detailed":
        return renderDetailed();
      case "card":
        return renderCard();
      case "compact":
      default:
        return renderCompact();
    }
  };

  return (
    <WidgetWrapper
      widget={widget}
      isEditMode={isEditMode}
      onDelete={onDelete}
      onConfigure={onConfigure}
    >
      <div className="flex h-full flex-col">
        {isLoading && !quote ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-[var(--text-muted)]">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-sm text-red-500">{error}</div>
            </div>
          </div>
        ) : (
          <>
            {renderContent()}
            <div className="px-4 pb-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>
                {lastUpdate
                  ? `Updated ${lastUpdate.toLocaleTimeString()}`
                  : "No data"}
              </span>
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="p-1 rounded hover:bg-[var(--muted)] transition-colors"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </>
        )}
      </div>
    </WidgetWrapper>
  );
}

