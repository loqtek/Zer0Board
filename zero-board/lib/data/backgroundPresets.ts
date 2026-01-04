/**
 * Background presets for boards
 * Common YouTube videos/streams for ambient backgrounds
 */

import type { BackgroundPreset } from "@/lib/types/data";
export type { BackgroundPreset };

export const backgroundPresets: BackgroundPreset[] = [
  // Fireplace & Cozy
  {
    id: "fireplace-1",
    name: "Cozy Fireplace",
    description: "Relaxing fireplace with crackling sounds",
    type: "youtube",
    source: "mKCieTImjvU",
    category: "Cozy",
    config: { muted: false, volume: 50 },
  },
  {
    id: "fireplace-2",
    name: "Christmas Fireplace",
    description: "Holiday fireplace with Christmas ambiance",
    type: "youtube",
    source: "UGzTkPauX8U", // Christmas Fireplace
    category: "Cozy",
    config: { muted: false, volume: 50 },
  },
  {
    id: "fireplace-3",
    name: "Crackling Fire",
    description: "Peaceful fire with ambient sounds",
    type: "youtube",
    source: "ITBtNXd5WJs",
    category: "Cozy",
    config: { muted: false, volume: 50 },
  },

  // Nature & Weather
  {
    id: "thunderstorm-1",
    name: "Thunderstorm",
    description: "Heavy rain and thunder",
    type: "youtube",
    source: "cI0zN1nG3PQ",
    category: "Nature",
    config: { muted: false, volume: 30 },
  },
  {
    id: "rain-1",
    name: "Gentle Rain",
    description: "Soft rain sounds for relaxation",
    type: "youtube",
    source: "Y9sQ2DwwjT4",
    category: "Nature",
    config: { muted: false, volume: 30 },
  },
  {
    id: "ocean-1",
    name: "Ocean Waves",
    description: "Calming ocean waves on the beach",
    type: "youtube",
    source: "_BMi3usEwi8",
    category: "Nature",
    config: { muted: false, volume: 30 },
  },
  {
    id: "forest-1",
    name: "Forest Ambiance",
    description: "Peaceful forest sounds with birds",
    type: "youtube",
    source: "F0GOOP82094",
    category: "Nature",
    config: { muted: false, volume: 50 },
  },
  {
    id: "snow-1",
    name: "Norway's Railway Views",
    description: "Norway's Railway WINTER Cab Views",
    type: "youtube",
    source: "tAWFO8_O_7M", // Snowfall
    category: "Nature",
    config: { muted: true, volume: 0 },
  },

  // Holiday & Seasonal
  {
    id: "christmas-1",
    name: "Christmas Ambiance",
    description: "Cozy Christmas atmosphere",
    type: "youtube",
    source: "Ou9Li9x-Q40", // Christmas Fireplace
    category: "Holiday",
    config: { muted: false, volume: 30 },
  },
  {
    id: "christmas-2",
    name: "Christmas Village",
    description: "Animated Christmas village scene",
    type: "youtube",
    source: "KBtef_F5iY0", // Christmas village
    category: "Holiday",
    config: { muted: false, volume: 25 },
  },
  {
    id: "fall-1",
    name: "Fall Ambiance",
    description: "Calm fall atmosphere",
    type: "youtube",
    source: "eCnHLEWZv08",
    category: "Holiday",
    config: { muted: false, volume: 30 },
  },

  // Abstract & Ambient
  {
    id: "lofi-city-1",
    name: "1990s Lofi City",
    description: "Lofi city atmosphere",
    type: "youtube",
    source: "TfWotiyXGfI", // Lofi stream
    category: "Abstract",
    config: { muted: false, volume: 30 },
  },
  {
    id: "Interstellar-suite-1",
    name: "Interstellar Suite",
    description: "Private Interstellar Suite in Deep Space ambient music",
    type: "youtube",
    source: "TGysUwc_LEc", // Placeholder - user can replace
    category: "Abstract",
    config: { muted: false, volume: 30 },
  },

  // City & Urban
  {
    id: "city-1",
    name: "Sydney Cityscape",
    description: "Live Sydney Cityscape",
    type: "youtube",
    source: "5uZa3-RMFos", 
    category: "Urban",
    config: { muted: false, volume: 20 },
  },
  {
    id: "city-1",
    name: "Sydney Cityscape",
    description: "Live Sydney Cityscape",
    type: "youtube",
    source: "5uZa3-RMFos", 
    category: "Urban",
    config: { muted: false, volume: 20 },
  },
  {
    id: "iss-live-1",
    name: "International Space Station Live",
    description: "Live view of the International Space Station & Earth",
    type: "youtube",
    source: "fO9e9jnhYK8",
    category: "Nature",
    config: { muted: false, volume: 30 },
  },
];

export const backgroundCategories = [
  "All",
  "Cozy",
  "Nature",
  "Holiday",
  "Abstract",
  "Urban",
];

export function getYouTubeVideoId(urlOrId: string): string {
  // If it's already just an ID, return it
  if (!urlOrId.includes("youtube.com") && !urlOrId.includes("youtu.be")) {
    return urlOrId;
  }
  // Extract from URL
  const match = urlOrId.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : urlOrId;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

