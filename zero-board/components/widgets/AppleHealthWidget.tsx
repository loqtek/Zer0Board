"use client";

import { Widget } from "@/lib/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { Activity, Smartphone, AlertCircle, ExternalLink } from "lucide-react";

interface AppleHealthWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
  onDuplicate?: () => void;
}

export function AppleHealthWidget({ widget, isEditMode, onDelete, onConfigure, onDuplicate }: AppleHealthWidgetProps) {
  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure} onDuplicate={onDuplicate}>
      <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
        <div className="text-center">
          <Smartphone className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold text-[var(--foreground)] mb-2">Apple Health</h3>
          <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-lg p-4 max-w-sm">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--foreground)] mb-1">
                  Native App Required
                </p>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Apple HealthKit is only available on iOS and macOS devices. To integrate Apple Health data with this web application, you'll need a native iOS/macOS app that can export or sync the data.
                </p>
              </div>
            </div>
            <div className="border-t border-[var(--border)] pt-3 mt-3">
              <p className="text-xs text-[var(--text-muted)] mb-2">
                <strong>Alternative Options:</strong>
              </p>
              <ul className="text-xs text-[var(--text-muted)] space-y-1 list-disc list-inside">
                <li>Use Strava or Fitbit integrations (available now)</li>
                <li>Export HealthKit data via third-party services</li>
                <li>Use a mobile app bridge to sync data</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-4">
            Learn more about{" "}
            <a
              href="https://developer.apple.com/documentation/healthkit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary)] hover:underline inline-flex items-center gap-1"
            >
              HealthKit
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>
    </WidgetWrapper>
  );
}

