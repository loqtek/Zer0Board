/**
 * Weather service types
 */

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  location: string;
  unit: "celsius" | "fahrenheit";
}

export interface LocationSuggestion {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  admin1?: string; // State/Province
}

