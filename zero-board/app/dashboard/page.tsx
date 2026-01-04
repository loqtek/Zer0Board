"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { boardsApi, widgetsApi, type Board } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeSwitcher } from "@/components/common/ThemeSwitcher";
import { useState, useRef, useEffect } from "react";
import { Download, Upload } from "lucide-react";

export default function DashboardPage() {
  // All hooks must be declared at the top, before any conditional returns
  // Router and context hooks first
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  
  // State hooks - all declared unconditionally
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  
  // Ref hooks
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query hooks - must always be called, even if disabled
  const {
    data: boards,
    isLoading: boardsLoading,
    error,
  } = useQuery({
    queryKey: ["boards"],
    queryFn: () => boardsApi.list(),
    enabled: isAuthenticated,
  });

  // Mutation hooks - all declared unconditionally before any early returns
  const createBoardMutation = useMutation({
    mutationFn: (title: string) =>
      boardsApi.create({ title, description: undefined }),
    onSuccess: (newBoard) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      setNewBoardTitle("");
      setIsCreating(false);
      toast.success("Board created successfully");
      router.push(`/boards/${newBoard.id}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: (id: number) => boardsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board deleted successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { layout_config?: Record<string, unknown> } }) =>
      boardsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board updated successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Effect hooks - declared after all other hooks
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const toggleFullscreen = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentConfig = board.layout_config || {};
    const newFullscreen = !currentConfig.fullscreen;
    
    updateBoardMutation.mutate({
      id: board.id,
      data: {
        layout_config: {
          ...currentConfig,
          fullscreen: newFullscreen,
        },
      },
    });
  };

  const toggleLockout = async (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentLockout = board.settings?.lockout_mode ?? false;
    const newLockout = !currentLockout;
    
    try {
      await boardsApi.updateSettings(board.id, {
        lockout_mode: newLockout,
      });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success(`Lockout mode ${newLockout ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // Early returns after all hooks are declared
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBoardTitle.trim()) {
      createBoardMutation.mutate(newBoardTitle.trim());
    }
  };

  const handleDeleteBoard = async (id: number) => {
    if (confirm("Are you sure you want to delete this board?")) {
      deleteBoardMutation.mutate(id);
    }
  };

  const handleExportBoard = async (boardId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const boardDetail = await boardsApi.get(boardId);
      
      // Prepare export data (exclude IDs and timestamps that shouldn't be imported)
      const exportData = {
        title: boardDetail.title,
        description: boardDetail.description,
        layout_config: boardDetail.layout_config,
        settings: boardDetail.settings,
        widgets: boardDetail.widgets.map(w => ({
          type: w.type,
          config: w.config,
          position: w.position,
        })),
        exported_at: new Date().toISOString(),
        version: "1.0",
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${boardDetail.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${exportData.exported_at}_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Board exported successfully");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportBoard = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate import data
      if (!importData.title || !Array.isArray(importData.widgets)) {
        throw new Error("Invalid board export file format");
      }

      // Create new board
      const newBoard = await boardsApi.create({
        title: `${importData.title} (Imported)`,
        description: importData.description,
        layout_config: importData.layout_config,
      });

      // Update board settings if present
      if (importData.settings) {
        await boardsApi.updateSettings(newBoard.id, {
          background_type: importData.settings.background_type,
          background_source: importData.settings.background_source,
          background_config: importData.settings.background_config,
          resolution_width: importData.settings.resolution_width,
          resolution_height: importData.settings.resolution_height,
          aspect_ratio: importData.settings.aspect_ratio,
          orientation: importData.settings.orientation,
          auto_rotate_pages: importData.settings.auto_rotate_pages,
        });
      }

      // Create all widgets
      for (const widget of importData.widgets) {
        try {
          await widgetsApi.create(newBoard.id, {
            type: widget.type,
            config: widget.config || {},
            position: widget.position || { x: 0, y: 0, w: 4, h: 4 },
          });
        } catch (error) {
          console.error(`Failed to import widget ${widget.type}:`, error);
          // Continue with other widgets even if one fails
        }
      }

      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board imported successfully");
      router.push(`/boards/${newBoard.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Zero Board</h1>
          <div className="flex items-center gap-4">
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
            <Button variant="ghost" onClick={() => router.push("/integrations")}>
              Integrations
            </Button>
            <Button variant="ghost" onClick={() => router.push("/templates")}>
              Templates
            </Button>
            <span className="text-sm text-[var(--text-muted)]">{user?.username}</span>
            <Button variant="outline" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">My Boards</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleImportClick}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import Board"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportBoard}
              className="hidden"
            />
            <Button onClick={() => setIsCreating(true)}>Create Board</Button>
          </div>
        </div>

        {isCreating && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Create New Board</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBoard} className="space-y-4">
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="Board title"
                  className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={createBoardMutation.isPending}>
                    Create
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setNewBoardTitle("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {boardsLoading ? (
          <div className="text-center text-[var(--text-muted)]">Loading boards...</div>
        ) : error ? (
          <div className="text-center text-red-500">
            Error loading boards. Please try again.
          </div>
        ) : boards && boards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Card
                key={board.id}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => router.push(`/boards/${board.id}`)}
              >
                <CardHeader>
                  <CardTitle>{board.title}</CardTitle>
                  {board.description && (
                    <CardDescription>{board.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleExportBoard(board.id, e)}
                        title="Export board as JSON"
                        className="text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Export
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => toggleFullscreen(board, e)}
                        title="Toggle fullscreen mode for IoT devices"
                        className="text-xs"
                      >
                        {board.layout_config?.fullscreen ? "📺 Fullscreen ON" : "📺 Fullscreen OFF"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => toggleLockout(board, e)}
                        title="Toggle lockout mode - prevents all interactions and navigation"
                        className="text-xs"
                      >
                        {board.settings?.lockout_mode ? "🔒 Lockout ON" : "🔓 Lockout OFF"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/boards/${board.id}${board.layout_config?.fullscreen ? "?full_screen=true" : ""}`);
                        }}
                        title="Open in fullscreen mode"
                        className="text-xs"
                      >
                        Open Fullscreen
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-muted)]">
                      {new Date(board.created_at).toLocaleDateString()}
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBoard(board.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-[var(--text-muted)]">No boards yet. Create your first board!</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
