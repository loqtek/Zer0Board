"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { getEventsFromICal, getEventsFromGoogle } from "@/lib/services/calendar";
import { settingsApi } from "@/lib/api";
import type { CalendarEvent } from "@/lib/types/services/calendar";
import { useQuery } from "@tanstack/react-query";

interface CalendarWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
  onDuplicate?: () => void;
}

export function CalendarWidget({ widget, isEditMode, onDelete, onConfigure, onDuplicate }: CalendarWidgetProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 200, height: 100 });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDate] = useState(new Date());

  // Auto-detect calendar type from widget type if not set in config
  let calendarType = widget.config?.calendarType;
  if (!calendarType) {
    if (widget.type === "google_calendar") {
      calendarType = "google";
    } else if (widget.type === "microsoft_calendar") {
      calendarType = "microsoft";
    } else {
      calendarType = "local";
    }
  }
  
  const icalUrlRaw = widget.config?.icalUrl;
  const icalUrl = typeof icalUrlRaw === "string" ? icalUrlRaw : undefined;
  const useLocalEvents = widget.config?.useLocalEvents !== false;
  const showTime = widget.config?.showTime !== false;
  const showLocation = widget.config?.showLocation !== false;
  const maxEventsRaw = widget.config?.maxEvents;
  const maxEvents = typeof maxEventsRaw === "number" ? maxEventsRaw : 5;
  const viewMode = widget.config?.viewMode || "upcoming"; // upcoming, today, week
  
  // Extract stable primitive values from config
  const localEventsRaw = widget.config?.events;
  const localEvents = Array.isArray(localEventsRaw) ? localEventsRaw : [];
  const calendarIdRaw = widget.config?.calendarId;
  const calendarId = typeof calendarIdRaw === "string" ? calendarIdRaw : "primary";

  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => settingsApi.listIntegrations(),
  });
  
  // Get calendar integration URLs (ICS feeds)
  const googleCalendarIntegration = integrations?.find(
      (i) => i.service === "google_calendar" && i.is_active
    );
  const microsoftCalendarIntegration = integrations?.find(
    (i) => i.service === "microsoft_calendar" && i.is_active
  );
  
  // Use integration ICS URL if available, otherwise use widget config
  // Check both ical_url and url fields, and also check the raw config object
  const googleCalendarUrlRaw = googleCalendarIntegration?.config?.ical_url || 
                            googleCalendarIntegration?.config?.url;
  const googleCalendarUrl = typeof googleCalendarUrlRaw === "string" ? googleCalendarUrlRaw : null;
  
  const microsoftCalendarUrlRaw = microsoftCalendarIntegration?.config?.ical_url || 
                              microsoftCalendarIntegration?.config?.url;
  const microsoftCalendarUrl = typeof microsoftCalendarUrlRaw === "string" ? microsoftCalendarUrlRaw : null;
  
  // Legacy support: check for access_token (OAuth)
  const googleAccessTokenRaw = googleCalendarIntegration?.config?.access_token;
  const googleAccessToken = typeof googleAccessTokenRaw === "string" ? googleAccessTokenRaw : null;
  
  // Debug logging - log the full integration object to see what we're working with
  useEffect(() => {
    if (calendarType === "google" || calendarType === "microsoft") {
      console.log("Calendar Widget Debug:", {
        widgetType: widget.type,
        calendarType,
        googleCalendarUrl,
        microsoftCalendarUrl,
        googleAccessToken: googleAccessToken ? "***" : null,
        hasGoogleIntegration: !!googleCalendarIntegration,
        hasMicrosoftIntegration: !!microsoftCalendarIntegration,
        googleIntegrationConfig: googleCalendarIntegration?.config,
        microsoftIntegrationConfig: microsoftCalendarIntegration?.config,
        allIntegrations: integrations?.map(i => ({ service: i.service, is_active: i.is_active, configKeys: Object.keys(i.config || {}) })),
      });
    }
  }, [calendarType, googleCalendarUrl, microsoftCalendarUrl, googleAccessToken, googleCalendarIntegration, microsoftCalendarIntegration, widget.type, integrations]);
  
  // Create stable string representation of localEvents
  // Use a ref to track the previous string to prevent unnecessary recalculations
  const localEventsStrRef = useRef<string>("");
  const currentLocalEventsStr = JSON.stringify(localEvents);
  if (currentLocalEventsStr !== localEventsStrRef.current) {
    localEventsStrRef.current = currentLocalEventsStr;
  }
  const localEventsStr = localEventsStrRef.current;
  
  // Use refs to track previous values and prevent unnecessary re-renders
  const prevDepsRef = useRef<string>("");

  useEffect(() => {
    if (!containerRef) return;
    
    const updateSize = () => {
      if (containerRef) {
        setContainerSize({
          width: containerRef.offsetWidth,
          height: containerRef.offsetHeight,
        });
      }
    };
    
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  useEffect(() => {
    // Create a stable dependency string
    const currentDepsStr = `${calendarType}|${icalUrl}|${useLocalEvents}|${localEventsStr}|${googleCalendarUrl}|${microsoftCalendarUrl}|${googleAccessToken}|${calendarId}`;
    
    console.log("CalendarWidget useEffect triggered:", {
      currentDepsStr,
      prevDepsStr: prevDepsRef.current,
      calendarType,
      googleCalendarUrl,
      microsoftCalendarUrl,
      icalUrl,
    });
    
    // Check if dependencies actually changed
    if (currentDepsStr === prevDepsRef.current) {
      // Dependencies haven't changed, skip fetch
      console.log("Dependencies unchanged, skipping fetch");
      return;
    }
    
    // Update the ref with current dependencies
    prevDepsRef.current = currentDepsStr;
    
    const fetchEvents = async () => {
      console.log("fetchEvents called with:", {
        calendarType,
        googleCalendarUrl,
        microsoftCalendarUrl,
        icalUrl,
        useLocalEvents,
        localEventsCount: localEvents.length,
      });
      
      // Only skip if we're using local-only mode
      if (calendarType === "local" && useLocalEvents && localEvents.length > 0) {
        console.log("Using local events only");
        setEvents(localEvents.map((e: { title?: string; date?: string; [key: string]: unknown }) => ({
          title: e.title || "",
          date: e.date || new Date().toISOString().split("T")[0],
          source: "Local",
        })));
        return;
      }

      setIsLoading(true);
      try {
        let fetchedEvents: CalendarEvent[] = [];

        if (calendarType === "ical" && icalUrl) {
          console.log("Fetching iCal events from URL:", icalUrl);
          fetchedEvents = await getEventsFromICal(icalUrl);
        } else if (calendarType === "google") {
          // Prefer ICS feed URL from integration, fallback to OAuth token
          if (googleCalendarUrl) {
            console.log("Fetching Google Calendar events from ICS URL:", googleCalendarUrl);
            try {
              fetchedEvents = await getEventsFromICal(googleCalendarUrl);
              console.log(`Successfully fetched ${fetchedEvents.length} events from Google Calendar`);
            } catch (error) {
              console.error("Error fetching from Google Calendar ICS URL:", error);
              // Try OAuth fallback if available
              if (googleAccessToken) {
                console.log("Falling back to OAuth token");
                fetchedEvents = await getEventsFromGoogle(googleAccessToken, calendarId);
              }
            }
          } else if (googleAccessToken) {
            console.log("Fetching Google Calendar events using OAuth token");
          fetchedEvents = await getEventsFromGoogle(
              googleAccessToken,
            calendarId
          );
          } else {
            console.warn("No Google Calendar integration found. Please connect Google Calendar in Integrations.");
            setEvents([]);
            setIsLoading(false);
            return;
          }
        } else if (calendarType === "microsoft") {
          if (microsoftCalendarUrl) {
            console.log("Fetching Microsoft Calendar events from ICS URL:", microsoftCalendarUrl);
            try {
              fetchedEvents = await getEventsFromICal(microsoftCalendarUrl);
              console.log(`Successfully fetched ${fetchedEvents.length} events from Microsoft Calendar`);
            } catch (error) {
              console.error("Error fetching from Microsoft Calendar ICS URL:", error);
            }
          } else {
            console.warn("No Microsoft Calendar integration found. Please connect Microsoft Calendar in Integrations.");
            setEvents([]);
            setIsLoading(false);
            return;
          }
        }

        // Merge with local events
        const allEvents = [...fetchedEvents, ...localEvents.map((e: { title?: string; date?: string; [key: string]: unknown }) => ({
          title: e.title || "",
          date: e.date || new Date().toISOString().split("T")[0],
          source: "Local",
        }))];

        // Sort by date
        allEvents.sort((a, b) => a.date.localeCompare(b.date));
        
        setEvents(allEvents.slice(0, maxEvents * 2)); // Get more events for filtering
      } catch (error) {
        console.error("Error fetching calendar events:", error);
        setEvents(localEvents.map((e: { title?: string; date?: string; [key: string]: unknown }) => ({
          title: e.title || "",
          date: e.date || new Date().toISOString().split("T")[0],
          source: "Local",
        })));
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
    
    // Refresh every hour
    const interval = setInterval(fetchEvents, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [calendarType, icalUrl, useLocalEvents, localEventsStr, googleCalendarUrl, microsoftCalendarUrl, googleAccessToken, calendarId]);

  const fontSize = useMemo(() => {
    const baseSize = Math.min(containerSize.width / 20, containerSize.height / 8);
    return Math.max(11, Math.min(baseSize, 16));
  }, [containerSize]);

  const month = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const day = currentDate.getDate();
  const dayName = currentDate.toLocaleString("default", { weekday: "short" });

  // Filter events based on view mode
  const todayStr = new Date().toISOString().split("T")[0];
  const today = new Date();
  const weekFromNow = new Date(today);
  weekFromNow.setDate(today.getDate() + 7);
  const weekFromNowStr = weekFromNow.toISOString().split("T")[0];
  
  let filteredEvents: CalendarEvent[] = [];
  if (viewMode === "today") {
    filteredEvents = events.filter((e) => e.date === todayStr).slice(0, maxEvents);
  } else if (viewMode === "week") {
    filteredEvents = events.filter((e) => e.date >= todayStr && e.date <= weekFromNowStr).slice(0, maxEvents);
  } else {
    // upcoming (default)
    filteredEvents = events.filter((e) => e.date >= todayStr).slice(0, maxEvents);
  }
  
  // Get calendar source name
  const calendarSource = calendarType === "google" 
    ? "Google Calendar" 
    : calendarType === "microsoft" 
    ? "Microsoft Calendar" 
    : calendarType === "ical" 
    ? "iCal Feed" 
    : "Local";

  // Format event date for display
  const formatEventDate = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventDateOnly = new Date(eventDate);
    eventDateOnly.setHours(0, 0, 0, 0);
    
    if (eventDateOnly.getTime() === today.getTime()) {
      return "Today";
    } else if (eventDateOnly.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      return eventDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(eventDate.getFullYear() !== today.getFullYear() && { year: "numeric" }),
      });
    }
  };

  // Check if integration is connected and has a valid URL
  const hasIntegration = (calendarType === "google" && (googleCalendarUrl || googleAccessToken)) ||
                        (calendarType === "microsoft" && microsoftCalendarUrl) ||
                        (calendarType === "ical" && icalUrl) ||
                        (calendarType === "local");

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure} onDuplicate={onDuplicate}>
      <div
        ref={setContainerRef}
        className="flex h-full w-full flex-col text-[var(--foreground)] p-3"
        style={{ color: "var(--foreground)" }}
      >
        {/* Date Header */}
        <div className="mb-4 text-center border-b border-[var(--border)] pb-3">
          <div className="text-xs uppercase tracking-wider opacity-60 mb-1" style={{ fontSize: `${fontSize * 0.7}px` }}>
            {dayName}
          </div>
          <div className="font-bold text-[var(--primary)]" style={{ fontSize: `${fontSize * 2.5}px` }}>
            {day}
          </div>
          <div className="font-medium opacity-80" style={{ fontSize: `${fontSize * 0.9}px` }}>
            {month}
          </div>
        </div>

        {/* Events List */}
        {isLoading && events.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xs opacity-50 mb-2">Loading events...</div>
              <div className="w-8 h-8 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event, index) => {
                const eventDate = new Date(event.date);
                const isToday = eventDate.toISOString().split("T")[0] === todayStr;
                
                return (
              <div
                key={index}
                    className={`rounded-lg p-2.5 transition-all hover:shadow-md ${
                      isToday
                        ? "bg-[var(--primary)]/20 border border-[var(--primary)]/30"
                        : "bg-[var(--muted)]/30 border border-[var(--border)]"
                    }`}
                    style={{ fontSize: `${fontSize * 0.85}px` }}
              >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[var(--foreground)] mb-1 truncate">
                          {event.title}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="text-xs opacity-70 flex items-center gap-1">
                            <span>📅</span>
                            <span>{formatEventDate(event.date)}</span>
                          </div>
                          {showTime && event.startTime && (
                            <div className="text-xs opacity-70 flex items-center gap-1">
                              <span>🕐</span>
                              <span>{event.startTime}</span>
                              {event.endTime && <span> - {event.endTime}</span>}
                            </div>
                          )}
                          {showLocation && event.location && (
                            <div className="text-xs opacity-70 flex items-center gap-1 truncate">
                              <span>📍</span>
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                          {event.source && event.source !== "Local" && (
                            <div className="text-[10px] opacity-50 mt-1">
                              {event.source}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2 opacity-30">📅</div>
                <div className="text-xs opacity-50 mb-2">
                  {isLoading 
                    ? "Loading events..." 
                    : !hasIntegration && (calendarType === "google" || calendarType === "microsoft")
                    ? `No ${calendarSource} integration connected. Go to Integrations to connect your ${calendarSource} ICS feed URL.`
                    : filteredEvents.length === 0 && hasIntegration
                    ? `No ${viewMode === "today" ? "events today" : viewMode === "week" ? "events this week" : "upcoming events"} found in ${calendarSource}`
                    : `No ${viewMode === "today" ? "events today" : viewMode === "week" ? "events this week" : "upcoming events"}`}
                </div>
                {!hasIntegration && (calendarType === "google" || calendarType === "microsoft") && (
                  <div className="mt-3">
                    <p className="text-[10px] opacity-60">
                      Connect {calendarSource} in Settings → Integrations
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Footer */}
        {calendarType !== "local" && (
          <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-end">
            <div className="text-[9px] opacity-40">
              {calendarSource}
            </div>
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}
