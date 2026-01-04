import axios, { AxiosError } from "axios";

// Get API URL from environment variable
// Next.js requires NEXT_PUBLIC_ prefix for client-side env vars
const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  
  // Debug logging
  if (typeof window !== "undefined") {
    console.log("[API Debug] NEXT_PUBLIC_API_URL from env:", url);
    console.log("[API Debug] All NEXT_PUBLIC_ vars:", Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')));
  }
  
  if (url) {
    // Remove trailing slash if present
    const cleanUrl = url.replace(/\/$/, "");
    if (typeof window !== "undefined") {
      console.log("[API Debug] Using API URL:", cleanUrl);
    }
    return cleanUrl;
  }
  
  const defaultUrl = "http://localhost:8000";
  if (typeof window !== "undefined") {
    console.warn("[API Debug] NEXT_PUBLIC_API_URL not set, using default:", defaultUrl);
  }
  return defaultUrl;
};

const api = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000", 10), // Default 30 seconds
});

// Log the final API URL
if (typeof window !== "undefined") {
  console.log("[API] Configured Base URL:", api.defaults.baseURL);
}

// Request interceptor for logging (development only)
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      console.error("[API] Request timeout:", error.config?.url);
      return Promise.reject(
        new Error(
          `Request timeout. The server took too long to respond. Please try again or increase NEXT_PUBLIC_API_TIMEOUT if needed.`
        )
      );
    }

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      if (status === 401) {
        // Unauthorized - clear auth state
        if (typeof window !== "undefined") {
          // Only clear on client side
          console.warn("[API] Unauthorized - clearing auth state");
        }
      }

      // Return error with message from server if available
      const message = data?.detail || error.message || "An error occurred";
      return Promise.reject(new Error(message));
    }

    if (error.request) {
      // Request was made but no response received
      console.error("[API] No response received:", error.config?.url);
      return Promise.reject(
        new Error(
          "Unable to connect to the server. Please check your connection and ensure the API server is running."
        )
      );
    }

    // Something else happened
    console.error("[API] Error:", error.message);
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: number;
  username: string;
  email?: string;
  is_admin: boolean;
  created_at: string;
  last_login_at?: string;
}

export interface BoardSettings {
  id: number;
  board_id: number;
  background_type?: string; // youtube, google_photos, dropbox, url, none, preset
  background_source?: string;
  background_config?: Record<string, any>;
  background_preset?: string; // Preset ID from backgroundPresets
  resolution_width?: number;
  resolution_height?: number;
  aspect_ratio?: string; // 16:9, 4:3, 21:9, custom, etc.
  orientation?: string; // landscape, portrait, auto
  auto_rotate_pages?: boolean; // Enable automatic page rotation
  lockout_mode?: boolean; // Enable lockout mode - prevents all interactions and navigation
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: number;
  title: string;
  description?: string;
  owner_id: number;
  layout_config?: Record<string, any>;
  settings?: BoardSettings;
  created_at: string;
  updated_at: string;
}

export interface Widget {
  id: number;
  board_id: number;
  type: string;
  config: Record<string, unknown>;
  position: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BoardDetail extends Board {
  widgets: Widget[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  message: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface Integration {
  id: number;
  user_id: number;
  service: string;
  service_type: string;
  config: Record<string, any>;
  extra_data: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WidgetTemplate {
  category: string;
  widgets: Array<{
    type: string;
    name: string;
    icon: string;
    description: string;
    requires_auth?: boolean;
    requires_config?: boolean;
  }>;
}

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/api/auth/login", data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/api/auth/logout");
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>("/api/auth/me");
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await api.post("/api/auth/change-password", data);
  },
};

// Boards API
export const boardsApi = {
  list: async (skip = 0, limit = 100): Promise<Board[]> => {
    const response = await api.get<Board[]>("/api/boards", {
      params: { skip, limit },
    });
    return response.data;
  },

  get: async (id: number, accessToken?: string): Promise<BoardDetail> => {
    const config: any = {};
    if (accessToken) {
      config.params = { access_token: accessToken };
      // Also set as header for alternative authentication methods
      config.headers = { ...config.headers, "X-Access-Token": accessToken };
    }
    const response = await api.get<BoardDetail>(`/api/boards/${id}`, config);
    return response.data;
  },

  create: async (data: {
    title: string;
    description?: string;
    layout_config?: Record<string, any>;
  }): Promise<Board> => {
    const response = await api.post<Board>("/api/boards", data);
    return response.data;
  },

  update: async (
    id: number,
    data: {
      title?: string;
      description?: string;
      layout_config?: Record<string, any>;
    }
  ): Promise<Board> => {
    const response = await api.put<Board>(`/api/boards/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/boards/${id}`);
  },

  getSettings: async (id: number): Promise<BoardSettings> => {
    const response = await api.get<BoardSettings>(`/api/boards/${id}/settings`);
    return response.data;
  },

  updateSettings: async (
    id: number,
    data: {
      background_type?: string;
      background_source?: string;
      background_config?: Record<string, any>;
      background_preset?: string;
      resolution_width?: number;
      resolution_height?: number;
      aspect_ratio?: string;
      orientation?: string;
      auto_rotate_pages?: boolean;
      lockout_mode?: boolean;
    }
  ): Promise<BoardSettings> => {
    const response = await api.put<BoardSettings>(`/api/boards/${id}/settings`, data);
    return response.data;
  },
};

// Board Access Token API
export interface BoardAccessToken {
  id: number;
  board_id: number;
  name?: string;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
  is_active: boolean;
}

export interface BoardAccessTokenCreate {
  name?: string;
  expires_at?: string;
}

export interface BoardAccessTokenCreateResponse extends BoardAccessToken {
  token: string; // Only shown once when created
}

export interface BoardAccessTokenUpdate {
  name?: string;
  is_active?: boolean;
  expires_at?: string;
}

export const boardAccessTokensApi = {
  create: async (boardId: number, data: BoardAccessTokenCreate): Promise<BoardAccessTokenCreateResponse> => {
    const response = await api.post<BoardAccessTokenCreateResponse>(`/api/v1/boards/${boardId}/access-tokens`, data);
    return response.data;
  },

  list: async (boardId: number): Promise<BoardAccessToken[]> => {
    const response = await api.get<BoardAccessToken[]>(`/api/v1/boards/${boardId}/access-tokens`);
    return response.data;
  },

  update: async (
    boardId: number,
    tokenId: number,
    data: BoardAccessTokenUpdate
  ): Promise<BoardAccessToken> => {
    const response = await api.patch<BoardAccessToken>(
      `/api/v1/boards/${boardId}/access-tokens/${tokenId}`,
      data
    );
    return response.data;
  },

  delete: async (boardId: number, tokenId: number): Promise<void> => {
    await api.delete(`/api/v1/boards/${boardId}/access-tokens/${tokenId}`);
  },
};

// Widgets API
export const widgetsApi = {
  create: async (
    boardId: number,
    data: {
      type: string;
      config?: Record<string, any>;
      position?: Record<string, any>;
    }
  ): Promise<Widget> => {
    const response = await api.post<Widget>(
      `/api/boards/${boardId}/widgets`,
      data
    );
    return response.data;
  },

  update: async (
    boardId: number,
    widgetId: number,
    data: {
      type?: string;
      config?: Record<string, any>;
      position?: Record<string, any>;
    }
  ): Promise<Widget> => {
    const response = await api.put<Widget>(
      `/api/boards/${boardId}/widgets/${widgetId}`,
      data
    );
    return response.data;
  },

  delete: async (boardId: number, widgetId: number): Promise<void> => {
    await api.delete(`/api/boards/${boardId}/widgets/${widgetId}`);
  },
};

// Settings API
export const settingsApi = {
  proxyICalFeed: async (url: string): Promise<{ content: string; content_type: string }> => {
    const response = await api.get<{ content: string; content_type: string }>("/api/settings/integrations/ical/proxy", {
      params: { url },
    });
    return response.data;
  },
  getWidgetTemplates: async (): Promise<WidgetTemplate[]> => {
    const response = await api.get<WidgetTemplate[]>("/api/settings/widgets/templates");
    return response.data;
  },

  listIntegrations: async (): Promise<Integration[]> => {
    const response = await api.get<Integration[]>("/api/settings/integrations");
    return response.data;
  },

  createIntegration: async (data: {
    service: string;
    service_type: string;
    config?: Record<string, any>;
    extra_data?: Record<string, any>;
    is_active?: boolean;
  }): Promise<Integration> => {
    const response = await api.post<Integration>("/api/settings/integrations", data);
    return response.data;
  },

  updateIntegration: async (
    id: number,
    data: {
    config?: Record<string, any>;
    extra_data?: Record<string, any>;
    is_active?: boolean;
    }
  ): Promise<Integration> => {
    const response = await api.put<Integration>(`/api/settings/integrations/${id}`, data);
    return response.data;
  },

  deleteIntegration: async (id: number): Promise<void> => {
    await api.delete(`/api/settings/integrations/${id}`);
  },

  testIntegration: async (data: {
    service: string;
    service_type: string;
    config?: Record<string, any>;
  }): Promise<{ success: boolean; message: string; details?: Record<string, any> }> => {
    const response = await api.post<{ success: boolean; message: string; details?: Record<string, any> }>(
      "/api/settings/integrations/test",
      data
    );
    return response.data;
  },

  fetchEmailIntegration: async (
    integrationId: number,
    limit: number = 10
  ): Promise<{ emails: any[]; unread_count: number }> => {
    const response = await api.get<{ emails: any[]; unread_count: number }>(
      `/api/settings/integrations/email/fetch`,
      {
        params: { integration_id: integrationId, limit },
      }
    );
    return response.data;
  },

  // Home Assistant API
  fetchHomeAssistantStates: async (
    integrationId: number,
    entityIds?: string[]
  ): Promise<{ states: any[] }> => {
    const response = await api.get<{ states: any[] }>(
      `/api/settings/integrations/home_assistant/states`,
      {
        params: {
          integration_id: integrationId,
          entity_ids: entityIds?.join(","),
        },
      }
    );
    return response.data;
  },

  callHomeAssistantService: async (
    integrationId: number,
    domain: string,
    service: string,
    entityId?: string,
    serviceData?: Record<string, any>
  ): Promise<{ success: boolean; message: string; data?: any }> => {
    const response = await api.post<{ success: boolean; message: string; data?: any }>(
      `/api/settings/integrations/home_assistant/service`,
      {
        integration_id: integrationId,
        domain,
        service,
        entity_id: entityId,
        service_data: serviceData,
      }
    );
    return response.data;
  },

  getHomeAssistantEntities: async (
    integrationId: number,
    domain?: string
  ): Promise<{ entities: any[] }> => {
    const response = await api.get<{ entities: any[] }>(
      `/api/settings/integrations/home_assistant/entities`,
      {
        params: {
          integration_id: integrationId,
          domain,
        },
      }
    );
    return response.data;
  },
};
