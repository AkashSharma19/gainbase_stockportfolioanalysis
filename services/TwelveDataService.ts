import { API_CONFIG } from '@/constants/Api';
import { Ticker } from '@/types';

interface TwelveDataQuoteResponse {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  close: string;
  previous_close: string;
  change: string;
  percent_change: string;
  fifty_two_week?: {
    low: string;
    high: string;
    low_change?: string;
    high_change?: string;
  };
  code?: number;
  message?: string;
  status?: string;
}

interface TwelveDataLogoResponse {
  meta?: { symbol: string };
  url?: string;
  code?: number;
  message?: string;
}

/**
 * Normalizes symbol for Twelve Data queries.
 * Converts 'NSE:INFY' -> 'INFY:NSE', 'INFY.NS' -> 'INFY:NSE'.
 */
export function formatTwelveDataSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (clean.startsWith('NSE:')) {
    return `${clean.replace('NSE:', '')}:NSE`;
  }
  if (clean.startsWith('BSE:') || clean.startsWith('BOM:')) {
    return `${clean.replace(/^(BSE|BOM):/, '')}:BSE`;
  }
  if (clean.startsWith('NASDAQ:')) {
    return `${clean.replace('NASDAQ:', '')}:NASDAQ`;
  }
  if (clean.startsWith('NYSE:')) {
    return `${clean.replace('NYSE:', '')}:NYSE`;
  }
  if (clean.endsWith('.NS')) {
    return `${clean.replace('.NS', '')}:NSE`;
  }
  if (clean.endsWith('.BO')) {
    return `${clean.replace('.BO', '')}:BSE`;
  }
  return clean;
}

interface CachedRate {
  rate: number;
  timestamp: number;
}

const rateCache = new Map<string, CachedRate>();
const RATE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetches or retrieves cached Forex rate to INR.
 */
export async function getRateToINR(
  currency: string = 'USD',
  apiKey: string = API_CONFIG.TWELVE_DATA_API_KEY,
): Promise<number> {
  const curr = (currency || 'USD').trim().toUpperCase();
  if (curr === 'INR') return 1;

  const cacheKey = `${curr}/INR`;
  const cached = rateCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < RATE_CACHE_TTL_MS) {
    return cached.rate;
  }

  const liveRate = await fetchExchangeRate(curr, 'INR', apiKey);
  if (liveRate && liveRate > 0) {
    rateCache.set(cacheKey, { rate: liveRate, timestamp: now });
    return liveRate;
  }

  // Fallbacks if network / API is busy
  if (curr === 'USD') return 95.8;
  if (curr === 'EUR') return 105.0;
  if (curr === 'GBP') return 125.0;
  return 1;
}

/**
 * Fetches a single real-time stock quote from Twelve Data, converting foreign currencies (USD/EUR/etc.) to INR.
 */
export async function fetchTwelveDataQuote(
  symbol: string,
  apiKey: string = API_CONFIG.TWELVE_DATA_API_KEY,
): Promise<Partial<Ticker> | null> {
  try {
    const formattedSym = formatTwelveDataSymbol(symbol);
    const url = `${API_CONFIG.TWELVE_DATA_BASE_URL}/quote?symbol=${encodeURIComponent(formattedSym)}&apikey=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data: TwelveDataQuoteResponse = await res.json();
    if (data.code || data.status === 'error' || !data.close) {
      // Free tier restriction or symbol not found
      return null;
    }

    const rawCurrency = (data.currency || 'USD').toUpperCase();
    const rateToINR = await getRateToINR(rawCurrency, apiKey);

    const rawClose = parseFloat(data.close);
    const rawPrev = parseFloat(data.previous_close);
    const rawHigh52 = data.fifty_two_week?.high ? parseFloat(data.fifty_two_week.high) : undefined;
    const rawLow52 = data.fifty_two_week?.low ? parseFloat(data.fifty_two_week.low) : undefined;

    const currentVal = !isNaN(rawClose) ? rawClose * rateToINR : undefined;
    const yesterdayClose = !isNaN(rawPrev) ? rawPrev * rateToINR : undefined;
    const high52 = rawHigh52 !== undefined && !isNaN(rawHigh52) ? rawHigh52 * rateToINR : undefined;
    const low52 = rawLow52 !== undefined && !isNaN(rawLow52) ? rawLow52 * rateToINR : undefined;

    return {
      Tickers: symbol.trim().toUpperCase(),
      'Company Name': data.name || symbol,
      'Current Value': currentVal,
      'Yesterday Close': yesterdayClose,
      High52: high52,
      Low52: low52,
      Currency: 'INR',
      OriginalCurrency: rawCurrency !== 'INR' ? rawCurrency : undefined,
      OriginalPrice: rawCurrency !== 'INR' && !isNaN(rawClose) ? rawClose : undefined,
    };
  } catch (err) {
    console.warn(`[TwelveData] Failed to fetch quote for ${symbol}:`, err);
    return null;
  }
}

/**
 * Fetches batch quotes for multiple symbols from Twelve Data, converting foreign currencies to INR.
 */
export async function fetchTwelveDataBatchQuotes(
  symbols: string[],
  apiKey: string = API_CONFIG.TWELVE_DATA_API_KEY,
): Promise<Map<string, Partial<Ticker>>> {
  const resultMap = new Map<string, Partial<Ticker>>();
  if (symbols.length === 0) return resultMap;

  try {
    const formattedList = symbols.map((s) => ({
      original: s.trim().toUpperCase(),
      formatted: formatTwelveDataSymbol(s),
    }));

    const symParam = formattedList.map((f) => f.formatted).join(',');
    const url = `${API_CONFIG.TWELVE_DATA_BASE_URL}/quote?symbol=${encodeURIComponent(symParam)}&apikey=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) return resultMap;

    const json = await res.json();

    // Single item returns object directly, batch returns { [sym]: data }
    if (formattedList.length === 1 && json.close) {
      const single = json as TwelveDataQuoteResponse;
      const rawCurrency = (single.currency || 'USD').toUpperCase();
      const rateToINR = await getRateToINR(rawCurrency, apiKey);

      const rawClose = parseFloat(single.close);
      const rawPrev = parseFloat(single.previous_close);
      const rawHigh52 = single.fifty_two_week?.high ? parseFloat(single.fifty_two_week.high) : undefined;
      const rawLow52 = single.fifty_two_week?.low ? parseFloat(single.fifty_two_week.low) : undefined;

      const currentVal = !isNaN(rawClose) ? rawClose * rateToINR : undefined;
      const yesterdayClose = !isNaN(rawPrev) ? rawPrev * rateToINR : undefined;
      const high52 = rawHigh52 !== undefined && !isNaN(rawHigh52) ? rawHigh52 * rateToINR : undefined;
      const low52 = rawLow52 !== undefined && !isNaN(rawLow52) ? rawLow52 * rateToINR : undefined;

      resultMap.set(formattedList[0].original, {
        Tickers: formattedList[0].original,
        'Company Name': single.name || formattedList[0].original,
        'Current Value': currentVal,
        'Yesterday Close': yesterdayClose,
        High52: high52,
        Low52: low52,
        Currency: 'INR',
        OriginalCurrency: rawCurrency !== 'INR' ? rawCurrency : undefined,
        OriginalPrice: rawCurrency !== 'INR' && !isNaN(rawClose) ? rawClose : undefined,
      });
      return resultMap;
    }

    // Process each symbol in batch
    for (const { original, formatted } of formattedList) {
      const data: TwelveDataQuoteResponse | undefined = json[formatted] || json[original];
      if (data && !data.code && data.close) {
        const rawCurrency = (data.currency || 'USD').toUpperCase();
        const rateToINR = await getRateToINR(rawCurrency, apiKey);

        const rawClose = parseFloat(data.close);
        const rawPrev = parseFloat(data.previous_close);
        const rawHigh52 = data.fifty_two_week?.high ? parseFloat(data.fifty_two_week.high) : undefined;
        const rawLow52 = data.fifty_two_week?.low ? parseFloat(data.fifty_two_week.low) : undefined;

        const currentVal = !isNaN(rawClose) ? rawClose * rateToINR : undefined;
        const yesterdayClose = !isNaN(rawPrev) ? rawPrev * rateToINR : undefined;
        const high52 = rawHigh52 !== undefined && !isNaN(rawHigh52) ? rawHigh52 * rateToINR : undefined;
        const low52 = rawLow52 !== undefined && !isNaN(rawLow52) ? rawLow52 * rateToINR : undefined;

        resultMap.set(original, {
          Tickers: original,
          'Company Name': data.name || original,
          'Current Value': currentVal,
          'Yesterday Close': yesterdayClose,
          High52: high52,
          Low52: low52,
          Currency: 'INR',
          OriginalCurrency: rawCurrency !== 'INR' ? rawCurrency : undefined,
          OriginalPrice: rawCurrency !== 'INR' && !isNaN(rawClose) ? rawClose : undefined,
        });
      }
    }
  } catch (err) {
    console.warn('[TwelveData] Failed to fetch batch quotes:', err);
  }

  return resultMap;
}

/**
 * Fetches official logo URL for a symbol from Twelve Data.

 */
export async function fetchTwelveDataLogo(
  symbol: string,
  apiKey: string = API_CONFIG.TWELVE_DATA_API_KEY,
): Promise<string | null> {
  try {
    const formattedSym = formatTwelveDataSymbol(symbol);
    const url = `${API_CONFIG.TWELVE_DATA_BASE_URL}/logo?symbol=${encodeURIComponent(formattedSym)}&apikey=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data: TwelveDataLogoResponse = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

export interface TwelveDataSearchResultItem {
  symbol: string;
  instrument_name: string;
  exchange: string;
  mic_code?: string;
  country?: string;
  currency?: string;
  instrument_type?: string;
}

const POPULAR_BRAND_ALIASES: Record<string, string[]> = {
  google: ['GOOGL', 'GOOG'],
  alphabet: ['GOOGL', 'GOOG'],
  facebook: ['META'],
  meta: ['META'],
  twitter: ['TWTR'],
  amazon: ['AMZN'],
  apple: ['AAPL'],
  microsoft: ['MSFT'],
  netflix: ['NFLX'],
  tesla: ['TSLA'],
  nvidia: ['NVDA'],
  uber: ['UBER'],
  airbnb: ['ABNB'],
  spotify: ['SPOT'],
  adobe: ['ADBE'],
  disney: ['DIS'],
  'walt disney': ['DIS'],
  coca: ['KO'],
  cocacola: ['KO'],
  'coca-cola': ['KO'],
  'coca cola': ['KO'],
  coke: ['KO'],
  pepsi: ['PEP'],
  pepsico: ['PEP'],
  'pepsi-cola': ['PEP'],
  intel: ['INTC'],
  amd: ['AMD'],
  oracle: ['ORCL'],
  salesforce: ['CRM'],
  nike: ['NKE'],
  starbucks: ['SBUX'],
  walmart: ['WMT'],
  costco: ['COST'],
  jpmorgan: ['JPM'],
  'jp morgan': ['JPM'],
  chase: ['JPM'],
  visa: ['V'],
  mastercard: ['MA'],
  berkshire: ['BRK.A', 'BRK.B'],
  'berkshire hathaway': ['BRK.A', 'BRK.B'],
  buffett: ['BRK.A', 'BRK.B'],
  johnson: ['JNJ'],
  'johnson & johnson': ['JNJ'],
  jnj: ['JNJ'],
  procter: ['PG'],
  'procter & gamble': ['PG'],
  pg: ['PG'],
  palantir: ['PLTR'],
  qualcomm: ['QCOM'],
  broadcom: ['AVGO'],
  tsmc: ['TSM'],
  'taiwan semiconductor': ['TSM'],
  infosys: ['INFY'],
  infy: ['INFY'],
  tcs: ['TCS'],
  'tata consultancy': ['TCS'],
  reliance: ['RELIANCE'],
  hdfc: ['HDFCBANK'],
  'hdfc bank': ['HDFCBANK'],
  icici: ['ICICIBANK'],
  'icici bank': ['ICICIBANK'],
  sbi: ['SBIN'],
  'state bank of india': ['SBIN'],
  'tata motors': ['TATAMOTORS'],
  wipro: ['WIPRO'],
  itc: ['ITC'],
  lt: ['LT'],
  'l&t': ['LT'],
  larsen: ['LT'],
};

/**
 * Searches symbols on Twelve Data globally with brand alias resolution and multi-word handling.
 */
export async function searchTwelveDataSymbols(
  query: string,
  apiKey: string = API_CONFIG.TWELVE_DATA_API_KEY,
): Promise<TwelveDataSearchResultItem[]> {
  if (!query || query.trim().length < 2) return [];

  const rawQuery = query.trim();
  const cleanQuery = rawQuery.toLowerCase();
  const normalizedNoSpaces = cleanQuery.replace(/[\s\-_&.]+/g, '');
  const words = cleanQuery.split(/[\s\-_&.]+/).filter((w) => w.length >= 2);

  const aliasTerms = [
    ...(POPULAR_BRAND_ALIASES[cleanQuery] || []),
    ...(POPULAR_BRAND_ALIASES[normalizedNoSpaces] || []),
    ...words.flatMap((w) => POPULAR_BRAND_ALIASES[w] || []),
  ];

  // Strip spaces since Twelve Data symbol_search API does not accept spaces in symbol param
  const searchTerms = Array.from(
    new Set([
      rawQuery,
      normalizedNoSpaces,
      ...words,
      ...aliasTerms,
    ])
  ).filter((term) => term && term.length >= 1 && !term.includes(' '));

  try {
    const fetchPromises = searchTerms.map(async (term) => {
      try {
        const url = `${API_CONFIG.TWELVE_DATA_BASE_URL}/symbol_search?symbol=${encodeURIComponent(term)}&apikey=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json.data) ? json.data : [];
      } catch {
        return [];
      }
    });

    const rawBatches = await Promise.all(fetchPromises);
    const combinedRaw = rawBatches.flat();

    const ALLOWED_EXCHANGES = new Set(['NYSE', 'NASDAQ', 'NSE', 'BSE', 'BOM']);

    const normalizeEx = (ex: string): string => {
      const clean = (ex || '').trim().toUpperCase();
      return clean === 'BOM' ? 'BSE' : clean;
    };

    const seenKeys = new Set<string>();
    const rawResults: TwelveDataSearchResultItem[] = [];

    for (const item of combinedRaw) {
      if (!item.symbol || !item.instrument_name) continue;
      const ex = normalizeEx(item.exchange);
      if (!ALLOWED_EXCHANGES.has(ex)) continue;

      const dedupeKey = `${item.symbol.toUpperCase()}:${ex}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      const isIndia = ex === 'NSE' || ex === 'BSE';
      rawResults.push({
        symbol: item.symbol,
        instrument_name: item.instrument_name,
        exchange: ex,
        mic_code: item.mic_code,
        country: item.country || (isIndia ? 'India' : 'United States'),
        currency: item.currency || (isIndia ? 'INR' : 'USD'),
        instrument_type: item.instrument_type || 'Common Stock',
      });
    }

    const upperQuery = query.trim().toUpperCase();

    const sorted = rawResults.sort((a, b) => {
      // 1. Exact symbol match first
      const aExact = a.symbol.toUpperCase() === upperQuery ? 1 : 0;
      const bExact = b.symbol.toUpperCase() === upperQuery ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      // 2. Common Stock priority over mutual funds / note certificates
      const aCommon = a.instrument_type === 'Common Stock' ? 1 : 0;
      const bCommon = b.instrument_type === 'Common Stock' ? 1 : 0;
      if (aCommon !== bCommon) return bCommon - aCommon;

      return 0;
    });

    return sorted.slice(0, 15);
  } catch (err) {
    console.warn('[TwelveData] Failed to search symbols:', err);
    return [];
  }
}

export interface TwelveDataExchangeRate {
  symbol: string;
  rate: number;
  timestamp: number;
}

/**
 * Fetches real-time Forex exchange rate (e.g. USD/INR, EUR/INR).
 */
export async function fetchExchangeRate(
  from: string = 'USD',
  to: string = 'INR',
  apiKey: string = API_CONFIG.TWELVE_DATA_API_KEY,
): Promise<number | null> {
  try {
    const pair = `${from.toUpperCase()}/${to.toUpperCase()}`;
    const url = `${API_CONFIG.TWELVE_DATA_BASE_URL}/exchange_rate?symbol=${encodeURIComponent(pair)}&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.rate && !isNaN(Number(data.rate))) {
      return Number(data.rate);
    }
    return null;
  } catch (err) {
    console.warn(`[TwelveData] Failed to fetch exchange rate for ${from}/${to}:`, err);
    return null;
  }
}


