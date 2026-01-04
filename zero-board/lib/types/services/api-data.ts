/**
 * API data service types
 */

export interface ApiDataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface ApiDataResponse {
  data: ApiDataPoint[];
  error?: string;
}

