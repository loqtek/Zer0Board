/**
 * Board template service types
 */

export interface BoardTemplate {
  id: string;
  name: string;
  description: string | null;
  preview?: string;
  data: {
    title: string;
    description: string | null;
    layout_config: Record<string, unknown>;
    settings: Record<string, unknown>;
    widgets: Array<{
      type: string;
      config: Record<string, unknown>;
      position: Record<string, unknown>;
    }>;
    exported_at: string;
    version: string;
  };
}

