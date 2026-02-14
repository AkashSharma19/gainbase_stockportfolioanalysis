import { usePortfolioStore } from '@/store/usePortfolioStore';
import { useMemo } from 'react';

export type InsightCategory = 'Buy' | 'Sell/Hold' | 'Observe';

export interface Insight {
    id: string;
    category: InsightCategory;
    title: string; // Used for company name
    subtitle: string; // Used for "Total Invested"
    icon: string;
    symbol?: string;
    logo?: string;
    value: string; // The primary metric to display (e.g. +30%)
    color: string; // Insight color
    pnlPercentage?: number;
}

export const useInsights = () => {
    const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);
    const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
    const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

    const holdings = useMemo(() => getHoldingsData(), [getHoldingsData, transactions, tickers]);

    const formatCurrency = (value: number) => {
        return `${showCurrencySymbol ? '₹' : ''}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    };

    const insights = useMemo(() => {
        const list: Insight[] = [];

        if (holdings.length === 0) return list;

        // Sell/Hold: High Concentration
        holdings.forEach((h) => {
            if (h.contributionPercentage > 25) {
                list.push({
                    id: `concentration-${h.symbol}`,
                    category: 'Sell/Hold',
                    title: h.companyName || h.symbol,
                    subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'TriangleAlert',
                    value: 'Sell/Hold',
                    color: '#FF3B30',
                    pnlPercentage: h.pnlPercentage,
                });
            }
        });

        // Sell/Hold: Profit Taking
        holdings.forEach((h) => {
            if (h.pnlPercentage > 30) {
                list.push({
                    id: `profit-${h.symbol}`,
                    category: 'Sell/Hold',
                    title: h.companyName || h.symbol,
                    subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'TrendingUp',
                    value: 'Sell/Hold',
                    color: '#34C759',
                    pnlPercentage: h.pnlPercentage,
                });
            }
        });

        // Sell/Hold: Tax-Loss Harvesting
        holdings.forEach((h) => {
            if (h.pnlPercentage < -15) {
                list.push({
                    id: `tax-loss-${h.symbol}`,
                    category: 'Sell/Hold',
                    title: h.companyName || h.symbol,
                    subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'CircleArrowDown',
                    value: 'Sell/Hold',
                    color: '#FF3B30',
                    pnlPercentage: h.pnlPercentage,
                });
            }
        });

        // Buy: DCA Opportunity
        holdings.forEach((h) => {
            if (h.pnlPercentage < -10) {
                list.push({
                    id: `dca-${h.symbol}`,
                    category: 'Buy',
                    title: h.companyName || h.symbol,
                    subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'CircleArrowDown',
                    value: 'Buy More',
                    color: '#FF3B30', // Red for low price/discount
                    pnlPercentage: h.pnlPercentage,
                });
            }
        });

        // Observe: Near 52W High
        holdings.forEach((h) => {
            if (h.high52 && h.currentPrice >= h.high52 * 0.98) {
                list.push({
                    id: `high52-${h.symbol}`,
                    category: 'Observe',
                    title: h.companyName || h.symbol,
                    subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'Zap',
                    value: 'Near High',
                    color: '#FF9500',
                    pnlPercentage: h.pnlPercentage,
                });
            }
        });

        // Observe: Winning/Losing Streaks
        holdings.forEach((h) => {
            const ticker = tickers.find((t) => t.Tickers.trim().toUpperCase() === h.symbol.trim().toUpperCase());
            if (!ticker) return;

            const prices = [
                h.currentPrice,
                ticker['Yesterday Close'],
                ticker['Today - 2'],
                ticker['Today - 3'],
            ].filter((p): p is number => p !== undefined && p !== null);

            if (prices.length >= 4) {
                const isWinningStreak = prices[0] > prices[1] && prices[1] > prices[2] && prices[2] > prices[3];
                const isLosingStreak = prices[0] < prices[1] && prices[1] < prices[2] && prices[2] < prices[3];

                if (isWinningStreak) {
                    list.push({
                        id: `winning-streak-${h.symbol}`,
                        category: 'Observe',
                        title: h.companyName || h.symbol,
                        subtitle: '3-Day Winning Streak',
                        symbol: h.symbol,
                        logo: h.logo,
                        icon: 'TrendingUp',
                        value: 'Winning',
                        color: '#34C759',
                        pnlPercentage: h.pnlPercentage,
                    });
                } else if (isLosingStreak) {
                    list.push({
                        id: `losing-streak-${h.symbol}`,
                        category: 'Observe',
                        title: h.companyName || h.symbol,
                        subtitle: '3-Day Losing Streak',
                        symbol: h.symbol,
                        logo: h.logo,
                        icon: 'CircleArrowDown',
                        value: 'Losing',
                        color: '#FF3B30',
                        pnlPercentage: h.pnlPercentage,
                    });
                }
            }
        });

        // Buy: Near 52W Low
        holdings.forEach((h) => {
            if (h.low52 && h.currentPrice <= h.low52 * 1.02) {
                list.push({
                    id: `low52-${h.symbol}`,
                    category: 'Buy',
                    title: h.companyName || h.symbol,
                    subtitle: `Invested: ${formatCurrency(h.investedValue)}`,
                    symbol: h.symbol,
                    logo: h.logo,
                    icon: 'Compass',
                    value: 'Buy More',
                    color: '#34C759',
                    pnlPercentage: h.pnlPercentage,
                });
            }
        });

        // Observe: Sector Concentration
        const sectorTotals: Record<string, number> = {};
        holdings.forEach((h) => {
            const sector = h.sector || 'Other';
            sectorTotals[sector] = (sectorTotals[sector] || 0) + h.contributionPercentage;
        });

        Object.entries(sectorTotals).forEach(([sector, percentage]) => {
            if (percentage > 30) {
                list.push({
                    id: `sector-concentration-${sector}`,
                    category: 'Observe',
                    title: `${sector} Sector`,
                    subtitle: 'High Concentration',
                    icon: 'TriangleAlert',
                    value: `${percentage.toFixed(1)}%`,
                    color: '#FF9500',
                });
            }
        });

        return list;
    }, [holdings, isPrivacyMode, showCurrencySymbol, tickers]);

    return {
        insights,
        count: insights.length,
    };
};
