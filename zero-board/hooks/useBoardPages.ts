import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import type { BoardPage } from "@/components/board/PageTabs";
import type { BoardDetail } from "@/lib/api";

interface UseBoardPagesOptions {
  board: BoardDetail | undefined;
  boardId: number;
  updateBoardMutation: {
    mutate: (variables: { layout_config?: Record<string, unknown> }) => void;
  };
  updateWidgetPositionMutation: {
    mutate: (variables: {
      widgetId: number;
      position: { x: number; y: number; w: number; h: number; page_id?: string };
    }) => void;
  };
}

export function useBoardPages({
  board,
  boardId,
  updateBoardMutation,
  updateWidgetPositionMutation,
}: UseBoardPagesOptions) {
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);

  // Initialize pages from layout_config
  const pages = useMemo(() => {
    const pagesData = board?.layout_config?.pages as BoardPage[] | undefined;
    if (pagesData && Array.isArray(pagesData) && pagesData.length > 0) {
      return pagesData;
    }
    // Default: create a single page if none exist
    return [
      {
        id: "page-1",
        name: "Page 1",
        order: 0,
        settings: { use_global_settings: true },
      },
    ];
  }, [board?.layout_config?.pages]);

  // Set current page on mount or when pages change
  useEffect(() => {
    if (pages.length > 0 && !currentPageId) {
      const sortedPages = [...pages].sort((a, b) => a.order - b.order);
      const firstPageId = sortedPages[0].id;
      setCurrentPageId((prev) => {
        if (!prev && firstPageId) {
          return firstPageId;
        }
        return prev;
      });
    }
  }, [pages, currentPageId]);

  // Get current page
  const currentPage = useMemo(() => {
    return pages.find((p) => p.id === currentPageId) || pages[0];
  }, [pages, currentPageId]);

  // Filter widgets by current page
  const currentPageWidgets = useMemo(() => {
    if (!board?.widgets) return [];
    return board.widgets.filter((widget) => {
      const widgetPageId = widget.position?.page_id;
      // If no page_id is set, show on first page
      if (!widgetPageId) {
        return currentPageId === pages[0]?.id;
      }
      return widgetPageId === currentPageId;
    });
  }, [board, currentPageId, pages]);

  // Page management functions
  const handlePageAdd = useCallback(() => {
    const newPage: BoardPage = {
      id: `page-${Date.now()}`,
      name: `Page ${pages.length + 1}`,
      order: pages.length,
      settings: { use_global_settings: true },
    };
    const updatedPages = [...pages, newPage];
    const currentConfig = board?.layout_config || {};
    updateBoardMutation.mutate({
      layout_config: {
        ...currentConfig,
        pages: updatedPages,
      },
    });
    setCurrentPageId(newPage.id);
  }, [pages, board?.layout_config, updateBoardMutation]);

  const handlePageDelete = useCallback(
    (pageId: string) => {
      if (pages.length <= 1) {
        toast.error("Cannot delete the last page");
        return;
      }
      const updatedPages = pages.filter((p) => p.id !== pageId);
      // Reorder remaining pages
      updatedPages.forEach((page, index) => {
        page.order = index;
      });
      // Move widgets from deleted page to first page
      const firstPageId = updatedPages[0].id;
      if (board?.widgets) {
        board.widgets.forEach((widget) => {
          if (widget.position?.page_id === pageId) {
            const currentPos = widget.position || {};
            const defaultPos = { x: 0, y: 0, w: 4, h: 4 };
            updateWidgetPositionMutation.mutate({
              widgetId: widget.id,
              position: {
                x: (currentPos as { x?: number }).x ?? defaultPos.x,
                y: (currentPos as { y?: number }).y ?? defaultPos.y,
                w: (currentPos as { w?: number }).w ?? defaultPos.w,
                h: (currentPos as { h?: number }).h ?? defaultPos.h,
                page_id: firstPageId,
              },
            });
          }
        });
      }
      const currentConfig = board?.layout_config || {};
      updateBoardMutation.mutate({
        layout_config: {
          ...currentConfig,
          pages: updatedPages,
        },
      });
      if (currentPageId === pageId) {
        setCurrentPageId(firstPageId);
      }
    },
    [pages, board, currentPageId, updateBoardMutation, updateWidgetPositionMutation]
  );

  const handlePageReorder = useCallback(
    (pageId: string, newOrder: number) => {
      const updatedPages = [...pages];
      const page = updatedPages.find((p) => p.id === pageId);
      if (!page) return;

      const oldOrder = page.order;
      page.order = newOrder;

      // Adjust other pages' orders
      updatedPages.forEach((p) => {
        if (p.id !== pageId) {
          if (newOrder > oldOrder && p.order > oldOrder && p.order <= newOrder) {
            p.order -= 1;
          } else if (newOrder < oldOrder && p.order >= newOrder && p.order < oldOrder) {
            p.order += 1;
          }
        }
      });

      const currentConfig = board?.layout_config || {};
      updateBoardMutation.mutate({
        layout_config: {
          ...currentConfig,
          pages: updatedPages,
        },
      });
    },
    [pages, board?.layout_config, updateBoardMutation]
  );

  const handlePageUpdate = useCallback(
    (updatedPage: BoardPage) => {
      const updatedPages = pages.map((p) => (p.id === updatedPage.id ? updatedPage : p));
      const currentConfig = board?.layout_config || {};
      updateBoardMutation.mutate({
        layout_config: {
          ...currentConfig,
          pages: updatedPages,
        },
      });
    },
    [pages, board?.layout_config, updateBoardMutation]
  );

  return {
    pages,
    currentPageId,
    setCurrentPageId,
    currentPage,
    currentPageWidgets,
    handlePageAdd,
    handlePageDelete,
    handlePageReorder,
    handlePageUpdate,
  };
}

