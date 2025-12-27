import { useMemo } from "react";
import type { BoardDetail } from "@/lib/api";
import type { BoardPage } from "@/components/board/PageTabs";
import type { EffectiveBoardSettings } from "@/lib/types/board";

interface UseBoardSettingsOptions {
  board: BoardDetail | undefined;
  currentPage: BoardPage | undefined;
}

export function useBoardSettings({ board, currentPage }: UseBoardSettingsOptions) {
  // Get effective settings (page-specific or global)
  const effectiveSettings = useMemo((): EffectiveBoardSettings => {
    if (currentPage?.settings?.use_global_settings !== false && board?.settings) {
      return {
        background_type: board.settings.background_type || "none",
        background_source: board.settings.background_source,
        background_config: board.settings.background_config,
        background_preset: board.settings.background_preset,
        resolution_width: board.settings.resolution_width,
        resolution_height: board.settings.resolution_height,
        aspect_ratio: board.settings.aspect_ratio,
        orientation: board.settings.orientation,
        auto_rotate_pages: board.settings.auto_rotate_pages,
        lockout_mode: board.settings.lockout_mode,
      };
    }
    // Use page-specific settings
    return {
      background_type: currentPage?.settings?.background_type || board?.settings?.background_type || "none",
      background_source: currentPage?.settings?.background_source || board?.settings?.background_source,
      background_config: currentPage?.settings?.background_config || board?.settings?.background_config,
      background_preset: currentPage?.settings?.background_preset || board?.settings?.background_preset,
      resolution_width: currentPage?.settings?.resolution_width || board?.settings?.resolution_width,
      resolution_height: currentPage?.settings?.resolution_height || board?.settings?.resolution_height,
      aspect_ratio: currentPage?.settings?.aspect_ratio || board?.settings?.aspect_ratio,
      orientation: currentPage?.settings?.orientation || board?.settings?.orientation,
      auto_rotate_pages: board?.settings?.auto_rotate_pages,
      lockout_mode: board?.settings?.lockout_mode,
    };
  }, [currentPage, board?.settings]);

  const isLockoutMode = board?.settings?.lockout_mode ?? false;

  return {
    effectiveSettings,
    isLockoutMode,
  };
}

