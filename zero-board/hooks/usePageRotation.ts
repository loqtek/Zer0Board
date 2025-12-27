import { useEffect } from "react";
import type { BoardPage } from "@/components/board/PageTabs";
import type { BoardDetail } from "@/lib/api";

interface UsePageRotationOptions {
  isEditMode: boolean;
  board: BoardDetail | undefined;
  currentPage: BoardPage | undefined;
  currentPageId: string | null;
  pages: BoardPage[];
  setCurrentPageId: (pageId: string) => void;
}

export function usePageRotation({
  isEditMode,
  board,
  currentPage,
  currentPageId,
  pages,
  setCurrentPageId,
}: UsePageRotationOptions) {
  useEffect(() => {
    const autoRotateEnabled = board?.settings?.auto_rotate_pages ?? false;
    const pageDuration = currentPage?.settings?.duration;

    // Only rotate if all conditions are met
    if (isEditMode || !autoRotateEnabled || !pageDuration || !currentPageId || pages.length === 0) {
      if (isEditMode || !autoRotateEnabled || !pageDuration) {
        console.log("[Page Rotation] Conditions not met:", {
          isEditMode,
          autoRotateEnabled,
          pageDuration,
          currentPageId,
        });
      }
      return;
    }

    console.log("[Page Rotation] Starting timer:", {
      isEditMode,
      autoRotateEnabled,
      pageDuration,
      currentPageId,
      currentPageName: currentPage?.name,
      pagesCount: pages.length,
    });

    const duration = pageDuration * 1000; // Convert to ms
    const timer = setTimeout(() => {
      // Get fresh pages data in case it changed
      const sortedPages = [...pages].sort((a, b) => a.order - b.order);
      const currentIndex = sortedPages.findIndex((p) => p.id === currentPageId);

      if (currentIndex === -1) {
        console.warn("[Page Rotation] Current page not found in pages array");
        return;
      }

      const nextIndex = (currentIndex + 1) % sortedPages.length;
      const nextPage = sortedPages[nextIndex];

      console.log("[Page Rotation] Rotating to next page:", {
        from: currentPage?.name,
        to: nextPage.name,
        nextIndex,
      });

      setCurrentPageId(nextPage.id);
    }, duration);

    return () => {
      console.log("[Page Rotation] Clearing timer");
      clearTimeout(timer);
    };
  }, [isEditMode, board?.settings?.auto_rotate_pages, currentPage?.settings?.duration, currentPageId, pages, currentPage?.name, setCurrentPageId]);
}

