/**
 * Default RSS feeds organized by region/language and category
 * Based on major feeds from awesome-rss-feeds and other popular sources
 */

import type { RssFeed } from "@/lib/types/data";
export type { RssFeed };

export const defaultRssFeeds: RssFeed[] = [
  // United States - General News
  {
    id: "bbc-us",
    name: "BBC News - US",
    url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml",
    language: "en",
    region: "us",
    category: "general",
    description: "BBC News coverage of US and Canada",
  },
  {
    id: "cnn",
    name: "CNN Top Stories",
    url: "http://rss.cnn.com/rss/edition.rss",
    language: "en",
    region: "us",
    category: "general",
    description: "CNN breaking news and top stories",
  },
  {
    id: "reuters-us",
    name: "Reuters - US",
    url: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
    language: "en",
    region: "us",
    category: "business",
    description: "Reuters US business and finance news",
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    language: "en",
    region: "us",
    category: "technology",
    description: "Latest technology news and startup information",
  },
  {
    id: "ars-technica",
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    language: "en",
    region: "us",
    category: "technology",
    description: "Technology news and analysis",
  },
  {
    id: "espn",
    name: "ESPN",
    url: "https://www.espn.com/espn/rss/news",
    language: "en",
    region: "us",
    category: "sports",
    description: "ESPN sports news and updates",
  },
  {
    id: "npr",
    name: "NPR News",
    url: "https://feeds.npr.org/1001/rss.xml",
    language: "en",
    region: "us",
    category: "general",
    description: "National Public Radio news",
  },
  {
    id: "the-verge",
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    language: "en",
    region: "us",
    category: "technology",
    description: "Technology, science, art, and culture news",
  },

  // United Kingdom
  {
    id: "bbc-uk",
    name: "BBC News - UK",
    url: "https://feeds.bbci.co.uk/news/rss.xml",
    language: "en",
    region: "gb",
    category: "general",
    description: "BBC News UK edition",
  },
  {
    id: "the-guardian",
    name: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
    language: "en",
    region: "gb",
    category: "general",
    description: "The Guardian world news",
  },
  {
    id: "reuters-uk",
    name: "Reuters - UK",
    url: "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best",
    language: "en",
    region: "gb",
    category: "general",
    description: "Reuters UK news",
  },

  // Canada
  {
    id: "cbc",
    name: "CBC News",
    url: "https://www.cbc.ca/cmlink/rss-topstories",
    language: "en",
    region: "ca",
    category: "general",
    description: "CBC News top stories",
  },
  {
    id: "globe-and-mail",
    name: "The Globe and Mail",
    url: "https://www.theglobeandmail.com/feed/",
    language: "en",
    region: "ca",
    category: "general",
    description: "The Globe and Mail news",
  },

  // Australia
  {
    id: "abc-australia",
    name: "ABC News Australia",
    url: "https://www.abc.net.au/news/feed/51120/rss.xml",
    language: "en",
    region: "au",
    category: "general",
    description: "ABC News Australia",
  },
  {
    id: "the-australian",
    name: "The Australian",
    url: "https://www.theaustralian.com.au/rss",
    language: "en",
    region: "au",
    category: "general",
    description: "The Australian news",
  },

  // Germany
  {
    id: "spiegel",
    name: "Der Spiegel",
    url: "https://www.spiegel.de/international/index.rss",
    language: "de",
    region: "de",
    category: "general",
    description: "Der Spiegel international news",
  },
  {
    id: "dw",
    name: "Deutsche Welle",
    url: "https://rss.dw.com/xml/rss-en-all",
    language: "en",
    region: "de",
    category: "general",
    description: "Deutsche Welle English news",
  },

  // France
  {
    id: "le-monde",
    name: "Le Monde",
    url: "https://www.lemonde.fr/rss/une.xml",
    language: "fr",
    region: "fr",
    category: "general",
    description: "Le Monde news",
  },
  {
    id: "france24",
    name: "France 24",
    url: "https://www.france24.com/en/rss",
    language: "en",
    region: "fr",
    category: "general",
    description: "France 24 English news",
  },

  // Spain
  {
    id: "el-pais",
    name: "El País",
    url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
    language: "es",
    region: "es",
    category: "general",
    description: "El País news",
  },

  // Italy
  {
    id: "repubblica",
    name: "La Repubblica",
    url: "https://www.repubblica.it/rss/homepage/rss2.0.xml",
    language: "it",
    region: "it",
    category: "general",
    description: "La Repubblica news",
  },

  // Japan
  {
    id: "japan-times",
    name: "The Japan Times",
    url: "https://www.japantimes.co.jp/rss/news/",
    language: "en",
    region: "jp",
    category: "general",
    description: "The Japan Times English news",
  },
  {
    id: "nhk",
    name: "NHK World",
    url: "https://www3.nhk.or.jp/nhkworld/en/news/rss.xml",
    language: "en",
    region: "jp",
    category: "general",
    description: "NHK World English news",
  },

  // China
  {
    id: "scmp",
    name: "South China Morning Post",
    url: "https://www.scmp.com/rss/2/feed",
    language: "en",
    region: "cn",
    category: "general",
    description: "South China Morning Post news",
  },

  // India
  {
    id: "times-of-india",
    name: "Times of India",
    url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
    language: "en",
    region: "in",
    category: "general",
    description: "Times of India top stories",
  },
  {
    id: "the-hindu",
    name: "The Hindu",
    url: "https://www.thehindu.com/news/feeder/default.rss",
    language: "en",
    region: "in",
    category: "general",
    description: "The Hindu news",
  },

  // Technology Category (Global)
  {
    id: "hacker-news",
    name: "Hacker News",
    url: "https://hnrss.org/frontpage",
    language: "en",
    region: "global",
    category: "technology",
    description: "Hacker News top stories",
  },
  {
    id: "wired",
    name: "Wired",
    url: "https://www.wired.com/feed/rss",
    language: "en",
    region: "global",
    category: "technology",
    description: "Wired technology and culture news",
  },
  {
    id: "engadget",
    name: "Engadget",
    url: "https://www.engadget.com/rss.xml",
    language: "en",
    region: "global",
    category: "technology",
    description: "Engadget technology news",
  },

  // Business Category (Global)
  {
    id: "bloomberg",
    name: "Bloomberg",
    url: "https://feeds.bloomberg.com/markets/news.rss",
    language: "en",
    region: "global",
    category: "business",
    description: "Bloomberg business and markets news",
  },
  {
    id: "financial-times",
    name: "Financial Times",
    url: "https://www.ft.com/?format=rss",
    language: "en",
    region: "global",
    category: "business",
    description: "Financial Times business news",
  },
  {
    id: "wsj",
    name: "Wall Street Journal",
    url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
    language: "en",
    region: "global",
    category: "business",
    description: "Wall Street Journal world news",
  },

  // Science Category
  {
    id: "science-daily",
    name: "Science Daily",
    url: "https://www.sciencedaily.com/rss/all.xml",
    language: "en",
    region: "global",
    category: "science",
    description: "Science Daily latest science news",
  },
  {
    id: "nature",
    name: "Nature",
    url: "https://www.nature.com/nature.rss",
    language: "en",
    region: "global",
    category: "science",
    description: "Nature science journal",
  },

  // Health Category
  {
    id: "webmd",
    name: "WebMD",
    url: "https://rssfeeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC",
    language: "en",
    region: "global",
    category: "health",
    description: "WebMD health news",
  },

  // Entertainment Category
  {
    id: "entertainment-weekly",
    name: "Entertainment Weekly",
    url: "https://ew.com/feed/",
    language: "en",
    region: "global",
    category: "entertainment",
    description: "Entertainment Weekly news",
  },
];

export const regions = [
  { value: "global", label: "Global" },
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "es", label: "Spain" },
  { value: "it", label: "Italy" },
  { value: "jp", label: "Japan" },
  { value: "cn", label: "China" },
  { value: "in", label: "India" },
];

export const categories = [
  { value: "general", label: "General" },
  { value: "technology", label: "Technology" },
  { value: "business", label: "Business" },
  { value: "science", label: "Science" },
  { value: "health", label: "Health" },
  { value: "sports", label: "Sports" },
  { value: "entertainment", label: "Entertainment" },
];

export function filterFeeds(
  feeds: RssFeed[],
  region?: string,
  category?: string,
  language?: string
): RssFeed[] {
  return feeds.filter((feed) => {
    if (region && feed.region !== region) return false;
    if (category && feed.category !== category) return false;
    if (language && feed.language !== language) return false;
    return true;
  });
}


