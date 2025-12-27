"use client";

import { Widget } from "@/lib/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { QRCodeSVG } from "qrcode.react";

interface QRCodeWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

export function QRCodeWidget({ widget, isEditMode, onDelete, onConfigure }: QRCodeWidgetProps) {
  const link = widget.config?.link || widget.config?.data || "https://example.com";
  const size = widget.config?.size || 150;

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure}>
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
        <div className="flex items-center justify-center bg-white p-2 rounded">
          <QRCodeSVG
            value={link}
            size={Math.min(Math.max(size, 50), 300)}
            level="M"
            includeMargin={true}
          />
        </div>
        <div className="text-center w-full">
          <p className="text-xs text-[var(--text-muted)] break-all px-2">{link}</p>
        </div>
      </div>
    </WidgetWrapper>
  );
}




