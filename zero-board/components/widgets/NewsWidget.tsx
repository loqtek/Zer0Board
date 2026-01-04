"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { Widget } from "@/lib/types/api";
import { WidgetWrapper } from "./WidgetWrapper";
import { getNewsHeadlines } from "@/lib/services/news";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api";
import type { NewsArticle } from "@/lib/types/services/news";
import { defaultRssFeeds } from "@/lib/data/defaultRssFeeds";

type NewsDisplayStyle = "list" | "grid" | "carousel" | "ticker";

interface NewsWidgetProps {
  widget: Widget;
  isEditMode: boolean;
  onDelete: () => void;
  onConfigure?: () => void;
  onDuplicate?: () => void;
}

export function NewsWidget({ widget, isEditMode, onDelete, onConfigure, onDuplicate }: NewsWidgetProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 200, height: 100 });
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const apiKeyRaw = widget.config?.newsApiKey;
  const apiKey = typeof apiKeyRaw === "string" ? apiKeyRaw : undefined;
  const countryRaw = widget.config?.country;
  const country = typeof countryRaw === "string" ? countryRaw : "us";
  const categoryRaw = widget.config?.category;
  const category = typeof categoryRaw === "string" ? categoryRaw : undefined;
  const useCustomHeadlines = widget.config?.useCustomHeadlines === true;
  const customHeadlinesRaw = widget.config?.headlines;
  const customHeadlines = Array.isArray(customHeadlinesRaw) ? customHeadlinesRaw : [];
  const customRssUrlRaw = widget.config?.customRssUrl;
  const customRssUrl = typeof customRssUrlRaw === "string" ? customRssUrlRaw : undefined;
  const rssFeedIdsRaw = widget.config?.rssFeedIds;
  const rssFeedIds = Array.isArray(rssFeedIdsRaw) ? rssFeedIdsRaw : [];
  const displayStyleRaw = widget.config?.displayStyle;
  const displayStyle: NewsDisplayStyle = (typeof displayStyleRaw === "string" && ["list", "grid", "carousel", "ticker"].includes(displayStyleRaw) ? displayStyleRaw : "list") as NewsDisplayStyle;
  const showTitle = widget.config?.showTitle !== false;
  const showSource = widget.config?.showSource !== false;
  const showDescription = widget.config?.showDescription !== false;
  const descriptionLengthRaw = widget.config?.descriptionLength;
  const descriptionLength = typeof descriptionLengthRaw === "number" ? descriptionLengthRaw : 150;
  
  // Text styling config
  const fontSizeRaw = widget.config?.fontSize;
  const fontWeightRaw = widget.config?.fontWeight;
  const lineHeightRaw = widget.config?.lineHeight;
  const letterSpacingRaw = widget.config?.letterSpacing;
  const textColorRaw = widget.config?.textColor;
  const textAlignRaw = widget.config?.textAlign;
  const textTransformRaw = widget.config?.textTransform;
  
  const textStyle = {
    fontSize: typeof fontSizeRaw === "number" || typeof fontSizeRaw === "string" ? `${fontSizeRaw}px` : undefined,
    fontWeight: typeof fontWeightRaw === "string" ? fontWeightRaw : undefined,
    lineHeight: typeof lineHeightRaw === "string" || typeof lineHeightRaw === "number" ? lineHeightRaw : undefined,
    letterSpacing: typeof letterSpacingRaw === "number" || typeof letterSpacingRaw === "string" ? `${letterSpacingRaw}px` : undefined,
    color: typeof textColorRaw === "string" ? textColorRaw : undefined,
    textAlign: typeof textAlignRaw === "string" ? textAlignRaw : undefined,
    textTransform: typeof textTransformRaw === "string" ? textTransformRaw : undefined,
  };
  
  // Fetch RSS feed URLs from integrations if feed IDs are configured
  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => settingsApi.listIntegrations(),
    enabled: rssFeedIds.length > 0,
  });

  // Get RSS feed URLs from integrations and default feeds
  const rssUrls = useMemo(() => {
    if (rssFeedIds.length === 0) return [];
    
    const urls: string[] = [];
    
    // Get URLs from integrations (custom feeds)
    if (integrations) {
      const integrationUrls = integrations
        .filter((integration) => 
          integration.service === "rss_feed" && 
          integration.is_active &&
          rssFeedIds.includes(integration.id.toString())
        )
        .map((integration) => integration.config?.url || integration.config?.rss_url)
        .filter((url): url is string => !!url);
      urls.push(...integrationUrls);
    }
    
    // Get URLs from default feeds
    const defaultFeedUrls = defaultRssFeeds
      .filter((feed) => rssFeedIds.includes(feed.id))
      .map((feed) => feed.url);
    urls.push(...defaultFeedUrls);
    
    return urls;
  }, [integrations, rssFeedIds]);

  // Create stable string representation of customHeadlines to prevent infinite loops
  const customHeadlinesStrRef = useRef<string>("");
  const currentCustomHeadlinesStr = JSON.stringify(customHeadlines);
  if (currentCustomHeadlinesStr !== customHeadlinesStrRef.current) {
    customHeadlinesStrRef.current = currentCustomHeadlinesStr;
  }
  const customHeadlinesStr = customHeadlinesStrRef.current;

  // Use ref to track previous dependencies
  const prevDepsRef = useRef<string>("");

  useEffect(() => {
    if (!containerRef) return;
    
    const updateSize = () => {
      if (containerRef) {
        setContainerSize({
          width: containerRef.offsetWidth,
          height: containerRef.offsetHeight,
        });
      }
    };
    
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  // Reset carousel index when articles change
  useEffect(() => {
    if (displayStyle === "carousel" && articles.length > 0) {
      const limitedCount = Math.min(articles.length, 10);
      if (carouselIndex >= limitedCount) {
        setCarouselIndex(0);
      }
    }
  }, [displayStyle, articles.length, carouselIndex]);

  // Carousel auto-rotate effect
  useEffect(() => {
    if (displayStyle !== "carousel" || articles.length === 0) return;
    
    const interval = setInterval(() => {
      setCarouselIndex((prev) => {
        const count = Math.min(articles.length, 10);
        return count > 0 ? (prev + 1) % count : 0;
      });
    }, 5000); // Rotate every 5 seconds
    
    return () => clearInterval(interval);
  }, [displayStyle, articles.length]);

  useEffect(() => {
    // Create a stable dependency string
    const rssUrlsStr = JSON.stringify(rssUrls);
    const currentDepsStr = `${apiKey}|${country}|${category}|${useCustomHeadlines}|${customHeadlinesStr}|${customRssUrl}|${rssUrlsStr}`;
    
    // Check if dependencies actually changed
    if (currentDepsStr === prevDepsRef.current) {
      // Dependencies haven't changed, skip fetch
      return;
    }
    
    // Update the ref with current dependencies
    prevDepsRef.current = currentDepsStr;
    
    const fetchNews = async () => {
      if (useCustomHeadlines) {
        setArticles(customHeadlines.map((h: string) => ({ title: h })));
        return;
      }

      setIsLoading(true);
      try {
        // If RSS feed IDs are configured, use those URLs
        const headlines = await getNewsHeadlines(
          apiKey, 
          country, 
          category, 
          customRssUrl,
          rssUrls.length > 0 ? rssUrls : undefined
        );
        setArticles(headlines);
      } catch (error) {
        console.error("Error fetching news:", error);
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
    
    // Refresh every 30 minutes
    const interval = setInterval(fetchNews, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apiKey, country, category, useCustomHeadlines, customHeadlinesStr, customHeadlines, customRssUrl, rssUrls]);

  const fontSize = useMemo(() => {
    // Use custom fontSize if provided, otherwise calculate based on container
    if (widget.config?.fontSize) {
      return widget.config.fontSize;
    }
    const baseSize = Math.min(containerSize.width / 20, containerSize.height / 8);
    return Math.max(10, Math.min(baseSize, 16));
  }, [containerSize, widget.config?.fontSize]);

  const displayArticles: NewsArticle[] = articles.length > 0 ? articles : customHeadlines.map((h: string) => ({ title: h, url: undefined, description: undefined, source: undefined, publishedAt: undefined }));
  const limitedArticles = displayArticles.slice(0, displayStyle === "grid" ? 6 : displayStyle === "carousel" ? 10 : 20);

  const renderListStyle = () => (
    <ul 
      className="flex-1 space-y-2 overflow-y-auto"
      style={{ textAlign: (textStyle.textAlign || "left") as "left" | "center" | "right" | "justify" }}
    >
      {limitedArticles.map((article: NewsArticle, index: number) => (
        <li
          key={index}
          className="border-l-2 border-[var(--accent)] pl-2 text-[var(--foreground)]"
          style={{ 
            fontSize: textStyle.fontSize || `${fontSize}px`,
            fontWeight: textStyle.fontWeight || "normal",
            lineHeight: textStyle.lineHeight,
            letterSpacing: textStyle.letterSpacing,
            color: textStyle.color || undefined,
            textTransform: textStyle.textTransform,
          }}
        >
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {article.title}
            </a>
          ) : (
            article.title
          )}
          {showSource && article.source && (
            <div 
              className="text-xs opacity-60 mt-1"
              style={{ 
                fontSize: textStyle.fontSize ? `${parseInt(textStyle.fontSize.replace("px", "")) * 0.75}px` : undefined,
              }}
            >
              {article.source}
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const renderGridStyle = () => (
    <div 
      className="flex-1 overflow-y-auto grid grid-cols-2 gap-2"
      style={{ textAlign: (textStyle.textAlign || "left") as "left" | "center" | "right" | "justify" }}
    >
      {limitedArticles.map((article: NewsArticle, index: number) => (
        <div
          key={index}
          className="border border-[var(--input-border)] rounded p-2 hover:bg-[var(--input-bg)] transition-colors"
          style={{ 
            fontSize: textStyle.fontSize ? `${parseInt(textStyle.fontSize.replace("px", "")) * 0.85}px` : `${(typeof fontSize === "number" ? fontSize : 14) * 0.85}px`,
            fontWeight: textStyle.fontWeight || "normal",
            lineHeight: textStyle.lineHeight,
            letterSpacing: textStyle.letterSpacing,
            color: textStyle.color || undefined,
            textTransform: textStyle.textTransform,
          }}
        >
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline block"
            >
              {article.title}
            </a>
          ) : (
            <div>{article.title}</div>
          )}
          {showSource && article.source && (
            <div 
              className="text-xs opacity-60 mt-1"
              style={{ 
                fontSize: textStyle.fontSize ? `${parseInt(textStyle.fontSize.replace("px", "")) * 0.64}px` : undefined,
              }}
            >
              {article.source}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderCarouselStyle = () => {
    if (limitedArticles.length === 0) return null;
    
    // Ensure carouselIndex is within bounds
    const safeIndex = Math.min(carouselIndex, limitedArticles.length - 1);
    const currentArticle = limitedArticles[safeIndex];
    
    if (!currentArticle) return null;
    
    return (
      <div 
        className="flex-1 flex flex-col items-center justify-center relative"
        style={{ textAlign: (textStyle.textAlign || "center") as "left" | "center" | "right" | "justify" }}
      >
        <div className="px-4">
          {currentArticle.url ? (
            <a
              href={currentArticle.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline block"
              style={{ 
                fontSize: textStyle.fontSize ? `${parseInt(textStyle.fontSize.replace("px", "")) * 1.2}px` : `${(typeof fontSize === "number" ? fontSize : 14) * 1.2}px`,
                fontWeight: textStyle.fontWeight || "normal",
                lineHeight: textStyle.lineHeight,
                letterSpacing: textStyle.letterSpacing,
                color: textStyle.color || undefined,
                textTransform: textStyle.textTransform,
              }}
            >
              {currentArticle.title}
            </a>
          ) : (
            <div 
              style={{ 
                fontSize: textStyle.fontSize ? `${parseInt(textStyle.fontSize.replace("px", "")) * 1.2}px` : `${(typeof fontSize === "number" ? fontSize : 14) * 1.2}px`,
                fontWeight: textStyle.fontWeight || "normal",
                lineHeight: textStyle.lineHeight,
                letterSpacing: textStyle.letterSpacing,
                color: textStyle.color || undefined,
                textTransform: textStyle.textTransform,
              }}
            >
              {currentArticle.title}
            </div>
          )}
          {showDescription && currentArticle.description && (
            <p 
              className="text-xs opacity-70 mt-2" 
              style={{ 
                fontSize: textStyle.fontSize ? `${parseInt(textStyle.fontSize.replace("px", "")) * 0.9}px` : `${(typeof fontSize === "number" ? fontSize : 14) * 0.9}px`,
                fontWeight: textStyle.fontWeight || "normal",
                lineHeight: textStyle.lineHeight,
                letterSpacing: textStyle.letterSpacing,
                color: textStyle.color || undefined,
                textTransform: textStyle.textTransform,
              }}
            >
              {descriptionLength > 0 
                ? currentArticle.description.substring(0, descriptionLength) + (currentArticle.description.length > descriptionLength ? "..." : "")
                : currentArticle.description
              }
            </p>
          )}
          {showSource && currentArticle.source && (
            <div 
              className="text-xs opacity-60 mt-2"
              style={{ 
                fontSize: textStyle.fontSize ? `${parseInt(textStyle.fontSize.replace("px", "")) * 0.75}px` : undefined,
              }}
            >
              {currentArticle.source}
            </div>
          )}
        </div>
        {limitedArticles.length > 1 && (
          <div className="flex gap-1 mt-4">
            {limitedArticles.map((_article: NewsArticle, idx: number) => (
              <button
                key={idx}
                onClick={() => setCarouselIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === safeIndex
                    ? "bg-[var(--accent)]"
                    : "bg-[var(--input-border)] opacity-50"
                }`}
                aria-label={`Go to article ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTickerStyle = () => (
    <div className="flex-1 overflow-hidden relative">
      <style>{`
        @keyframes news-ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .news-ticker-animate {
          animation: news-ticker-scroll 30s linear infinite;
        }
      `}</style>
      <div className="absolute inset-0 flex items-center">
        <div className="news-ticker-animate whitespace-nowrap">
          {limitedArticles.map((article: NewsArticle, index: number) => (
            <span 
              key={index} 
              className="inline-block mr-8" 
              style={{ 
                fontSize: textStyle.fontSize || `${fontSize}px`,
                fontWeight: textStyle.fontWeight || "normal",
                lineHeight: textStyle.lineHeight,
                letterSpacing: textStyle.letterSpacing,
                color: textStyle.color || undefined,
                textTransform: textStyle.textTransform,
              }}
            >
              {article.url ? (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {article.title}
                </a>
              ) : (
                article.title
              )}
              {index < limitedArticles.length - 1 && " • "}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (displayStyle) {
      case "grid":
        return renderGridStyle();
      case "carousel":
        return renderCarouselStyle();
      case "ticker":
        return renderTickerStyle();
      case "list":
      default:
        return renderListStyle();
    }
  };

  return (
    <WidgetWrapper widget={widget} isEditMode={isEditMode} onDelete={onDelete} onConfigure={onConfigure}>
      <div
        ref={setContainerRef}
        className="flex h-full w-full flex-col text-[var(--foreground)]"
        style={{ 
          color: textStyle.color || "var(--foreground)",
          textAlign: (textStyle.textAlign || "left") as "left" | "center" | "right" | "justify",
        }}
      >
        {showTitle && (
          <h3
            className="mb-3 font-semibold uppercase tracking-wide opacity-60"
            style={{ 
              fontSize: textStyle.fontSize ? `${parseInt(textStyle.fontSize.replace("px", "")) * 0.9}px` : `${(typeof fontSize === "number" ? fontSize : 14) * 0.9}px`,
              fontWeight: textStyle.fontWeight || "600",
              lineHeight: textStyle.lineHeight,
              letterSpacing: textStyle.letterSpacing,
              textTransform: textStyle.textTransform || "uppercase",
            }}
          >
            News Headlines
          </h3>
        )}
        {isLoading && articles.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xs opacity-50">Loading news...</div>
          </div>
        ) : (
          renderContent()
        )}
        {displayArticles.length === 0 && !isLoading && (
          <p className="text-xs opacity-40">No headlines available</p>
        )}
        {!useCustomHeadlines && (
          <div className="mt-2 text-[8px] opacity-30">
            via {apiKey ? "NewsAPI" : rssUrls.length > 0 ? `${rssUrls.length} RSS Feed${rssUrls.length > 1 ? "s" : ""}` : "RSS Feed"}
          </div>
        )}
      </div>
    </WidgetWrapper>
  );
}
