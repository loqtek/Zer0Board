"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { widgetsApi, settingsApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils/errors";
import type { WidgetTemplate } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AddWidgetDialogProps {
  boardId: number;
  currentPageId: string | null;
  onClose: () => void;
}

export function AddWidgetDialog({ boardId, currentPageId, onClose }: AddWidgetDialogProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["widget-templates"],
    queryFn: () => settingsApi.getWidgetTemplates(),
  });

  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => settingsApi.listIntegrations(),
  });

  const createWidgetMutation = useMutation({
    mutationFn: (type: string) => {
      // Auto-set calendar type for calendar widgets
      let config: Record<string, unknown> = {};
      if (type === "google_calendar") {
        config = { calendarType: "google" };
      } else if (type === "microsoft_calendar") {
        config = { calendarType: "microsoft" };
      }

      return widgetsApi.create(boardId, {
        type,
        config,
        position: { x: 0, y: 0, w: 4, h: 4, page_id: currentPageId || undefined },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", boardId] });
      toast.success("Widget created successfully");
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleWidgetSelect = (widget: { type: string; name: string; requires_auth?: boolean }) => {
    if (widget.requires_auth) {
      const integration = integrations?.find((i) => i.service === widget.type && i.is_active);
      if (!integration) {
        alert(`This widget requires authentication. Please connect ${widget.name} in Settings first.`);
        router.push("/integrations");
        onClose();
        return;
      }
    }
    setSelectedWidget(widget.type);
  };

  const handleAdd = () => {
    if (selectedWidget) {
      createWidgetMutation.mutate(selectedWidget);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardContent className="p-6 flex-1 overflow-y-auto">
          <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Add Widget</h3>
          <div className="space-y-6">
            {templates?.map((category) => (
              <div key={category.category}>
                <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                  {category.category}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {category.widgets.map((widget: WidgetTemplate["widgets"][number]) => {
                    const integration = integrations?.find(
                      (i) => i.service === widget.type && i.is_active
                    );
                    const isSelected = selectedWidget === widget.type;
                    const canAdd = !widget.requires_auth || integration;

                    return (
                      <button
                        key={widget.type}
                        onClick={() => canAdd && handleWidgetSelect(widget)}
                        disabled={!canAdd}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent)]/10"
                            : "border-[var(--border)] hover:bg-[var(--muted)]"
                        } ${!canAdd ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{widget.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-[var(--foreground)] truncate">
                              {widget.name}
                            </div>
                            {widget.requires_auth && !integration && (
                              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                Requires connection
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <div className="p-6 border-t border-[var(--border)] flex gap-2">
          <Button
            onClick={handleAdd}
            disabled={!selectedWidget || createWidgetMutation.isPending}
            className="flex-1"
          >
            {createWidgetMutation.isPending ? "Adding..." : "Add Widget"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}

