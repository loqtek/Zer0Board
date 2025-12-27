import { useEffect } from "react";

interface UseBoardLockoutOptions {
  isLockoutMode: boolean;
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
}

export function useBoardLockout({ isLockoutMode, isEditMode, setIsEditMode }: UseBoardLockoutOptions) {
  useEffect(() => {
    if (!isLockoutMode) return;

    // Prevent all clicks and touches
    const preventInteraction = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Prevent keyboard shortcuts
    const preventKeyboard = (e: KeyboardEvent) => {
      // Block all keyboard input for maximum security
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Prevent context menu
    const preventContextMenu = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Prevent navigation
    const preventNavigation = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    // Prevent fullscreen exit
    const preventFullscreenExit = () => {
      if (document.fullscreenElement) {
        // Keep fullscreen active
        document.documentElement.requestFullscreen().catch(() => {
          // Ignore errors
        });
      }
    };

    // Add event listeners with capture phase to catch everything
    document.addEventListener("click", preventInteraction, { capture: true, passive: false });
    document.addEventListener("touchstart", preventInteraction, { capture: true, passive: false });
    document.addEventListener("touchmove", preventInteraction, { capture: true, passive: false });
    document.addEventListener("touchend", preventInteraction, { capture: true, passive: false });
    document.addEventListener("keydown", preventKeyboard, { capture: true, passive: false });
    document.addEventListener("keyup", preventKeyboard, { capture: true, passive: false });
    document.addEventListener("contextmenu", preventContextMenu, { capture: true, passive: false });
    window.addEventListener("beforeunload", preventNavigation);
    document.addEventListener("fullscreenchange", preventFullscreenExit);

    // Disable edit mode if lockout is enabled
    if (isEditMode) {
      setIsEditMode(false);
    }

    // Cleanup
    return () => {
      document.removeEventListener("click", preventInteraction, { capture: true } as EventListenerOptions);
      document.removeEventListener("touchstart", preventInteraction, { capture: true } as EventListenerOptions);
      document.removeEventListener("touchmove", preventInteraction, { capture: true } as EventListenerOptions);
      document.removeEventListener("touchend", preventInteraction, { capture: true } as EventListenerOptions);
      document.removeEventListener("keydown", preventKeyboard, { capture: true } as EventListenerOptions);
      document.removeEventListener("keyup", preventKeyboard, { capture: true } as EventListenerOptions);
      document.removeEventListener("contextmenu", preventContextMenu, { capture: true } as EventListenerOptions);
      window.removeEventListener("beforeunload", preventNavigation);
      document.removeEventListener("fullscreenchange", preventFullscreenExit);
    };
  }, [isLockoutMode, isEditMode, setIsEditMode]);
}

