"use client";

import React from "react";
import { ClockWidget } from "@/components/widgets/ClockWidget";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { NewsWidget } from "@/components/widgets/NewsWidget";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { NoteWidget } from "@/components/widgets/NoteWidget";
import { TodoWidget } from "@/components/widgets/TodoWidget";
import { StockWidget } from "@/components/widgets/StockWidget";
import { TradingViewWidget } from "@/components/widgets/TradingViewWidget";
import { QRCodeWidget } from "@/components/widgets/QRCodeWidget";
import { EmailWidget } from "@/components/widgets/EmailWidget";
import { SlackWidget } from "@/components/widgets/SlackWidget";
import { SmartHomeWidget } from "@/components/widgets/SmartHomeWidget";
import { FitbitWidget } from "@/components/widgets/FitbitWidget";
import { PhotoWidget } from "@/components/widgets/PhotoWidget";
import { GraphWidget } from "@/components/widgets/GraphWidget";
import { BookmarkWidget } from "@/components/widgets/BookmarkWidget";
import { HomeAssistantWidget } from "@/components/widgets/HomeAssistantWidget";
import type { WidgetProps } from "@/lib/types/board";
import type { ComponentType } from "react";

type WidgetComponent = ComponentType<WidgetProps>;

interface WidgetRegistry {
  [key: string]: WidgetComponent;
}

const widgetRegistry: WidgetRegistry = {
  clock: ClockWidget,
  weather: WeatherWidget,
  news: NewsWidget,
  calendar: CalendarWidget,
  google_calendar: CalendarWidget,
  microsoft_calendar: CalendarWidget,
  note: NoteWidget,
  todo: TodoWidget,
  stock: StockWidget,
  crypto: StockWidget,
  tradingview: TradingViewWidget,
  qr_code: QRCodeWidget,
  email: EmailWidget,
  slack: SlackWidget,
  discord: SlackWidget,
  teams: SlackWidget,
  smart_home: SmartHomeWidget,
  home_assistant: HomeAssistantWidget,
  fitbit: FitbitWidget,
  photo: PhotoWidget,
  graph: GraphWidget,
  metric: GraphWidget,
  bookmark: BookmarkWidget,
};

export function renderWidget(widgetProps: WidgetProps): React.ReactElement {
  const WidgetComponent = widgetRegistry[widgetProps.widget.type];

  if (!WidgetComponent) {
    return (
      <div key={widgetProps.widget.id} className="p-4 text-center text-[var(--text-muted)]">
        Unknown widget type: {widgetProps.widget.type}
      </div>
    );
  }

  return <WidgetComponent key={widgetProps.widget.id} {...widgetProps} />;
}

export function getWidgetComponent(type: string): WidgetComponent | undefined {
  return widgetRegistry[type];
}

export function isWidgetTypeSupported(type: string): boolean {
  return type in widgetRegistry;
}

