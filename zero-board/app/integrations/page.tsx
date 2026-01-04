"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { settingsApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { 
  X, CheckCircle2, AlertCircle, Settings2, ChevronRight,
  Calendar, TrendingUp, MessageSquare, Activity, Home, 
  Image as ImageIcon, Zap, Video, Search as SearchIcon
} from "lucide-react";
import { boardsApi } from "@/lib/api";
import { backgroundPresets, backgroundCategories, getYouTubeVideoId, getYouTubeThumbnail } from "@/lib/data/backgroundPresets";
import type { BackgroundPreset } from "@/lib/types/data";
import type { WidgetTemplate } from "@/lib/types/api";
import Image from "next/image";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Calendars": Calendar,
  "Finance & Trading": TrendingUp,
  "Communication": MessageSquare,
  "Health & Fitness": Activity,
  "Smart Home": Home,
  "Media": ImageIcon,
  "Utilities": Zap,
};

export default function IntegrationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWidget, setSelectedWidget] = useState<{ type: string; name: string; [key: string]: unknown } | null>(null);
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [serviceType, setServiceType] = useState<string>("api_key");
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: Record<string, unknown> } | null>(null);
  
  // Backgrounds section state
  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const [selectedBackgroundCategory, setSelectedBackgroundCategory] = useState<string>("All");
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState("");
  const [selectedBoard, setSelectedBoard] = useState<number | null>(null);
  const [applyingBackground, setApplyingBackground] = useState<string | null>(null);

  const {
    data: templates,
  } = useQuery({
    queryKey: ["widget-templates"],
    queryFn: () => settingsApi.getWidgetTemplates(),
    enabled: isAuthenticated,
  });

  const {
    data: integrations,
    isLoading: integrationsLoading,
  } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => settingsApi.listIntegrations(),
    enabled: isAuthenticated,
  });

  const {
    data: boards,
    isLoading: boardsLoading,
  } = useQuery({
    queryKey: ["boards"],
    queryFn: () => boardsApi.list(),
    enabled: isAuthenticated && showBackgrounds,
  });

  const createIntegrationMutation = useMutation({
    mutationFn: settingsApi.createIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setShowSetupForm(false);
      setSelectedWidget(null);
      setTestResult(null);
    },
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      settingsApi.updateIntegration(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Integration updated successfully");
      setShowSetupForm(false);
      setSelectedWidget(null);
      setTestResult(null);
      setShowRssFeedForm(false);
      setRssFeedName("");
      setRssFeedUrl("");
      setEditingRssFeedId(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: settingsApi.deleteIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Integration deleted successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: (data: { service: string; service_type: string; config: Record<string, unknown> }) =>
      settingsApi.testIntegration(data),
    onSuccess: (result) => {
      setTestResult(result);
      setTestingConnection(false);
      if (result.success) {
        toast.success(result.message || "Connection test successful");
      } else {
        toast.error(result.message || "Connection test failed");
      }
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setTestResult({
        success: false,
        message,
      });
      setTestingConnection(false);
      toast.error(message);
    },
  });

  // RSS Feed state
  const [showRssFeedForm, setShowRssFeedForm] = useState(false);
  const [rssFeedName, setRssFeedName] = useState("");
  const [rssFeedUrl, setRssFeedUrl] = useState("");
  const [editingRssFeedId, setEditingRssFeedId] = useState<number | null>(null);

  // Determine service type based on selected widget
  useEffect(() => {
    if (selectedWidget) {
      // URL-based integrations
      if (selectedWidget.type === "tradingview" || 
          selectedWidget.type === "google_calendar" || 
          selectedWidget.type === "microsoft_calendar") {
        setServiceType("url");
      } 
      // OAuth integrations
      else if (selectedWidget.type === "fitbit") {
        setServiceType("oauth");
      }
      // IMAP email integration
      else if (selectedWidget.type === "email") {
        setServiceType("imap");
      }
      // Home Assistant integration (uses URL service type with access token)
      else if (selectedWidget.type === "home_assistant") {
        setServiceType("url");
      }
      // API key integrations
      else {
        setServiceType("api_key");
      }
    }
  }, [selectedWidget]);

  const handleApplyBackground = async (preset: BackgroundPreset) => {
    if (!selectedBoard) {
      toast.error("Please select a board first");
      return;
    }
    setApplyingBackground(preset.id);
    try {
      await boardsApi.updateSettings(selectedBoard, {
        background_type: preset.type,
        background_source: getYouTubeVideoId(preset.source),
        background_config: preset.config || { muted: true, volume: 0 },
      });
      toast.success(`Applied "${preset.name}" background!`);
      setApplyingBackground(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setApplyingBackground(null);
    }
  };

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedWidget(null);
    setShowSetupForm(false);
    setTestResult(null);
  };

  const handleWidgetSelect = (widget: { type: string; name: string; [key: string]: unknown }) => {
    const integration = integrations?.find(
      (i) => i.service === widget.type && i.is_active
    );
    
    if (widget.requires_auth || widget.requires_config) {
      if (!integration) {
        setSelectedWidget(widget);
        setShowSetupForm(true);
        setTestResult(null);
        return;
      }
    }
    // Widget doesn't require setup or is already connected
    setSelectedWidget(widget);
  };

  const handleTestConnection = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    // Get the form element
    const form = e.currentTarget.closest('form');
    if (!form) {
      setTestResult({ success: false, message: "Form not found" });
      return;
    }
    
    const formData = new FormData(form);
    
    setTestingConnection(true);
    setTestResult(null);

    let config: Record<string, unknown> = {};
    
    if (serviceType === "url") {
      const url = formData.get("url") as string;
      if (!url) {
        setTestResult({ success: false, message: "URL is required" });
        setTestingConnection(false);
        return;
      }
      // For calendars, store as ical_url, for tradingview as widget_url
      if (selectedWidget?.type === "google_calendar" || selectedWidget?.type === "microsoft_calendar") {
        config = { ical_url: url, url };
      } else if (selectedWidget?.type === "home_assistant") {
        // Home Assistant needs both URL and access token
        const accessToken = formData.get("access_token") as string;
        if (!accessToken) {
          setTestResult({ success: false, message: "Access token is required" });
          setTestingConnection(false);
          return;
        }
        config = { url, widget_url: url, access_token: accessToken };
      } else {
        config = { url, widget_url: url };
      }
    } else if (serviceType === "imap") {
      const host = formData.get("host") as string;
      const port = formData.get("port") as string;
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;
      const useSsl = formData.get("use_ssl") === "true" || formData.get("use_ssl") === "on";
      const useTls = formData.get("use_tls") === "true" || formData.get("use_tls") === "on";
      
      if (!host || !username || !password) {
        setTestResult({ success: false, message: "Host, username, and password are required" });
        setTestingConnection(false);
        return;
      }
      
      config = {
        host,
        port: parseInt(port) || 993,
        username,
        password,
        use_ssl: useSsl,
        use_tls: useTls,
        folder: formData.get("folder") as string || "INBOX",
      };
    } else if (serviceType === "oauth") {
      const clientId = formData.get("client_id") as string;
      const clientSecret = formData.get("client_secret") as string;
      const accessToken = formData.get("access_token") as string;
      
      if (!clientId || !clientSecret) {
        setTestResult({ success: false, message: "Client ID and Client Secret are required" });
        setTestingConnection(false);
        return;
      }
      
      config = {
        client_id: clientId,
        client_secret: clientSecret,
        access_token: accessToken || undefined,
        refresh_token: formData.get("refresh_token") as string || undefined,
      };
    } else {
      const apiKey = formData.get("api_key") as string;
      if (!apiKey) {
        setTestResult({ success: false, message: "API key is required" });
        setTestingConnection(false);
        return;
      }
      config = {
        api_key: apiKey,
        api_secret: formData.get("api_secret") as string || undefined,
      };
    }

    testConnectionMutation.mutate({
      service: selectedWidget?.type || "",
      service_type: serviceType,
      config,
    });
  };

  const handleSaveIntegration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!testResult || !testResult.success) {
      setTestResult({ success: false, message: "Please test the connection first and ensure it succeeds" });
      return;
    }

    const formData = new FormData(e.currentTarget);
    
    let config: Record<string, unknown> = {};
    
    if (serviceType === "url") {
      const url = formData.get("url") as string;
      // For calendars, store as ical_url, for tradingview as widget_url
      if (selectedWidget?.type === "google_calendar" || selectedWidget?.type === "microsoft_calendar") {
        config = { ical_url: url, url };
      } else if (selectedWidget?.type === "home_assistant") {
        // Home Assistant needs both URL and access token
        const accessToken = formData.get("access_token") as string;
        config = { url, widget_url: url, access_token: accessToken };
      } else {
        config = { url, widget_url: url };
      }
    } else if (serviceType === "imap") {
      const host = formData.get("host") as string;
      const port = formData.get("port") as string;
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;
      const useSsl = formData.get("use_ssl") === "true" || formData.get("use_ssl") === "on";
      const useTls = formData.get("use_tls") === "true" || formData.get("use_tls") === "on";
      
      config = {
        host,
        port: parseInt(port) || 993,
        username,
        password,
        use_ssl: useSsl,
        use_tls: useTls,
        folder: formData.get("folder") as string || "INBOX",
      };
    } else if (serviceType === "oauth") {
      const clientId = formData.get("client_id") as string;
      const clientSecret = formData.get("client_secret") as string;
      const accessToken = formData.get("access_token") as string;
      
      config = {
        client_id: clientId,
        client_secret: clientSecret,
        access_token: accessToken || undefined,
        refresh_token: formData.get("refresh_token") as string || undefined,
      };
    } else {
      config = {
        api_key: formData.get("api_key") as string,
        api_secret: formData.get("api_secret") as string || undefined,
      };
    }

    createIntegrationMutation.mutate({
      service: selectedWidget?.type || "",
      service_type: serviceType,
      config,
      is_active: true,
    });
  };

  const categories = templates?.map(cat => cat.category) || [];
  const selectedCategoryData = templates?.find(cat => cat.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--card-bg)] flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[var(--border)] sticky top-0 bg-[var(--card-bg)] z-10">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              ← Back
            </Button>
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Integrations / Widgets</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Connect services to enable widgets
          </p>
        </div>
        
        <nav className="p-2">
          {/* Backgrounds Button */}
          <button
            onClick={() => {
              setShowBackgrounds(true);
              setSelectedCategory(null);
              setSelectedWidget(null);
              setShowSetupForm(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors mb-1 ${
              showBackgrounds
                ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
                : "text-[var(--foreground)] hover:bg-[var(--muted)]/50"
            }`}
          >
            <Video className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-sm font-medium">Backgrounds</span>
          </button>
          
          {categories.map((category) => {
            const Icon = categoryIcons[category] || Settings2;
            const categoryWidgets = templates?.find((c: WidgetTemplate) => c.category === category)?.widgets || [];
            const hasRequiredAuth = categoryWidgets.some((w: WidgetTemplate["widgets"][number]) => w.requires_auth || w.requires_config);
            const connectedCount = categoryWidgets.filter((w: WidgetTemplate["widgets"][number]) => 
              integrations?.some(i => i.service === w.type && i.is_active)
            ).length;
            
            return (
              <button
                key={category}
                onClick={() => {
                  handleCategorySelect(category);
                  setShowBackgrounds(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors mb-1 ${
                  selectedCategory === category
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
                    : "text-[var(--foreground)] hover:bg-[var(--muted)]/50"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium">{category}</span>
                {hasRequiredAuth && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--text-muted)]">
                    {connectedCount}/{categoryWidgets.filter((w: WidgetTemplate["widgets"][number]) => w.requires_auth || w.requires_config).length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {showBackgrounds ? (
            /* Backgrounds Section */
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
                  Background Presets
                </h2>
                <p className="text-[var(--text-muted)]">
                  Choose from preset backgrounds or search for YouTube videos to use as board backgrounds
                </p>
              </div>

              {/* Board Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                  Select Board
                </label>
                {boardsLoading ? (
                  <div className="text-sm text-[var(--text-muted)]">Loading boards...</div>
                ) : boards && boards.length > 0 ? (
                  <select
                    value={selectedBoard || ""}
                    onChange={(e) => setSelectedBoard(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full max-w-md rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                  >
                    <option value="">Select a board...</option>
                    {boards.map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-[var(--text-muted)]">No boards available. Create a board first.</div>
                )}
              </div>

              {/* Category Filter */}
              <div className="mb-6 flex gap-2 flex-wrap">
                {backgroundCategories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedBackgroundCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedBackgroundCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* YouTube Search */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SearchIcon className="h-5 w-5" />
                    Search YouTube
                  </CardTitle>
                  <CardDescription>
                    Enter a YouTube video URL or ID to use as a background
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Input
                        type="text"
                        value={youtubeSearchQuery}
                        onChange={(e) => setYoutubeSearchQuery(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=... or video ID"
                        className="w-full"
                      />
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Paste a YouTube URL or video ID
                      </p>
                    </div>
                    {youtubeSearchQuery && selectedBoard && (
                      <Button
                        onClick={async () => {
                          if (!selectedBoard) {
                            toast.error("Please select a board first");
                            return;
                          }
                          const videoId = getYouTubeVideoId(youtubeSearchQuery);
                          setApplyingBackground(`youtube-${videoId}`);
                          try {
                            await boardsApi.updateSettings(selectedBoard, {
                              background_type: "youtube",
                              background_source: videoId,
                              background_config: {
                                muted: true,
                                volume: 0,
                              },
                            });
                            toast.success("Background applied successfully!");
                            setYoutubeSearchQuery("");
                            setApplyingBackground(null);
                          } catch (error) {
                            toast.error(getErrorMessage(error));
                            setApplyingBackground(null);
                          }
                        }}
                        disabled={applyingBackground !== null}
                        className="w-full"
                      >
                        {applyingBackground ? "Applying..." : "Apply YouTube Background"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Presets Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {backgroundPresets
                  .filter((preset) => 
                    selectedBackgroundCategory === "All" || preset.category === selectedBackgroundCategory
                  )
                  .map((preset) => (
                    <Card
                      key={preset.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="relative w-full h-32 bg-[var(--muted)]">
                        <Image
                          src={getYouTubeThumbnail(getYouTubeVideoId(preset.source))}
                          alt={preset.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <h3 className="text-sm font-semibold text-white">{preset.name}</h3>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-[var(--text-muted)] mb-3">
                          {preset.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs px-2 py-1 rounded bg-[var(--muted)] text-[var(--text-muted)]">
                            {preset.category}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => handleApplyBackground(preset)}
                            disabled={!selectedBoard || applyingBackground !== null}
                          >
                            {applyingBackground === preset.id ? "Applying..." : "Apply"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ) : !selectedCategory ? (
            <div className="text-center py-16">
              <Settings2 className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
                Select a Category
              </h2>
              <p className="text-[var(--text-muted)]">
                Choose a category from the sidebar to view and configure integrations
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
                  {selectedCategory}
                </h2>
                <p className="text-[var(--text-muted)]">
                  Configure integrations for widgets in this category
                </p>
              </div>

              {/* Widgets Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                {selectedCategoryData?.widgets.map((widget: WidgetTemplate["widgets"][number]) => {
                  const integration = integrations?.find(
                    (i) => i.service === widget.type && i.is_active
                  );
                  const isConnected = !!integration;
                  const requiresSetup = widget.requires_auth || widget.requires_config;
                  
                  return (
                    <Card
                      key={widget.type}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedWidget?.type === widget.type
                          ? "border-2 border-[var(--primary)]"
                          : isConnected
                          ? "border-green-500/30 bg-green-500/5"
                          : requiresSetup
                          ? "border-orange-500/30 bg-orange-500/5"
                          : ""
                      }`}
                      onClick={() => handleWidgetSelect(widget)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl flex-shrink-0">{widget.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-[var(--foreground)] text-sm">
                                {widget.name}
                              </h3>
                              {isConnected && (
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              )}
                              {requiresSetup && !isConnected && (
                                <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-2">
                              {widget.description}
                            </p>
                            {isConnected && (
                              <span className="inline-block text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400">
                                Connected
                              </span>
                            )}
                            {requiresSetup && !isConnected && (
                              <span className="inline-block text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400">
                                Setup Required
                              </span>
                            )}
                          </div>
                          {selectedWidget?.type === widget.type && (
                            <ChevronRight className="h-4 w-4 text-[var(--primary)] flex-shrink-0" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Setup Form */}
              {showSetupForm && selectedWidget && (
                <Card className="border-2 border-[var(--primary)]/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Setup {selectedWidget.name}</CardTitle>
                        <CardDescription>
                          {selectedWidget.type === "fitbit"
                            ? "Connect your Fitbit account using OAuth 2.0. Get your Client ID and Client Secret from Fitbit Developer Portal."
                            : selectedWidget.type === "tradingview" 
                            ? "Enter your TradingView widget URL or embed code"
                            : selectedWidget.type === "google_calendar" || selectedWidget.type === "microsoft_calendar"
                            ? `Enter your ${selectedWidget.name} ICS Feed URL (public calendar feed)`
                            : selectedWidget.type === "stock"
                            ? "Enter your Alpha Vantage API key (get free key at alphavantage.co)"
                            : selectedWidget.type === "crypto"
                            ? "Enter your cryptocurrency API key (CoinGecko, CoinMarketCap, etc.)"
                            : selectedWidget.type === "slack"
                            ? "Enter your Slack Bot Token (starts with xoxb-)"
                            : selectedWidget.type === "discord"
                            ? "Enter your Discord Bot Token"
                            : selectedWidget.type === "email"
                            ? "Configure your email account using IMAP. Enter your email server settings below."
                            : `Enter your API credentials for ${selectedWidget.name}`}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowSetupForm(false);
                          setSelectedWidget(null);
                          setTestResult(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveIntegration} className="space-y-4">
                      {serviceType === "url" ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                              {selectedWidget.type === "google_calendar" || selectedWidget.type === "microsoft_calendar"
                                ? "ICS Feed URL"
                                : selectedWidget.type === "home_assistant"
                                ? "Home Assistant URL"
                                : "Widget URL"}
                            </label>
                            <Input
                              name="url"
                              type="url"
                              required
                              placeholder={
                                selectedWidget.type === "google_calendar"
                                  ? "https://calendar.google.com/calendar/ical/your-email%40gmail.com/public/basic.ics"
                                  : selectedWidget.type === "microsoft_calendar"
                                  ? "https://outlook.live.com/owa/calendar/..."
                                  : selectedWidget.type === "home_assistant"
                                  ? "https://home-assistant.example.com or http://192.168.1.100:8123"
                                  : "https://www.tradingview.com/widget/..."
                              }
                              onChange={() => setTestResult(null)}
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              {selectedWidget.type === "google_calendar"
                                ? "Get your public calendar ICS feed URL from Google Calendar settings. Make sure the calendar is set to public."
                                : selectedWidget.type === "microsoft_calendar"
                                ? "Get your calendar ICS feed URL from Microsoft Outlook/Calendar settings"
                                : selectedWidget.type === "home_assistant"
                                ? "Enter your Home Assistant instance URL (e.g., https://home-assistant.example.com or http://192.168.1.100:8123)"
                                : "Enter a TradingView widget URL or embed code URL"}
                            </p>
                          </div>
                          {selectedWidget.type === "home_assistant" && (
                            <div>
                              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                                Long-Lived Access Token
                              </label>
                              <Input
                                name="access_token"
                                type="password"
                                required
                                placeholder="Enter your Home Assistant long-lived access token"
                                onChange={() => setTestResult(null)}
                              />
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                Create a long-lived access token in Home Assistant: Profile → Long-Lived Access Tokens → Create Token
                              </p>
                            </div>
                          )}
                        </>
                      ) : serviceType === "imap" ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                              IMAP Host
                            </label>
                            <Input
                              name="host"
                              type="text"
                              required
                              placeholder="imap.gmail.com or mail.example.com"
                              onChange={() => setTestResult(null)}
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              Your email provider&apos;s IMAP server address.
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                                Port
                              </label>
                              <Input
                                name="port"
                                type="number"
                                required
                                defaultValue="993"
                                placeholder="993"
                                onChange={() => setTestResult(null)}
                              />
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                Usually 993 for SSL, 143 for TLS
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                                Folder
                              </label>
                              <Input
                                name="folder"
                                type="text"
                                defaultValue="INBOX"
                                placeholder="INBOX"
                                onChange={() => setTestResult(null)}
                              />
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                Mailbox folder (default: INBOX)
                              </p>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                              Username/Email
                            </label>
                            <Input
                              name="username"
                              type="email"
                              required
                              placeholder="your-email@example.com"
                              onChange={() => setTestResult(null)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                              Password
                            </label>
                            <Input
                              name="password"
                              type="password"
                              required
                              placeholder="Enter your email password"
                              onChange={() => setTestResult(null)}
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              For Gmail, use an App Password if 2FA is enabled.
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 mb-2">
                                <input
                                  name="use_ssl"
                                  type="checkbox"
                                  defaultChecked
                                  className="rounded border-[var(--input-border)]"
                                />
                                <span className="text-sm">Use SSL</span>
                              </label>
                              <p className="text-xs text-[var(--text-muted)]">
                                Enable for secure connection (port 993)
                              </p>
                            </div>
                            <div>
                              <label className="flex items-center gap-2 mb-2">
                                <input
                                  name="use_tls"
                                  type="checkbox"
                                  className="rounded border-[var(--input-border)]"
                                />
                                <span className="text-sm">Use TLS</span>
                              </label>
                              <p className="text-xs text-[var(--text-muted)]">
                                Enable STARTTLS (port 143)
                              </p>
                            </div>
                          </div>
                        </>
                      ) : serviceType === "oauth" ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                              Client ID
                            </label>
                            <Input
                              name="client_id"
                              type="text"
                              required
                              placeholder="Enter Client ID"
                              onChange={() => setTestResult(null)}
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              {selectedWidget.type === "fitbit"
                                ? "Get your Client ID from https://dev.fitbit.com/apps"
                                : "Get your Client ID from the service's developer portal"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                              Client Secret
                            </label>
                            <Input
                              name="client_secret"
                              type="password"
                              required
                              placeholder="Enter Client Secret"
                              onChange={() => setTestResult(null)}
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              Keep your Client Secret secure. Never share it publicly.
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                              Access Token (Optional - for testing)
                            </label>
                            <Input
                              name="access_token"
                              type="password"
                              placeholder="Enter Access Token if you have one"
                              onChange={() => setTestResult(null)}
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              If you already have an access token, enter it here to test the connection. Otherwise, complete the OAuth flow to get one.
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                              Refresh Token (Optional)
                            </label>
                            <Input
                              name="refresh_token"
                              type="password"
                              placeholder="Enter Refresh Token if you have one"
                              onChange={() => setTestResult(null)}
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              Refresh token allows automatic token renewal. Get this from the OAuth callback.
                            </p>
                          </div>
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              <strong>OAuth Flow:</strong> After entering Client ID and Secret, you&apos;ll need to complete the OAuth authorization flow. 
                              The service will redirect you to authorize the application, then return with an access token.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                              {selectedWidget.type === "slack" || selectedWidget.type === "discord"
                                ? "Bot Token"
                                : "API Key"}
                            </label>
                            <Input
                              name="api_key"
                              type={selectedWidget.type === "slack" || selectedWidget.type === "discord" ? "password" : "text"}
                              required
                              placeholder={
                                selectedWidget.type === "stock"
                                  ? "Alpha Vantage API key"
                                  : selectedWidget.type === "crypto"
                                  ? "Cryptocurrency API key"
                                  : selectedWidget.type === "slack"
                                  ? "xoxb-..."
                                  : selectedWidget.type === "discord"
                                  ? "Discord bot token"
                                  : "Enter API key"
                              }
                              onChange={() => setTestResult(null)}
                            />
                            {selectedWidget.type === "stock" && (
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                Get a free API key from <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] underline">alphavantage.co</a>
                              </p>
                            )}
                            {selectedWidget.type === "slack" && (
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                Create a bot in your Slack workspace and get the bot token (starts with xoxb-)
                              </p>
                            )}
                            {selectedWidget.type === "discord" && (
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                Create a bot in Discord Developer Portal and get the bot token
                              </p>
                            )}
                          </div>
                          {(selectedWidget.type === "crypto" || selectedWidget.type === "email") && (
                            <div>
                              <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                                API Secret (Optional)
                              </label>
                              <Input
                                name="api_secret"
                                type="password"
                                placeholder="Enter API secret if required"
                                onChange={() => setTestResult(null)}
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* Test Result Display */}
                      {testResult && (
                        <div
                          className={`p-3 rounded-lg border ${
                            testResult.success
                              ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                              : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {testResult.success ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium">{testResult.message}</span>
                          </div>
                          {(() => {
                            const calendars = testResult.details?.calendars;
                            if (calendars && Array.isArray(calendars)) {
                              return (
                                <div className="mt-2 text-xs">
                                  <p>Available calendars:</p>
                                  <ul className="list-disc list-inside ml-2">
                                    {(calendars as Array<{ summary?: string; name?: string; id?: string }>).map((cal: { summary?: string; name?: string; id?: string }, idx: number) => (
                                      <li key={idx}>{cal.summary || cal.name || cal.id || ""}</li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestConnection}
                          disabled={testingConnection || testConnectionMutation.isPending}
                          className="flex-1"
                        >
                          {testingConnection || testConnectionMutation.isPending
                            ? "Testing..."
                            : "Test Connection"}
                        </Button>
                        <Button
                          type="submit"
                          disabled={
                            createIntegrationMutation.isPending ||
                            !testResult ||
                            !testResult.success
                          }
                          className="flex-1"
                        >
                          {createIntegrationMutation.isPending ? "Adding..." : "Add Integration"}
                        </Button>
                      </div>
                      {(!testResult || !testResult.success) && (
                        <p className="text-xs text-[var(--text-muted)] text-center">
                          You must test the connection successfully before adding
                        </p>
                      )}
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* RSS Feeds Section - Only show in Media category */}
              {selectedCategory === "Media" && (
                <div className="mt-8 border-t border-[var(--border)] pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                      Custom RSS Feeds
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Add custom RSS feeds to use in your news widgets
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRssFeedForm(!showRssFeedForm);
                      setRssFeedName("");
                      setRssFeedUrl("");
                      setEditingRssFeedId(null);
                      setTestResult(null);
                    }}
                  >
                    {showRssFeedForm ? "Cancel" : "+ Add RSS Feed"}
                  </Button>
                </div>

                {/* RSS Feed Form */}
                {showRssFeedForm && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>{editingRssFeedId ? "Edit RSS Feed" : "Add Custom RSS Feed"}</CardTitle>
                      <CardDescription>
                        Enter the RSS feed URL and a name for easy identification
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!rssFeedUrl.trim()) {
                            setTestResult({ success: false, message: "RSS feed URL is required" });
                            return;
                          }

                          // Test the RSS feed first
                          setTestingConnection(true);
                          setTestResult(null);
                          
                          try {
                            const testResult = await settingsApi.testIntegration({
                              service: "rss_feed",
                              service_type: "url",
                              config: { url: rssFeedUrl, rss_url: rssFeedUrl },
                            });

                            setTestResult(testResult);
                            setTestingConnection(false);

                            if (testResult.success) {
                              if (editingRssFeedId) {
                                // Update existing integration
                                await updateIntegrationMutation.mutateAsync({
                                  id: editingRssFeedId,
                                  data: {
                                    config: { url: rssFeedUrl, rss_url: rssFeedUrl },
                                    extra_data: { name: rssFeedName || rssFeedUrl },
                                    is_active: true,
                                  },
                                });
                              } else {
                                // Create new integration
                                await createIntegrationMutation.mutateAsync({
                                  service: "rss_feed",
                                  service_type: "url",
                                  config: { url: rssFeedUrl, rss_url: rssFeedUrl },
                                  extra_data: { name: rssFeedName || rssFeedUrl },
                                  is_active: true,
                                });
                              }

                              setRssFeedName("");
                              setRssFeedUrl("");
                              setEditingRssFeedId(null);
                              setShowRssFeedForm(false);
                              setTestResult(null);
                            }
                          } catch (error) {
                            setTestResult({
                              success: false,
                              message: getErrorMessage(error),
                            });
                            setTestingConnection(false);
                          }
                        }}
                      >
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                              Feed Name (Optional)
                            </label>
                            <Input
                              value={rssFeedName}
                              onChange={(e) => setRssFeedName(e.target.value)}
                              placeholder="My Custom Feed"
                              onBlur={() => setTestResult(null)}
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              A friendly name to identify this feed
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">
                              RSS Feed URL *
                            </label>
                            <Input
                              type="url"
                              value={rssFeedUrl}
                              onChange={(e) => {
                                setRssFeedUrl(e.target.value);
                                setTestResult(null);
                              }}
                              placeholder="https://example.com/feed.xml"
                              required
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              Enter the full URL of the RSS feed
                            </p>
                          </div>

                          {testResult && (
                            <div
                              className={`p-3 rounded-lg border ${
                                testResult.success
                                  ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                                  : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {testResult.success ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <AlertCircle className="h-4 w-4" />
                                )}
                                <span className="text-sm font-medium">{testResult.message}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={async () => {
                                if (!rssFeedUrl.trim()) {
                                  setTestResult({ success: false, message: "RSS feed URL is required" });
                                  return;
                                }

                                setTestingConnection(true);
                                setTestResult(null);

                                try {
                                  const result = await settingsApi.testIntegration({
                                    service: "rss_feed",
                                    service_type: "url",
                                    config: { url: rssFeedUrl, rss_url: rssFeedUrl },
                                  });
                                  setTestResult(result);
                                } catch (error) {
                                  setTestResult({
                                    success: false,
                                    message: getErrorMessage(error),
                                  });
                                } finally {
                                  setTestingConnection(false);
                                }
                              }}
                              disabled={testingConnection || createIntegrationMutation.isPending}
                              className="flex-1"
                            >
                              {testingConnection ? "Testing..." : "Test Feed"}
                            </Button>
                            <Button
                              type="submit"
                              disabled={
                                (createIntegrationMutation.isPending || updateIntegrationMutation.isPending) ||
                                !testResult ||
                                !testResult.success ||
                                !rssFeedUrl.trim()
                              }
                              className="flex-1"
                            >
                              {(createIntegrationMutation.isPending || updateIntegrationMutation.isPending) 
                                ? (editingRssFeedId ? "Updating..." : "Adding...") 
                                : (editingRssFeedId ? "Update Feed" : "Add Feed")}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {/* RSS Feed Integrations List */}
                {integrationsLoading ? (
                  <div className="text-center text-[var(--text-muted)] py-8">Loading...</div>
                ) : integrations && integrations.filter(i => i.service === "rss_feed").length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {integrations
                      .filter(i => i.service === "rss_feed")
                      .map((integration) => (
                        <Card
                          key={integration.id}
                          className={`${
                            integration.is_active
                              ? "border-green-500/30 bg-green-500/5"
                              : "border-[var(--border)] opacity-60"
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-[var(--foreground)]">
                                    {integration.extra_data?.name || integration.config?.name || "RSS Feed"}
                                  </h3>
                                  {integration.is_active ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-[var(--text-muted)]" />
                                  )}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] break-all">
                                  {integration.config?.url || integration.config?.rss_url || "No URL"}
                                </p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                  {integration.is_active ? "Active" : "Inactive"}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRssFeedName(integration.extra_data?.name || "");
                                  setRssFeedUrl(integration.config?.url || integration.config?.rss_url || "");
                                  setEditingRssFeedId(integration.id);
                                  setShowRssFeedForm(true);
                                  setSelectedWidget(null);
                                  setTestResult(null);
                                }}
                                className="flex-1"
                              >
                                <Settings2 className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Delete RSS feed "${integration.extra_data?.name || 'this feed'}"?`)) {
                                    deleteIntegrationMutation.mutate(integration.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
                                disabled={deleteIntegrationMutation.isPending}
                              >
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-[var(--text-muted)]">
                        No custom RSS feeds added yet. Click &quot;Add RSS Feed&quot; to get started.
                      </p>
                    </CardContent>
                  </Card>
                )}
                </div>
              )}

              {/* Connected Integrations List */}
              {selectedCategoryData && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                    Connected Integrations
                  </h3>
                  {integrationsLoading ? (
                    <div className="text-center text-[var(--text-muted)] py-8">Loading...</div>
                  ) : integrations && integrations.filter(i => 
                    selectedCategoryData.widgets.some((w: WidgetTemplate["widgets"][number]) => w.type === i.service)
                  ).length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {integrations
                        .filter(i => selectedCategoryData.widgets.some((w: WidgetTemplate["widgets"][number]) => w.type === i.service))
                        .map((integration) => (
                          <Card
                            key={integration.id}
                            className={`${
                              integration.is_active
                                ? "border-green-500/30 bg-green-500/5"
                                : "border-[var(--border)] opacity-60"
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-[var(--foreground)]">
                                      {integration.service.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                    </h3>
                                    {integration.is_active ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 text-[var(--text-muted)]" />
                                    )}
                                  </div>
                                  <p className="text-xs text-[var(--text-muted)]">
                                    {integration.service_type} •{" "}
                                    {integration.is_active ? "Active" : "Inactive"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const widget = selectedCategoryData.widgets.find((w: WidgetTemplate["widgets"][number]) => w.type === integration.service);
                                    if (widget) {
                                      setSelectedWidget(widget);
                                      setShowSetupForm(true);
                                    }
                                  }}
                                  className="flex-1"
                                >
                                  <Settings2 className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Delete integration for ${integration.service}?`)) {
                                      deleteIntegrationMutation.mutate(integration.id);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                  disabled={deleteIntegrationMutation.isPending}
                                >
                                  Delete
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <AlertCircle className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                        <p className="text-[var(--text-muted)]">
                          No integrations connected yet in this category
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

