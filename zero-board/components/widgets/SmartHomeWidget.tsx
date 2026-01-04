"use client";

import { Widget } from "@/lib/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { Home, Lightbulb, Thermometer, Lock } from "lucide-react";

interface SmartHomeWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

export function SmartHomeWidget({ widget, isEditMode, onDelete, onConfigure }: SmartHomeWidgetProps) {
  const devices = widget.config?.devices || [
    { name: "Living Room Lights", type: "light", status: "on", icon: Lightbulb },
    { name: "Thermostat", type: "thermostat", status: "72°F", icon: Thermometer },
    { name: "Front Door", type: "lock", status: "locked", icon: Lock },
  ];

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure}>
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-[var(--foreground)]" />
          <h3 className="font-semibold text-[var(--foreground)]">Smart Home</h3>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {devices.map((device: { entity_id: string; attributes?: { friendly_name?: string }; state?: string; icon?: React.ComponentType<{ className?: string }> }, index: number) => {
            const Icon = device.icon || Lightbulb;
            return (
              <div
                key={index}
                className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 hover:bg-[var(--muted)]/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-[var(--foreground)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {device.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {device.type}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${
                  device.status === "on" || device.status === "unlocked"
                    ? "text-green-500"
                    : device.status === "off" || device.status === "locked"
                    ? "text-[var(--text-muted)]"
                    : "text-[var(--foreground)]"
                }`}>
                  {device.status}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-[var(--text-muted)] text-center">
          Connect to smart home platform to control devices
        </p>
      </div>
    </WidgetWrapper>
  );
}




