/**
 * Fitbit service types
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

export interface FitbitProfile {
  user: {
    age: number;
    ambassador: boolean;
    autoStrideEnabled: boolean;
    avatar: string;
    avatar150: string;
    avatar640: string;
    averageDailySteps: number;
    clockTimeDisplayFormat: string;
    corporate: boolean;
    corporateAdmin: boolean;
    dateOfBirth: string;
    displayName: string;
    displayNameSetting: string;
    distanceUnit: string;
    distanceUnitSetting: string;
    encodedId: string;
    features: {
      exerciseGoal: boolean;
    };
    firstName: string;
    foodsLocale: string;
    fullName: string;
    gender: string;
    glucoseUnit: string;
    height: number;
    heightUnit: string;
    isChild: boolean;
    isCoach: boolean;
    languageLocale: string;
    lastName: string;
    legalTermsAcceptRequired: boolean;
    locale: string;
    memberSince: string;
    mfaEnabled: boolean;
    offsetFromUTCMillis: number;
    sdkDeveloper: boolean;
    sleepTracking: string;
    startDayOfWeek: string;
    strideLengthRunning: number;
    strideLengthWalking: number;
    swimUnit: string;
    temperatureUnit: string;
    timezone: string;
    topBadges: Array<{
      badgeGradientEndColor: string;
      badgeGradientStartColor: string;
      badgeType: string;
      category: string;
      cheers: Array<unknown>;
      dateTime: string;
      description: string;
      earnedMessage: string;
      encodedId: string;
      image100px: string;
      image125px: string;
      image300px: string;
      image50px: string;
      image75px: string;
      marketingDescription: string;
      mobileDescription: string;
      name: string;
      shareImage640px: string;
      shareText: string;
      shortDescription: string;
      shortName: string;
      timesAchieved: number;
      value: number;
    }>;
    weight: number;
    weightUnit: string;
  };
}

