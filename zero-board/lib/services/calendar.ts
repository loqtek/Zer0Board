/**
 * Calendar service for fetching calendar events
 * Supports multiple sources: Google Calendar, Microsoft Calendar, iCal feeds
 */

import type { CalendarEvent } from "@/lib/types/services/calendar";
export type { CalendarEvent };

/**
 * Parse iCal feed URL (public calendar feeds)
 */
export async function getEventsFromICal(url: string): Promise<CalendarEvent[]> {
  try {
    console.log("Fetching iCal from URL:", url);
    
    // Use secure backend proxy to fetch iCal content (avoids CORS and security issues)
    const { settingsApi } = await import("@/lib/api");
    
    let icalContent: string;
    try {
      const proxyResponse = await settingsApi.proxyICalFeed(url);
      icalContent = proxyResponse.content;
      console.log("Fetched iCal via secure backend proxy, length:", icalContent.length);
    } catch (proxyError) {
      console.error("Backend proxy failed:", proxyError);
      // Fallback: try direct fetch as last resort (may fail due to CORS)
      try {
        const directResponse = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "text/calendar, text/plain, */*",
          },
        });
        
        if (directResponse.ok) {
          icalContent = await directResponse.text();
          console.log("Fetched iCal directly (fallback), length:", icalContent.length);
        } else {
          throw new Error(`Direct fetch failed: ${directResponse.status}`);
        }
      } catch (directError) {
        console.error("Both backend proxy and direct fetch failed:", directError);
        throw new Error(`Failed to fetch iCal: ${proxyError instanceof Error ? proxyError.message : String(proxyError)}`);
      }
    }
    
    if (!icalContent || icalContent.length === 0) {
      console.warn("Empty iCal content received");
      return [];
    }
    
    console.log("iCal content preview (first 500 chars):", icalContent.substring(0, 500));
    
    // Simple iCal parser (basic implementation)
    const events: CalendarEvent[] = [];
    
    // This is a simplified parser - for production, use a proper iCal library
    const eventMatches = Array.from(icalContent.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g));
    console.log(`Found ${eventMatches.length} events in iCal content`);
    
    for (const match of eventMatches) {
      const eventText = match[0];
      const titleMatch = eventText.match(/SUMMARY[;:](.+)/);
      const dateMatch = eventText.match(/DTSTART[;:]([^;\r\n]+)/);
      const endDateMatch = eventText.match(/DTEND[;:]([^;\r\n]+)/);
      const locationMatch = eventText.match(/LOCATION[;:](.+)/);
      const descriptionMatch = eventText.match(/DESCRIPTION[;:](.+)/);
      
      if (titleMatch && dateMatch) {
        const title = titleMatch[1].trim().replace(/\\n/g, " ").replace(/\\,/g, ",");
        const dateStr = dateMatch[1].trim();
        const endDateStr = endDateMatch ? endDateMatch[1].trim() : null;
        const location = locationMatch ? locationMatch[1].trim().replace(/\\n/g, " ").replace(/\\,/g, ",") : undefined;
        const description = descriptionMatch ? descriptionMatch[1].trim().replace(/\\n/g, " ").replace(/\\,/g, ",") : undefined;
        
        // Parse iCal date format (YYYYMMDD or YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ)
        let date = "";
        let startTime = undefined;
        let endTime = undefined;
        
        // Handle date with or without time
        if (dateStr.length >= 8) {
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          date = `${year}-${month}-${day}`;
          
          // If there's time information (T separator)
          if (dateStr.includes("T") && dateStr.length >= 15) {
            const timePart = dateStr.split("T")[1];
            const hour = timePart.substring(0, 2);
            const minute = timePart.substring(2, 4);
            const second = timePart.length >= 6 ? timePart.substring(4, 6) : "00";
            startTime = `${hour}:${minute}:${second}`;
          }
        }
        
        // Parse end time if available
        if (endDateStr && endDateStr.includes("T") && endDateStr.length >= 15) {
          const timePart = endDateStr.split("T")[1];
          const hour = timePart.substring(0, 2);
          const minute = timePart.substring(2, 4);
          const second = timePart.length >= 6 ? timePart.substring(4, 6) : "00";
          endTime = `${hour}:${minute}:${second}`;
        }
        
        if (title && date) {
          events.push({
            title,
            date,
            startTime,
            endTime,
            location,
            description,
            source: "iCal Feed",
          });
        } else {
          console.warn("Skipping event - missing title or date:", { title, date });
        }
      }
    }
    
    console.log(`Parsed ${events.length} events from iCal feed`);
    return events.slice(0, 20); // Limit to 20 events
  } catch (error) {
    console.error("Error fetching iCal events:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return [];
  }
}

/**
 * Get events from Google Calendar (requires OAuth token)
 * This is a placeholder - full implementation would use Google Calendar API
 */
export async function getEventsFromGoogle(
  accessToken: string,
  calendarId: string = "primary"
): Promise<CalendarEvent[]> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?maxResults=20&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json() as { items?: Array<{
        summary?: string;
        start?: { date?: string; dateTime?: string };
        end?: { dateTime?: string };
        description?: string;
        location?: string;
      }> };
      return (data.items || []).map((item) => ({
        title: item.summary || "Untitled Event",
        date: item.start?.date || item.start?.dateTime?.split("T")[0] || "",
        startTime: item.start?.dateTime?.split("T")[1]?.split("+")[0]?.split("Z")[0],
        endTime: item.end?.dateTime?.split("T")[1]?.split("+")[0]?.split("Z")[0],
        description: item.description,
        location: item.location,
        source: "Google Calendar",
      }));
    }
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
  }
  
  return [];
}

