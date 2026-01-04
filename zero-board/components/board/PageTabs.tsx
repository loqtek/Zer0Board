"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, MoreVertical, Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import type { BoardPage } from "@/lib/types/board";
export type { BoardPage };

interface PageTabsProps {
  pages: BoardPage[];
  currentPageId: string | null;
  onPageChange: (pageId: string) => void;
  onPageAdd: () => void;
  onPageDelete: (pageId: string) => void;
  onPageReorder: (pageId: string, newOrder: number) => void;
  onPageConfigure: (pageId: string) => void;
  isEditMode: boolean;
}

export function PageTabs({
  pages,
  currentPageId,
  onPageChange,
  onPageAdd,
  onPageDelete,
  onPageReorder,
  onPageConfigure,
  isEditMode,
}: PageTabsProps) {
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);

  const sortedPages = [...pages].sort((a, b) => a.order - b.order);

  const handleDragStart = (pageId: string) => {
    setDraggedPageId(pageId);
  };

  const handleDragOver = (e: React.DragEvent, targetOrder: number) => {
    e.preventDefault();
    if (!draggedPageId) return;

    const draggedPage = pages.find((p) => p.id === draggedPageId);
    if (!draggedPage || draggedPage.order === targetOrder) return;

    onPageReorder(draggedPageId, targetOrder);
  };

  const handleDragEnd = () => {
    setDraggedPageId(null);
  };

  const handleDelete = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    if (pages.length <= 1) {
      toast.error("Cannot delete the last page. Boards must have at least one page.");
      return;
    }
    if (confirm("Are you sure you want to delete this page? All widgets on this page will be moved to the first page.")) {
      onPageDelete(pageId);
    }
  };

  if (!isEditMode && pages.length <= 1) {
    return null; // Don't show tabs if not editing and only one page
  }

  return (
    <div className="border-b border-[var(--border)] bg-[var(--card-bg)]">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {sortedPages.map((page) => (
            <div
              key={page.id}
              draggable={isEditMode}
              onDragStart={() => handleDragStart(page.id)}
              onDragOver={(e) => handleDragOver(e, page.order)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-1 px-4 py-2 border-b-2 transition-colors cursor-pointer ${
                currentPageId === page.id
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]"
              } ${isEditMode ? "cursor-move" : ""}`}
              onClick={() => onPageChange(page.id)}
            >
              {isEditMode && (
                <GripVertical className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
              )}
              <span className="whitespace-nowrap">{page.name}</span>
              {isEditMode && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-[var(--primary)]/20 hover:text-[var(--primary)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPageConfigure(page.id);
                    }}
                    title="Configure page"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-500"
                    onClick={(e) => handleDelete(e, page.id)}
                    title="Delete page"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
          {isEditMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPageAdd}
              className="px-3 py-2 text-[var(--text-muted)] hover:text-[var(--foreground)]"
              title="Add new page"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Page
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

