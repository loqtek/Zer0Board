/**
 * Data types for presets, feeds, and other static data structures
 */

export interface BackgroundPreset {
  id: string;
  name: string;
  description: string;
  type: "youtube";
  source: string; // YouTube video ID or URL
  category: string;
  thumbnail?: string;
  config?: {
    muted?: boolean;
    volume?: number;
  };
}

export interface RssFeed {
  id: string;
  name: string;
  url: string;
  language: string;
  region: string;
  category: string;
  description?: string;
}

