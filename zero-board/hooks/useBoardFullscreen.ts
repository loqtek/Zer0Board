import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BoardDetail } from "@/lib/types/api";

interface UseBoardFullscreenOptions {
  board: BoardDetail | undefined;
  boardId: number;
  fullScreenParam: boolean;
  updateBoardMutation: {
    mutate: (variables: { layout_config?: Record<string, unknown> }) => void;
  };
}

export function useBoardFullscreen({
  board,
  boardId,
  fullScreenParam,
  updateBoardMutation,
}: UseBoardFullscreenOptions) {
  const router = useRouter();
  const shouldBeFullscreenInitial = fullScreenParam || board?.layout_config?.fullscreen === true;
  const [isFullscreen, setIsFullscreen] = useState(shouldBeFullscreenInitial);

  // Handle fullscreen mode
  useEffect(() => {
    const shouldBeFullscreen = fullScreenParam || board?.layout_config?.fullscreen === true;

    if (shouldBeFullscreen && typeof window !== "undefined") {
      setIsFullscreen((prev) => {
        if (prev !== shouldBeFullscreen) {
          return shouldBeFullscreen;
        }
        return prev;
      });

      // Auto-enter fullscreen
      const enterFullscreen = async () => {
        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          } else if ((document.documentElement as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
            await (document.documentElement as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
          } else if ((document.documentElement as unknown as { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
            await (document.documentElement as unknown as { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen();
          }
        } catch (error) {
          console.error("Error entering fullscreen:", error);
        }
      };

      // Small delay to ensure page is loaded
      const timer = setTimeout(() => {
        enterFullscreen();
      }, 100);

      // Listen for fullscreen changes
      const handleFullscreenChange = () => {
        const isCurrentlyFullscreen = !!(
          document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
          (document as unknown as { msFullscreenElement?: Element }).msFullscreenElement
        );
        setIsFullscreen(isCurrentlyFullscreen);

        // If exited fullscreen and query param is set, remove it
        if (!isCurrentlyFullscreen && fullScreenParam) {
          router.replace(`/boards/${boardId}`);
        }
      };

      // Handle ESC key to exit fullscreen
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && fullScreenParam) {
          router.replace(`/boards/${boardId}`);
        }
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.addEventListener("msfullscreenchange", handleFullscreenChange);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        clearTimeout(timer);
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.removeEventListener("msfullscreenchange", handleFullscreenChange);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [fullScreenParam, board?.layout_config?.fullscreen, boardId, router]);

  const toggleFullscreenSetting = useCallback(() => {
    const currentConfig = board?.layout_config || {};
    const newFullscreen = !currentConfig.fullscreen;

    updateBoardMutation.mutate({
      layout_config: {
        ...currentConfig,
        fullscreen: newFullscreen,
      },
    });
  }, [board?.layout_config, updateBoardMutation]);

  return {
    isFullscreen,
    toggleFullscreenSetting,
  };
}

