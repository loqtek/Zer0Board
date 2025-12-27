/**
 * Fitbit API service
 * https://dev.fitbit.com/build/reference/web-api/
 */

export interface FitbitActivity {
  date: string;
  steps: number;
  distance: Array<{ activity: string; distance: number }>;
  calories: number;
  floors: number;
  elevation: number;
  minutesSedentary: number;
  minutesLightlyActive: number;
  minutesFairlyActive: number;
  minutesVeryActive: number;
  activityCalories: number;
}

export interface FitbitHeartRate {
  dateTime: string;
  value: {
    bpm: number;
    confidence: number;
  };
}

export interface FitbitStats {
  todaySteps: number;
  todayDistance: number; // km
  todayCalories: number;
  todayActiveMinutes: number;
  todayHeartRate?: number;
  weeklySteps: number;
  weeklyDistance: number; // km
  weeklyCalories: number;
  weeklyActiveMinutes: number;
}

/**
 * Get Fitbit profile
 */
export async function getFitbitProfile(accessToken: string): Promise<any> {
  const response = await fetch("https://api.fitbit.com/1/user/-/profile.json", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Fitbit API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get today's activity summary
 */
export async function getFitbitTodayActivity(accessToken: string): Promise<FitbitActivity> {
  const today = new Date().toISOString().split("T")[0];
  const response = await fetch(
    `https://api.fitbit.com/1/user/-/activities/date/${today}.json`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Fitbit API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.summary;
}

/**
 * Get weekly activity summary
 */
export async function getFitbitWeeklyActivity(accessToken: string): Promise<FitbitActivity[]> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const endDateStr = endDate.toISOString().split("T")[0];
  const startDateStr = startDate.toISOString().split("T")[0];

  const response = await fetch(
    `https://api.fitbit.com/1/user/-/activities/date/${startDateStr}/${endDateStr}.json`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Fitbit API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data["activities-steps"] || [];
}

/**
 * Get heart rate data
 */
export async function getFitbitHeartRate(accessToken: string): Promise<number | null> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await fetch(
      `https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d.json`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const heartRateZones = data["activities-heart"]?.[0]?.value?.restingHeartRate;
    return heartRateZones || null;
  } catch (error) {
    console.error("Error fetching Fitbit heart rate:", error);
    return null;
  }
}

/**
 * Get aggregated Fitbit stats
 */
export async function getFitbitStats(accessToken: string): Promise<FitbitStats> {
  try {
    const todayActivity = await getFitbitTodayActivity(accessToken);
    const weeklyActivities = await getFitbitWeeklyActivity(accessToken);
    const heartRate = await getFitbitHeartRate(accessToken);

    const weeklySteps = weeklyActivities.reduce(
      (sum, activity) => sum + (activity.steps || 0),
      0
    );
    const weeklyDistance = weeklyActivities.reduce(
      (sum, activity) => sum + (activity.distance?.[0]?.distance || 0),
      0
    ) / 1000; // Convert to km
    const weeklyCalories = weeklyActivities.reduce(
      (sum, activity) => sum + (activity.calories || 0),
      0
    );
    const weeklyActiveMinutes = weeklyActivities.reduce(
      (sum, activity) =>
        sum +
        (activity.minutesLightlyActive || 0) +
        (activity.minutesFairlyActive || 0) +
        (activity.minutesVeryActive || 0),
      0
    );

    return {
      todaySteps: todayActivity.steps || 0,
      todayDistance: (todayActivity.distance?.[0]?.distance || 0) / 1000, // Convert to km
      todayCalories: todayActivity.calories || 0,
      todayActiveMinutes:
        (todayActivity.minutesLightlyActive || 0) +
        (todayActivity.minutesFairlyActive || 0) +
        (todayActivity.minutesVeryActive || 0),
      todayHeartRate: heartRate || undefined,
      weeklySteps,
      weeklyDistance,
      weeklyCalories,
      weeklyActiveMinutes,
    };
  } catch (error) {
    console.error("Error fetching Fitbit stats:", error);
    throw error;
  }
}

