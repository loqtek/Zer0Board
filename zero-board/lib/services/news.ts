/**
 * News API service using NewsAPI (free tier)
 * https://newsapi.org/
 * 
 * Note: For production, you'll need to get a free API key from newsapi.org
 * For now, we'll use a fallback RSS feed approach
 */

import type { NewsArticle } from "@/lib/types/services/news";
export type { NewsArticle };

/**
 * Get news headlines from NewsAPI
 * Requires API key - falls back to RSS if not available
 */
export async function getNewsHeadlines(
  apiKey?: string,
  country: string = "us",
  category?: string,
  customRssUrl?: string,
  rssUrls?: string[]
): Promise<NewsArticle[]> {
  // If multiple RSS URLs are provided, fetch from all of them
  if (rssUrls && rssUrls.length > 0) {
    return getNewsFromMultipleRSS(rssUrls);
  }

  // If API key is provided, use NewsAPI
  if (apiKey) {
    try {
      const categoryParam = category ? `&category=${category}` : "";
      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?country=${country}${categoryParam}&pageSize=10`,
        {
          headers: {
            "X-API-Key": apiKey,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.articles) {
          return data.articles
            .filter((article: { title?: string }) => article.title)
            .map((article: {
              title: string;
              description?: string;
              url: string;
              urlToImage?: string;
              publishedAt?: string;
              source?: { name?: string };
            }) => ({
              title: article.title,
              description: article.description,
              url: article.url,
              source: article.source?.name,
              publishedAt: article.publishedAt,
            }));
        }
      }
    } catch (error) {
      console.error("Error fetching news from NewsAPI:", error);
    }
  }
  
  // Fallback: Use RSS feed (no API key required)
  return getNewsFromRSS(customRssUrl);
}

/**
 * Get news from a single RSS feed (no API key required)
 */
export async function getNewsFromRSS(customRssUrl?: string): Promise<NewsArticle[]> {
  try {
    // Use custom RSS URL if provided, otherwise use default BBC News feed
    const rssUrl = customRssUrl || "https://feeds.bbci.co.uk/news/rss.xml";
    
    // Using a public RSS to JSON proxy
    const response = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`
    );
    const data = await response.json();
    
    if (data.items) {
      return data.items.slice(0, 10).map((item: {
        title: string;
        description?: string;
        link: string;
        pubDate?: string;
      }) => ({
        title: item.title,
        description: item.description,
        url: item.link,
        source: data.feed?.title || "RSS Feed",
        publishedAt: item.pubDate,
      }));
    }
  } catch (error) {
    console.error("Error fetching RSS news:", error);
  }
  
  return [];
}

/**
 * Get news from multiple RSS feeds and combine results
 */
export async function getNewsFromMultipleRSS(rssUrls: string[]): Promise<NewsArticle[]> {
  try {
    // Fetch from all RSS feeds in parallel
    const fetchPromises = rssUrls.map(async (url) => {
      try {
        const response = await fetch(
          `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`
        );
        const data = await response.json();
        
        if (data.items) {
          return data.items.map((item: {
            title: string;
            description?: string;
            link: string;
            pubDate?: string;
          }) => ({
            title: item.title,
            description: item.description,
            url: item.link,
            source: data.feed?.title || "RSS Feed",
            publishedAt: item.pubDate,
          }));
        }
      } catch (error) {
        console.error(`Error fetching RSS feed ${url}:`, error);
      }
      return [];
    });

    // Wait for all feeds to load
    const results = await Promise.all(fetchPromises);
    
    // Combine all articles
    const allArticles = results.flat();
    
    // Sort by published date (newest first) and remove duplicates
    const uniqueArticles = Array.from(
      new Map(allArticles.map((article) => [article.title, article])).values()
    );
    
    // Sort by published date if available
    uniqueArticles.sort((a, b) => {
      if (!a.publishedAt || !b.publishedAt) return 0;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
    
    // Return top 50 articles (can be limited further in the widget)
    return uniqueArticles.slice(0, 50);
  } catch (error) {
    console.error("Error fetching multiple RSS feeds:", error);
    return [];
  }
}

