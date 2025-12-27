"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/common/ThemeSwitcher";
import type { BoardDetail } from "@/lib/api";
import type { Theme } from "@/lib/theme";

interface BoardHeaderProps {
  board: BoardDetail;
  isEditMode: boolean;
  isLockoutMode: boolean;
  isFullscreen: boolean;
  isApiKeyMode: boolean;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onEditModeToggle: () => void;
  onAddWidget: () => void;
  onSettingsOpen: () => void;
  onFullscreenToggle: () => void;
}

export function BoardHeader({
  board,
  isEditMode,
  isLockoutMode,
  isFullscreen,
  isApiKeyMode,
  theme,
  setTheme,
  onEditModeToggle,
  onAddWidget,
  onSettingsOpen,
  onFullscreenToggle,
}: BoardHeaderProps) {
  const router = useRouter();

  if (isFullscreen || isLockoutMode || isApiKeyMode) {
    return null;
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            ← Back
          </Button>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{board.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isLockoutMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onSettingsOpen}
                title="Board settings"
              >
                ⚙️ Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onFullscreenToggle}
                title="Toggle fullscreen mode for IoT devices"
              >
                {board?.layout_config?.fullscreen ? "📺 Fullscreen ON" : "📺 Fullscreen OFF"}
              </Button>
              <ThemeSwitcher theme={theme} setTheme={setTheme} />
              <Button
                variant={isEditMode ? "default" : "outline"}
                onClick={onEditModeToggle}
              >
                {isEditMode ? "Done Editing" : "Edit"}
              </Button>
              {isEditMode && (
                <Button onClick={onAddWidget}>Add Widget</Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

