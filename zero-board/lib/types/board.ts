import type { Widget, BoardSettings } from "@/lib/api";
import type { BoardPage } from "@/components/board/PageTabs";

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

