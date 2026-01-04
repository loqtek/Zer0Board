/**
 * Weather API service using Open-Meteo (free, no API key required)
 * https://open-meteo.com/
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

/**
 * Search for locations using Open-Meteo Geocoding API
 */
export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`
    );
    const data = await response.json();
    
    if (!data.results) return [];
    
    return data.results.map((result: {
      name: string;
      country: string;
      latitude: number;
      longitude: number;
      admin1?: string;
    }) => ({
      name: result.name,
      country: result.country,
      latitude: result.latitude,
      longitude: result.longitude,
      admin1: result.admin1,
    }));
  } catch (error) {
    console.error("Error searching locations:", error);
    return [];
  }
}

/**
 * Get weather data for a location
 */
export async function getWeather(
  latitude: number,
  longitude: number,
  unit: "celsius" | "fahrenheit" = "fahrenheit"
): Promise<WeatherData | null> {
  try {
    const tempUnit = unit === "celsius" ? "celsius" : "fahrenheit";
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&temperature_unit=${tempUnit}&wind_speed_unit=${unit === "celsius" ? "kmh" : "mph"}`
    );
    const data = await response.json();
    
    if (!data.current) return null;
    
    const weatherCodes: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      56: "Light freezing drizzle",
      57: "Dense freezing drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      66: "Light freezing rain",
      67: "Heavy freezing rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      85: "Slight snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with slight hail",
      99: "Thunderstorm with heavy hail",
    };
    
    return {
      temperature: Math.round(data.current.temperature_2m),
      condition: weatherCodes[data.current.weather_code] || "Unknown",
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
      windDirection: data.current.wind_direction_10m,
      location: "", // Will be set by widget
      unit,
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}

