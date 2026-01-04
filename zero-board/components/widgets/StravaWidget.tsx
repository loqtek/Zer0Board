"use client";

import { useState, useEffect } from "react";
import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { Activity, MapPin, Clock, TrendingUp, Zap, Calendar, AlertCircle } from "lucide-react";
import { getStravaStats } from "@/lib/services/strava";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";
import type { StravaStats } from "@/lib/types/services/strava";

interface StravaWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
  onDuplicate?: () => void;
}

export function StravaWidget({ widget, isEditMode, onDelete, onConfigure, onDuplicate }: StravaWidgetProps) {
  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => settingsApi.listIntegrations(),
  });

  const stravaIntegration = integrations?.find(
    (i) => i.service === "strava" && i.is_active
  );

  const accessToken = stravaIntegration?.config?.access_token;

  // Widget customization options
  const showWeeklyStats = widget.config?.showWeeklyStats !== false;
  const showTotalStats = widget.config?.showTotalStats === true;
  const showLastActivity = widget.config?.showLastActivity !== false;
  const metricUnit = widget.config?.metricUnit || "km"; // km or miles
  const refreshIntervalRaw = widget.config?.refreshInterval;
  const refreshInterval = typeof refreshIntervalRaw === "number" ? refreshIntervalRaw : 300; // 5 minutes default

  const [stats, setStats] = useState<StravaStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setError("Strava not connected");
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getStravaStats(accessToken);
        setStats(data);
      } catch (err) {
        console.error("Error fetching Strava stats:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch Strava data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Set up refresh interval
    const interval = setInterval(fetchStats, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [accessToken, refreshInterval]);

  const formatDistance = (meters: number): string => {
    if (metricUnit === "miles") {
      return `${(meters / 1609.34).toFixed(1)} mi`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatActivityType = (type: string): string => {
    const types: Record<string, string> = {
      Run: "🏃",
      Ride: "🚴",
      Walk: "🚶",
      Swim: "🏊",
      Hike: "🥾",
      Workout: "💪",
    };
    return types[type] || "🏃";
  };

  if (!stravaIntegration || !accessToken) {
    return (
      <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure} onDuplicate={onDuplicate}>
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <div className="text-center">
            <Activity className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-[var(--text-muted)] mb-2">Strava Integration</p>
            <p className="text-xs text-[var(--text-muted)]">
              Connect your Strava account in Settings → Integrations
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
          <h3 className="font-semibold text-[var(--foreground)]">Strava</h3>
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
            {showWeeklyStats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
                  <MapPin className="h-5 w-5 text-[var(--foreground)] mx-auto mb-2" />
                  <p className="text-xl font-bold text-[var(--foreground)]">
                    {formatDistance(stats.weeklyDistance)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">This Week</p>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
                  <Zap className="h-5 w-5 text-[var(--foreground)] mx-auto mb-2" />
                  <p className="text-xl font-bold text-[var(--foreground)]">
                    {stats.weeklyActivities}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Activities</p>
                </div>
              </div>
            )}

            {showTotalStats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
                  <TrendingUp className="h-5 w-5 text-[var(--foreground)] mx-auto mb-2" />
                  <p className="text-lg font-bold text-[var(--foreground)]">
                    {formatDistance(stats.totalDistance)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Total Distance</p>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-center">
                  <Activity className="h-5 w-5 text-[var(--foreground)] mx-auto mb-2" />
                  <p className="text-lg font-bold text-[var(--foreground)]">
                    {stats.totalActivities}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Total Activities</p>
                </div>
              </div>
            )}

            {showLastActivity && stats.lastActivity && (
              <div className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{formatActivityType(stats.lastActivity.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                      {stats.lastActivity.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {formatDistance(stats.lastActivity.distance)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.floor(stats.lastActivity.moving_time / 60)}m
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {new Date(stats.lastActivity.start_date_local).toLocaleDateString()}
                </p>
              </div>
            )}

            <p className="text-xs text-[var(--text-muted)] text-center">
              via Strava API
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
