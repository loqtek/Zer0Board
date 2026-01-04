/**
 * Strava API service
 * https://developers.strava.com/
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

/**
 * Get Strava athlete profile
 */
export async function getStravaAthlete(accessToken: string): Promise<StravaAthlete> {
  const response = await fetch("https://www.strava.com/api/v3/athlete", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get recent activities from Strava
 */
export async function getStravaActivities(
  accessToken: string,
  perPage: number = 10,
  page: number = 1
): Promise<StravaActivity[]> {
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get aggregated Strava stats
 */
export async function getStravaStats(accessToken: string): Promise<StravaStats> {
  try {
    const activities = await getStravaActivities(accessToken, 200, 1);
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentActivities = activities.filter(
      (activity) => new Date(activity.start_date) >= oneWeekAgo
    );
    
    const weeklyDistance = recentActivities.reduce(
      (sum, activity) => sum + activity.distance,
      0
    );
    
    const totalDistance = activities.reduce(
      (sum, activity) => sum + activity.distance,
      0
    );
    
    const lastActivity = activities.length > 0 ? activities[0] : undefined;
    
    return {
      recentDistance: lastActivity?.distance || 0,
      recentActivities: activities.slice(0, 5).length,
      weeklyDistance,
      weeklyActivities: recentActivities.length,
      totalDistance,
      totalActivities: activities.length,
      lastActivity,
    };
  } catch (error) {
    console.error("Error fetching Strava stats:", error);
    throw error;
  }
}

