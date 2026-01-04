/**
 * Calendar service types
 */

export interface CalendarEvent {
  title: string;
  date: string; // ISO date string
  startTime?: string;
  endTime?: string;
  description?: string;
  location?: string;
  source?: string;
}

