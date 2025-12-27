"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boardsApi, BoardSettings } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BoardPage } from "./PageTabs";

interface PageSettingsDialogProps {
  boardId: number;
  page: BoardPage;
  globalSettings?: BoardSettings;
  onClose: () => void;
  onUpdate: (updatedPage: BoardPage) => void;
}

export function PageSettingsDialog({
  boardId,
  page,
  globalSettings,
  onClose,
  onUpdate,
}: PageSettingsDialogProps) {
  const [pageName, setPageName] = useState(page.name);
  const [useGlobalSettings, setUseGlobalSettings] = useState(
    page.settings?.use_global_settings ?? true
  );
  const [duration, setDuration] = useState(
    page.settings?.duration?.toString() || ""
  );
  const [pageSettings, setPageSettings] = useState<Partial<BoardSettings>>({
    background_type: page.settings?.background_type || globalSettings?.background_type || "none",
    background_source: page.settings?.background_source || globalSettings?.background_source || "",
    background_config: page.settings?.background_config || globalSettings?.background_config || {},
    resolution_width: page.settings?.resolution_width || globalSettings?.resolution_width || 1920,
    resolution_height: page.settings?.resolution_height || globalSettings?.resolution_height || 1080,
    aspect_ratio: page.settings?.aspect_ratio || globalSettings?.aspect_ratio || "16:9",
    orientation: page.settings?.orientation || globalSettings?.orientation || "landscape",
  });

  useEffect(() => {
    if (useGlobalSettings && globalSettings) {
      setPageSettings({
        background_type: globalSettings.background_type || "none",
        background_source: globalSettings.background_source || "",
        background_config: globalSettings.background_config || {},
        resolution_width: globalSettings.resolution_width || 1920,
        resolution_height: globalSettings.resolution_height || 1080,
        aspect_ratio: globalSettings.aspect_ratio || "16:9",
        orientation: globalSettings.orientation || "landscape",
      });
    }
  }, [useGlobalSettings, globalSettings]);

  const handleSave = () => {
    const updatedPage: BoardPage = {
      ...page,
      name: pageName,
      settings: {
        ...page.settings,
        use_global_settings: useGlobalSettings,
        duration: duration ? parseInt(duration) : undefined,
        ...(useGlobalSettings ? {} : {
          background_type: pageSettings.background_type,
          background_source: pageSettings.background_source,
          background_config: pageSettings.background_config,
          resolution_width: pageSettings.resolution_width,
          resolution_height: pageSettings.resolution_height,
          aspect_ratio: pageSettings.aspect_ratio,
          orientation: pageSettings.orientation,
        }),
      },
    };
    onUpdate(updatedPage);
    onClose();
  };

  const aspectRatios = [
    { value: "16:9", label: "16:9 (Widescreen)" },
    { value: "4:3", label: "4:3 (Standard)" },
    { value: "21:9", label: "21:9 (Ultrawide)" },
    { value: "1:1", label: "1:1 (Square)" },
    { value: "9:16", label: "9:16 (Portrait)" },
    { value: "custom", label: "Custom" },
  ];

  const orientations = [
    { value: "landscape", label: "Landscape" },
    { value: "portrait", label: "Portrait" },
    { value: "auto", label: "Auto" },
  ];

  const backgroundTypes = [
    { value: "none", label: "None" },
    { value: "url", label: "Image URL" },
    { value: "youtube", label: "YouTube Video" },
    { value: "google_photos", label: "Google Photos" },
    { value: "dropbox", label: "Dropbox" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-[var(--foreground)]">Page Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Page Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Page Name
              </label>
              <Input
                type="text"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                placeholder="Enter page name"
                className="w-full"
              />
            </div>

            {/* Use Global Settings */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useGlobalSettings}
                  onChange={(e) => setUseGlobalSettings(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Use board-level settings
                </span>
              </label>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                If enabled, this page will use the same settings as the board. Otherwise, you can configure custom settings below.
              </p>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Display Duration (seconds)
              </label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Leave empty for no auto-rotation"
                min="1"
                className="w-full"
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                How long to display this page before rotating to the next (if auto-rotation is enabled).
              </p>
            </div>

            {/* Page-specific settings (only if not using global) */}
            {!useGlobalSettings && (
              <>
                {/* Background Settings */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Background Type
                  </label>
                  <select
                    value={pageSettings.background_type || "none"}
                    onChange={(e) =>
                      setPageSettings({ ...pageSettings, background_type: e.target.value })
                    }
                    className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                  >
                    {backgroundTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {pageSettings.background_type && pageSettings.background_type !== "none" && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      {pageSettings.background_type === "youtube"
                        ? "YouTube Video ID or URL"
                        : pageSettings.background_type === "google_photos"
                        ? "Google Photos Image URL or ID"
                        : pageSettings.background_type === "dropbox"
                        ? "Dropbox File URL or ID"
                        : "Image URL"}
                    </label>
                    <Input
                      type="text"
                      value={pageSettings.background_source || ""}
                      onChange={(e) =>
                        setPageSettings({ ...pageSettings, background_source: e.target.value })
                      }
                      placeholder={
                        pageSettings.background_type === "youtube"
                          ? "e.g., dQw4w9WgXcQ or https://www.youtube.com/watch?v=..."
                          : "Enter URL or ID"
                      }
                      className="w-full"
                    />
                  </div>
                )}

                {/* Resolution Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Resolution Width
                    </label>
                    <Input
                      type="number"
                      value={pageSettings.resolution_width || 1920}
                      onChange={(e) =>
                        setPageSettings({
                          ...pageSettings,
                          resolution_width: parseInt(e.target.value) || undefined,
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Resolution Height
                    </label>
                    <Input
                      type="number"
                      value={pageSettings.resolution_height || 1080}
                      onChange={(e) =>
                        setPageSettings({
                          ...pageSettings,
                          resolution_height: parseInt(e.target.value) || undefined,
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Aspect Ratio
                  </label>
                  <select
                    value={pageSettings.aspect_ratio || "16:9"}
                    onChange={(e) =>
                      setPageSettings({ ...pageSettings, aspect_ratio: e.target.value })
                    }
                    className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                  >
                    {aspectRatios.map((ratio) => (
                      <option key={ratio.value} value={ratio.value}>
                        {ratio.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Orientation */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Orientation
                  </label>
                  <select
                    value={pageSettings.orientation || "landscape"}
                    onChange={(e) =>
                      setPageSettings({ ...pageSettings, orientation: e.target.value })
                    }
                    className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                  >
                    {orientations.map((orientation) => (
                      <option key={orientation.value} value={orientation.value}>
                        {orientation.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSave}
                className="flex-1"
              >
                Save Settings
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



