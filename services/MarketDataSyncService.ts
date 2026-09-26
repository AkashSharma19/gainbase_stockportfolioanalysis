import { supabase } from '@/lib/supabase';
import { Ticker } from '@/types';
import {
  fetchTwelveDataBatchQuotes,
  fetchTwelveDataLogo,
  fetchTwelveDataQuote,
} from './TwelveDataService';
import { getCompanyLogoUrl } from './logoService';

export interface MarketPriceRecord {
  ticker: string;
  company_name: string;
  current_value: number;
  yesterday_close?: number;
  high_52?: number;
  low_52?: number;
  currency: string;
  logo?: string;
  asset_type?: string;
  sector?: string;
  updated_at: string;
}

/**
 * Upserts a single stock's real-time quote into Supabase Table A (public.tickers).
 */
export async function syncSingleTickerToSupabase(symbol: string): Promise<Ticker | null> {
  const cleanSym = symbol.trim().toUpperCase();
  if (!cleanSym) return null;

  try {
    const quote = await fetchTwelveDataQuote(cleanSym);
    if (!quote || quote['Current Value'] === undefined) {
      return null;
    }

    const logo = (await fetchTwelveDataLogo(cleanSym)) || getCompanyLogoUrl(cleanSym, quote['Company Name']);
    const nowIso = new Date().toISOString();

    const record = {
      ticker: cleanSym,
      company_name: quote['Company Name'] || cleanSym,
      current_value: quote['Current Value'],
      yesterday_close: quote['Yesterday Close'] ?? quote['Current Value'],
      high_52: quote.High52 ?? null,
      low_52: quote.Low52 ?? null,
      asset_type: quote['Asset Type'] || 'Equity',
      sector: quote.Sector || 'General',
      logo: logo || null,
      updated_at: nowIso,
    };

    // Upsert into Supabase
    const { error } = await supabase
      .from('tickers')
      .upsert(record, { onConflict: 'ticker' });

    if (error) {
      console.warn(`[SupabaseSync] Failed to upsert ${cleanSym}:`, error.message);
    }

    return {
      Tickers: cleanSym,
      'Company Name': record.company_name,
      'Current Value': record.current_value,
      'Yesterday Close': record.yesterday_close,
      High52: quote.High52,
      Low52: quote.Low52,
      Currency: 'INR',
      Logo: logo,
      'Asset Type': record.asset_type,
      Sector: record.sector,
    };
  } catch (err) {
    console.warn(`[SupabaseSync] Error syncing ${cleanSym}:`, err);
    return null;
  }
}

/**
 * Batches and synchronizes multiple stock prices from Twelve Data into Supabase.
 */
export async function syncBatchTickersToSupabase(symbols: string[]): Promise<number> {
  const uniqueSymbols = Array.from(
    new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))
  );

  if (uniqueSymbols.length === 0) return 0;

  try {
    const quotesMap = await fetchTwelveDataBatchQuotes(uniqueSymbols);
    if (quotesMap.size === 0) return 0;

    const nowIso = new Date().toISOString();
    const recordsToUpsert = [];

    for (const [sym, quote] of quotesMap.entries()) {
      if (quote['Current Value'] !== undefined) {
        recordsToUpsert.push({
          ticker: sym,
          company_name: quote['Company Name'] || sym,
          current_value: quote['Current Value'],
          yesterday_close: quote['Yesterday Close'] ?? quote['Current Value'],
          high_52: quote.High52 ?? null,
          low_52: quote.Low52 ?? null,
          asset_type: quote['Asset Type'] || 'Equity',
          sector: quote.Sector || 'General',
          logo: getCompanyLogoUrl(sym, quote['Company Name']),
          updated_at: nowIso,
        });
      }
    }

    if (recordsToUpsert.length === 0) return 0;

    const { error } = await supabase
      .from('tickers')
      .upsert(recordsToUpsert, { onConflict: 'ticker' });

    if (error) {
      console.warn('[SupabaseSync] Batch upsert error:', error.message);
      return 0;
    }

    return recordsToUpsert.length;
  } catch (err) {
    console.warn('[SupabaseSync] Batch sync error:', err);
    return 0;
  }
}
