/**
 * API-related types
 * Types for API requests, responses, and data models
 */

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

