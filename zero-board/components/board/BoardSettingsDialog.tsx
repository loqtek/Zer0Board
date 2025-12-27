"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boardsApi, boardAccessTokensApi, BoardSettings, type BoardAccessToken, type BoardAccessTokenCreateResponse } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Copy, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { backgroundPresets, backgroundCategories, getYouTubeVideoId, getYouTubeThumbnail, type BackgroundPreset } from "@/lib/data/backgroundPresets";
import Image from "next/image";

interface BoardSettingsDialogProps {
  boardId: number;
  onClose: () => void;
}

export function BoardSettingsDialog({ boardId, onClose }: BoardSettingsDialogProps) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Partial<BoardSettings>>({});

  const { data: currentSettings } = useQuery({
    queryKey: ["board-settings", boardId],
    queryFn: () => boardsApi.getSettings(boardId),
  });

  const [selectedPresetCategory, setSelectedPresetCategory] = useState<string>("All");
  const [showPresets, setShowPresets] = useState(false);
  
  // API Key management state
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<BoardAccessTokenCreateResponse | null>(null);
  const [visibleTokens, setVisibleTokens] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (currentSettings) {
      setSettings({
        background_type: currentSettings.background_type || "none",
        background_source: currentSettings.background_source || "",
        background_config: currentSettings.background_config || {},
        background_preset: currentSettings.background_preset || undefined,
        resolution_width: currentSettings.resolution_width || 1920,
        resolution_height: currentSettings.resolution_height || 1080,
        aspect_ratio: currentSettings.aspect_ratio || "16:9",
        orientation: currentSettings.orientation || "landscape",
        auto_rotate_pages: currentSettings.auto_rotate_pages ?? false,
        lockout_mode: currentSettings.lockout_mode ?? false,
      });
    }
  }, [currentSettings]);

  const handlePresetSelect = (preset: BackgroundPreset) => {
    // When selecting a preset, convert it to YouTube type so user can control volume/mute
    // But keep background_preset ID for reference
    setSettings({
      ...settings,
      background_type: "youtube", // Set to youtube so it works as a YouTube video
      background_source: getYouTubeVideoId(preset.source), // YouTube video ID
      background_config: preset.config || { muted: true, volume: 0 }, // Default config from preset
      background_preset: preset.id, // Store preset ID for reference
    });
    setShowPresets(false);
    toast.success(`Selected "${preset.name}" preset`);
  };

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<BoardSettings>) =>
      boardsApi.updateSettings(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-settings", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards", boardId] });
      toast.success("Board settings updated successfully");
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(settings);
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
    { value: "preset", label: "Preset" },
    { value: "url", label: "Image URL" },
    { value: "youtube", label: "YouTube Video" },
    { value: "google_photos", label: "Google Photos" },
    { value: "dropbox", label: "Dropbox" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-[var(--foreground)]">Board Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Background Settings */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Background Type
              </label>
              <select
                value={settings.background_type || "none"}
                onChange={(e) => {
                  const newType = e.target.value;
                  if (newType === "preset") {
                    // Show preset browser - if a preset is already selected, keep it but show browser
                    setSettings({ 
                      ...settings, 
                      background_type: newType,
                      // Don't clear background_preset - let user see current selection and change it
                    });
                    setShowPresets(true); // Auto-show preset browser when "Preset" is selected
                  } else {
                    // Clear preset when switching to non-preset type
                    setSettings({ 
                      ...settings, 
                      background_type: newType,
                      background_preset: undefined,
                    });
                    setShowPresets(false);
                  }
                }}
                className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
              >
                {backgroundTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Preset Selection - Show when "Preset" type is selected OR when a preset is already selected */}
            {(settings.background_type === "preset" || settings.background_preset) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    {settings.background_preset ? "Selected Preset" : "Select Background Preset"}
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPresets(!showPresets)}
                  >
                    {showPresets ? "Hide Presets" : settings.background_preset ? "Change Preset" : "Browse Presets"}
                  </Button>
                </div>
                
                {settings.background_preset && (
                  <div className="space-y-4">
                    <div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--muted)]/30">
                      <p className="text-sm text-[var(--foreground)]">
                        Selected: {backgroundPresets.find(p => p.id === settings.background_preset)?.name || "Unknown Preset"}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSettings({
                            ...settings,
                            background_preset: undefined,
                            background_type: "none",
                            background_source: undefined,
                            background_config: {},
                          });
                        }}
                        className="mt-2"
                      >
                        Clear Preset
                      </Button>
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        This preset is configured as a YouTube video. You can adjust the volume and mute settings below.
                      </p>
                    </div>

                    {/* Video Audio Controls for Presets - Show when background_type is youtube and preset is selected */}
                    {settings.background_type === "youtube" && settings.background_preset && (
                      <div className="space-y-4 p-4 border border-[var(--border)] rounded-lg bg-[var(--muted)]/30">
                        <h4 className="text-sm font-semibold text-[var(--foreground)]">Video Audio Settings</h4>
                        
                        {/* Mute/Unmute Toggle */}
                        <div>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.background_config?.muted !== false}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  background_config: {
                                    ...settings.background_config,
                                    muted: e.target.checked,
                                  },
                                })
                              }
                              className="rounded"
                            />
                            <span className="text-sm text-[var(--foreground)]">
                              Mute Video
                            </span>
                          </label>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            When enabled, the video will play without sound.
                          </p>
                        </div>

                        {/* Volume Control (only show if not muted) */}
                        {settings.background_config?.muted === false && (
                          <div>
                            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                              Volume: {Math.round((settings.background_config?.volume || 50))}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={settings.background_config?.volume || 50}
                              onChange={(e) =>
                                setSettings({
                                  ...settings,
                                  background_config: {
                                    ...settings.background_config,
                                    volume: parseInt(e.target.value),
                                  },
                                })
                              }
                              className="w-full h-2 bg-[var(--muted)] rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${settings.background_config?.volume || 50}%, var(--muted) ${settings.background_config?.volume || 50}%, var(--muted) 100%)`
                              }}
                            />
                            <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                              <span>0%</span>
                              <span>100%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {showPresets && (
                  <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card-bg)] max-h-96 overflow-y-auto">
                    {/* Category Filter */}
                    <div className="mb-4 flex gap-2 flex-wrap">
                      {backgroundCategories.map((cat) => (
                        <Button
                          key={cat}
                          type="button"
                          variant={selectedPresetCategory === cat ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedPresetCategory(cat)}
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {backgroundPresets
                        .filter((preset) => 
                          selectedPresetCategory === "All" || preset.category === selectedPresetCategory
                        )
                        .map((preset) => (
                          <div
                            key={preset.id}
                            onClick={() => handlePresetSelect(preset)}
                            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                              settings.background_preset === preset.id
                                ? "border-[var(--primary)]"
                                : "border-[var(--border)] hover:border-[var(--primary)]/50"
                            }`}
                          >
                            <div className="relative w-full h-24 bg-[var(--muted)]">
                              <img
                                src={getYouTubeThumbnail(getYouTubeVideoId(preset.source))}
                                alt={preset.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                              <div className="absolute bottom-1 left-2 right-2">
                                <h4 className="text-xs font-semibold text-white truncate">{preset.name}</h4>
                              </div>
                            </div>
                            <div className="p-2 bg-[var(--card-bg)]">
                              <p className="text-xs text-[var(--text-muted)] line-clamp-1">{preset.description}</p>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--text-muted)] mt-1 inline-block">
                                {preset.category}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Show URL input for non-preset types, or for YouTube when no preset is selected */}
            {settings.background_type && settings.background_type !== "none" && !settings.background_preset && (
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  {settings.background_type === "youtube"
                    ? "YouTube Video ID or URL"
                    : settings.background_type === "google_photos"
                    ? "Google Photos Image URL or ID"
                    : settings.background_type === "dropbox"
                    ? "Dropbox File URL or ID"
                    : "Image URL"}
                </label>
                <input
                  type="text"
                  value={settings.background_source || ""}
                  onChange={(e) => {
                    setSettings({ 
                      ...settings, 
                      background_source: e.target.value,
                      background_preset: undefined, // Clear preset when manually entering source
                    });
                  }}
                  onFocus={() => {
                    // Clear preset if user manually edits the source
                    if (settings.background_preset) {
                      setSettings({
                        ...settings,
                        background_preset: undefined,
                      });
                    }
                  }}
                  placeholder={
                    settings.background_type === "youtube"
                      ? "e.g., dQw4w9WgXcQ or https://www.youtube.com/watch?v=..."
                      : "Enter URL or ID"
                  }
                  className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                />
                {settings.background_type === "youtube" && (
                  <>
                    <p className="mt-1 text-xs text-[var(--text-muted)] mb-4">
                      Enter YouTube video ID or full URL. Video will autoplay and loop.
                    </p>
                    
                    {/* Video Audio Controls */}
                    <div className="space-y-4 mt-4 p-4 border border-[var(--border)] rounded-lg bg-[var(--muted)]/30">
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">Video Audio Settings</h4>
                      
                      {/* Mute/Unmute Toggle */}
                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.background_config?.muted !== false}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                background_config: {
                                  ...settings.background_config,
                                  muted: e.target.checked,
                                },
                              })
                            }
                            className="rounded"
                          />
                          <span className="text-sm text-[var(--foreground)]">
                            Mute Video
                          </span>
                        </label>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          When enabled, the video will play without sound.
                        </p>
                      </div>

                      {/* Volume Control (only show if not muted) */}
                      {settings.background_config?.muted === false && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                            Volume: {Math.round((settings.background_config?.volume || 50))}%
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={settings.background_config?.volume || 50}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                background_config: {
                                  ...settings.background_config,
                                  volume: parseInt(e.target.value),
                                },
                              })
                            }
                            className="w-full h-2 bg-[var(--muted)] rounded-lg appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${settings.background_config?.volume || 50}%, var(--muted) ${settings.background_config?.volume || 50}%, var(--muted) 100%)`
                            }}
                          />
                          <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                            <span>0%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Resolution Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Resolution Width
                </label>
                <input
                  type="number"
                  value={settings.resolution_width || 1920}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      resolution_width: parseInt(e.target.value) || undefined,
                    })
                  }
                  className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Resolution Height
                </label>
                <input
                  type="number"
                  value={settings.resolution_height || 1080}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      resolution_height: parseInt(e.target.value) || undefined,
                    })
                  }
                  className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                />
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Aspect Ratio
              </label>
              <select
                value={settings.aspect_ratio || "16:9"}
                onChange={(e) =>
                  setSettings({ ...settings, aspect_ratio: e.target.value })
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
                value={settings.orientation || "landscape"}
                onChange={(e) =>
                  setSettings({ ...settings, orientation: e.target.value })
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

            {/* Auto Rotate Pages */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.auto_rotate_pages || false}
                  onChange={(e) =>
                    setSettings({ ...settings, auto_rotate_pages: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Auto Rotate Pages
                </span>
              </label>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Automatically rotate between pages when in fullscreen mode. Each page must have a duration set in its settings.
              </p>
            </div>

            {/* Lockout Mode */}
            <div className="border-t border-[var(--border)] pt-4">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={settings.lockout_mode || false}
                  onChange={(e) =>
                    setSettings({ ...settings, lockout_mode: e.target.checked })
                  }
                  className="rounded mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      Lockout Mode
                    </span>
                    <div className="group relative">
                      <Info className="h-4 w-4 text-[var(--text-muted)] cursor-help" />
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-md shadow-lg text-xs text-[var(--foreground)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        When enabled, prevents all clicking, keyboard input, and navigation. Designed for public displays to prevent tampering. Users cannot exit fullscreen, close dialogs, or interact with the board in any way.
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Prevents all interactions and navigation. Ideal for public displays to prevent tampering.
                  </p>
                </div>
              </label>
            </div>

            {/* API Keys Section */}
            <div className="border-t border-[var(--border)] pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">API Keys</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Generate secure API keys to access this board without authentication. Useful for displays and kiosks.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKeys(!showApiKeys)}
                >
                  {showApiKeys ? "Hide" : "Manage"}
                </Button>
              </div>

              {showApiKeys && (
                <ApiKeysSection
                  boardId={boardId}
                  newlyCreatedToken={newlyCreatedToken}
                  setNewlyCreatedToken={setNewlyCreatedToken}
                  visibleTokens={visibleTokens}
                  setVisibleTokens={setVisibleTokens}
                />
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="flex-1"
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// API Keys Management Component
function ApiKeysSection({
  boardId,
  newlyCreatedToken,
  setNewlyCreatedToken,
  visibleTokens,
  setVisibleTokens,
}: {
  boardId: number;
  newlyCreatedToken: BoardAccessTokenCreateResponse | null;
  setNewlyCreatedToken: (token: BoardAccessTokenCreateResponse | null) => void;
  visibleTokens: Set<number>;
  setVisibleTokens: (tokens: Set<number>) => void;
}) {
  const queryClient = useQueryClient();
  const [newTokenName, setNewTokenName] = useState("");

  const { data: tokens, isLoading } = useQuery({
    queryKey: ["board-access-tokens", boardId],
    queryFn: () => boardAccessTokensApi.list(boardId),
  });

  const createTokenMutation = useMutation({
    mutationFn: (data: { name?: string }) => boardAccessTokensApi.create(boardId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["board-access-tokens", boardId] });
      setNewlyCreatedToken(data);
      setNewTokenName("");
      toast.success("API key created successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteTokenMutation = useMutation({
    mutationFn: (tokenId: number) => boardAccessTokensApi.delete(boardId, tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-access-tokens", boardId] });
      toast.success("API key deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const toggleTokenMutation = useMutation({
    mutationFn: ({ tokenId, isActive }: { tokenId: number; isActive: boolean }) =>
      boardAccessTokensApi.update(boardId, tokenId, { is_active: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-access-tokens", boardId] });
      toast.success("API key updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const toggleTokenVisibility = (tokenId: number) => {
    const newVisible = new Set(visibleTokens);
    if (newVisible.has(tokenId)) {
      newVisible.delete(tokenId);
    } else {
      newVisible.add(tokenId);
    }
    setVisibleTokens(newVisible);
  };

  return (
    <div className="space-y-4">
      {/* New Token Creation */}
      <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--muted)]/30">
        <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">Create New API Key</h4>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Optional name (e.g., 'TV Display')"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            className="flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => createTokenMutation.mutate({ name: newTokenName || undefined })}
            disabled={createTokenMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>
      </div>

      {/* Newly Created Token Display */}
      {newlyCreatedToken && (
        <div className="p-4 border-2 border-[var(--primary)] rounded-lg bg-[var(--muted)]/50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">New API Key Created</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNewlyCreatedToken(null)}
            >
              ×
            </Button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-2">
            Save this token now - you won't be able to see it again!
          </p>
          <div className="flex gap-2">
            <code className="flex-1 p-2 bg-[var(--background)] border border-[var(--border)] rounded text-xs font-mono text-[var(--foreground)] break-all">
              {newlyCreatedToken.token}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(newlyCreatedToken.token)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
            <p>Use in query param: <code className="bg-[var(--muted)] px-1 rounded">?access_token={newlyCreatedToken.token}</code></p>
            <p>Or in header: <code className="bg-[var(--muted)] px-1 rounded">Authorization: Bearer {newlyCreatedToken.token}</code></p>
            <p>Or: <code className="bg-[var(--muted)] px-1 rounded">X-Access-Token: {newlyCreatedToken.token}</code></p>
          </div>
        </div>
      )}

      {/* Existing Tokens List */}
      <div>
        <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">Existing API Keys</h4>
        {isLoading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        ) : !tokens || tokens.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No API keys created yet</p>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="p-3 border border-[var(--border)] rounded-lg bg-[var(--card-bg)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {token.name || `Token #${token.id}`}
                      </span>
                      {token.is_active ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-500">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] space-y-1">
                      <p>Created: {new Date(token.created_at).toLocaleString()}</p>
                      {token.last_used_at && (
                        <p>Last used: {new Date(token.last_used_at).toLocaleString()}</p>
                      )}
                      {token.expires_at && (
                        <p>Expires: {new Date(token.expires_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTokenMutation.mutate({ tokenId: token.id, isActive: token.is_active })}
                      disabled={toggleTokenMutation.isPending}
                      title={token.is_active ? "Deactivate" : "Activate"}
                    >
                      {token.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this API key?")) {
                          deleteTokenMutation.mutate(token.id);
                        }
                      }}
                      disabled={deleteTokenMutation.isPending}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


