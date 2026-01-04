/**
 * Strava service types
 */

export interface StravaActivity {
  id: number;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  type: string;
  start_date: string;
  start_date_local: string;
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
}

export interface StravaStats {
  recentDistance: number; // meters
  recentActivities: number;
  weeklyDistance: number; // meters
  weeklyActivities: number;
  totalDistance: number; // meters
  totalActivities: number;
  lastActivity?: StravaActivity;
}

export interface StravaAthlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  city?: string;
  state?: string;
  country?: string;
  profile?: string;
}

