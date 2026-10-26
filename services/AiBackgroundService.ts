import { useAiStore, AiInsight } from '@/store/useAiStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
let isCurrentlyRunning = false;

/**
 * Runs the AI Insights background evaluation across Stock Portfolio.
 * - Guard: Only runs if Gemini API Key is configured.
 * - Interval: Only runs if >= 12 hours have elapsed since the last run.
 * - Silent: Never throws or displays user-facing error dialogs.
 */
export async function runBackgroundAiInsightsIfNeeded(): Promise<boolean> {
  if (isCurrentlyRunning) {
    return false;
  }

  const {
    geminiApiKey,
    selectedModel,
    lastAiInsightsRunTimestamp,
    setLastAiInsightsRunTimestamp,
    setIsAiGeneratingBackground,
  } = useAiStore.getState();

  // Guard: User must have an active Gemini API key configured. Do not run without it.
  if (!geminiApiKey || !geminiApiKey.trim()) {
    return false;
  }

  // Guard: Check 12-hour throttle
  const now = Date.now();
  if (lastAiInsightsRunTimestamp && now - lastAiInsightsRunTimestamp < TWELVE_HOURS_MS) {
    return false;
  }

  isCurrentlyRunning = true;
  setIsAiGeneratingBackground(true);

  try {
    // Optimistically update timestamp to guard against duplicate app switches
    setLastAiInsightsRunTimestamp(now);

    const modelToUse = selectedModel || 'gemini-1.5-flash';
    const keyToUse = geminiApiKey.trim();

    // Run Stock Insights in the background
    await generateStockInsightsSilently(keyToUse, modelToUse);

    return true;
  } catch (error) {
    console.error('[AiBackgroundService] Error in background execution:', error);
    return false;
  } finally {
    isCurrentlyRunning = false;
    useAiStore.getState().setIsAiGeneratingBackground(false);
  }
}


/**
 * Evaluates the user's active stock holdings and updates aiStockInsights in useAiStore.
 */
export async function generateStockInsightsSilently(
  geminiApiKey: string,
  selectedModel: string,
): Promise<void> {
  try {
    const portfolioStore = usePortfolioStore.getState();
    const holdings = portfolioStore.getHoldingsData?.() || [];

    if (holdings.length === 0) {
      return;
    }

    const portfolioSummary = portfolioStore.calculateSummary();
    const totalPortfolioVal = holdings.reduce(
      (sum: number, h: any) => sum + (h.currentValue || h.quantity * h.avgPrice),
      0,
    );
    const totalInvestedVal = holdings.reduce(
      (sum: number, h: any) => sum + (h.investedValue || h.quantity * h.avgPrice),
      0,
    );
    const totalPnl = totalPortfolioVal - totalInvestedVal;
    const totalPnlPct = totalInvestedVal > 0 ? (totalPnl / totalInvestedVal) * 100 : 0;

    const serializedHoldings = holdings
      .map((h: any) => {
        const allocPct =
          h.contributionPercentage !== undefined
            ? h.contributionPercentage
            : totalPortfolioVal > 0
              ? ((h.currentValue || h.quantity * h.avgPrice) / totalPortfolioVal) * 100
              : 0;
        const pnlPct = h.pnlPercentage !== undefined ? h.pnlPercentage : 0;
        const currentP = h.currentPrice || h.avgPrice;
        const highLow =
          h.high52 && h.low52 ? `, 52W High: ₹${h.high52}, 52W Low: ₹${h.low52}` : '';
        const peStr = h.PE ? `, P/E: ${h.PE}` : '';
        const divStr = h.DividendYield ? `, Div Yield: ${h.DividendYield}%` : '';
        const sectorStr = h.sector ? `, Sector: ${h.sector}` : '';
        const dayStr =
          h.dayChangePercentage !== undefined
            ? `, Day Return: ${h.dayChangePercentage >= 0 ? '+' : ''}${h.dayChangePercentage.toFixed(2)}%`
            : '';

        return `- Ticker: ${h.symbol} (${h.companyName})
  Shares: ${h.quantity} | Avg Buy Price: ₹${h.avgPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })} | Current Market Price: ₹${currentP.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
  Total Invested: ₹${Math.round(h.investedValue || h.quantity * h.avgPrice).toLocaleString('en-IN')} | Current Value: ₹${Math.round(h.currentValue || h.quantity * h.avgPrice).toLocaleString('en-IN')}
  Unrealized PnL: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}% (₹${Math.round(h.pnl || h.currentValue - h.investedValue || 0).toLocaleString('en-IN')}) | Portfolio Weight: ${allocPct.toFixed(1)}%${sectorStr}${dayStr}${highLow}${peStr}${divStr}`;
      })
      .join('\n\n');

    const serializedPortfolio = `PORTFOLIO MACRO SNAPSHOT:
- Total Portfolio Value: ₹${Math.round(totalPortfolioVal).toLocaleString('en-IN')}
- Total Capital Invested: ₹${Math.round(totalInvestedVal).toLocaleString('en-IN')}
- Overall Portfolio Unrealized PnL: ${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}% (₹${Math.round(totalPnl).toLocaleString('en-IN')})
- Number of Active Holdings: ${holdings.length} stocks
- Portfolio XIRR: ${portfolioSummary.xirr ? `${portfolioSummary.xirr.toFixed(1)}%` : 'N/A'}`;

    const prompt = `You are Gainbase AI, an institutional-grade portfolio strategist and quantitative equity analyst.

${serializedPortfolio}

CURRENT PORTFOLIO POSITIONS (${holdings.length} Active Stocks):
${serializedHoldings}

CRITICAL MANDATORY REQUIREMENT - 100% FULL PORTFOLIO COVERAGE:
- The user has EXACTLY ${holdings.length} stocks in their portfolio.
- You MUST evaluate and return an insight for EVERY SINGLE ONE of the ${holdings.length} stocks listed above (${holdings.map((h: any) => h.symbol).join(', ')}).
- DO NOT SKIP, OMIT, MERGE, OR TRUNCATE ANY STOCK. Every stock ticker in the holdings list MUST have exactly one dedicated insight object in the returned JSON array.
- The returned JSON array MUST contain at least ${holdings.length} objects.

YOUR MISSION:
Rigorously categorize every single stock into the single best fitting category:
1. "Buy" -> WHICH STOCKS TO BUY MORE / ACCUMULATE / AVERAGE DOWN
2. "Sell" -> WHAT TO SELL / TRIM / TAKE PROFIT / STOP-LOSS
3. "Hold" -> WHAT TO HOLD & COMPOUND
4. "Not Sure" -> WHAT TO OBSERVE & WATCH (Ambiguous / Crossroad Signals)

INSTRUCTIONS:
- Return a JSON array with an insight object for every holding in the portfolio.
- "id": unique string
- "category": MUST be exactly one of: "Buy", "Sell", "Hold", "Not Sure"
- "symbol": exact stock ticker matching the portfolio holdings
- "title": full company name
- "badge": short 2-3 word highlight tag
- "value": quantitative metric highlight
- "reason": 2-3 sentences of deep, objective, institutional-grade rationale explaining the exact decision for this specific stock.
- "color": Buy is "#34C759", Sell is "#FF3B30", Hold is "#FF9500", Not Sure is "#007AFF"
- "icon": Buy is "TrendingUp" or "Zap", Sell is "TrendingDown" or "TriangleAlert", Hold is "TrendingUp" or "CheckCircle", Not Sure is "Eye" or "Compass"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            responseSchema: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  id: { type: 'STRING' },
                  category: {
                    type: 'STRING',
                    enum: ['Buy', 'Sell', 'Hold', 'Not Sure'],
                  },
                  symbol: { type: 'STRING' },
                  title: { type: 'STRING' },
                  badge: { type: 'STRING' },
                  value: { type: 'STRING' },
                  reason: { type: 'STRING' },
                  color: { type: 'STRING' },
                  icon: { type: 'STRING' },
                },
                required: [
                  'id',
                  'category',
                  'title',
                  'badge',
                  'value',
                  'reason',
                  'color',
                  'icon',
                ],
              },
            },
          },
        }),
      },
    );

    const data = await response.json();
    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const parsed: AiInsight[] = JSON.parse(data.candidates[0].content.parts[0].text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        useAiStore.getState().setAiStockInsights(parsed);
      }
    }
  } catch (err) {
    console.error('[AiBackgroundService] Failed to generate stock insights in background:', err);
  }
}
