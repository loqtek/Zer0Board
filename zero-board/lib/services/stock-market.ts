/**
 * Stock Market API service using Alpha Vantage
 * Free tier: 5 API calls per minute, 500 calls per day
 * Get free API key at: https://www.alphavantage.co/support/#api-key
 */

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

export interface StockOverview {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  marketCap: string;
  peRatio: string;
  dividendYield: string;
  eps: string;
  beta: string;
  "52WeekHigh": string;
  "52WeekLow": string;
}

export interface ForexQuote {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

/**
 * Fetch real-time stock quote using Alpha Vantage
 */
export async function getStockQuote(
  symbol: string,
  apiKey: string
): Promise<StockQuote | null> {
  try {
    // Use GLOBAL_QUOTE function for real-time data
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data["Error Message"]) {
      throw new Error(data["Error Message"]);
    }

    if (data["Note"]) {
      throw new Error("API call frequency limit reached. Please wait a moment.");
    }

    const quote = data["Global Quote"];
    if (!quote || !quote["05. price"]) {
      return null;
    }

    const price = parseFloat(quote["05. price"]);
    const previousClose = parseFloat(quote["08. previous close"]);
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: quote["01. symbol"],
      price,
      change,
      changePercent,
      volume: parseInt(quote["06. volume"]) || 0,
      high: parseFloat(quote["03. high"]) || 0,
      low: parseFloat(quote["04. low"]) || 0,
      open: parseFloat(quote["02. open"]) || 0,
      previousClose,
      timestamp: quote["07. latest trading day"],
    };
  } catch (error) {
    console.error("Error fetching stock quote:", error);
    throw error;
  }
}

/**
 * Fetch stock overview/company information
 */
export async function getStockOverview(
  symbol: string,
  apiKey: string
): Promise<StockOverview | null> {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data["Error Message"]) {
      throw new Error(data["Error Message"]);
    }

    if (data["Note"]) {
      throw new Error("API call frequency limit reached. Please wait a moment.");
    }

    if (!data.Symbol) {
      return null;
    }

    return {
      symbol: data.Symbol,
      name: data.Name,
      description: data.Description,
      sector: data.Sector,
      industry: data.Industry,
      marketCap: data.MarketCapitalization,
      peRatio: data.PERatio,
      dividendYield: data.DividendYield,
      eps: data.EPS,
      beta: data.Beta,
      "52WeekHigh": data["52WeekHigh"],
      "52WeekLow": data["52WeekLow"],
    };
  } catch (error) {
    console.error("Error fetching stock overview:", error);
    throw error;
  }
}

/**
 * Fetch forex quote
 */
export async function getForexQuote(
  fromCurrency: string,
  toCurrency: string,
  apiKey: string
): Promise<ForexQuote | null> {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data["Error Message"]) {
      throw new Error(data["Error Message"]);
    }

    if (data["Note"]) {
      throw new Error("API call frequency limit reached. Please wait a moment.");
    }

    const rateData = data["Realtime Currency Exchange Rate"];
    if (!rateData) {
      return null;
    }

    const rate = parseFloat(rateData["5. Exchange Rate"]);
    // For forex, we'll calculate change from bid/ask or use previous close if available
    const change = 0; // Alpha Vantage doesn't provide change in this endpoint
    const changePercent = 0;

    return {
      fromCurrency: rateData["1. From_Currency Code"],
      toCurrency: rateData["3. To_Currency Code"],
      rate,
      change,
      changePercent,
      timestamp: rateData["6. Last Refreshed"],
    };
  } catch (error) {
    console.error("Error fetching forex quote:", error);
    throw error;
  }
}

/**
 * Search for stocks/symbols
 */
export async function searchSymbols(
  keywords: string,
  apiKey: string
): Promise<Array<{ symbol: string; name: string }>> {
  try {
    // Alpha Vantage doesn't have a search endpoint, so we'll use a simple approach
    // For production, you might want to use a different service or maintain a symbol list
    const response = await fetch(
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${keywords}&apikey=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data["Error Message"]) {
      throw new Error(data["Error Message"]);
    }

    if (data["Note"]) {
      return []; // Rate limited, return empty
    }

    const matches = (data["bestMatches"] || []) as Array<{
      "1. symbol": string;
      "2. name": string;
      "3. type": string;
      "4. region": string;
      "8. currency": string;
    }>;
    return matches.map((match) => ({
      symbol: match["1. symbol"],
      name: match["2. name"],
    }));
  } catch (error) {
    console.error("Error searching symbols:", error);
    return [];
  }
}

