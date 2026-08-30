import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useMoneyStore } from '../store/useMoneyStore';

export const APP_GROUP = 'group.com.akashsharma.gainbase';

export interface WidgetDataModel {
  // ─── Investments Metrics ───
  portfolioValue: string;             // Total Current Value (e.g. "₹4,25,800" or "-₹10,000")
  portfolioInvested: string;          // Total Invested (e.g. "₹3,57,400")
  portfolioDayChange: string;         // 1D Return % (e.g. "+2.15%" or "-2.15%")
  portfolioDayAmount: string;         // 1D Return Amount (e.g. "+₹8,970" or "-₹8,970")
  portfolioTotalReturn: string;       // Total Return Amount (e.g. "+₹68,400" or "-₹68,400")
  portfolioTotalReturnPct: string;    // Total Return % (e.g. "+19.2%" or "-19.2%")
  portfolioXirr: string;              // XIRR % (e.g. "24.8%" or "-12.4%")
  portfolioIsPositive: boolean;       // 1D is >= 0
  totalReturnIsPositive: boolean;     // Total return is >= 0
  xirrIsPositive: boolean;            // XIRR is >= 0

  // ─── Money Manager Metrics ───
  netWorth: string;                   // Total Net Worth (e.g. "₹5,62,400" or "-₹25,000")
  monthlyIncome: string;              // Monthly Income (e.g. "₹50,000")
  monthlySpend: string;               // Monthly Spend (e.g. "₹16,200")
  monthlyNetSavings: string;          // Month Savings (e.g. "+₹33,800" or "-₹12,400")
  monthlySavingsRate: string;         // Savings Rate % (e.g. "34%" or "-20%")
  netSavingsIsPositive: boolean;      // Net savings is >= 0

  // ─── Metadata ───
  lastUpdated: number;
}

// True if running inside Expo Go client app where custom native modules are not linked
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === 'expo';

/**
 * Safely writes data to iOS UserDefaults App Group without crashing
 * if native module is absent (e.g. in Expo Go / web).
 */
async function writeToAppGroup(key: string, value: string): Promise<void> {
  if (Platform.OS !== 'ios' || isExpoGo) return;

  try {
    const expoModules = (globalThis as any).expo?.modules;
    const nativeModules = (globalThis as any).NativeModules;
    const hasNativeModule =
      (expoModules && expoModules.ReactNativeUserDefaults) ||
      (nativeModules && nativeModules.ReactNativeUserDefaults);

    if (!hasNativeModule) {
      return;
    }

    const UserDefaultsModule = require('@alevy97/react-native-userdefaults');
    const UserDefaults = UserDefaultsModule.default || UserDefaultsModule;

    if (UserDefaults) {
      if (typeof UserDefaults.set === 'function') {
        await UserDefaults.set(key, value, APP_GROUP);
        return;
      }
      const instance = new UserDefaults(APP_GROUP);
      if (instance && typeof instance.set === 'function') {
        await instance.set(key, value);
        return;
      }
    }
  } catch {
    // Graceful silent ignore if module is unlinked
  }
}

/**
 * Compiles and writes real-time financial snapshot combining both
 * Investments & Money Manager to iOS App Group UserDefaults.
 */
export async function syncGainbaseWidgetData(): Promise<void> {
  if (Platform.OS !== 'ios' || isExpoGo) return;

  try {
    const portfolioSummary = usePortfolioStore.getState().calculateSummary();
    const isPrivacyMode = usePortfolioStore.getState().isPrivacyMode;
    const showCurrencySymbol = usePortfolioStore.getState().showCurrencySymbol;

    const moneyStore = useMoneyStore.getState();
    const netWorthNum = moneyStore.getNetWorth();

    const prefix = showCurrencySymbol ? '₹' : '';

    // ─── Helper formatters for explicit positive / negative signs ───
    const formatSignedCurrency = (num: number): string => {
      if (isPrivacyMode) return '••••••';
      const isNeg = num < 0;
      const formatted = Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
      return `${isNeg ? '-' : '+'}${prefix}${formatted}`;
    };

    const formatCurrencyWithOptionalNegative = (num: number): string => {
      if (isPrivacyMode) return '••••••';
      const isNeg = num < 0;
      const formatted = Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
      return `${isNeg ? '-' : ''}${prefix}${formatted}`;
    };

    const formatSignedPercentage = (num: number, decimals = 2): string => {
      const isNeg = num < 0;
      return `${isNeg ? '-' : '+'}${Math.abs(num).toFixed(decimals)}%`;
    };

    // ─── 1. Investments Data ───
    const formattedPortfolioValue = formatCurrencyWithOptionalNegative(portfolioSummary.totalValue);
    const formattedPortfolioInvested = formatCurrencyWithOptionalNegative(portfolioSummary.totalCost);

    const dayChangePct = portfolioSummary.dayChangePercentage || 0;
    const dayChangeAmt = portfolioSummary.dayChange || 0;
    const portfolioIsPositive = dayChangeAmt >= 0;
    const formattedPortfolioDayChange = formatSignedPercentage(dayChangePct, 2);
    const formattedPortfolioDayAmount = formatSignedCurrency(dayChangeAmt);

    const totalReturnAmt = portfolioSummary.totalReturn ?? portfolioSummary.profitAmount ?? 0;
    const totalReturnPct = portfolioSummary.profitPercentage ?? 0;
    const totalReturnIsPositive = totalReturnAmt >= 0;
    const formattedTotalReturn = formatSignedCurrency(totalReturnAmt);
    const formattedTotalReturnPct = formatSignedPercentage(totalReturnPct, 1);

    const xirrVal = portfolioSummary.xirr || 0;
    const xirrIsPositive = xirrVal >= 0;
    const formattedXirr = `${xirrIsPositive ? '' : '-'}${Math.abs(xirrVal).toFixed(1)}%`;

    // ─── 2. Money Manager Data ───
    const formattedNetWorth = formatCurrencyWithOptionalNegative(netWorthNum);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    moneyStore.moneyTransactions.forEach((tx) => {
      const tTime = new Date(tx.date).getTime();
      if (tTime >= startOfMonth) {
        if (tx.type === 'income') monthlyIncome += tx.amount;
        else if (tx.type === 'expense') monthlyExpense += tx.amount;
      }
    });

    const formattedMonthlyIncome = formatCurrencyWithOptionalNegative(monthlyIncome);
    const formattedMonthlySpend = formatCurrencyWithOptionalNegative(monthlyExpense);

    const netSavings = monthlyIncome - monthlyExpense;
    const netSavingsIsPositive = netSavings >= 0;
    const formattedNetSavings = formatSignedCurrency(netSavings);

    const savingsRate = monthlyIncome > 0 ? (netSavings / monthlyIncome) * 100 : 0;
    const formattedSavingsRate = `${savingsRate >= 0 ? '' : '-'}${Math.abs(savingsRate).toFixed(0)}%`;

    const payload: WidgetDataModel = {
      portfolioValue: formattedPortfolioValue,
      portfolioInvested: formattedPortfolioInvested,
      portfolioDayChange: formattedPortfolioDayChange,
      portfolioDayAmount: formattedPortfolioDayAmount,
      portfolioTotalReturn: formattedTotalReturn,
      portfolioTotalReturnPct: formattedTotalReturnPct,
      portfolioXirr: formattedXirr,
      portfolioIsPositive,
      totalReturnIsPositive,
      xirrIsPositive,
      netWorth: formattedNetWorth,
      monthlyIncome: formattedMonthlyIncome,
      monthlySpend: formattedMonthlySpend,
      monthlyNetSavings: formattedNetSavings,
      monthlySavingsRate: formattedSavingsRate,
      netSavingsIsPositive,
      lastUpdated: Date.now(),
    };

    await writeToAppGroup('gainbase_widget_data', JSON.stringify(payload));
  } catch (err) {
    console.warn('[WidgetSync] Failed to sync data to iOS Widget:', err);
  }
}
