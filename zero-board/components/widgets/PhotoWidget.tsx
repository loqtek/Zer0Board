"use client";

import { Widget } from "@/lib/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { Image, Camera } from "lucide-react";

interface PhotoWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

export function PhotoWidget({ widget, isEditMode, onDelete, onConfigure }: PhotoWidgetProps) {
  const photos = widget.config?.photos || [
    { url: "https://via.placeholder.com/300x200?text=Photo+1", title: "Photo 1" },
    { url: "https://via.placeholder.com/300x200?text=Photo+2", title: "Photo 2" },
  ];
  const currentPhotoIndex = widget.config?.currentPhotoIndex || 0;
  const currentPhoto = photos[currentPhotoIndex] || photos[0];

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure}>
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-[var(--foreground)]" />
          <h3 className="font-semibold text-[var(--foreground)]">Photo Gallery</h3>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[var(--muted)]/30 rounded border border-[var(--border)] overflow-hidden">
          {currentPhoto ? (
            <img
              src={currentPhoto.url}
              alt={currentPhoto.title || "Photo"}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Image className="h-12 w-12 text-[var(--text-muted)] mb-2" />
              <p className="text-sm text-[var(--text-muted)]">No photos</p>
            </div>
          )}
        </div>
        {photos.length > 1 && (
          <div className="flex gap-1 justify-center">
            {photos.map((_: any, index: number) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentPhotoIndex
                    ? "w-6 bg-[var(--primary)]"
                    : "w-2 bg-[var(--text-muted)]"
                }`}
              />
            ))}
          </div>
        )}
        <p className="text-xs text-[var(--text-muted)] text-center">
          Connect to Google Photos, Dropbox, or upload images
        </p>
      </div>
    </WidgetWrapper>
  );
}




