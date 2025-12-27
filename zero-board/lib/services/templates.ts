/**
 * Board template service
 * Loads templates from the boardTemplates directory
 */

export interface BoardTemplate {
  id: string;
  name: string;
  description: string | null;
  preview?: string;
  data: {
    title: string;
    description: string | null;
    layout_config: Record<string, any>;
    settings: Record<string, any>;
    widgets: Array<{
      type: string;
      config: Record<string, any>;
      position: Record<string, any>;
    }>;
    exported_at: string;
    version: string;
  };
}

/**
 * Load all board templates from the boardTemplates directory
 */
export async function loadBoardTemplates(): Promise<BoardTemplate[]> {
  try {
    const templates: BoardTemplate[] = [];
    
    // Load template1
    try {
      // Use dynamic import for JSON files
      // Next.js webpack handles JSON imports automatically
      const template1Module = await import("@/boardTemplates/template1/template1.json");
      // JSON modules in Next.js export the data as default
      const template1Data = (template1Module as any).default || template1Module;
      
      const template1: BoardTemplate = {
        id: "template1",
        name: template1Data.title || "Template 1",
        description: template1Data.description || "A pre-configured board template with weather, news, clock, calendar, and todo widgets",
        preview: "/boardTemplates/template1/template1Preview.png",
        data: template1Data,
      };
      templates.push(template1);
    } catch (error) {
      console.warn("Failed to load template1:", error);
    }
    
    // Load template2
    try {
      const template2Module = await import("@/boardTemplates/template2/template2.json");
      const template2Data = (template2Module as any).default || template2Module;
      
      const template2: BoardTemplate = {
        id: "template2",
        name: template2Data.title || "Minimal Dashboard",
        description: template2Data.description || "A clean, minimal dashboard with essential widgets",
        preview: "/boardTemplates/template2/template2Preview.png",
        data: template2Data,
      };
      templates.push(template2);
    } catch (error) {
      console.warn("Failed to load template2:", error);
    }

    // Load template3
    try {
      const template3Module = await import("@/boardTemplates/template3/template3.json");
      const template3Data = (template3Module as any).default || template3Module;
      
      const template3: BoardTemplate = {
        id: "template3",
        name: template3Data.title || "Productivity Hub",
        description: template3Data.description || "A productivity-focused dashboard",
        preview: "/boardTemplates/template3/template3Preview.png",
        data: template3Data,
      };
      templates.push(template3);
    } catch (error) {
      console.warn("Failed to load template3:", error);
    }

    // Load template4
    try {
      const template4Module = await import("@/boardTemplates/template4/template4.json");
      const template4Data = (template4Module as any).default || template4Module;
      
      const template4: BoardTemplate = {
        id: "template4",
        name: template4Data.title || "News & Media Hub",
        description: template4Data.description || "Stay informed with news and media",
        preview: "/boardTemplates/template4/template4Preview.png",
        data: template4Data,
      };
      templates.push(template4);
    } catch (error) {
      console.warn("Failed to load template4:", error);
    }

    // Load template5
    try {
      const template5Module = await import("@/boardTemplates/template5/template5.json");
      const template5Data = (template5Module as any).default || template5Module;
      
      const template5: BoardTemplate = {
        id: "template5",
        name: template5Data.title || "Finance Dashboard",
        description: template5Data.description || "Monitor markets and finance",
        preview: "/boardTemplates/template5/template5Preview.png",
        data: template5Data,
      };
      templates.push(template5);
    } catch (error) {
      console.warn("Failed to load template5:", error);
    }

    // Load template6
    try {
      const template6Module = await import("@/boardTemplates/template6/template6.json");
      const template6Data = (template6Module as any).default || template6Module;
      
      const template6: BoardTemplate = {
        id: "template6",
        name: template6Data.title || "Smart Home Control",
        description: template6Data.description || "Control your smart home",
        preview: "/boardTemplates/template6/template6Preview.png",
        data: template6Data,
      };
      templates.push(template6);
    } catch (error) {
      console.warn("Failed to load template6:", error);
    }
    
    return templates;
  } catch (error) {
    console.error("Error loading board templates:", error);
    return [];
  }
}

/**
 * Get a specific template by ID
 */
export async function getBoardTemplate(id: string): Promise<BoardTemplate | null> {
  const templates = await loadBoardTemplates();
  return templates.find(t => t.id === id) || null;
}

