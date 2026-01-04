"use client";

import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { Activity, Heart, Footprints, Flame } from "lucide-react";

interface HealthWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
  onDuplicate?: () => void;
}

export function HealthWidget({ widget, isEditMode, onDelete, onConfigure, onDuplicate }: HealthWidgetProps) {
  const statsRaw = widget.config?.stats;
  const defaultStats = {
    steps: 8543,
    calories: 2150,
    heartRate: 72,
    activeMinutes: 45,
  };
  const stats = statsRaw && typeof statsRaw === "object" && !Array.isArray(statsRaw) 
    ? { ...defaultStats, ...(statsRaw as Record<string, unknown>) }
    : defaultStats;

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure} onDuplicate={onDuplicate}>
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--foreground)]" />
          <h3 className="font-semibold text-[var(--foreground)]">Health & Fitness</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 flex-1">
          <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
            <Footprints className="h-6 w-6 text-[var(--foreground)] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[var(--foreground)]">{stats.steps.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Steps</p>
          </div>
          <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
            <Flame className="h-6 w-6 text-[var(--foreground)] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[var(--foreground)]">{stats.calories}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Calories</p>
          </div>
          <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
            <Heart className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-[var(--foreground)]">{stats.heartRate}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">BPM</p>
          </div>
          <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
            <Activity className="h-6 w-6 text-[var(--foreground)] mx-auto mb-2" />
            <p className="text-2xl font-bold text-[var(--foreground)]">{stats.activeMinutes}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Active Min</p>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] text-center">
          Connect to fitness tracker to get real-time data
        </p>
      </div>
    </WidgetWrapper>
  );
}




