"use client";

// Legacy stock widget - now redirects to StockMarketWidget
// Keeping for backward compatibility
import { StockMarketWidget } from "./StockMarketWidget";
import type { Widget } from "@/lib/api";

interface StockWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

export function StockWidget(props: StockWidgetProps) {
  // Use StockMarketWidget with default stock configuration
  return <StockMarketWidget {...props} />;
}




