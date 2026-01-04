"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { boardsApi, widgetsApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { 
  Layout, Download, Settings2, 
  Loader2, Eye, Search
} from "lucide-react";
import { loadBoardTemplates } from "@/lib/services/templates";
import type { BoardTemplate } from "@/lib/types/services/templates";
import Image from "next/image";

export default function TemplatesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [importingTemplateId, setImportingTemplateId] = useState<string | null>(null);
  const [boardTitle, setBoardTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: templates,
    isLoading: templatesLoading,
  } = useQuery({
    queryKey: ["board-templates"],
    queryFn: loadBoardTemplates,
    enabled: isAuthenticated,
  });

  const createBoardMutation = useMutation({
    mutationFn: boardsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board created successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      boardsApi.updateSettings(id, data),
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  const handleImportTemplate = async (template: BoardTemplate) => {
    if (!template) return;

    const finalTitle = boardTitle.trim() || `${template.name} (Copy)`;
    setImportingTemplateId(template.id);

    try {
      // Create the board
      const board = await createBoardMutation.mutateAsync({
        title: finalTitle,
        description: template.data.description || template.description || undefined,
        layout_config: template.data.layout_config || {},
      });

      // Update board settings if they exist
      if (template.data.settings) {
        const settingsData: Record<string, unknown> = {};
        if (template.data.settings.background_type) {
          settingsData.background_type = template.data.settings.background_type;
        }
        if (template.data.settings.background_source) {
          settingsData.background_source = template.data.settings.background_source;
        }
        if (template.data.settings.background_config) {
          settingsData.background_config = template.data.settings.background_config;
        }
        if (template.data.settings.resolution_width) {
          settingsData.resolution_width = template.data.settings.resolution_width;
        }
        if (template.data.settings.resolution_height) {
          settingsData.resolution_height = template.data.settings.resolution_height;
        }
        if (template.data.settings.aspect_ratio) {
          settingsData.aspect_ratio = template.data.settings.aspect_ratio;
        }
        if (template.data.settings.orientation) {
          settingsData.orientation = template.data.settings.orientation;
        }
        if (template.data.settings.auto_rotate_pages !== undefined) {
          settingsData.auto_rotate_pages = template.data.settings.auto_rotate_pages;
        }
        if (template.data.settings.lockout_mode !== undefined) {
          settingsData.lockout_mode = template.data.settings.lockout_mode;
        }

        if (Object.keys(settingsData).length > 0) {
          await updateSettingsMutation.mutateAsync({
            id: board.id,
            data: settingsData,
          });
        }
      }

      // Create all widgets
      if (template.data.widgets && template.data.widgets.length > 0) {
        const widgetPromises = template.data.widgets.map((widget) =>
          widgetsApi.create(board.id, {
            type: widget.type,
            config: widget.config || {},
            position: widget.position || {},
          })
        );

        await Promise.all(widgetPromises);
      }

      toast.success(`Board "${finalTitle}" created successfully from template!`);
      setImportingTemplateId(null);
      setBoardTitle("");
      setSelectedTemplate(null);
      
      // Navigate to the new board
      router.push(`/boards/${board.id}`);
    } catch (error) {
      console.error("Error importing template:", error);
      toast.error(getErrorMessage(error));
      setImportingTemplateId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              ← Back
            </Button>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <Layout className="h-8 w-8 text-[var(--primary)]" />
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Board Templates</h1>
          </div>
          <p className="text-[var(--text-muted)]">
            Choose a template to quickly create a pre-configured board with widgets and settings
          </p>
        </div>

        {/* Search Bar */}
        {templates && templates.length > 0 && (
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Templates Grid */}
        {templatesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--text-muted)]" />
            <span className="ml-2 text-[var(--text-muted)]">Loading templates...</span>
          </div>
        ) : templates && templates.length > 0 ? (
          (() => {
            const filteredTemplates = templates.filter((template) => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              return (
                template.name.toLowerCase().includes(query) ||
                template.description?.toLowerCase().includes(query) ||
                template.data.widgets?.some((w) =>
                  w.type.toLowerCase().includes(query)
                )
              );
            });

            if (filteredTemplates.length === 0) {
              return (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Search className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--text-muted)] mb-2">
                      No templates found matching &quot;{searchQuery}&quot;
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear search
                    </Button>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className={`group overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer ${
                  selectedTemplate?.id === template.id
                    ? "border-2 border-[var(--primary)] shadow-lg"
                    : "border border-[var(--border)]"
                }`}
                onClick={() => {
                  setSelectedTemplate(template);
                  setShowPreview(true);
                  setBoardTitle(`${template.name} (Copy)`);
                }}
              >
                {/* Preview Image - Larger with hover effect */}
                {template.preview && (
                  <div className="relative w-full h-80 bg-[var(--muted)] overflow-hidden">
                    <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-110">
                      <Image
                        src={template.preview}
                        alt={template.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* Hover indicator */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-[var(--background)]/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-[var(--border)]">
                        <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                          <Eye className="h-4 w-4" />
                          Click to preview
                        </div>
                      </div>
                    </div>
                    {/* Widget count badge */}
                    <div className="absolute top-3 right-3 bg-[var(--background)]/90 backdrop-blur-sm rounded-full px-3 py-1 border border-[var(--border)]">
                      <span className="text-xs font-medium text-[var(--foreground)]">
                        {template.data.widgets?.length || 0} widgets
                      </span>
                    </div>
                  </div>
                )}
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2 group-hover:text-[var(--primary)] transition-colors">
                        {template.name}
                      </CardTitle>
                      {template.description && (
                        <CardDescription className="text-sm line-clamp-2">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Template Info */}
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      {template.data.version && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">v{template.data.version}</span>
                        </div>
                      )}
                      {(() => {
                        const width = template.data.settings?.resolution_width;
                        const height = template.data.settings?.resolution_height;
                        if (typeof width === "number" && typeof height === "number") {
                          return (
                            <div className="flex items-center gap-1">
                              <span>
                                {width} × {height}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                          setShowPreview(true);
                          setBoardTitle(`${template.name} (Copy)`);
                        }}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                          setBoardTitle(`${template.name} (Copy)`);
                        }}
                        className="flex-1"
                        disabled={importingTemplateId === template.id}
                      >
                        {importingTemplateId === template.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Import
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
                ))}
              </div>
            );
          })()
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Layout className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
              <p className="text-[var(--text-muted)]">
                No templates available
              </p>
            </CardContent>
          </Card>
        )}

        {/* Import Dialog */}
        {selectedTemplate && !showPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Import Template: {selectedTemplate.name}</CardTitle>
                <CardDescription>
                  Create a new board from this template. You can customize it after creation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                      Board Title
                    </label>
                    <Input
                      value={boardTitle}
                      onChange={(e) => setBoardTitle(e.target.value)}
                      placeholder="Enter board title"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {selectedTemplate.data.widgets?.length || 0} widgets will be imported
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedTemplate(null);
                        setBoardTitle("");
                      }}
                      className="flex-1"
                      disabled={importingTemplateId === selectedTemplate.id}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleImportTemplate(selectedTemplate)}
                      className="flex-1"
                      disabled={importingTemplateId === selectedTemplate.id}
                    >
                      {importingTemplateId === selectedTemplate.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          Import Template
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preview Dialog */}
        {selectedTemplate && showPreview && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowPreview(false);
              setSelectedTemplate(null);
            }}
          >
            <Card 
              className="max-w-6xl w-full max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedTemplate.name}</CardTitle>
                    {selectedTemplate.description && (
                      <CardDescription className="mt-2 text-base">
                        {selectedTemplate.description}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPreview(false);
                      setSelectedTemplate(null);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Preview Image - Full size */}
                  {selectedTemplate.preview && (
                    <div className="relative w-full h-[600px] bg-[var(--muted)] rounded-lg overflow-hidden border border-[var(--border)] shadow-lg">
                      <Image
                        src={selectedTemplate.preview}
                        alt={selectedTemplate.name}
                        fill
                        className="object-contain"
                        sizes="100vw"
                        priority
                      />
                    </div>
                  )}

                  {/* Template Details */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-[var(--foreground)] flex items-center gap-2">
                        <Layout className="h-5 w-5" />
                        Widgets Included ({selectedTemplate.data.widgets?.length || 0})
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedTemplate.data.widgets?.map((widget, index) => (
                          <div
                            key={index}
                            className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--muted)] transition-colors"
                          >
                            <div className="text-sm font-medium text-[var(--foreground)]">
                              {widget.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedTemplate.data.settings && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-[var(--foreground)] flex items-center gap-2">
                          <Settings2 className="h-5 w-5" />
                          Board Settings
                        </h3>
                        <div className="space-y-3">
                          {(() => {
                            const width = selectedTemplate.data.settings?.resolution_width;
                            const height = selectedTemplate.data.settings?.resolution_height;
                            if (typeof width === "number" && typeof height === "number") {
                              return (
                                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)]">
                                  <div className="text-xs text-[var(--text-muted)] mb-1">Resolution</div>
                                  <div className="text-sm font-medium text-[var(--foreground)]">
                                    {width} × {height}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {(() => {
                            const aspectRatio = selectedTemplate.data.settings?.aspect_ratio;
                            if (typeof aspectRatio === "string" && aspectRatio) {
                              return (
                                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)]">
                                  <div className="text-xs text-[var(--text-muted)] mb-1">Aspect Ratio</div>
                                  <div className="text-sm font-medium text-[var(--foreground)]">
                                    {aspectRatio}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {(() => {
                            const backgroundType = selectedTemplate.data.settings?.background_type;
                            if (typeof backgroundType === "string" && backgroundType) {
                              return (
                                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)]">
                                  <div className="text-xs text-[var(--text-muted)] mb-1">Background</div>
                                  <div className="text-sm font-medium text-[var(--foreground)]">
                                    {backgroundType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {selectedTemplate.data.version && (
                            <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)]">
                              <div className="text-xs text-[var(--text-muted)] mb-1">Version</div>
                              <div className="text-sm font-medium text-[var(--foreground)]">
                                {selectedTemplate.data.version}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Import Button */}
                  <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPreview(false);
                        setSelectedTemplate(null);
                      }}
                      className="flex-1"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        setShowPreview(false);
                        setBoardTitle(`${selectedTemplate.name} (Copy)`);
                      }}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Import Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

