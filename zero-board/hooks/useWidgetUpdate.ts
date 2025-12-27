import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { widgetsApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils/errors";

export function useWidgetUpdate(boardId: number, widgetId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Record<string, any>) =>
      widgetsApi.update(boardId, widgetId, { config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", boardId] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

