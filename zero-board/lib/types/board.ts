import type { Widget } from "@/lib/types/api";

export interface BoardPage {
  id: string;
  name: string;
  order: number;
  settings?: {
    background_type?: string;
    background_source?: string;
    background_config?: Record<string, any>;
    background_preset?: string; // Preset ID from backgroundPresets
    duration?: number; // seconds to show this page
    use_global_settings?: boolean; // if true, use board-level settings
    resolution_width?: number;
    resolution_height?: number;
    aspect_ratio?: string;
    orientation?: string;
  };
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  page_id?: string;
}

export interface WidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

export interface BoardPageSettings {
  background_type?: string;
  background_source?: string;
  background_config?: Record<string, unknown>;
  background_preset?: string;
  duration?: number;
  use_global_settings?: boolean;
  resolution_width?: number;
  resolution_height?: number;
  aspect_ratio?: string;
  orientation?: string;
}

export interface EffectiveBoardSettings {
  background_type: string;
  background_source?: string;
  background_config?: Record<string, unknown>;
  background_preset?: string;
  resolution_width?: number;
  resolution_height?: number;
  aspect_ratio?: string;
  orientation?: string;
  auto_rotate_pages?: boolean;
  lockout_mode?: boolean;
}

export interface BoardLayoutConfig {
  pages?: BoardPage[];
  fullscreen?: boolean;
  [key: string]: unknown;
}

export interface YouTubePlayer {
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
}

export interface YouTubePlayerEvent {
  target: YouTubePlayer;
}

