"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Widget, widgetsApi, settingsApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { searchLocations, type LocationSuggestion } from "@/lib/services/weather";
import { defaultRssFeeds, regions, categories, filterFeeds, type RssFeed } from "@/lib/data/defaultRssFeeds";

interface WidgetConfigDialogProps {
  widget: Widget;
  onClose: () => void;
}

export function WidgetConfigDialog({ widget, onClose }: WidgetConfigDialogProps) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState(widget.config || {});
  const [activeTab, setActiveTab] = useState<string>("appearance");

  const updateMutation = useMutation({
    mutationFn: (newConfig: Record<string, unknown>) =>
      widgetsApi.update(widget.board_id, widget.id, {
        config: newConfig,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", widget.board_id] });
      toast.success("Widget configuration updated successfully");
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleSave = () => {
    updateMutation.mutate(config);
  };

  const renderConfigForm = () => {
    switch (widget.type) {
      case "clock":
        return (
          <ClockConfigForm config={config} setConfig={setConfig} />
        );
      case "weather":
        return (
          <WeatherConfigForm config={config} setConfig={setConfig} />
        );
      case "news":
        return (
          <NewsConfigForm config={config} setConfig={setConfig} />
        );
      case "calendar":
      case "google_calendar":
      case "microsoft_calendar":
        return (
          <CalendarConfigForm widget={widget} config={config} setConfig={setConfig} />
        );
      case "note":
        return (
          <NoteConfigForm config={config} setConfig={setConfig} />
        );
      case "todo":
        return (
          <TodoConfigForm config={config} setConfig={setConfig} />
        );
      case "bookmark":
        return (
          <BookmarkConfigForm config={config} setConfig={setConfig} />
        );
      case "qr_code":
        return (
          <QRCodeConfigForm config={config} setConfig={setConfig} />
        );
      case "graph":
      case "metric":
        return (
          <GraphConfigForm widget={widget} config={config} setConfig={setConfig} />
        );
      case "fitbit":
        return (
          <FitbitConfigForm config={config} setConfig={setConfig} />
        );
      case "email":
        return (
          <EmailConfigForm widget={widget} config={config} setConfig={setConfig} />
        );
      case "home_assistant":
        return (
          <HomeAssistantConfigForm widget={widget} config={config} setConfig={setConfig} />
        );
      case "stock":
      case "crypto":
        return (
          <StockMarketConfigForm widget={widget} config={config} setConfig={setConfig} />
        );
      case "tradingview":
        return (
          <TradingViewConfigForm widget={widget} config={config} setConfig={setConfig} />
        );
      default:
        return (
          <div className="text-sm text-[var(--text-muted)]">
            No configuration options available for this widget type.
          </div>
        );
    }
  };

  // Determine available tabs based on widget type
  const getTabs = () => {
    const tabs = [
      { id: "appearance", label: "Appearance" },
      { id: "settings", label: "Settings" },
    ];

    // Add custom tabs for specific widgets
    if (widget.type === "news") {
      tabs.push({ id: "rss-feeds", label: "RSS Feeds" });
      tabs.push({ id: "display", label: "Display Options" });
    }

    return tabs;
  };

  const tabs = getTabs();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle>Configure Widget</CardTitle>
          <CardDescription>
            Customize {widget.type} widget settings
          </CardDescription>
        </CardHeader>

        {/* Tabs Navigation */}
        <div className="border-b border-[var(--border)] px-6">
          <div className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-[var(--primary)] text-[var(--primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)] hover:border-[var(--border)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="flex-1 overflow-y-auto">
          {/* Appearance Tab */}
          {activeTab === "appearance" && (
            <div className="space-y-6 pt-4">
              {/* Theme Type Selector */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Theme</h3>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Theme Type
                  </label>
                  <select
                    value={config.themeType || "default"}
                    onChange={(e) => setConfig({ ...config, themeType: e.target.value })}
                    className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                  >
                    <option value="default">Default</option>
                    <option value="glass">Glass (Frosted)</option>
                    <option value="clear">Clear (Transparent)</option>
                  </select>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {config.themeType === "glass" && "Semi-transparent with blur effect"}
                    {config.themeType === "clear" && "Transparent with slight blur for readability"}
                    {(!config.themeType || config.themeType === "default") && "Standard solid background"}
                  </p>
                </div>
              </div>

              {/* Custom CSS */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Custom CSS</h3>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Custom CSS (Advanced)
                  </label>
                  <textarea
                    value={config.customCSS || ""}
                    onChange={(e) => setConfig({ ...config, customCSS: e.target.value })}
                    placeholder="background-color: rgba(255, 0, 0, 0.1); border-radius: 12px;"
                    className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)] font-mono text-sm min-h-[100px]"
                    rows={4}
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Add custom CSS properties (e.g., background-color, border-radius, padding). Use standard CSS syntax.
                  </p>
                </div>
              </div>

              {/* Text Styling Section */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Text Styling</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Font Size */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Font Size (px)
                    </label>
                    <input
                      type="number"
                      value={config.fontSize || ""}
                      onChange={(e) => setConfig({ ...config, fontSize: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Auto"
                      min="8"
                      max="200"
                      className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                    />
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Leave empty for auto-sizing based on widget size
                    </p>
                  </div>

                  {/* Font Weight */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Font Weight
                    </label>
                    <select
                      value={config.fontWeight || "normal"}
                      onChange={(e) => setConfig({ ...config, fontWeight: e.target.value })}
                      className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                    >
                      <option value="normal">Normal (400)</option>
                      <option value="300">Light (300)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semi-Bold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">Extra Bold (800)</option>
                    </select>
                  </div>

                  {/* Line Height */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Line Height
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.lineHeight || ""}
                      onChange={(e) => setConfig({ ...config, lineHeight: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Auto"
                      min="0.5"
                      max="3"
                      className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                    />
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Multiplier (e.g., 1.5 = 1.5x font size)
                    </p>
                  </div>

                  {/* Letter Spacing */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Letter Spacing (px)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.letterSpacing || ""}
                      onChange={(e) => setConfig({ ...config, letterSpacing: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Normal"
                      min="-2"
                      max="10"
                      className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  {/* Text Color */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Text Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.textColor || "#ffffff"}
                        onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                        className="w-12 h-10 rounded border border-[var(--input-border)] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.textColor || ""}
                        onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                        placeholder="var(--foreground)"
                        className="flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                      />
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Use hex color, CSS variable, or leave empty for default
                    </p>
                  </div>

                  {/* Text Alignment */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Text Alignment
                    </label>
                    <select
                      value={config.textAlign || "left"}
                      onChange={(e) => setConfig({ ...config, textAlign: e.target.value })}
                      className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                      <option value="justify">Justify</option>
                    </select>
                  </div>
                </div>

                {/* Text Transform */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Text Transform
                  </label>
                  <select
                    value={config.textTransform || "none"}
                    onChange={(e) => setConfig({ ...config, textTransform: e.target.value })}
                    className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
                  >
                    <option value="none">None</option>
                    <option value="uppercase">Uppercase</option>
                    <option value="lowercase">Lowercase</option>
                    <option value="capitalize">Capitalize</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="pt-4">
              {renderConfigForm()}
            </div>
          )}

          {/* RSS Feeds Tab (News widget only) */}
          {activeTab === "rss-feeds" && widget.type === "news" && (
            <div className="pt-4">
              <NewsRssFeedsTab config={config} setConfig={setConfig} />
            </div>
          )}

          {/* Display Options Tab (News widget only) */}
          {activeTab === "display" && widget.type === "news" && (
            <div className="pt-4">
              <NewsDisplayOptionsTab config={config} setConfig={setConfig} />
            </div>
          )}
        </CardContent>
        <div className="p-6 border-t border-[var(--border)] flex gap-2">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex-1"
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Clock Configuration Form
function ClockConfigForm({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Display Format</label>
        <select
          value={config.format || "digital"}
          onChange={(e) => setConfig({ ...config, format: e.target.value })}
          className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
        >
          <option value="digital">Digital</option>
          <option value="analog">Analog</option>
        </select>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Choose between digital or analog clock display
        </p>
      </div>

      {/* Show/Hide Time */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.showTime !== false}
            onChange={(e) => setConfig({ ...config, showTime: e.target.checked })}
            className="rounded border-[var(--input-border)]"
          />
          <span className="text-sm font-medium">Show Time</span>
        </label>
        <p className="text-xs text-[var(--text-muted)] mt-1 ml-6">
          Display the current time
        </p>
      </div>

      {/* Show/Hide Date */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.showDate !== false}
            onChange={(e) => setConfig({ ...config, showDate: e.target.checked })}
            className="rounded border-[var(--input-border)]"
          />
          <span className="text-sm font-medium">Show Date</span>
        </label>
        <p className="text-xs text-[var(--text-muted)] mt-1 ml-6">
          Display the current date
        </p>
      </div>

      {/* Time Format - only show if showTime is enabled */}
      {config.showTime !== false && (
        <div>
          <label className="block text-sm font-medium mb-2">Time Format</label>
          <select
            value={config.hourFormat || "24"}
            onChange={(e) => setConfig({ ...config, hourFormat: e.target.value })}
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
          >
            <option value="24">24 Hour (e.g., 14:30)</option>
            <option value="12">12 Hour (e.g., 2:30 PM)</option>
          </select>
        </div>
      )}

      {/* Show Seconds - only show if showTime is enabled */}
      {config.showTime !== false && (
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.showSeconds === true}
              onChange={(e) => setConfig({ ...config, showSeconds: e.target.checked })}
              className="rounded border-[var(--input-border)]"
            />
            <span className="text-sm font-medium">Show Seconds</span>
          </label>
          <p className="text-xs text-[var(--text-muted)] mt-1 ml-6">
            Display seconds in the time (clock will update every second)
          </p>
        </div>
      )}

      {/* Date Format - only show if showDate is enabled */}
      {config.showDate !== false && (
        <div>
          <label className="block text-sm font-medium mb-2">Date Format</label>
          <select
            value={config.dateFormat || "long"}
            onChange={(e) => setConfig({ ...config, dateFormat: e.target.value })}
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
          >
            <option value="short">Short (e.g., 12/31/2024)</option>
            <option value="medium">Medium (e.g., Dec 31, 2024)</option>
            <option value="long">Long (e.g., Tuesday, December 31, 2024)</option>
            <option value="date-only">Date Only (e.g., December 31, 2024)</option>
            <option value="weekday">Weekday Only (e.g., Tuesday)</option>
          </select>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Choose how the date is displayed
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Timezone</label>
        <Input
          type="text"
          value={config.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
          onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
          placeholder="America/New_York"
        />
        <p className="text-xs text-[var(--text-muted)] mt-1">
          IANA timezone (e.g., America/New_York, Europe/London). Leave as default for local timezone.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Font Size</label>
        <select
          value={config.fontSize || "auto"}
          onChange={(e) => setConfig({ ...config, fontSize: e.target.value })}
          className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
        >
          <option value="auto">Auto (Responsive)</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Adjust the size of the clock text
        </p>
      </div>
    </div>
  );
}

// Weather Configuration Form
function WeatherConfigForm({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Location Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Location</label>
        <Autocomplete
          value={config.location || ""}
          onChange={(value) => setConfig({ ...config, location: value })}
          onSelect={(location: LocationSuggestion) => {
            setConfig({
              ...config,
              location: `${location.name}${location.admin1 ? `, ${location.admin1}` : ""}, ${location.country}`,
              latitude: location.latitude,
              longitude: location.longitude,
            });
          }}
          fetchSuggestions={searchLocations}
          getDisplayValue={(item: LocationSuggestion) => 
            `${item.name}${item.admin1 ? `, ${item.admin1}` : ""}, ${item.country}`
          }
          placeholder="Search for a city..."
        />
        {config.latitude && config.longitude && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            ✓ Location configured (Lat: {config.latitude.toFixed(2)}, Lon: {config.longitude.toFixed(2)})
          </p>
        )}
      </div>

      {/* Unit Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Temperature Unit</label>
        <select
          value={config.unit || "fahrenheit"}
          onChange={(e) => setConfig({ ...config, unit: e.target.value })}
          className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
        >
          <option value="fahrenheit">Fahrenheit (°F)</option>
          <option value="celsius">Celsius (°C)</option>
        </select>
      </div>

      {/* Show/Hide Options */}
      <div className="space-y-2 border-t border-[var(--border)] pt-4">
        <h4 className="text-sm font-semibold text-[var(--foreground)]">Display Options</h4>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.showTemperature !== false}
            onChange={(e) => setConfig({ ...config, showTemperature: e.target.checked })}
            className="rounded border-[var(--input-border)]"
          />
          <span className="text-sm">Show Temperature</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.showCondition !== false}
            onChange={(e) => setConfig({ ...config, showCondition: e.target.checked })}
            className="rounded border-[var(--input-border)]"
          />
          <span className="text-sm">Show Condition</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.showLocation !== false}
            onChange={(e) => setConfig({ ...config, showLocation: e.target.checked })}
            className="rounded border-[var(--input-border)]"
          />
          <span className="text-sm">Show Location</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.showDetails !== false}
            onChange={(e) => setConfig({ ...config, showDetails: e.target.checked })}
            className="rounded border-[var(--input-border)]"
          />
          <span className="text-sm">Show Details (Humidity, Wind)</span>
        </label>
      </div>
    </div>
  );
}

// News Configuration Form (Basic Settings)
function NewsConfigForm({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  const [useCustomHeadlines, setUseCustomHeadlines] = useState(
    config.useCustomHeadlines === true
  );
  const [headlines, setHeadlines] = useState<string[]>(
    config.headlines || []
  );

  const headlinesStr = JSON.stringify(headlines);

  useEffect(() => {
    setConfig((prevConfig: Record<string, unknown>) => ({ 
      ...prevConfig, 
      headlines, 
      useCustomHeadlines,
    }));
  }, [headlinesStr, useCustomHeadlines, setConfig]);

  const addHeadline = () => {
    setHeadlines([...headlines, ""]);
  };

  const updateHeadline = (index: number, value: string) => {
    const newHeadlines = [...headlines];
    newHeadlines[index] = value;
    setHeadlines(newHeadlines);
  };

  const removeHeadline = (index: number) => {
    setHeadlines(headlines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Configure basic news widget settings. Use the RSS Feeds and Display Options tabs for more configuration.
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Display Style</label>
          <select
            value={config.displayStyle || "list"}
            onChange={(e) => setConfig({ ...config, displayStyle: e.target.value })}
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
          >
            <option value="list">List</option>
            <option value="grid">Grid</option>
            <option value="carousel">Carousel</option>
            <option value="ticker">Ticker</option>
          </select>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Choose how news articles are displayed
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={useCustomHeadlines}
              onChange={(e) => setUseCustomHeadlines(e.target.checked)}
              className="rounded border-[var(--input-border)]"
            />
            <span className="text-sm">Use Custom Headlines (instead of API/RSS)</span>
          </label>
        </div>

        {useCustomHeadlines ? (
          <div>
            <label className="block text-sm font-medium mb-2">Custom Headlines</label>
            <div className="space-y-2">
              {headlines.map((headline, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="text"
                    value={headline}
                    onChange={(e) => updateHeadline(index, e.target.value)}
                    placeholder={`Headline ${index + 1}`}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeHeadline(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addHeadline}>
                + Add Headline
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">
                NewsAPI Key (Optional)
              </label>
              <Input
                type="password"
                value={config.newsApiKey || ""}
                onChange={(e) => setConfig({ ...config, newsApiKey: e.target.value })}
                placeholder="Enter NewsAPI key (get free key at newsapi.org)"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Leave empty to use RSS feeds - no API key required
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Custom RSS Feed URL (Optional)
              </label>
              <Input
                type="url"
                value={config.customRssUrl || ""}
                onChange={(e) => setConfig({ ...config, customRssUrl: e.target.value })}
                placeholder="https://example.com/feed.xml"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Enter a custom RSS feed URL. This will be used if no feeds are selected in the RSS Feeds tab.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// News RSS Feeds Tab
function NewsRssFeedsTab({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  const [selectedFeedRegion, setSelectedFeedRegion] = useState<string>("");
  const [selectedFeedCategory, setSelectedFeedCategory] = useState<string>("");
  const [selectedFeedIds, setSelectedFeedIds] = useState<string[]>(
    config.rssFeedIds || []
  );

  // Fetch integrations to get custom RSS feeds
  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => settingsApi.listIntegrations(),
  });

  // Get RSS feed integrations
  const rssIntegrations = integrations?.filter(
    (integration) => integration.service === "rss_feed" && integration.is_active
  ) || [];

  // Filter default feeds based on selected region/category
  const filteredDefaultFeeds = filterFeeds(
    defaultRssFeeds,
    selectedFeedRegion || undefined,
    selectedFeedCategory || undefined
  );

  useEffect(() => {
    setConfig((prevConfig: Record<string, unknown>) => ({ 
      ...prevConfig, 
      rssFeedIds: selectedFeedIds,
    }));
  }, [selectedFeedIds, setConfig]);

  const toggleFeedSelection = (feedId: string) => {
    setSelectedFeedIds((prev) =>
      prev.includes(feedId)
        ? prev.filter((id) => id !== feedId)
        : [...prev, feedId]
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Select RSS feeds to use for news headlines. You can choose from default feeds or custom feeds you&apos;ve added in Integrations.
        </p>

        {/* Custom RSS Feeds */}
        {rssIntegrations.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">Custom RSS Feeds</h4>
            <div className="space-y-2 border border-[var(--input-border)] rounded p-3 bg-[var(--muted)]/30">
              {rssIntegrations.map((integration) => (
                <label
                  key={integration.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-[var(--input-bg)] p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedFeedIds.includes(integration.id.toString())}
                    onChange={() => toggleFeedSelection(integration.id.toString())}
                    className="rounded border-[var(--input-border)]"
                  />
                  <span className="text-sm">
                    {integration.extra_data?.name || integration.config?.name || `Feed ${integration.id}`}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Default Feeds */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">Default RSS Feeds</h4>
          
          {/* Default Feeds Filter */}
          <div className="mb-3 flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 text-[var(--text-muted)]">
                Filter by Region
              </label>
              <select
                value={selectedFeedRegion}
                onChange={(e) => setSelectedFeedRegion(e.target.value)}
                className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-sm text-[var(--foreground)]"
              >
                <option value="">All Regions</option>
                {regions.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 text-[var(--text-muted)]">
                Filter by Category
              </label>
              <select
                value={selectedFeedCategory}
                onChange={(e) => setSelectedFeedCategory(e.target.value)}
                className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-sm text-[var(--foreground)]"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Default Feeds List */}
          <div className="max-h-64 overflow-y-auto border border-[var(--input-border)] rounded p-2">
            {filteredDefaultFeeds.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-2">
                No feeds match the selected filters
              </p>
            ) : (
              filteredDefaultFeeds.map((feed) => (
                <label
                  key={feed.id}
                  className="flex items-start gap-2 cursor-pointer hover:bg-[var(--input-bg)] p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedFeedIds.includes(feed.id)}
                    onChange={() => toggleFeedSelection(feed.id)}
                    className="rounded border-[var(--input-border)] mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{feed.name}</div>
                    {feed.description && (
                      <div className="text-xs text-[var(--text-muted)]">{feed.description}</div>
                    )}
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      {feed.region} • {feed.category}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
          {selectedFeedIds.length > 0 && (
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {selectedFeedIds.length} feed{selectedFeedIds.length > 1 ? "s" : ""} selected
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// News Display Options Tab
function NewsDisplayOptionsTab({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Configure what information is displayed in the news widget.
        </p>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.showTitle !== false}
              onChange={(e) => setConfig({ ...config, showTitle: e.target.checked })}
              className="rounded border-[var(--input-border)]"
            />
            <span className="text-sm">Show Title</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.showSource !== false}
              onChange={(e) => setConfig({ ...config, showSource: e.target.checked })}
              className="rounded border-[var(--input-border)]"
            />
            <span className="text-sm">Show Source</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.showDescription !== false}
              onChange={(e) => setConfig({ ...config, showDescription: e.target.checked })}
              className="rounded border-[var(--input-border)]"
            />
            <span className="text-sm">Show Description (Carousel only)</span>
          </label>

          {config.showDescription !== false && (
            <div className="ml-6 mt-2">
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Description Length (characters)
              </label>
              <input
                type="number"
                value={config.descriptionLength || 150}
                onChange={(e) => setConfig({ ...config, descriptionLength: e.target.value ? parseInt(e.target.value) : 150 })}
                placeholder="150"
                min="0"
                max="1000"
                className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Maximum number of characters to show. Set to 0 to show full description.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// QR Code Configuration Form
function QRCodeConfigForm({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Configure the QR code to display a link or text. The QR code will be generated automatically.
        </p>
        <div>
          <label className="block text-sm font-medium mb-2">
            Link or Text
          </label>
          <Input
            type="text"
            value={config.link || config.data || ""}
            onChange={(e) => setConfig({ ...config, link: e.target.value, data: e.target.value })}
            placeholder="https://example.com or any text"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Enter a URL or any text to encode in the QR code.
          </p>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">
            Size (pixels)
          </label>
          <Input
            type="number"
            value={config.size || 150}
            onChange={(e) => setConfig({ ...config, size: parseInt(e.target.value) || 150 })}
            placeholder="150"
            min="50"
            max="300"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            QR code size in pixels (50-300).
          </p>
        </div>
      </div>
    </div>
  );
}

// Graph/Chart Configuration Form
function GraphConfigForm({
  widget,
  config,
  setConfig,
}: {
  widget: Widget;
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  const [manualDataPoints, setManualDataPoints] = useState<number[]>(
    config.dataPoints || [65, 70, 68, 75, 80, 78, 85]
  );
  const [useManualData, setUseManualData] = useState(
    config.useManualData === true || !config.apiUrl
  );

  useEffect(() => {
    setConfig((prevConfig: Record<string, unknown>) => ({
      ...prevConfig,
      dataPoints: manualDataPoints,
      useManualData,
    }));
  }, [manualDataPoints, useManualData, setConfig]);

  const addDataPoint = () => {
    setManualDataPoints([...manualDataPoints, 0]);
  };

  const updateDataPoint = (index: number, value: number) => {
    const newPoints = [...manualDataPoints];
    newPoints[index] = value;
    setManualDataPoints(newPoints);
  };

  const removeDataPoint = (index: number) => {
    setManualDataPoints(manualDataPoints.filter((_, i) => i !== index));
  };

  const defaultChartType = widget.type === "metric" ? "metric" : "line";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Configure your graph or metric widget. Connect to an external API or use manual data points.
        </p>

        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <Input
            type="text"
            value={config.title || ""}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            placeholder="Data Graph"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Chart Type</label>
          <select
            value={config.chartType || defaultChartType}
            onChange={(e) => setConfig({ ...config, chartType: e.target.value })}
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="area">Area Chart</option>
            <option value="metric">Metric Display</option>
          </select>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={useManualData}
              onChange={(e) => setUseManualData(e.target.checked)}
              className="rounded border-[var(--input-border)]"
            />
            <span className="text-sm">Use Manual Data (instead of API)</span>
          </label>
        </div>

        {useManualData ? (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Data Points</label>
            <div className="space-y-2">
              {manualDataPoints.map((point, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="number"
                    value={point}
                    onChange={(e) => updateDataPoint(index, parseFloat(e.target.value) || 0)}
                    placeholder={`Point ${index + 1}`}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeDataPoint(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addDataPoint}>
                + Add Data Point
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">API URL</label>
              <Input
                type="url"
                value={config.apiUrl || ""}
                onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                placeholder="https://api.example.com/data"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Enter the API endpoint URL to fetch data from.
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">HTTP Method</label>
              <select
                value={config.apiMethod || "GET"}
                onChange={(e) => setConfig({ ...config, apiMethod: e.target.value })}
                className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                API Headers (Optional)
              </label>
              <textarea
                value={
                  typeof config.apiHeaders === "string"
                    ? config.apiHeaders
                    : config.apiHeaders
                    ? JSON.stringify(config.apiHeaders, null, 2)
                    : ""
                }
                onChange={(e) => setConfig({ ...config, apiHeaders: e.target.value })}
                placeholder='{"Authorization": "Bearer token"}\nor\nAuthorization: Bearer token'
                className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)] font-mono text-xs"
                rows={3}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Enter headers as JSON object or key:value pairs (one per line).
              </p>
            </div>

            {(config.apiMethod === "POST" || config.apiMethod === "PUT" || config.apiMethod === "PATCH") && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">
                  Request Body (Optional)
                </label>
                <textarea
                  value={config.apiBody || ""}
                  onChange={(e) => setConfig({ ...config, apiBody: e.target.value })}
                  placeholder='{"key": "value"}'
                  className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)] font-mono text-xs"
                  rows={3}
                />
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Data Path (Optional)
              </label>
              <Input
                type="text"
                value={config.dataPath || ""}
                onChange={(e) => setConfig({ ...config, dataPath: e.target.value })}
                placeholder="data.values or results"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                JSONPath to extract data array from API response (e.g., &quot;data.values&quot;).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">X Field Name</label>
                <Input
                  type="text"
                  value={config.xField || ""}
                  onChange={(e) => setConfig({ ...config, xField: e.target.value })}
                  placeholder="name, date, label"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Field name for X-axis labels.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Y Field Name</label>
                <Input
                  type="text"
                  value={config.yField || ""}
                  onChange={(e) => setConfig({ ...config, yField: e.target.value })}
                  placeholder="value, count, amount"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Field name for Y-axis values.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Refresh Interval (seconds)
              </label>
              <Input
                type="number"
                value={config.refreshInterval || 0}
                onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) || 0 })}
                placeholder="0 (no refresh)"
                min="0"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                How often to refresh data (0 = no automatic refresh).
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Fitbit Configuration Form
function FitbitConfigForm({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Customize how your Fitbit data is displayed in this widget.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={config.showTodayStats !== false}
                onChange={(e) => setConfig({ ...config, showTodayStats: e.target.checked })}
                className="rounded border-[var(--input-border)]"
              />
              <span className="text-sm">Show Today&apos;s Stats</span>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={config.showWeeklyStats === true}
                onChange={(e) => setConfig({ ...config, showWeeklyStats: e.target.checked })}
                className="rounded border-[var(--input-border)]"
              />
              <span className="text-sm">Show Weekly Stats</span>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={config.showHeartRate !== false}
                onChange={(e) => setConfig({ ...config, showHeartRate: e.target.checked })}
                className="rounded border-[var(--input-border)]"
              />
              <span className="text-sm">Show Heart Rate</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Distance Unit</label>
            <select
              value={config.metricUnit || "km"}
              onChange={(e) => setConfig({ ...config, metricUnit: e.target.value })}
              className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="km">Kilometers</option>
              <option value="miles">Miles</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Refresh Interval (seconds)</label>
            <Input
              type="number"
              value={config.refreshInterval || 300}
              onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) || 300 })}
              placeholder="300"
              min="60"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              How often to refresh data (minimum 60 seconds).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Email Configuration Form
function EmailConfigForm({
  widget,
  config,
  setConfig,
}: {
  widget: Widget;
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => settingsApi.listIntegrations(),
  });

  const emailIntegrations = integrations?.filter(
    (i) => i.service === "email" && i.is_active
  ) || [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Configure which email account to display and how emails are shown.
        </p>

        <div>
          <label className="block text-sm font-medium mb-2">Email Account</label>
          <select
            value={config.emailIntegrationId || ""}
            onChange={(e) => setConfig({ ...config, emailIntegrationId: parseInt(e.target.value) || undefined })}
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
          >
            <option value="">Select an email account</option>
            {emailIntegrations.map((integration) => (
              <option key={integration.id} value={integration.id}>
                {integration.config?.username || "Email"} @ {integration.config?.host || "server"}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Select which email integration to use for this widget.
          </p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Max Emails to Show</label>
          <Input
            type="number"
            value={config.maxEmails || 10}
            onChange={(e) => setConfig({ ...config, maxEmails: parseInt(e.target.value) || 10 })}
            placeholder="10"
            min="1"
            max="50"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Maximum number of emails to display (1-50).
          </p>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={config.showPreview !== false}
              onChange={(e) => setConfig({ ...config, showPreview: e.target.checked })}
              className="rounded border-[var(--input-border)]"
            />
            <span className="text-sm">Show Email Preview</span>
          </label>
        </div>

        {config.showPreview !== false && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Preview Length (characters)</label>
            <Input
              type="number"
              value={config.previewLength || 50}
              onChange={(e) => setConfig({ ...config, previewLength: parseInt(e.target.value) || 50 })}
              placeholder="50"
              min="0"
              max="200"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Maximum number of characters to show in email preview (0-200).
            </p>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Refresh Interval (seconds)</label>
          <Input
            type="number"
            value={config.refreshInterval || 300}
            onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) || 300 })}
            placeholder="300"
            min="60"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            How often to refresh emails (minimum 60 seconds).
          </p>
        </div>
      </div>
    </div>
  );
}

// Home Assistant Configuration Form
function HomeAssistantConfigForm({
  widget,
  config,
  setConfig,
}: {
  widget: Widget;
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => settingsApi.listIntegrations(),
  });

  const { data: entities, isLoading: entitiesLoading } = useQuery({
    queryKey: ["home_assistant_entities", config.homeAssistantIntegrationId],
    queryFn: async () => {
      if (!config.homeAssistantIntegrationId) return { entities: [] };
      return await settingsApi.getHomeAssistantEntities(config.homeAssistantIntegrationId);
    },
    enabled: !!config.homeAssistantIntegrationId,
  });

  const homeAssistantIntegrations = integrations?.filter(
    (i) => i.service === "home_assistant" && i.is_active
  ) || [];

  const selectedEntities = config.entityIds || [];
  const availableEntities = entities?.entities || [];

  const toggleEntity = (entityId: string) => {
    const current = selectedEntities || [];
    if (current.includes(entityId)) {
      setConfig({ ...config, entityIds: current.filter((id: string) => id !== entityId) });
    } else {
      setConfig({ ...config, entityIds: [...current, entityId] });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Configure which Home Assistant integration to use and which entities to display.
        </p>

        <div>
          <label className="block text-sm font-medium mb-2">Home Assistant Integration</label>
          <select
            value={config.homeAssistantIntegrationId || ""}
            onChange={(e) => setConfig({ ...config, homeAssistantIntegrationId: parseInt(e.target.value) || undefined, entityIds: [] })}
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
          >
            <option value="">Select a Home Assistant integration</option>
            {homeAssistantIntegrations.map((integration) => (
              <option key={integration.id} value={integration.id}>
                {integration.config?.url || "Home Assistant"}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Select which Home Assistant integration to use for this widget.
          </p>
        </div>

        {config.homeAssistantIntegrationId && (
          <>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Select Entities</label>
              {entitiesLoading ? (
                <div className="text-sm text-[var(--text-muted)]">Loading entities...</div>
              ) : availableEntities.length === 0 ? (
                <div className="text-sm text-[var(--text-muted)]">No entities found. Make sure your Home Assistant integration is configured correctly.</div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-[var(--border)] rounded p-2 space-y-1">
                  {availableEntities.map((entity: { entity_id: string; attributes?: { friendly_name?: string } }) => (
                    <label
                      key={entity.entity_id}
                      className="flex items-center gap-2 p-2 hover:bg-[var(--muted)] rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEntities.includes(entity.entity_id)}
                        onChange={() => toggleEntity(entity.entity_id)}
                        className="rounded border-[var(--input-border)]"
                      />
                      <span className="text-sm text-[var(--foreground)]">
                        {entity.friendly_name} ({entity.entity_id})
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Select which entities to display in this widget. You can select multiple entities.
              </p>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={config.showControls !== false}
                  onChange={(e) => setConfig({ ...config, showControls: e.target.checked })}
                  className="rounded border-[var(--input-border)]"
                />
                <span className="text-sm">Show Controls</span>
              </label>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Enable controls to toggle switches, lights, and other controllable entities.
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Display Mode</label>
              <select
                value={config.displayMode || "grid"}
                onChange={(e) => setConfig({ ...config, displayMode: e.target.value })}
                className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
              >
                <option value="grid">Grid (2 columns)</option>
                <option value="list">List (1 column)</option>
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Refresh Interval (seconds)</label>
              <Input
                type="number"
                value={config.refreshInterval || 30}
                onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) || 30 })}
                placeholder="30"
                min="10"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                How often to refresh entity states (minimum 10 seconds).
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Stock Market Configuration Form
function StockMarketConfigForm({
  widget,
  config,
  setConfig,
}: {
  widget: Widget;
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Configure your stock market widget using Alpha Vantage API (free tier available).
          Get your API key at{" "}
          <a
            href="https://www.alphavantage.co/support/#api-key"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--primary)] hover:underline"
          >
            alphavantage.co
          </a>
        </p>

        <div>
          <label className="block text-sm font-medium mb-2">Alpha Vantage API Key</label>
          <Input
            type="password"
            value={config.apiKey || ""}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder="Enter your Alpha Vantage API key"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Free tier: 5 calls/minute, 500 calls/day
          </p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Market Type</label>
          <select
            value={config.marketType || "stock"}
            onChange={(e) => setConfig({ ...config, marketType: e.target.value })}
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
          >
            <option value="stock">Stock</option>
            <option value="forex">Forex</option>
            <option value="crypto">Crypto</option>
          </select>
        </div>

        {config.marketType === "forex" ? (
          <>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">From Currency</label>
              <Input
                value={config.fromCurrency || "USD"}
                onChange={(e) => setConfig({ ...config, fromCurrency: e.target.value.toUpperCase() })}
                placeholder="USD"
                maxLength={3}
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">To Currency</label>
              <Input
                value={config.toCurrency || "EUR"}
                onChange={(e) => setConfig({ ...config, toCurrency: e.target.value.toUpperCase() })}
                placeholder="EUR"
                maxLength={3}
              />
            </div>
          </>
        ) : (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Symbol</label>
            <Input
              value={config.symbol || "AAPL"}
              onChange={(e) => setConfig({ ...config, symbol: e.target.value.toUpperCase() })}
              placeholder="AAPL"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Stock symbol (e.g., AAPL, MSFT, GOOGL)
            </p>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Display Template</label>
          <select
            value={config.template || "compact"}
            onChange={(e) => setConfig({ ...config, template: e.target.value })}
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
          >
            <option value="compact">Compact</option>
            <option value="minimal">Minimal</option>
            <option value="detailed">Detailed</option>
            <option value="card">Card</option>
          </select>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Choose how the data is displayed
          </p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Refresh Interval (seconds)</label>
          <Input
            type="number"
            value={config.refreshInterval || 60}
            onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) || 60 })}
            placeholder="60"
            min="30"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            How often to refresh data (minimum 30 seconds due to API limits)
          </p>
        </div>
      </div>
    </div>
  );
}

// TradingView Configuration Form
function TradingViewConfigForm({
  widget,
  config,
  setConfig,
}: {
  widget: Widget;
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Configure your TradingView widget. You can either use a custom widget URL or configure a symbol-based widget.
        </p>

        <div>
          <label className="block text-sm font-medium mb-2">Widget Type</label>
          <select
            value={config.widgetType || "symbol-overview"}
            onChange={(e) => setConfig({ ...config, widgetType: e.target.value })}
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
          >
            <option value="symbol-overview">Symbol Overview (Chart)</option>
            <option value="mini-chart">Mini Chart</option>
            <option value="ticker-tape">Ticker Tape</option>
            <option value="market-overview">Market Overview</option>
          </select>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Symbol</label>
          <Input
            value={config.symbol || "NASDAQ:AAPL"}
            onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
            placeholder="NASDAQ:AAPL"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            TradingView symbol format (e.g., NASDAQ:AAPL, NYSE:MSFT, FX:EURUSD)
          </p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Or Custom Widget URL (Optional)</label>
          <Input
            type="url"
            value={config.widgetUrl || ""}
            onChange={(e) => setConfig({ ...config, widgetUrl: e.target.value })}
            placeholder="https://www.tradingview.com/widget/..."
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            If provided, this will be used instead of the symbol-based widget
          </p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Height (pixels)</label>
          <Input
            type="number"
            value={config.height || 400}
            onChange={(e) => setConfig({ ...config, height: parseInt(e.target.value) || 400 })}
            placeholder="400"
            min="200"
            max="800"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Theme</label>
          <select
            value={config.theme || "light"}
            onChange={(e) => setConfig({ ...config, theme: e.target.value })}
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Calendar Configuration Form
function CalendarConfigForm({
  widget,
  config,
  setConfig,
}: {
  widget: Widget;
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  const [events, setEvents] = useState<Array<{ title: string; date: string }>>(
    config.events || []
  );
  
  // Auto-detect calendar type from widget type if not set
  const getDefaultCalendarType = () => {
    if (config.calendarType) return config.calendarType;
    if (widget.type === "google_calendar") return "google";
    if (widget.type === "microsoft_calendar") return "microsoft";
    return "local";
  };

  const [calendarType, setCalendarType] = useState<string>(getDefaultCalendarType());
  const [useLocalEvents, setUseLocalEvents] = useState(
    config.useLocalEvents !== false
  );
  const [showTime, setShowTime] = useState(config.showTime !== false);
  const [showLocation, setShowLocation] = useState(config.showLocation !== false);
  const [maxEvents, setMaxEvents] = useState(config.maxEvents || 5);
  const [viewMode, setViewMode] = useState(config.viewMode || "upcoming");

  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => settingsApi.listIntegrations(),
  });

  // Create stable string representation of events
  const eventsStr = JSON.stringify(events);

  useEffect(() => {
    setConfig((prevConfig: Record<string, unknown>) => ({ 
      ...prevConfig, 
      events, 
      calendarType, 
      useLocalEvents,
      showTime,
      showLocation,
      maxEvents,
      viewMode,
    }));
  }, [eventsStr, calendarType, useLocalEvents, showTime, showLocation, maxEvents, viewMode, setConfig]);

  const addEvent = () => {
    setEvents([...events, { title: "", date: new Date().toISOString().split("T")[0] }]);
  };

  const updateEvent = (index: number, field: string, value: string) => {
    const newEvents = [...events];
    newEvents[index] = { ...newEvents[index], [field]: value };
    setEvents(newEvents);
  };

  const removeEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const googleIntegration = integrations?.find(
    (i) => i.service === "google_calendar" && i.is_active
  );

  const microsoftIntegration = integrations?.find(
    (i) => i.service === "microsoft_calendar" && i.is_active
  );

  // If widget type is google_calendar or microsoft_calendar, lock the calendar type
  const isLockedCalendarType = widget.type === "google_calendar" || widget.type === "microsoft_calendar";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          {widget.type === "google_calendar" 
            ? "This widget uses your Google Calendar integration. Make sure you've connected Google Calendar in Integrations."
            : widget.type === "microsoft_calendar"
            ? "This widget uses your Microsoft Calendar integration. Make sure you've connected Microsoft Calendar in Integrations."
            : "Connect to Google Calendar, use an iCal feed URL, or add local events manually."}
        </p>
        <div>
          <label className="block text-sm font-medium mb-2">Calendar Source</label>
          <select
            value={calendarType}
            onChange={(e) => setCalendarType(e.target.value)}
            disabled={isLockedCalendarType}
            className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="local">Local Events Only</option>
            <option value="google">Google Calendar {googleIntegration ? "✓" : "(Not connected)"}</option>
            <option value="microsoft">Microsoft Calendar {microsoftIntegration ? "✓" : "(Not connected)"}</option>
            <option value="ical">iCal Feed URL</option>
          </select>
          {isLockedCalendarType && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Calendar source is automatically set based on widget type
            </p>
          )}
        </div>

        {calendarType === "ical" && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">iCal Feed URL</label>
            <Input
              type="url"
              value={config.icalUrl || ""}
              onChange={(e) => setConfig({ ...config, icalUrl: e.target.value })}
              placeholder="https://calendar.google.com/calendar/ical/..."
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Enter a public iCal feed URL (many calendars support this)
            </p>
          </div>
        )}

        {(calendarType === "google" && !googleIntegration) && (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Google Calendar not connected. Go to Integrations to connect.
            </p>
          </div>
        )}

        {(calendarType === "microsoft" && !integrations?.find(i => i.service === "microsoft_calendar" && i.is_active)) && (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Microsoft Calendar not connected. Go to Integrations to connect.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
            >
              <option value="upcoming">Upcoming Events</option>
              <option value="today">Today Only</option>
              <option value="week">This Week</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Max Events to Display</label>
            <Input
              type="number"
              min="1"
              max="20"
              value={maxEvents}
              onChange={(e) => setMaxEvents(parseInt(e.target.value) || 5)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useLocalEvents}
              onChange={(e) => setUseLocalEvents(e.target.checked)}
              className="rounded border-[var(--input-border)]"
            />
            <span className="text-sm">Also show local events</span>
          </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showTime}
                onChange={(e) => setShowTime(e.target.checked)}
                className="rounded border-[var(--input-border)]"
              />
              <span className="text-sm">Show event times</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showLocation}
                onChange={(e) => setShowLocation(e.target.checked)}
                className="rounded border-[var(--input-border)]"
              />
              <span className="text-sm">Show event locations</span>
            </label>
          </div>
        </div>

        {useLocalEvents && (
          <div>
            <label className="block text-sm font-medium mb-2">Local Events</label>
            <div className="space-y-2">
              {events.map((event, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="text"
                    value={event.title}
                    onChange={(e) => updateEvent(index, "title", e.target.value)}
                    placeholder="Event title"
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={event.date}
                    onChange={(e) => updateEvent(index, "date", e.target.value)}
                    className="w-40"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeEvent(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addEvent}>
                + Add Event
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Note Configuration Form
function NoteConfigForm({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Default Content</label>
        <textarea
          value={config.defaultContent || ""}
          onChange={(e) => setConfig({ ...config, defaultContent: e.target.value })}
          className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)] min-h-[100px]"
          placeholder="Default note content..."
        />
      </div>
    </div>
  );
}

// Todo Configuration Form
function TodoConfigForm({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Widget Title</label>
        <Input
          type="text"
          value={config.title || "Todo List"}
          onChange={(e) => setConfig({ ...config, title: e.target.value })}
          placeholder="Todo List"
        />
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.showCompleted !== false}
            onChange={(e) => setConfig({ ...config, showCompleted: e.target.checked })}
            className="rounded border-[var(--input-border)]"
          />
          <span className="text-sm">Show Completed Items</span>
        </label>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.allowDelete === true}
            onChange={(e) => setConfig({ ...config, allowDelete: e.target.checked })}
            className="rounded border-[var(--input-border)]"
          />
          <span className="text-sm">Allow Deleting Items</span>
        </label>
      </div>
    </div>
  );
}

// Bookmark Configuration Form
function BookmarkConfigForm({
  config,
  setConfig,
}: {
  config: Record<string, unknown>;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  const groups = config.groups || [];
  const defaultBorderColor = config.defaultBorderColor || "var(--border)";
  const defaultTextColor = config.defaultTextColor || "var(--foreground)";

  const addGroup = () => {
    const newGroup = {
      id: `group-${Date.now()}`,
      name: "",
      bookmarks: [],
    };
    setConfig({ ...config, groups: [...groups, newGroup] });
  };

  const updateGroup = (groupId: string, updates: Record<string, unknown>) => {
    setConfig({
      ...config,
      groups: groups.map((g: { id: string; [key: string]: unknown }) => (g.id === groupId ? { ...g, ...updates } : g)),
    });
  };

  const deleteGroup = (groupId: string) => {
    setConfig({
      ...config,
      groups: groups.filter((g: { id: string }) => g.id !== groupId),
    });
  };

  // Helper function to get favicon URL from a website URL
  const getFaviconUrl = (url: string): string => {
    if (!url) return "";
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
    } catch {
      return "";
    }
  };

  const addBookmark = (groupId: string) => {
    const newBookmark = {
      id: `bookmark-${Date.now()}`,
      name: "",
      url: "",
      icon: "",
    };
    updateGroup(groupId, {
      bookmarks: [...((groups.find((g: { id: string; bookmarks?: unknown[] }) => g.id === groupId)?.bookmarks || []) as unknown[]), newBookmark],
    });
  };

  const updateBookmark = (groupId: string, bookmarkId: string, updates: Record<string, unknown>) => {
    const group = groups.find((g: { id: string }) => g.id === groupId);
    if (!group) return;

    updateGroup(groupId, {
      bookmarks: (group.bookmarks as Array<{ id: string; [key: string]: unknown }>).map((b) =>
        b.id === bookmarkId ? { ...b, ...updates } : b
      ),
    });
  };

  const deleteBookmark = (groupId: string, bookmarkId: string) => {
    const group = groups.find((g: { id: string }) => g.id === groupId);
    if (!group) return;

    updateGroup(groupId, {
      bookmarks: (group.bookmarks as Array<{ id: string }>).filter((b) => b.id !== bookmarkId),
    });
  };

  return (
    <div className="space-y-6">
      {/* Default Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Default Border Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={defaultBorderColor.startsWith("#") ? defaultBorderColor : "#e5e7eb"}
              onChange={(e) => setConfig({ ...config, defaultBorderColor: e.target.value })}
              className="w-12 h-10 rounded border border-[var(--input-border)] cursor-pointer"
            />
            <Input
              type="text"
              value={defaultBorderColor}
              onChange={(e) => setConfig({ ...config, defaultBorderColor: e.target.value })}
              placeholder="var(--border) or #hex"
              className="flex-1"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Default Text Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={defaultTextColor.startsWith("#") ? defaultTextColor : "#ffffff"}
              onChange={(e) => setConfig({ ...config, defaultTextColor: e.target.value })}
              className="w-12 h-10 rounded border border-[var(--input-border)] cursor-pointer"
            />
            <Input
              type="text"
              value={defaultTextColor}
              onChange={(e) => setConfig({ ...config, defaultTextColor: e.target.value })}
              placeholder="var(--foreground) or #hex"
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Bookmark Groups</h4>
          <Button type="button" variant="outline" size="sm" onClick={addGroup}>
            + Add Group
          </Button>
        </div>

        {groups.map((group: { id: string; name: string; bookmarks?: unknown[] }) => (
          <div
            key={group.id}
            className="border border-[var(--border)] rounded-lg p-4 space-y-4 bg-[var(--muted)]/30"
          >
            {/* Group Header */}
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={group.name || ""}
                onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                placeholder="Group Name (e.g., Development Tools)"
                className="flex-1"
              />
              <div className="flex gap-2">
                <div className="flex gap-1">
                  <input
                    type="color"
                    value={group.borderColor?.startsWith("#") ? group.borderColor : defaultBorderColor.startsWith("#") ? defaultBorderColor : "#e5e7eb"}
                    onChange={(e) => updateGroup(group.id, { borderColor: e.target.value })}
                    className="w-8 h-8 rounded border border-[var(--input-border)] cursor-pointer"
                    title="Border Color"
                  />
                  <input
                    type="color"
                    value={group.textColor?.startsWith("#") ? group.textColor : defaultTextColor.startsWith("#") ? defaultTextColor : "#ffffff"}
                    onChange={(e) => updateGroup(group.id, { textColor: e.target.value })}
                    className="w-8 h-8 rounded border border-[var(--input-border)] cursor-pointer"
                    title="Text Color"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => deleteGroup(group.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </Button>
              </div>
            </div>

            {/* Bookmarks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">Bookmarks</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addBookmark(group.id)}
                >
                  + Add Bookmark
                </Button>
              </div>

              {(group.bookmarks as Array<{ id: string; name: string; url: string; icon?: string }> | undefined)?.map((bookmark) => (
                <div key={bookmark.id} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    value={bookmark.icon || ""}
                    onChange={(e) => updateBookmark(group.id, bookmark.id, { icon: e.target.value })}
                    placeholder="🔗 or URL to icon"
                    className="w-24"
                  />
                  <Input
                    type="text"
                    value={bookmark.name || ""}
                    onChange={(e) => updateBookmark(group.id, bookmark.id, { name: e.target.value })}
                    placeholder="Bookmark Name"
                    className="flex-1"
                  />
                  <Input
                    type="url"
                    value={bookmark.url || ""}
                    onChange={(e) => {
                      const url = e.target.value;
                      updateBookmark(group.id, bookmark.id, { url });
                      // Auto-fetch favicon if icon is empty and URL is valid
                      if (!bookmark.icon && url) {
                        const faviconUrl = getFaviconUrl(url);
                        if (faviconUrl) {
                          updateBookmark(group.id, bookmark.id, { icon: faviconUrl });
                        }
                      }
                    }}
                    placeholder="https://example.com"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const faviconUrl = getFaviconUrl(bookmark.url);
                      if (faviconUrl) {
                        updateBookmark(group.id, bookmark.id, { icon: faviconUrl });
                      }
                    }}
                    title="Auto-fetch favicon"
                    className="text-xs px-2"
                  >
                    🖼️
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => deleteBookmark(group.id, bookmark.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            No groups yet. Click &quot;Add Group&quot; to create your first bookmark group.
          </div>
        )}
      </div>
    </div>
  );
}

