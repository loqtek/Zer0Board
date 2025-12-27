/**
 * Service for fetching data from external APIs for graph/metric widgets
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

/**
 * Parse headers from string format (JSON or key:value pairs)
 */
function parseHeaders(headersStr?: string): Record<string, string> {
  if (!headersStr || !headersStr.trim()) {
    return {};
  }

  try {
    // Try parsing as JSON first
    const parsed = JSON.parse(headersStr);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch {
    // Not JSON, try key:value format
  }

  // Parse as key:value pairs (one per line)
  const headers: Record<string, string> = {};
  const lines = headersStr.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      if (key && value) {
        headers[key] = value;
      }
    }
  }

  return headers;
}

/**
 * Extract data from JSON response using a path (e.g., "data.values" or "results")
 */
function extractDataPath(obj: any, path?: string): any {
  if (!path) {
    return obj;
  }

  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return current;
}

/**
 * Transform API response data into chart data points
 */
function transformToDataPoints(
  data: any,
  xField?: string,
  yField?: string
): ApiDataPoint[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item, index) => {
    let x: string | number = index + 1;
    let y = 0;
    let label: string | undefined;

    if (typeof item === "number") {
      // Simple array of numbers
      y = item;
      x = index + 1;
    } else if (typeof item === "object" && item !== null) {
      // Object with fields
      if (xField && item[xField] !== undefined) {
        x = item[xField];
        label = String(item[xField]);
      }
      if (yField && item[yField] !== undefined) {
        y = typeof item[yField] === "number" ? item[yField] : parseFloat(item[yField]) || 0;
      } else if (item.value !== undefined) {
        y = typeof item.value === "number" ? item.value : parseFloat(item.value) || 0;
      } else if (item.y !== undefined) {
        y = typeof item.y === "number" ? item.y : parseFloat(item.y) || 0;
      }
    }

    return { x, y, label };
  });
}

/**
 * Fetch data from an external API
 */
export async function fetchApiData(
  url: string,
  method: string = "GET",
  headers?: string,
  body?: string,
  dataPath?: string,
  xField?: string,
  yField?: string
): Promise<ApiDataResponse> {
  try {
    const parsedHeaders = parseHeaders(headers);
    
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        ...parsedHeaders,
      },
    };

    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      try {
        // Try to parse as JSON, if it fails, use as string
        const parsed = JSON.parse(body);
        fetchOptions.body = JSON.stringify(parsed);
      } catch {
        fetchOptions.body = body;
      }
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      return {
        data: [],
        error: `API request failed: ${response.status} ${response.statusText}`,
      };
    }

    const jsonData = await response.json();
    const extractedData = extractDataPath(jsonData, dataPath);
    const dataPoints = transformToDataPoints(extractedData, xField, yField);

    return {
      data: dataPoints,
    };
  } catch (error) {
    console.error("Error fetching API data:", error);
    return {
      data: [],
      error: error instanceof Error ? error.message : "Failed to fetch data from API",
    };
  }
}

