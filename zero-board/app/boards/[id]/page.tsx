"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { boardsApi, widgetsApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils/errors";
import { backgroundPresets } from "@/lib/data/backgroundPresets";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveGridLayout } from "@/components/board/GridLayout";
import { WidgetConfigDialog } from "@/components/widgets/WidgetConfigDialog";
import { BoardSettingsDialog } from "@/components/board/BoardSettingsDialog";
import { PageTabs } from "@/components/board/PageTabs";
import { PageSettingsDialog } from "@/components/board/PageSettingsDialog";
import { BoardHeader } from "@/components/board/BoardHeader";
import { YouTubeBackgroundVideo } from "@/components/board/YouTubeBackgroundVideo";
import { AddWidgetDialog } from "@/components/board/AddWidgetDialog";
import { renderWidget } from "@/lib/widgets/registry";
import { useBoardPages } from "@/hooks/useBoardPages";
import { useBoardSettings } from "@/hooks/useBoardSettings";
import { useBoardFullscreen } from "@/hooks/useBoardFullscreen";
import { useBoardLockout } from "@/hooks/useBoardLockout";
import { usePageRotation } from "@/hooks/usePageRotation";
import { useState, useCallback, useEffect, useMemo } from "react";
import type { Layout } from "react-grid-layout";
import type { Widget } from "@/lib/api";
import type { WidgetProps } from "@/lib/types/board";

export default function BoardPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const boardId = parseInt(params.id as string);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [configuringWidget, setConfiguringWidget] = useState<Widget | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [configuringPage, setConfiguringPage] = useState<string | null>(null);

  // Check for full_screen query parameter
  const fullScreenParam = searchParams.get("full_screen") === "true";

  // Check for access_token in query params (for API key authentication)
  const accessToken = searchParams.get("access_token");

  const {
    data: board,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["boards", boardId, accessToken],
    queryFn: () => boardsApi.get(boardId, accessToken || undefined),
    enabled: !!boardId && (isAuthenticated || !!accessToken),
  });

  const updateBoardMutation = useMutation({
    mutationFn: (data: { layout_config?: Record<string, unknown> }) =>
      boardsApi.update(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", boardId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const updateWidgetPositionMutation = useMutation({
    mutationFn: ({
      widgetId,
      position,
    }: {
      widgetId: number;
      position: { x: number; y: number; w: number; h: number; page_id?: string };
    }) =>
      widgetsApi.update(boardId, widgetId, {
        position,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", boardId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Use custom hooks for board management
  const {
    pages,
    currentPageId,
    setCurrentPageId,
    currentPage,
    currentPageWidgets,
    handlePageAdd,
    handlePageDelete,
    handlePageReorder,
    handlePageUpdate,
  } = useBoardPages({
    board,
    boardId,
    updateBoardMutation,
    updateWidgetPositionMutation,
  });

  const { effectiveSettings, isLockoutMode } = useBoardSettings({
    board,
    currentPage,
  });

  const { isFullscreen, toggleFullscreenSetting } = useBoardFullscreen({
    board,
    boardId,
    fullScreenParam,
    updateBoardMutation,
  });

  useBoardLockout({
    isLockoutMode,
    isEditMode,
    setIsEditMode,
  });

  usePageRotation({
    isEditMode,
    board,
    currentPage,
    currentPageId,
    pages,
    setCurrentPageId,
  });

  const deleteWidgetMutation = useMutation({
    mutationFn: (widgetId: number) => widgetsApi.delete(boardId, widgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", boardId] });
      toast.success("Widget deleted successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleLayoutChange = useCallback(
    (layout: Layout[]) => {
      if (!currentPageWidgets) return;

      layout.forEach((item) => {
        const widget = currentPageWidgets.find((w) => w.id.toString() === item.i);
        if (widget) {
          const newPosition = {
            ...(widget.position || {}),
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
            page_id: currentPageId || undefined,
          };

          // Only update if position changed
          const currentPos = widget.position || { x: 0, y: 0, w: 4, h: 4 };
          if (
            (currentPos as { x?: number }).x !== newPosition.x ||
            (currentPos as { y?: number }).y !== newPosition.y ||
            (currentPos as { w?: number }).w !== newPosition.w ||
            (currentPos as { h?: number }).h !== newPosition.h
          ) {
            updateWidgetPositionMutation.mutate({
              widgetId: widget.id,
              position: newPosition,
            });
          }
        }
      });
    },
    [currentPageWidgets, currentPageId, updateWidgetPositionMutation]
  );

  // Redirect to login if not authenticated and no API key provided
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !accessToken) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router, accessToken]);

  const handleDeleteWidget = useCallback(
    (widgetId: number) => {
      if (confirm("Delete this widget?")) {
        deleteWidgetMutation.mutate(widgetId);
      }
    },
    [deleteWidgetMutation]
  );

  const renderWidgetComponent = useCallback(
    (widget: Widget) => {
      const widgetProps: WidgetProps = {
        widget,
        isEditMode,
        onDelete: () => handleDeleteWidget(widget.id),
        onConfigure: () => setConfiguringWidget(widget),
      };
      return renderWidget(widgetProps);
    },
    [isEditMode, handleDeleteWidget]
  );

  // Calculate board container styles based on settings (before early returns)
  const boardStyles = useMemo((): React.CSSProperties => {
    const settings = effectiveSettings;
    const styles: React.CSSProperties = {
      minHeight: "100vh",
      backgroundColor: "var(--background)",
    };

    // Apply background
    if (settings?.background_type && settings.background_type !== "none") {
      if (settings.background_type === "youtube" && settings.background_source) {
        // YouTube video background will be handled separately
        styles.position = "relative";
      } else if (settings.background_source) {
        styles.backgroundImage = `url(${settings.background_source})`;
        styles.backgroundSize = "cover";
        styles.backgroundPosition = "center";
        styles.backgroundRepeat = "no-repeat";
      }
    }

    // Apply resolution constraints
    if (settings?.resolution_width && settings?.resolution_height) {
      styles.maxWidth = `${settings.resolution_width}px`;
      styles.maxHeight = `${settings.resolution_height}px`;
    }

    // Apply aspect ratio
    if (settings?.aspect_ratio && settings.aspect_ratio !== "custom") {
      const [w, h] = settings.aspect_ratio.split(":").map(Number);
      styles.aspectRatio = `${w} / ${h}`;
    }

    // Apply orientation
    if (settings?.orientation === "portrait") {
      styles.maxWidth = "100vw";
      styles.maxHeight = "100vh";
    }

    return styles;
  }, [effectiveSettings]);

  // Get effective background settings (before early returns)
  const effectiveBackgroundConfig = useMemo(() => {
    const settings = effectiveSettings;
    if (settings?.background_config) {
      return settings.background_config;
    }
    // If no config but preset is set, use preset defaults
    if (settings?.background_preset) {
      const preset = backgroundPresets.find((p) => p.id === settings.background_preset);
      if (preset?.config) {
        return preset.config;
      }
    }
    return { muted: true, volume: 0 };
  }, [effectiveSettings]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated && !accessToken) {
    return null;
  }

  if (error || !board) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500">Board not found</h2>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const showHeader = !isFullscreen && !isLockoutMode && !accessToken;
  const isApiKeyMode = !!accessToken;
  const settings = effectiveSettings;

  return (
    <div className="min-h-screen bg-[var(--background)]" style={boardStyles}>
      {/* YouTube background video */}
      {settings?.background_type === "youtube" && settings.background_source && (
        <YouTubeBackgroundVideo
          videoId={settings.background_source}
          muted={effectiveBackgroundConfig?.muted !== false}
          volume={(effectiveBackgroundConfig?.volume as number) || 50}
        />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        {showHeader && (
          <>
            <BoardHeader
              board={board}
              isEditMode={isEditMode}
              isLockoutMode={isLockoutMode}
              isFullscreen={isFullscreen}
              isApiKeyMode={isApiKeyMode}
              theme={theme}
              setTheme={setTheme}
              onEditModeToggle={() => setIsEditMode(!isEditMode)}
              onAddWidget={() => setShowAddWidget(true)}
              onSettingsOpen={() => setShowSettings(true)}
              onFullscreenToggle={toggleFullscreenSetting}
            />
            {isEditMode && !isLockoutMode && !isApiKeyMode && (
              <PageTabs
                pages={pages}
                currentPageId={currentPageId}
                onPageChange={setCurrentPageId}
                onPageAdd={handlePageAdd}
                onPageDelete={handlePageDelete}
                onPageReorder={handlePageReorder}
                onPageConfigure={setConfiguringPage}
                isEditMode={isEditMode}
              />
            )}
          </>
        )}

        <main
          className={
            showHeader
              ? "container pl-0 py-2"
              : "w-full h-screen pl-0 py-4 overflow-hidden"
          }
        >
          {showHeader && board.description && (
            <p className="mb-6 text-[var(--text-muted)]">{board.description}</p>
          )}

          {showAddWidget && (
            <AddWidgetDialog
              boardId={boardId}
              currentPageId={currentPageId}
              onClose={() => setShowAddWidget(false)}
            />
          )}

          {configuringWidget && (
            <WidgetConfigDialog
              widget={configuringWidget}
              onClose={() => setConfiguringWidget(null)}
            />
          )}

          {showSettings && (
            <BoardSettingsDialog
              boardId={boardId}
              onClose={() => setShowSettings(false)}
            />
          )}

          {configuringPage && (
            <PageSettingsDialog
              boardId={boardId}
              page={pages.find((p) => p.id === configuringPage)!}
              globalSettings={board?.settings}
              onClose={() => setConfiguringPage(null)}
              onUpdate={handlePageUpdate}
            />
          )}

          {currentPageWidgets && currentPageWidgets.length > 0 ? (
            <ResponsiveGridLayout
              widgets={currentPageWidgets}
              isEditMode={isEditMode && !isLockoutMode}
              onLayoutChange={handleLayoutChange}
              cols={24}
              rowHeight={30}
            >
              {renderWidgetComponent}
            </ResponsiveGridLayout>
          ) : (
            <div className="flex items-center justify-center w-full ml-28">
              <Card className="w-full max-w-md">
                <CardContent className="py-12 text-center">
                  <p className="text-[var(--text-muted)]">
                    No widgets yet. {isEditMode && "Click 'Add Widget' to get started!"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
