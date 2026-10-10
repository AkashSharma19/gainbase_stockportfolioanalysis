import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line } from 'react-native-svg';
import {
  Sparkles,
  Zap,
  ArrowRight,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackButton } from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAiStore, AiMoneyInsight } from '@/store/useAiStore';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Category3DIcon } from '@/components/Category3DIcon';
import { findBest3DIconForText } from '@/constants/Category3DIcons';
import {
  FolderPalette,
  getInterlockingCardPath,
  getTicketCardPath,
} from '@/constants/folderTheme';
import { ExpandedFolderContainer } from '@/components/ExpandedFolderContainer';
import { FolderDetailsCard } from '@/components/FolderDetailsCard';

export type CriticalityLevel = 'critical' | 'warning' | 'moderate' | 'positive';

export interface CriticalityPalette extends FolderPalette {
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  label: string;
  border: string;
}

export const CRITICALITY_PALETTES: Record<CriticalityLevel, CriticalityPalette> = {
  critical: {
    bg: '#FEE2E2',      // Soft Red
    text: '#7F1D1D',    // Deep Crimson
    sub: '#991B1B',     // Strong Coral/Red
    badgeBg: '#FECACA',
    badgeText: '#991B1B',
    dotColor: '#EF4444',
    label: 'CRITICAL',
    border: '#FCA5A5',
  },
  warning: {
    bg: '#FFEDD5',      // Soft Orange
    text: '#7C2D12',    // Deep Burnt Orange
    sub: '#9A3412',     // Strong Orange
    badgeBg: '#FED7AA',
    badgeText: '#C2410C',
    dotColor: '#F97316',
    label: 'WARNING',
    border: '#FDBA74',
  },
  moderate: {
    bg: '#FEF08A',      // Soft Butter Yellow / Amber
    text: '#713F12',    // Deep Amber
    sub: '#854D0E',     // Warm Amber
    badgeBg: '#FDE047',
    badgeText: '#854D0E',
    dotColor: '#EAB308',
    label: 'OPPORTUNITY',
    border: '#FACC15',
  },
  positive: {
    bg: '#DCFCE7',      // Soft Mint / Green
    text: '#14532D',    // Deep Forest Green
    sub: '#15803D',     // Emerald
    badgeBg: '#BBF7D0',
    badgeText: '#15803D',
    dotColor: '#22C55E',
    label: 'ON TRACK',
    border: '#86EFAC',
  },
};

export interface InsightCardItem {
  id: string;
  criticality: CriticalityLevel;
  title: string;
  subtitle: string;
  valueHighlight: string;
  icon3D: string;
  palette: CriticalityPalette;
  rationale: string;
  steps: { title: string; desc: string }[];
  actionLabel: string;
  actionPath: string;
}

interface ExpandedItemState {
  item: InsightCardItem;
  origin: { x: number; y: number; width: number; height: number };
  palette: CriticalityPalette;
  isFirst?: boolean;
  isLast?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Domain-Specific 3D Icon Resolver for Financial Insights
// ─────────────────────────────────────────────────────────────
export function getRelevantInsightIcon(title: string, category?: string, type?: string): string {
  const text = (title + ' ' + (category || '') + ' ' + (type || '')).toLowerCase();

  // 1. Credit Card debt / overdue
  if (
    text.includes('credit card') ||
    text.includes('credit limit') ||
    text.includes('card balance') ||
    text.includes('overdue card') ||
    text.includes('overdue credit')
  ) {
    return 'credit_card';
  }

  // 2. Loans, EMIs, Prepayments, Consumer Goods Loans, Mortgages
  if (
    text.includes('loan') ||
    text.includes('emi') ||
    text.includes('mortgage') ||
    text.includes('prepay') ||
    text.includes('debt') ||
    text.includes('lender') ||
    text.includes('consumer goods')
  ) {
    return 'loan';
  }

  // 3. Bank balance, Savings deficit, Overdraft, Checking
  if (
    text.includes('negative balance') ||
    text.includes('overdraft') ||
    text.includes('deficit') ||
    text.includes('savings balance') ||
    text.includes('low balance') ||
    text.includes('bank') ||
    text.includes('checking')
  ) {
    return 'wallet';
  }

  // 4. Emergency fund, FD, Fixed deposit, Liquid cash, Buffer
  if (
    text.includes('emergency') ||
    text.includes('fd') ||
    text.includes('fixed deposit') ||
    text.includes('buffer') ||
    text.includes('runway') ||
    text.includes('safety net') ||
    text.includes('liquidate')
  ) {
    return 'shield';
  }

  // 5. Peer lending, Personal payments, Owed, Recover, Handshake
  if (
    text.includes('recover') ||
    text.includes('peer') ||
    text.includes('friend') ||
    text.includes('owed') ||
    text.includes('lent') ||
    text.includes('personal payment') ||
    text.includes('payable') ||
    text.includes('receivable')
  ) {
    return 'receivable';
  }

  // 6. Subscriptions, recurring, streaming, memberships
  if (
    text.includes('subscription') ||
    text.includes('membership') ||
    text.includes('saas') ||
    text.includes('recurring') ||
    text.includes('streaming') ||
    text.includes('netflix') ||
    text.includes('spotify')
  ) {
    return 'bell';
  }

  // 7. Investments, Wealth, Stocks, Mutual Funds, Compounding, SIP
  if (
    text.includes('invest') ||
    text.includes('stock') ||
    text.includes('sip') ||
    text.includes('mutual fund') ||
    text.includes('portfolio') ||
    text.includes('growth') ||
    text.includes('compounding')
  ) {
    return 'investments';
  }

  // 8. Savings rate, Surplus, Retain
  if (text.includes('savings rate') || text.includes('surplus') || text.includes('saving')) {
    return 'banknote';
  }

  // 9. Dining / Food
  if (
    text.includes('food') ||
    text.includes('dining') ||
    text.includes('swiggy') ||
    text.includes('zomato') ||
    text.includes('restaurant')
  ) {
    return 'food';
  }

  // 10. Grocery / Supermarket
  if (
    text.includes('grocery') ||
    text.includes('groceries') ||
    text.includes('blinkit') ||
    text.includes('instamart') ||
    text.includes('zepto')
  ) {
    return 'grocery';
  }

  // 11. Shopping / Retail / Consumer goods purchase
  if (
    text.includes('shopping') ||
    text.includes('amazon') ||
    text.includes('flipkart') ||
    text.includes('clothes') ||
    text.includes('apparel')
  ) {
    return 'shopping';
  }

  // 12. Utilities / Bills
  if (
    text.includes('bill') ||
    text.includes('electric') ||
    text.includes('water') ||
    text.includes('gas') ||
    text.includes('utility')
  ) {
    return 'receipt';
  }

  // 13. General Budget / Spend velocity / Surge
  if (text.includes('budget') || text.includes('surge') || text.includes('spend')) {
    return 'target';
  }

  // Fallback to Category3DIcons smart matcher or wallet
  const fallback = findBest3DIconForText(text);
  if (fallback && fallback !== 'food') {
    return fallback;
  }
  return 'wallet';
}

// ─────────────────────────────────────────────────────────────
// Tactical Implementation Steps Generator (Zero Duplicate Text)
// ─────────────────────────────────────────────────────────────
function getActionableStepsForInsight(item: {
  title: string;
  message?: string;
  type?: string;
  category?: string;
}): { title: string; desc: string }[] {
  const text = (item.title + ' ' + (item.message || '')).toLowerCase();

  // 1. Negative balance / overdraft / deficit
  if (
    text.includes('negative') ||
    text.includes('deficit') ||
    text.includes('overdraft') ||
    text.includes('plummeted') ||
    text.includes('low balance')
  ) {
    return [
      {
        title: 'Immediate Surplus Reallocation',
        desc: 'Transfer idle cash or liquid deposits from other accounts to clear the deficit and stop overdraft penalty interest.',
      },
      {
        title: 'Audit Auto-Debit Mandates',
        desc: 'Review scheduled recurring EMIs or bill mandates linked to this account to prevent returned payment charges.',
      },
      {
        title: 'Set Minimum Balance Cushion',
        desc: 'Configure an emergency buffer threshold to alert you before balance levels approach zero.',
      },
    ];
  }

  // 2. Credit Card Utilization
  if (
    text.includes('credit') ||
    text.includes('utilization') ||
    text.includes('card balance')
  ) {
    return [
      {
        title: 'Pre-Statement Payment',
        desc: 'Settle outstanding card balances prior to your statement generation date to keep reported utilization under 30%.',
      },
      {
        title: 'Shift Daily Outflows',
        desc: 'Divert routine discretionary purchases to debit or UPI until the billing cycle resets.',
      },
      {
        title: 'Credit Limit Reassessment',
        desc: 'Request a credit limit enhancement with the issuing bank to naturally decrease your utilization ratio.',
      },
    ];
  }

  // 3. Subscriptions & Recurring Fixed Costs
  if (
    text.includes('subscription') ||
    text.includes('recurring') ||
    text.includes('membership') ||
    text.includes('saas') ||
    text.includes('streaming')
  ) {
    return [
      {
        title: '30-Day Activity Audit',
        desc: 'Check if you logged in or actively utilized this service within the past billing cycle.',
      },
      {
        title: 'Family Plan or Annual Tier',
        desc: 'Switch to an annual billing discount or share a multi-user family plan to lower cost per person.',
      },
      {
        title: 'Pause or Deactivate',
        desc: 'Temporarily pause billing until you need the service again to eliminate redundant fixed overhead.',
      },
    ];
  }

  // 4. Food & Dining / Restaurant
  if (
    text.includes('food') ||
    text.includes('dining') ||
    text.includes('restaurant') ||
    text.includes('swiggy') ||
    text.includes('zomato')
  ) {
    return [
      {
        title: 'Batch Food Orders',
        desc: 'Limit food deliveries to designated days to eliminate small order surges and repeated delivery fees.',
      },
      {
        title: 'Weekly Category Cap',
        desc: 'Divide remaining monthly dining allowance into strict weekly spending allocations in Gainbase.',
      },
      {
        title: 'Meal Prep Substitution',
        desc: 'Substituting just two takeaway orders per week with home cooking recovers significant liquid savings.',
      },
    ];
  }

  // 5. Grocery & Shopping
  if (
    text.includes('grocery') ||
    text.includes('groceries') ||
    text.includes('shopping') ||
    text.includes('mart')
  ) {
    return [
      {
        title: 'Bi-Weekly Bulk Purchasing',
        desc: 'Consolidate frequent ad-hoc grocery runs into scheduled bi-weekly orders to cut platform fees.',
      },
      {
        title: 'Essential Pantry List',
        desc: 'Shop using a predefined essentials checklist to eliminate impulse cart additions.',
      },
      {
        title: 'Compare Platform Discounts',
        desc: 'Leverage store cards or loyalty reward channels to earn cashback on household staples.',
      },
    ];
  }

  // 6. Loans & EMIs / Debt Prepayment
  if (
    text.includes('loan') ||
    text.includes('emi') ||
    text.includes('debt') ||
    text.includes('prepay') ||
    text.includes('interest')
  ) {
    return [
      {
        title: 'Principal Prepayment Simulation',
        desc: 'Use the prepayment simulator to evaluate how extra payments directly shave months off your tenure.',
      },
      {
        title: 'Apply Surplus Inflows',
        desc: 'Direct tax refunds, bonuses, or dividend windfalls towards high-interest loan balances.',
      },
      {
        title: 'Confirm Principal Deduction',
        desc: 'Ensure the lending institution applies lump-sum payments directly against the principal balance.',
      },
    ];
  }

  // 7. General Budget Overspend / Surge
  if (
    text.includes('budget') ||
    text.includes('surge') ||
    text.includes('limit') ||
    text.includes('exceeded') ||
    text.includes('overspent')
  ) {
    return [
      {
        title: 'Throttle Daily Spending Velocity',
        desc: 'Slow discretionary purchases for the remainder of the month to avoid exceeding allocated limits.',
      },
      {
        title: 'Reallocate Budget Buffers',
        desc: 'Transfer unused surplus limits from under-budget categories to balance out overspent buckets.',
      },
      {
        title: 'Set Milestone Alerts',
        desc: 'Track weekly progress in Money Analytics to prevent end-of-month budget exhaustion.',
      },
    ];
  }

  // General Fallback
  return [
    {
      title: 'Analyze Root Cause',
      desc: 'Inspect recent transaction logs and account statements to pinpoint anomalous or unexpected charges.',
    },
    {
      title: 'Adjust Budget Allocation',
      desc: 'Realign monthly category targets in Gainbase to match actual cashflow patterns.',
    },
    {
      title: 'Track Weekly Milestone',
      desc: 'Review ledger updates regularly to ensure balances and outlays stay within recommended boundaries.',
    },
  ];
}

export default function MoneyInsightsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  const [cardWidth, setCardWidth] = useState<number>(
    Dimensions.get('window').width - 32,
  );
  const [expandedItem, setExpandedItem] = useState<ExpandedItemState | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRefs = useRef<{ [key: string]: View | null }>({});

  // Hide bottom tab bar dock and disable native back gesture while folder details is expanded
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: expandedItem ? 'none' : undefined },
      gestureEnabled: !expandedItem,
    });
  }, [expandedItem, navigation]);

  // AI Store
  const { geminiApiKey, selectedModel, aiMoneyInsights, setAiMoneyInsights } =
    useAiStore();

  // Money Store (Live User Financial Ledger)
  const {
    accounts,
    moneyTransactions,
    loans,
    budgets,
    subscriptions,
    getNetWorth,
    getMonthlyEMIBurden,
    getMonthlySubscriptionBurden,
    getActiveBudget,
    getCategorySpending,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ─────────────────────────────────────────────────────────────
  // 360° Comprehensive Multi-Angle Financial Intelligence Engine
  // ─────────────────────────────────────────────────────────────
  const ledgerAnalysis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const categorySpendCurrent: Record<string, number> = {};
    const categorySpendPrev: Record<string, number> = {};
    let totalExpenseThisMonth = 0;
    let totalIncomeThisMonth = 0;

    moneyTransactions.forEach((t) => {
      const d = new Date(t.date);
      const m = d.getMonth();
      const y = d.getFullYear();

      if (t.type === 'expense') {
        if (m === currentMonth && y === currentYear) {
          totalExpenseThisMonth += t.amount;
          categorySpendCurrent[t.category] =
            (categorySpendCurrent[t.category] || 0) + t.amount;
        } else if (m === prevMonth && y === prevYear) {
          categorySpendPrev[t.category] =
            (categorySpendPrev[t.category] || 0) + t.amount;
        }
      } else if (t.type === 'income') {
        if (m === currentMonth && y === currentYear) {
          totalIncomeThisMonth += t.amount;
        }
      }
    });

    const sortedCategories = Object.entries(categorySpendCurrent)
      .map(([name, amount]) => {
        const prevAmount = categorySpendPrev[name] || 0;
        const growthPct =
          prevAmount > 0
            ? Math.round(((amount - prevAmount) / prevAmount) * 100)
            : 0;
        const sharePct =
          totalExpenseThisMonth > 0
            ? Math.round((amount / totalExpenseThisMonth) * 100)
            : 0;
        return { name, amount, prevAmount, growthPct, sharePct };
      })
      .sort((a, b) => b.amount - a.amount);

    const activeSubs = subscriptions.filter((s) => s.isActive);
    const activeLoans = loans.filter((l) => l.isActive);
    const creditCardAccounts = accounts.filter(
      (a) => a.type === 'credit_card' && !a.isArchived,
    );
    const nonArchivedAccounts = accounts.filter((a) => !a.isArchived);

    // Liquid funds & runway
    const liquidCash = nonArchivedAccounts
      .filter((a) => a.type === 'savings' || a.type === 'wallet' || a.type === 'emergency_fund')
      .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

    const baselineBurnRate = Math.max(1, totalExpenseThisMonth || 25000);
    const emergencyRunwayMonths = liquidCash / baselineBurnRate;

    const monthlySubCost = activeSubs.reduce((sum, s) => sum + s.amount, 0);
    const topCategory = sortedCategories[0];
    const fastestGrowing = [...sortedCategories].sort(
      (a, b) => b.growthPct - a.growthPct,
    )[0];

    const discretionaryTrim = topCategory ? Math.round(topCategory.amount * 0.18) : 1500;
    const subTrim = Math.round(monthlySubCost * 0.4);
    const dynamicMonthlySavings = Math.max(1200, discretionaryTrim + subTrim);

    return {
      totalExpenseThisMonth,
      totalIncomeThisMonth,
      sortedCategories,
      topCategory,
      fastestGrowing,
      activeSubs,
      activeLoans,
      creditCardAccounts,
      nonArchivedAccounts,
      liquidCash,
      emergencyRunwayMonths,
      monthlySubCost,
      dynamicMonthlySavings,
    };
  }, [moneyTransactions, subscriptions, loans, accounts]);

  // ─────────────────────────────────────────────────────────────
  // Unified Prioritized Feed (All Angles, Color-Coded by Criticality)
  // ─────────────────────────────────────────────────────────────
  const allInsights = useMemo<InsightCardItem[]>(() => {
    // If Gemini AI returned insights, map them with criticality
    if (aiMoneyInsights.length > 0) {
      const geminiList = aiMoneyInsights.map((g, idx) => {
        let criticality: CriticalityLevel = 'moderate';
        if (g.type === 'warning') {
          const lower = (g.title + ' ' + g.message).toLowerCase();
          criticality =
            lower.includes('negative') ||
            lower.includes('deficit') ||
            lower.includes('overdraft') ||
            lower.includes('plummeted') ||
            lower.includes('severe')
              ? 'critical'
              : 'warning';
        } else if (g.type === 'success') {
          criticality = 'positive';
        }

        const icon3D = getRelevantInsightIcon(g.title, g.category, g.type);
        const palette = CRITICALITY_PALETTES[criticality];

        return {
          id: g.id || `gemini-${idx}`,
          criticality,
          title: g.title,
          subtitle: g.potentialSavings || g.value || palette.label,
          valueHighlight: g.potentialSavings || g.value || (criticality === 'critical' ? 'Action Needed' : 'Optimized'),
          icon3D,
          palette,
          rationale: g.message,
          steps: getActionableStepsForInsight(g),
          actionLabel: g.actionLabel || 'View Details',
          actionPath: g.actionPath || '/money-analytics',
        };
      });

      // Sort by criticality: Critical -> Warning -> Moderate -> Positive
      const orderMap: Record<CriticalityLevel, number> = {
        critical: 0,
        warning: 1,
        moderate: 2,
        positive: 3,
      };
      return geminiList.sort((a, b) => orderMap[a.criticality] - orderMap[b.criticality]);
    }

    const items: InsightCardItem[] = [];

    // ── ANGLE 1: Bank Overdraft & Negative Balances (🔴 Critical) ──
    ledgerAnalysis.nonArchivedAccounts.forEach((acc) => {
      if (acc.balance < 0 && acc.type !== 'credit_card') {
        const absBal = Math.abs(acc.balance);
        items.push({
          id: `crit-neg-bal-${acc.id}`,
          criticality: 'critical',
          title: `Clear Negative ${acc.name} Balance`,
          subtitle: `Deficit of ₹${absBal.toLocaleString('en-IN')}`,
          valueHighlight: `Action Needed`,
          icon3D: 'wallet',
          palette: CRITICALITY_PALETTES.critical,
          rationale: `Your ${acc.name} account has dropped to a deficit of ₹${absBal.toLocaleString('en-IN')}. Incurring daily overdraft penalties and risking failed standing instructions. Immediately redirect surplus inflows to stabilize the balance.`,
          steps: getActionableStepsForInsight({
            title: 'Clear Negative Balance',
            message: 'overdraft deficit',
          }),
          actionLabel: `View ${acc.name}`,
          actionPath: `/account-details/${acc.id}`,
        });
      }
    });

    // ── ANGLE 2: Credit Card Utilization (🔴 Critical or 🟠 Warning) ──
    ledgerAnalysis.creditCardAccounts.forEach((cc) => {
      const absBal = Math.abs(cc.balance);
      if (absBal > 0) {
        const limit = cc.creditLimit || 100000;
        const utilPct = Math.round((absBal / limit) * 100);
        const isCrit = utilPct >= 60;
        const critLevel: CriticalityLevel = isCrit ? 'critical' : 'warning';

        items.push({
          id: `alert-cc-${cc.id}`,
          criticality: critLevel,
          title: `${cc.name} Utilization Check`,
          subtitle: `Active balance: ₹${absBal.toLocaleString('en-IN')} (${utilPct}% of limit)`,
          valueHighlight: `${utilPct}% Utilization`,
          icon3D: 'credit_card',
          palette: CRITICALITY_PALETTES[critLevel],
          rationale: `Your ${cc.name} card has an unpaid balance of ₹${absBal.toLocaleString('en-IN')}. Keeping credit utilization under 30% avoids high APR interest and protects your credit score.`,
          steps: getActionableStepsForInsight({
            title: 'Credit Card Utilization',
            message: 'credit card balance',
          }),
          actionLabel: `View ${cc.name}`,
          actionPath: `/account-details/${cc.id}`,
        });
      }
    });

    // ── ANGLE 3: Active Budget Breaches (🟠 Warning) ──
    const activeBudget = getActiveBudget();
    if (activeBudget) {
      const now = new Date();
      const spentMap = getCategorySpending(
        activeBudget.id,
        now.getFullYear(),
        now.getMonth(),
      );
      activeBudget.categories.forEach((cat) => {
        const spent = spentMap[cat.name] || 0;
        if (cat.limit > 0 && spent / cat.limit >= 0.75) {
          const pct = Math.round((spent / cat.limit) * 100);
          const icon3D = getRelevantInsightIcon(cat.name, 'budget');
          items.push({
            id: `alert-budget-${cat.id}`,
            criticality: 'warning',
            title: `${cat.name} at ${pct}% of Budget`,
            subtitle: `₹${Math.max(0, cat.limit - spent).toLocaleString('en-IN')} remaining of ₹${cat.limit.toLocaleString('en-IN')}`,
            valueHighlight: `${pct}% Used`,
            icon3D,
            palette: CRITICALITY_PALETTES.warning,
            rationale: `Your ${cat.name} category has consumed ${pct}% of its ₹${cat.limit.toLocaleString('en-IN')} limit with days remaining in the billing period. Slow spending velocity to avoid budget exhaustion.`,
            steps: getActionableStepsForInsight({
              title: 'Budget Limit',
              message: 'budget threshold exceeded',
            }),
            actionLabel: 'View Budget Details',
            actionPath: `/budget-details/${activeBudget.id}`,
          });
        }
      });
    }

    // ── ANGLE 4: Fast Growing Spending Surge (🟠 Warning) ──
    if (
      ledgerAnalysis.fastestGrowing &&
      ledgerAnalysis.fastestGrowing.growthPct > 20
    ) {
      const fg = ledgerAnalysis.fastestGrowing;
      const icon3D = getRelevantInsightIcon(fg.name, 'surge');
      items.push({
        id: `alert-surge-${fg.name}`,
        criticality: 'warning',
        title: `${fg.name} Spend Surge (+${fg.growthPct}%)`,
        subtitle: `₹${fg.amount.toLocaleString('en-IN')} spent vs ₹${fg.prevAmount.toLocaleString('en-IN')} last cycle`,
        valueHighlight: `+${fg.growthPct}% Surge`,
        icon3D,
        palette: CRITICALITY_PALETTES.warning,
        rationale: `Outlays in ${fg.name} surged by ${fg.growthPct}% compared to your previous billing cycle. Auditing recent transactions can pinpoint anomalous orders and eliminate surge costs.`,
        steps: getActionableStepsForInsight({
          title: fg.name,
          message: 'spending surge velocity',
        }),
        actionLabel: `Inspect ${fg.name}`,
        actionPath: `/all-money-transactions?category=${encodeURIComponent(fg.name)}`,
      });
    }

    // ── ANGLE 5: Top Discretionary Spend Optimization (🟡 Opportunity) ──
    if (ledgerAnalysis.topCategory && ledgerAnalysis.topCategory.amount > 0) {
      const cat = ledgerAnalysis.topCategory;
      const trimAmount = Math.round(cat.amount * 0.18);
      const icon3D = getRelevantInsightIcon(cat.name, 'expense');

      items.push({
        id: `sugg-cat-${cat.name}`,
        criticality: 'moderate',
        title: `Trim ${cat.name} Outlays`,
        subtitle: `Save ₹${trimAmount.toLocaleString('en-IN')}/monthly`,
        valueHighlight: `Save ₹${trimAmount.toLocaleString('en-IN')}/mo`,
        icon3D,
        palette: CRITICALITY_PALETTES.moderate,
        rationale: `${cat.name} represents your single largest spending category this month at ₹${cat.amount.toLocaleString('en-IN')} (${cat.sharePct}% of your total expenditures). A modest 18% reduction will recover ₹${trimAmount.toLocaleString('en-IN')} every month.`,
        steps: getActionableStepsForInsight({
          title: cat.name,
          message: 'dining food delivery trim',
        }),
        actionLabel: `Set ${cat.name} Budget`,
        actionPath: '/add-budget',
      });
    }

    // ── ANGLE 6: Active Subscriptions Audit (🟡 Opportunity) ──
    if (ledgerAnalysis.activeSubs.length > 0) {
      const topSub = ledgerAnalysis.activeSubs[0];
      const icon3D = topSub.logo || getRelevantInsightIcon(topSub.name, 'subscription');

      items.push({
        id: `sugg-sub-${topSub.id}`,
        criticality: 'moderate',
        title: `Audit ${topSub.name} Subscription`,
        subtitle: `Save ₹${topSub.amount.toLocaleString('en-IN')}/${topSub.billingCycle}`,
        valueHighlight: `₹${topSub.amount.toLocaleString('en-IN')}/${topSub.billingCycle}`,
        icon3D,
        palette: CRITICALITY_PALETTES.moderate,
        rationale: `Your active ${topSub.name} subscription costs ₹${topSub.amount.toLocaleString('en-IN')} every ${topSub.billingCycle}. Reviewing usage logs or sharing a group account can eliminate unnecessary recurring expenses.`,
        steps: getActionableStepsForInsight({
          title: topSub.name,
          message: 'subscription audit',
        }),
        actionLabel: `Manage ${topSub.name}`,
        actionPath: '/(tabs)/money-loans',
      });
    }

    // ── ANGLE 7: Loan Principal Prepayment (🟡 Opportunity) ──
    if (ledgerAnalysis.activeLoans.length > 0) {
      const loan = ledgerAnalysis.activeLoans[0];
      const icon3D = loan.icon || 'loan';
      const extraPayment = Math.round(loan.emiAmount * 0.5);

      items.push({
        id: `sugg-loan-${loan.id}`,
        criticality: 'moderate',
        title: `Prepay ${loan.name} Principal`,
        subtitle: `Save interest at ${loan.interestRate}% p.a.`,
        valueHighlight: `${loan.interestRate}% Interest`,
        icon3D,
        palette: CRITICALITY_PALETTES.moderate,
        rationale: `Your ${loan.name} with ${loan.lenderName || 'lender'} has an outstanding principal balance of ₹${loan.outstandingAmount.toLocaleString('en-IN')}. Making an extra prepayment of ₹${extraPayment.toLocaleString('en-IN')} reduces long-term interest burdens substantially.`,
        steps: getActionableStepsForInsight({
          title: loan.name,
          message: 'loan prepayment principal',
        }),
        actionLabel: `Simulate Prepayment`,
        actionPath: `/prepay-loan/${loan.id}`,
      });
    }

    // ── ANGLE 8: Emergency Runway & Buffer (🟢 On Track or 🔴 Critical) ──
    if (ledgerAnalysis.emergencyRunwayMonths >= 3) {
      items.push({
        id: 'pos-runway-healthy',
        criticality: 'positive',
        title: 'Emergency Buffer On Track',
        subtitle: `Reserves cover ${ledgerAnalysis.emergencyRunwayMonths.toFixed(1)} months of burn rate`,
        valueHighlight: `${ledgerAnalysis.emergencyRunwayMonths.toFixed(1)}x Buffer`,
        icon3D: 'shield',
        palette: CRITICALITY_PALETTES.positive,
        rationale: `Your liquid savings of ₹${ledgerAnalysis.liquidCash.toLocaleString('en-IN')} comfortably covers ${ledgerAnalysis.emergencyRunwayMonths.toFixed(1)} months of fixed outflows, providing resilient peace of mind.`,
        steps: [
          {
            title: 'Preserve Liquid Cushion',
            desc: 'Continue routing surplus earnings into high-yield savings or sweep deposits.',
          },
        ],
        actionLabel: 'View Health Score',
        actionPath: '/money-health',
      });
    } else if (ledgerAnalysis.emergencyRunwayMonths < 1) {
      items.push({
        id: 'crit-runway-low',
        criticality: 'critical',
        title: 'Build Emergency Buffer',
        subtitle: `Liquid cash covers only ${ledgerAnalysis.emergencyRunwayMonths.toFixed(1)} months`,
        valueHighlight: 'Low Buffer',
        icon3D: 'shield',
        palette: CRITICALITY_PALETTES.critical,
        rationale: `Your liquid reserves cover under 1 month of current expenditures. Prioritize accumulating a 3-month living expense reserve before increasing discretionary investments.`,
        steps: [
          {
            title: 'Automate Emergency Transfer',
            desc: 'Direct 10% of monthly income to a separate liquid emergency fund.',
          },
        ],
        actionLabel: 'View Net Worth',
        actionPath: '/money-health',
      });
    }

    // ── ANGLE 9: Monthly Savings Rate (🟢 On Track) ──
    if (
      ledgerAnalysis.totalIncomeThisMonth > 0 &&
      ledgerAnalysis.totalIncomeThisMonth > ledgerAnalysis.totalExpenseThisMonth
    ) {
      const savingsRate = Math.round(
        ((ledgerAnalysis.totalIncomeThisMonth - ledgerAnalysis.totalExpenseThisMonth) /
          ledgerAnalysis.totalIncomeThisMonth) *
          100,
      );
      if (savingsRate >= 20) {
        items.push({
          id: 'pos-savings-rate',
          criticality: 'positive',
          title: `Healthy ${savingsRate}% Savings Rate`,
          subtitle: `Retaining surplus cashflow this month`,
          valueHighlight: `${savingsRate}% Saved`,
          icon3D: 'banknote',
          palette: CRITICALITY_PALETTES.positive,
          rationale: `You are currently saving ${savingsRate}% of your total recorded income this month. Maintaining savings rates above 20% accelerates long-term wealth compounding.`,
          steps: [
            {
              title: 'Automate Surplus Sweep',
              desc: 'Transfer monthly excess cash into recurring SIPs or investment deposits.',
            },
          ],
          actionLabel: 'View Cashflow Analytics',
          actionPath: '/money-analytics',
        });
      }
    }

    // Sort by criticality: Critical -> Warning -> Moderate -> Positive
    const orderMap: Record<CriticalityLevel, number> = {
      critical: 0,
      warning: 1,
      moderate: 2,
      positive: 3,
    };
    return items.sort((a, b) => orderMap[a.criticality] - orderMap[b.criticality]);
  }, [ledgerAnalysis, aiMoneyInsights, getActiveBudget, getCategorySpending]);

  // Counts by Criticality
  const criticalityCounts = useMemo(() => {
    return {
      critical: allInsights.filter((i) => i.criticality === 'critical').length,
      warning: allInsights.filter((i) => i.criticality === 'warning').length,
      moderate: allInsights.filter((i) => i.criticality === 'moderate').length,
      positive: allInsights.filter((i) => i.criticality === 'positive').length,
    };
  }, [allInsights]);

  // ─────────────────────────────────────────────────────────────
  // Card Press & Measure for Physical Folder Expansion
  // ─────────────────────────────────────────────────────────────
  const handleCardPress = (
    item: InsightCardItem,
    isFirst: boolean = false,
    isLast: boolean = false,
  ) => {
    handleHaptic();
    const ref = cardRefs.current[item.id];
    if (ref && (ref as any).measureInWindow) {
      (ref as any).measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) {
            setExpandedItem({
              item,
              origin: { x, y, width, height },
              palette: item.palette,
              isFirst,
              isLast,
            });
          } else {
            setExpandedItem({
              item,
              origin: { x: 16, y: 220, width: cardWidth, height: 118 },
              palette: item.palette,
              isFirst,
              isLast,
            });
          }
        },
      );
    } else {
      setExpandedItem({
        item,
        origin: { x: 16, y: 220, width: cardWidth, height: 118 },
        palette: item.palette,
        isFirst,
        isLast,
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Render Interlocking Card (Color-Coded by Criticality)
  // ─────────────────────────────────────────────────────────────
  const renderInterlockingCard = (
    item: InsightCardItem,
    index: number,
    totalCount: number,
  ) => {
    const isFirst = index === 0;
    const isLast = index === totalCount - 1;
    const palette = item.palette;

    const hBody = 92;
    const tabH = 26;
    const tabW = 90;
    const totalH = hBody + tabH;
    const path = getInterlockingCardPath(
      cardWidth,
      hBody,
      tabW,
      tabH,
      18,
      isFirst,
      isLast,
      24,
    );

    return (
      <TouchableOpacity
        key={item.id}
        ref={(r) => {
          cardRefs.current[item.id] = r;
        }}
        style={{
          height: totalH,
          marginTop: isFirst ? 0 : -tabH,
          zIndex: totalCount - index,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1.5 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 1,
        }}
        activeOpacity={0.84}
        onPress={() => handleCardPress(item, isFirst, isLast)}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={cardWidth} height={totalH}>
            <Path
              d={path}
              fill={palette.bg}
              stroke={isDark ? 'transparent' : palette.border || palette.sub + '55'}
              strokeWidth={1.2}
            />
          </Svg>
        </View>

        {/* Right Tab Lobe with 3D Icon */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 14,
            width: tabW - 14,
            height: hBody,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Category3DIcon name={item.icon3D} size={38} />
        </View>

        {/* Left Body Content */}
        <View
          style={{
            position: 'absolute',
            top: tabH,
            left: 20,
            height: hBody,
            justifyContent: 'center',
            paddingRight: tabW + 12,
          }}
        >
          <ThemedText
            style={[styles.curvedCardTitle, { color: palette.text }]}
            numberOfLines={1}
          >
            {item.title}
          </ThemedText>
          <ThemedText
            style={[styles.curvedCardSubtitle, { color: palette.sub }]}
            numberOfLines={1}
          >
            {item.subtitle}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Top Summary Ticket Hero Card (With Criticality Breakdown)
  // ─────────────────────────────────────────────────────────────
  const renderSummaryTicketCard = () => {
    // Determine overall priority palette based on worst criticality
    const topCriticality: CriticalityLevel =
      criticalityCounts.critical > 0
        ? 'critical'
        : criticalityCounts.warning > 0
          ? 'warning'
          : criticalityCounts.moderate > 0
            ? 'moderate'
            : 'positive';

    const palette = CRITICALITY_PALETTES[topCriticality];

    const w = cardWidth;
    const h = 122;
    const notchY = 74;
    const notchR = 10;
    const path = getTicketCardPath(w, h, notchY, notchR, 22);

    const title = 'AI 360° FINANCIAL DIAGNOSIS';
    const mainAmount =
      topCriticality === 'critical'
        ? `${criticalityCounts.critical} Immediate Risks Detected`
        : (showCurrencySymbol ? '₹' : '') +
          `${ledgerAnalysis.dynamicMonthlySavings.toLocaleString('en-IN')}/mo Potential Savings`;

    return (
      <View
        style={{
          width: w,
          height: h,
          alignSelf: 'center',
          marginBottom: 16,
          shadowColor: isDark ? '#000000' : palette.sub,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.08 : 0.12,
          shadowRadius: isDark ? 4 : 8,
          elevation: 2,
        }}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={w} height={h}>
            <Path
              d={path}
              fill={palette.bg}
              stroke={isDark ? 'transparent' : palette.border}
              strokeWidth={1.5}
            />
            {/* Perforated dashed divider line connecting the side notches */}
            <Line
              x1={notchR + 6}
              y1={notchY}
              x2={w - notchR - 6}
              y2={notchY}
              stroke={isDark ? palette.text + '35' : palette.sub + 'B0'}
              strokeWidth={1.5}
              strokeDasharray="5, 4"
            />
          </Svg>
        </View>

        {/* Top Ticket Section */}
        <View
          style={{
            height: notchY,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <ThemedText
              style={{
                fontSize: 10,
                fontFamily: 'Outfit_700Bold',
                letterSpacing: 0.8,
                color: palette.sub,
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {title}
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 22,
                fontFamily: 'Outfit_600SemiBold',
                color: palette.text,
              }}
              numberOfLines={1}
            >
              {mainAmount}
            </ThemedText>
          </View>
        </View>

        {/* Bottom Ticket Stub (Criticality Breakdown Indicators) */}
        <View
          style={{
            height: h - notchY,
            paddingHorizontal: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Criticality Pills Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {criticalityCounts.critical > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EF4444' }} />
                <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: palette.text }}>
                  {criticalityCounts.critical}
                </ThemedText>
              </View>
            )}
            {criticalityCounts.warning > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#F97316' }} />
                <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: palette.text }}>
                  {criticalityCounts.warning}
                </ThemedText>
              </View>
            )}
            {criticalityCounts.moderate > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EAB308' }} />
                <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: palette.text }}>
                  {criticalityCounts.moderate}
                </ThemedText>
              </View>
            )}
            {criticalityCounts.positive > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22C55E' }} />
                <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: palette.text }}>
                  {criticalityCounts.positive}
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText
            style={{
              fontSize: 12,
              fontFamily: 'Outfit_600SemiBold',
              color: palette.sub,
            }}
          >
            {allInsights.length} Total Findings
          </ThemedText>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Render Expanded Card Preview for Morph Physics
  // ─────────────────────────────────────────────────────────────
  const renderExpandedCardPreview = (expanded: ExpandedItemState) => {
    const palette = expanded.palette;
    const w = expanded.origin.width || cardWidth;
    const hBody = 92;
    const tabH = 26;
    const tabW = 90;
    const totalH = hBody + tabH;
    const isFirst = expanded.isFirst ?? false;
    const isLast = expanded.isLast ?? false;
    const path = getInterlockingCardPath(
      w,
      hBody,
      tabW,
      tabH,
      18,
      isFirst,
      isLast,
      24,
    );

    return (
      <View style={{ width: w, height: totalH, alignSelf: 'center' }}>
        <Svg width={w} height={totalH}>
          <Path
            d={path}
            fill={palette.bg}
            stroke={isDark ? 'transparent' : palette.sub + '55'}
            strokeWidth={1.2}
          />
        </Svg>
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 14,
            width: tabW - 14,
            height: hBody,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Category3DIcon name={expanded.item.icon3D} size={38} />
        </View>
        <View
          style={{
            position: 'absolute',
            top: tabH,
            left: 20,
            height: hBody,
            justifyContent: 'center',
            paddingRight: tabW + 12,
          }}
        >
          <ThemedText
            style={[styles.curvedCardTitle, { color: palette.text }]}
            numberOfLines={1}
          >
            {expanded.item.title}
          </ThemedText>
          <ThemedText
            style={[styles.curvedCardSubtitle, { color: palette.sub }]}
            numberOfLines={1}
          >
            {expanded.item.subtitle}
          </ThemedText>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Gemini AI Analysis Trigger (Sending Live Ledger Data)
  // ─────────────────────────────────────────────────────────────
  const handleGenerateAi = async () => {
    if (!geminiApiKey.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Gemini API Key Required',
        'Configure your Gemini Developer API Key in AI Chat Settings to enable live LLM ledger evaluation.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Configure', onPress: () => router.push('/ai-chat') },
        ],
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);

    try {
      const netWorth = getNetWorth();
      const monthlyEmiBurden = getMonthlyEMIBurden();
      const monthlySubBurden = getMonthlySubscriptionBurden();

      const accountsSummary = accounts
        .filter((a) => !a.isArchived)
        .map((a) => `- ${a.name} (${a.type}): Balance ₹${a.balance.toLocaleString('en-IN')}`)
        .join('\n');

      const categorySummary = ledgerAnalysis.sortedCategories
        .slice(0, 8)
        .map((c) => `- ${c.name}: ₹${c.amount.toLocaleString('en-IN')} (${c.sharePct}%)`)
        .join('\n');

      const subscriptionsSummary = subscriptions
        .filter((s) => s.isActive)
        .map((s) => `- ${s.name}: ₹${s.amount.toLocaleString('en-IN')}/${s.billingCycle}`)
        .join('\n');

      const loansSummary = loans
        .filter((l) => l.isActive)
        .map((l) => `- ${l.name}: Principal ₹${l.outstandingAmount.toLocaleString('en-IN')}, EMI ₹${l.emiAmount.toLocaleString('en-IN')}/mo`)
        .join('\n');

      const prompt = `You are Gainbase AI, an institutional-grade personal wealth strategist. Analyze this user's real financial ledger:

[FINANCIAL METRICS]
Net Worth: ₹${netWorth.toLocaleString('en-IN')}
Monthly EMI Burden: ₹${monthlyEmiBurden.toLocaleString('en-IN')}
Monthly Subscription Burden: ₹${monthlySubBurden.toLocaleString('en-IN')}

[ACCOUNTS]
${accountsSummary || 'No accounts logged'}

[CATEGORY SPENDING THIS MONTH]
${categorySummary || 'No expenses logged'}

[ACTIVE SUBSCRIPTIONS]
${subscriptionsSummary || 'No active subscriptions'}

[ACTIVE LOANS & DEBT]
${loansSummary || 'No active debt'}

TASK:
Generate 6 highly personalized, quantitative optimization proposals referencing the user's specific account names, category spending amounts, subscriptions, and loans.
Format strictly as a JSON array of objects with fields:
- "id": unique string
- "type": "warning" | "tip" | "success"
- "title": punchy 3-5 word proposal mentioning the real category or service name
- "potentialSavings": e.g. "Save ₹1,500/month" or "Action Needed"
- "message": 2 crisp sentences explaining the exact quantitative root cause and observation
- "actionLabel": e.g. "Adjust Budget", "Manage Subscriptions", "View Accounts"
- "actionPath": one of "/money-analytics", "/(tabs)/money-accounts", "/(tabs)/money-loans", "/add-budget", "/manage-categories"`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    type: {
                      type: 'STRING',
                      enum: ['warning', 'tip', 'success'],
                    },
                    title: { type: 'STRING' },
                    potentialSavings: { type: 'STRING' },
                    message: { type: 'STRING' },
                    actionLabel: { type: 'STRING' },
                    actionPath: { type: 'STRING' },
                  },
                  required: [
                    'id',
                    'type',
                    'title',
                    'potentialSavings',
                    'message',
                    'actionLabel',
                    'actionPath',
                  ],
                },
              },
            },
          }),
        },
      );

      const data = await response.json();
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const parsed: AiMoneyInsight[] = JSON.parse(
          data.candidates[0].content.parts[0].text,
        );
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAiMoneyInsights(parsed);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (e) {
      console.error(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: currColors.background }]}
        edges={['top']}
      >
        {/* ─── 1. Header (Centered, matching Accounts & Loans pages) ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeftAction}>
            {router.canGoBack() && <BackButton />}
          </View>

          <View style={styles.headerCenterTitle}>
            <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
              AI Insights
            </ThemedText>
            <View
              style={[
                styles.headerBadge,
                {
                  backgroundColor: isDark
                    ? currColors.cardSecondary
                    : '#E2E8F0',
                },
              ]}
            >
              <ThemedText
                style={[styles.headerBadgeText, { color: currColors.textSecondary }]}
              >
                {allInsights.length}
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerRightAction}
            onPress={handleGenerateAi}
            disabled={isGenerating}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#00A3FF" />
            ) : (
              <Sparkles size={20} color={currColors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* ─── 2. Scrollable Unified Feed (NO Tabs, Single Cohesive Page) ─── */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Summary Ticket Hero Card */}
          {renderSummaryTicketCard()}

          {/* Unified Interlocking Cards Container */}
          <View
            style={styles.cardListContainer}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0) setCardWidth(w);
            }}
          >
            {allInsights.map((item, index) =>
              renderInterlockingCard(item, index, allInsights.length),
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ─── Seamless Folder Expanding & Collapsing Container ─── */}
      {expandedItem && (
        <ExpandedFolderContainer
          isOpen={!!expandedItem}
          origin={expandedItem.origin}
          palette={expandedItem.palette}
          cardPreview={renderExpandedCardPreview(expandedItem)}
          onClose={() => setExpandedItem(null)}
          disableBackGesture={true}
        >
          {(triggerClose) => (
            <InsightDetailsContent
              item={expandedItem.item}
              palette={expandedItem.palette}
              onBack={triggerClose}
            />
          )}
        </ExpandedFolderContainer>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Folder Dossier Detail View (Full Consistent Width, Zero Repetition)
// ─────────────────────────────────────────────────────────────
function InsightDetailsContent({
  item,
  palette,
  onBack,
}: {
  item: InsightCardItem;
  palette: CriticalityPalette;
  onBack: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onBack();
    if (item.actionPath) {
      router.push(item.actionPath as any);
    }
  };

  const headerTopPadding = Math.max(
    insets.top,
    Platform.OS === 'ios' ? 56 : 32,
  );

  return (
    <View
      style={[
        styles.detailsRoot,
        { backgroundColor: isDark ? '#000000' : '#F8FAFC' },
      ]}
    >
      {/* Detail Header with Back Button */}
      <View
        style={[
          styles.detailsHeader,
          {
            paddingTop: headerTopPadding,
            backgroundColor: isDark ? '#000000' : '#F8FAFC',
          },
        ]}
      >
        <BackButton onPress={onBack} />
        <ThemedText
          style={[styles.detailsHeaderTitle, { color: currColors.text }]}
          numberOfLines={1}
        >
          {item.title}
        </ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.detailsScrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* 1. Folder Dossier Hero Card */}
        <FolderDetailsCard
          palette={palette}
          headerTitle={item.title}
          headerSubtitle={
            (item.valueHighlight || item.subtitle) ? (
              <ThemedText
                style={{
                  fontSize: 13,
                  fontFamily: 'Outfit_500Medium',
                  color: palette.sub,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {item.valueHighlight || item.subtitle}
              </ThemedText>
            ) : undefined
          }
          tabRightContent={
            <Category3DIcon name={item.icon3D} size={42} />
          }
        >
          {/* Detailed Quantitative Rationale */}
          <ThemedText
            style={[
              styles.dossierText,
              {
                color: palette.sub,
                fontFamily: 'Outfit_400Regular',
                marginTop: 4,
                marginBottom: 16,
                lineHeight: 22,
                fontSize: 14,
              },
            ]}
          >
            {item.rationale}
          </ThemedText>

          {/* Minimal Action Pill Button */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'flex-start',
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: 20,
              backgroundColor: palette.text,
              gap: 6,
            }}
            activeOpacity={0.85}
            onPress={handleAction}
          >
            <ThemedText
              style={{
                color: palette.bg,
                fontSize: 13,
                fontFamily: 'Outfit_600SemiBold',
              }}
            >
              {item.actionLabel}
            </ThemedText>
            <ArrowRight size={14} color={palette.bg} />
          </TouchableOpacity>
        </FolderDetailsCard>

        {/* 2. Step-by-Step Implementation Cards (Zero Text Repetition) */}
        <View style={styles.planSection}>
          <ThemedText
            style={[
              styles.sectionTitle,
              { color: currColors.textSecondary, marginBottom: 12 },
            ]}
          >
            ACTIONABLE IMPLEMENTATION PLAN
          </ThemedText>

          {item.steps.map((s, idx) => (
            <View
              key={idx}
              style={[
                styles.planCard,
                {
                  backgroundColor: currColors.card,
                  borderColor: currColors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.planIndexBadge,
                  { backgroundColor: palette.bg },
                ]}
              >
                <ThemedText
                  style={{
                    fontSize: 12,
                    fontFamily: 'Outfit_700Bold',
                    color: palette.text,
                  }}
                >
                  {idx + 1}
                </ThemedText>
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[
                    styles.planTitle,
                    { color: currColors.text, fontFamily: 'Outfit_600SemiBold' },
                  ]}
                >
                  {s.title}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.planDesc,
                    {
                      color: currColors.textSecondary,
                      fontFamily: 'Outfit_400Regular',
                    },
                  ]}
                >
                  {s.desc}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeftAction: {
    width: 38,
    alignItems: 'flex-start',
  },
  headerCenterTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  headerBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  headerBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
  },
  headerRightAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingBottom: 160,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardListContainer: {
    marginHorizontal: 16,
  },

  /* Interlocking Cards */
  curvedCardTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  curvedCardSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },

  /* Details Screen (Full consistent width) */
  detailsRoot: {
    flex: 1,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  detailsHeaderTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  detailsScrollContent: {
    paddingBottom: 40,
  },
  planSection: {
    marginHorizontal: 16,
    marginTop: 10,
  },
  dossierValue: {
    marginBottom: 0,
  },
  dossierDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 1,
    marginBottom: 14,
  },
  dossierText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  dossierActionsRow: {
    borderTopWidth: 1,
    paddingTop: 14,
    flexDirection: 'row',
  },
  dossierPrimaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dossierPrimaryBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },

  /* Implementation Steps */
  planCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: 'flex-start',
    gap: 14,
  },
  planIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
