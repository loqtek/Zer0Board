"use client";

import { useState, useEffect } from "react";
import { Widget } from "@/lib/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { Activity, Footprints, Flame, Heart, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { getFitbitStats, type FitbitStats } from "@/lib/services/fitbit";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";

interface FitbitWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
  onDuplicate?: () => void;
}

export function FitbitWidget({ widget, isEditMode, onDelete, onConfigure, onDuplicate }: FitbitWidgetProps) {
  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => settingsApi.listIntegrations(),
  });

  const fitbitIntegration = integrations?.find(
    (i) => i.service === "fitbit" && i.is_active
  );

  const accessToken = fitbitIntegration?.config?.access_token;
  const refreshToken = fitbitIntegration?.config?.refresh_token;

  // Widget customization options
  const showTodayStats = widget.config?.showTodayStats !== false;
  const showWeeklyStats = widget.config?.showWeeklyStats === true;
  const showHeartRate = widget.config?.showHeartRate !== false;
  const metricUnit = widget.config?.metricUnit || "km"; // km or miles
  const refreshInterval = widget.config?.refreshInterval || 300; // 5 minutes default

  const [stats, setStats] = useState<FitbitStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setError("Fitbit not connected");
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getFitbitStats(accessToken);
        setStats(data);
      } catch (err) {
        console.error("Error fetching Fitbit stats:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch Fitbit data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Set up refresh interval
    const interval = setInterval(fetchStats, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [accessToken, refreshInterval]);

  const formatDistance = (km: number): string => {
    if (metricUnit === "miles") {
      return `${(km * 0.621371).toFixed(1)} mi`;
    }
    return `${km.toFixed(1)} km`;
  };

  if (!fitbitIntegration || !accessToken) {
    return (
      <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure} onDuplicate={onDuplicate}>
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <div className="text-center">
            <Activity className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-[var(--text-muted)] mb-2">Fitbit Integration</p>
            <p className="text-xs text-[var(--text-muted)]">
              Connect your Fitbit account in Settings → Integrations
            </p>
          </div>
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure} onDuplicate={onDuplicate}>
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--foreground)]" />
          <h3 className="font-semibold text-[var(--foreground)]">Fitbit</h3>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-[var(--text-muted)]">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-sm text-red-500">{error}</div>
            </div>
          </div>
        ) : stats ? (
          <>
            {showTodayStats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
                  <Footprints className="h-5 w-5 text-[var(--foreground)] mx-auto mb-2" />
                  <p className="text-xl font-bold text-[var(--foreground)]">
                    {stats.todaySteps.toLocaleString()}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Steps</p>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
                  <Flame className="h-5 w-5 text-[var(--foreground)] mx-auto mb-2" />
                  <p className="text-xl font-bold text-[var(--foreground)]">
                    {stats.todayCalories.toLocaleString()}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Calories</p>
                </div>
                {showHeartRate && stats.todayHeartRate && (
                  <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
                    <Heart className="h-5 w-5 text-red-500 mx-auto mb-2" />
                    <p className="text-xl font-bold text-[var(--foreground)]">
                      {stats.todayHeartRate}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">BPM</p>
                  </div>
                )}
                <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
                  <Clock className="h-5 w-5 text-[var(--foreground)] mx-auto mb-2" />
                  <p className="text-xl font-bold text-[var(--foreground)]">
                    {stats.todayActiveMinutes}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Active Min</p>
                </div>
              </div>
            )}

            {showWeeklyStats && (
              <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3">
                <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
                  <TrendingUp className="h-5 w-5 text-[var(--foreground)] mx-auto mb-2" />
                  <p className="text-lg font-bold text-[var(--foreground)]">
                    {formatDistance(stats.weeklyDistance)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">This Week</p>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
                  <Activity className="h-5 w-5 text-[var(--foreground)] mx-auto mb-2" />
                  <p className="text-lg font-bold text-[var(--foreground)]">
                    {stats.weeklyActiveMinutes}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Active Min</p>
                </div>
              </div>
            )}

            <p className="text-xs text-[var(--text-muted)] text-center">
              via Fitbit API
            </p>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-[var(--text-muted)]">No data available</div>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}

