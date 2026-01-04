"use client";

import { useState, useEffect } from "react";
import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";
import {
  Home,
  Lightbulb,
  Power,
  Thermometer,
  Gauge,
  AlertCircle,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react";
import { settingsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface HomeAssistantWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
}

interface EntityState {
  entity_id: string;
  domain: string;
  state: string;
  friendly_name: string;
  attributes: Record<string, any>;
  is_on?: boolean;
  brightness?: number;
  temperature?: number;
  current_temperature?: number;
  hvac_mode?: string;
  position?: number;
  is_open?: boolean;
  unit?: string;
  value?: string;
  rgb_color?: number[];
}

export function HomeAssistantWidget({
  widget,
  isEditMode,
  onDelete,
  onConfigure,
}: HomeAssistantWidgetProps) {
  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => settingsApi.listIntegrations(),
  });

  // Widget configuration
  const integrationIdRaw = widget.config?.homeAssistantIntegrationId;
  const integrationId = typeof integrationIdRaw === "number" ? integrationIdRaw : undefined;
  const entityIdsRaw = widget.config?.entityIds;
  const entityIds = Array.isArray(entityIdsRaw) ? entityIdsRaw : [];
  const refreshIntervalRaw = widget.config?.refreshInterval;
  const refreshInterval = typeof refreshIntervalRaw === "number" ? refreshIntervalRaw : 30; // 30 seconds default
  const showControls = widget.config?.showControls !== false;
  const displayMode = widget.config?.displayMode || "grid"; // grid, list, single

  const integration = integrations?.find(
    (i) => i.id === integrationId && i.service === "home_assistant" && i.is_active
  );

  const [states, setStates] = useState<EntityState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStates = async () => {
    if (!integrationId || !integration) {
      setError("Home Assistant integration not configured");
      return;
    }

    if (entityIds.length === 0) {
      setError("No entities configured");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await settingsApi.fetchHomeAssistantStates(
        integrationId,
        entityIds
      );
      setStates(data.states || []);
    } catch (err) {
      console.error("Error fetching Home Assistant states:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch entity states"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStates();

    // Set up refresh interval
    const interval = setInterval(fetchStates, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [integrationId, integration, entityIds.join(","), refreshInterval]);

  const handleServiceCall = async (
    domain: string,
    service: string,
    entityId: string,
    serviceData?: Record<string, any>
  ) => {
    if (!integrationId) return;

    setActionLoading(entityId);
    try {
      await settingsApi.callHomeAssistantService(
        integrationId,
        domain,
        service,
        entityId,
        serviceData
      );
      // Refresh states after action
      setTimeout(fetchStates, 500);
    } catch (err) {
      console.error("Error calling service:", err);
      setError(err instanceof Error ? err.message : "Failed to call service");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleLight = (entity: EntityState) => {
    const service = entity.is_on ? "turn_off" : "turn_on";
    handleServiceCall("light", service, entity.entity_id);
  };

  const toggleSwitch = (entity: EntityState) => {
    const service = entity.is_on ? "turn_off" : "turn_on";
    handleServiceCall("switch", service, entity.entity_id);
  };

  const setBrightness = (entity: EntityState, brightness: number) => {
    handleServiceCall("light", "turn_on", entity.entity_id, { brightness });
  };

  const setTemperature = (entity: EntityState, temperature: number) => {
    handleServiceCall("climate", "set_temperature", entity.entity_id, {
      temperature,
    });
  };

  const setCoverPosition = (entity: EntityState, position: number) => {
    handleServiceCall("cover", "set_cover_position", entity.entity_id, {
      position,
    });
  };

  const getEntityIcon = (domain: string, state: string) => {
    switch (domain) {
      case "light":
        return state === "on" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />;
      case "switch":
        return <Power className="h-5 w-5" />;
      case "sensor":
        return <Gauge className="h-5 w-5" />;
      case "climate":
        return <Thermometer className="h-5 w-5" />;
      case "cover":
        return state === "open" ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />;
      default:
        return <Home className="h-5 w-5" />;
    }
  };

  const renderEntity = (entity: EntityState) => {
    const isLoading = actionLoading === entity.entity_id;

    switch (entity.domain) {
      case "light":
        return (
          <div
            key={entity.entity_id}
            className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getEntityIcon(entity.domain, entity.state)}
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {entity.friendly_name}
                </span>
              </div>
              {showControls && (
                <button
                  onClick={() => toggleLight(entity)}
                  disabled={isLoading}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    entity.is_on
                      ? "bg-yellow-500 text-white hover:bg-yellow-600"
                      : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isLoading ? "..." : entity.is_on ? "ON" : "OFF"}
                </button>
              )}
            </div>
            {entity.brightness !== undefined && showControls && (
              <div className="mt-2">
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={entity.brightness}
                  onChange={(e) =>
                    setBrightness(entity, parseInt(e.target.value))
                  }
                  disabled={isLoading || !entity.is_on}
                  className="w-full"
                />
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  Brightness: {Math.round((entity.brightness / 255) * 100)}%
                </div>
              </div>
            )}
          </div>
        );

      case "switch":
        return (
          <div
            key={entity.entity_id}
            className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getEntityIcon(entity.domain, entity.state)}
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {entity.friendly_name}
                </span>
              </div>
              {showControls && (
                <button
                  onClick={() => toggleSwitch(entity)}
                  disabled={isLoading}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    entity.is_on
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isLoading ? "..." : entity.is_on ? "ON" : "OFF"}
                </button>
              )}
            </div>
          </div>
        );

      case "sensor":
        return (
          <div
            key={entity.entity_id}
            className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              {getEntityIcon(entity.domain, entity.state)}
              <span className="text-sm font-medium text-[var(--foreground)]">
                {entity.friendly_name}
              </span>
            </div>
            <div className="text-lg font-bold text-[var(--foreground)]">
              {entity.value || entity.state} {entity.unit}
            </div>
          </div>
        );

      case "climate":
        return (
          <div
            key={entity.entity_id}
            className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getEntityIcon(entity.domain, entity.state)}
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {entity.friendly_name}
                </span>
              </div>
              <span className="text-sm text-[var(--text-muted)]">
                {entity.hvac_mode}
              </span>
            </div>
            <div className="text-lg font-bold text-[var(--foreground)] mb-2">
              {entity.current_temperature || entity.temperature}°{entity.attributes?.unit_of_measurement || "C"}
            </div>
            {showControls && entity.temperature !== undefined && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTemperature(entity, entity.temperature! - 1)}
                  disabled={isLoading}
                  className="px-2 py-1 rounded bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)]"
                >
                  -
                </button>
                <span className="text-sm text-[var(--text-muted)]">
                  Set: {entity.temperature}°
                </span>
                <button
                  onClick={() => setTemperature(entity, entity.temperature! + 1)}
                  disabled={isLoading}
                  className="px-2 py-1 rounded bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)]"
                >
                  +
                </button>
              </div>
            )}
          </div>
        );

      case "cover":
        return (
          <div
            key={entity.entity_id}
            className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getEntityIcon(entity.domain, entity.state)}
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {entity.friendly_name}
                </span>
              </div>
              {showControls && (
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      handleServiceCall("cover", "open_cover", entity.entity_id)
                    }
                    disabled={isLoading}
                    className="px-2 py-1 rounded text-xs bg-[var(--muted)] hover:bg-[var(--muted)]/80"
                  >
                    Open
                  </button>
                  <button
                    onClick={() =>
                      handleServiceCall("cover", "close_cover", entity.entity_id)
                    }
                    disabled={isLoading}
                    className="px-2 py-1 rounded text-xs bg-[var(--muted)] hover:bg-[var(--muted)]/80"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
            {entity.position !== undefined && (
              <div className="text-xs text-[var(--text-muted)]">
                Position: {entity.position}%
              </div>
            )}
          </div>
        );

      default:
        return (
          <div
            key={entity.entity_id}
            className="rounded border border-[var(--border)] bg-[var(--muted)]/30 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getEntityIcon(entity.domain, entity.state)}
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {entity.friendly_name}
                </span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {entity.state}
              </span>
            </div>
          </div>
        );
    }
  };

  if (!integrationId || !integration) {
    return (
      <WidgetWrapper
        widget={widget}
        isEditMode={isEditMode}
        onDelete={onDelete}
        onConfigure={onConfigure}
      >
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <div className="text-center">
            <Home className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Home Assistant
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Configure Home Assistant integration in Settings → Integrations
            </p>
          </div>
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper
      widget={widget}
      isEditMode={isEditMode}
      onDelete={onDelete}
      onConfigure={onConfigure}
    >
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-[var(--foreground)]" />
            <h3 className="font-semibold text-[var(--foreground)]">
              Home Assistant
            </h3>
          </div>
          <button
            onClick={fetchStates}
            disabled={isLoading}
            className="p-1 rounded hover:bg-[var(--muted)] transition-colors"
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 text-[var(--text-muted)] ${
                isLoading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>

        {isLoading && states.length === 0 ? (
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
        ) : states.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-[var(--text-muted)]">
              No entities configured
            </div>
          </div>
        ) : (
          <div
            className={`flex-1 overflow-y-auto ${
              displayMode === "grid"
                ? "grid grid-cols-2 gap-2"
                : "space-y-2"
            }`}
          >
            {states.map((entity) => renderEntity(entity))}
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}

