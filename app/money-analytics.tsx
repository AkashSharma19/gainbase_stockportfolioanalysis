import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
  Check,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Category3DIcon } from '@/components/Category3DIcon';
import { BackButton } from '@/components/BackButton';

const SCREEN_WIDTH = Dimensions.get('window').width;

const DEFAULT_CATEGORY_METADATA: Record<string, { icon: string; color: string }> = {
  'Food & Dining': { icon: 'food', color: '#FF3B30' },
  'Rent & Bills': { icon: 'receipt', color: '#007AFF' },
  'Shopping': { icon: 'shopping', color: '#FF9500' },
  'Entertainment': { icon: 'clapperboard', color: '#AF52DE' },
  'Travel': { icon: 'travel', color: '#34C759' },
  'Medical': { icon: 'medical', color: '#FF2D55' },
  'Education': { icon: 'education', color: '#5AC8FA' },
  'Food': { icon: 'food', color: '#FF6B6B' },
  'Junk': { icon: 'cookie', color: '#FF922B' },
  'Shopping - Electronics': { icon: 'laptop', color: '#5856D6' },
  'Shopping - Clothes': { icon: 'clothes', color: '#FD79A8' },
  'Subscriptions - OTT': { icon: 'tv', color: '#CC5DE8' },
  'Subscriptions - WiFi': { icon: 'internet', color: '#4DABF7' },
  'House': { icon: 'house', color: '#20C997' },
  'Electricity Bill': { icon: 'electric', color: '#FFCC00' },
  'Transport - Fuel': { icon: 'fuel', color: '#FF8E53' },
  'Transport - Cab': { icon: 'car', color: '#FCC419' },
  'Maintainance': { icon: 'wrench', color: '#8E8E93' },
  'Maintenance': { icon: 'wrench', color: '#8E8E93' },
  'Travel/ Trips': { icon: 'compass', color: '#748FFC' },
  'Family': { icon: 'home_garden', color: '#B33771' },
  'Gifts': { icon: 'gift', color: '#E84393' },
  'EMI Payments': { icon: 'credit_card', color: '#A06A42' },
  'Salary': { icon: 'banknote', color: '#34C759' },
  'Investments': { icon: 'investments', color: '#00C9A7' },
  'Business': { icon: 'briefcase', color: '#007AFF' },
  'Refund': { icon: 'money', color: '#5856D6' },
  'Others': { icon: 'package', color: '#8E8E93' },
  'Other': { icon: 'package', color: '#8E8E93' },
};

const CATEGORY_COLORS = [
  '#FF3B30', '#007AFF', '#FF9500', '#34C759', '#AF52DE', '#FF2D55',
  '#5AC8FA', '#FFCC00', '#5856D6', '#00C9A7', '#FF6B6B', '#4DABF7',
  '#FF922B', '#51CF66', '#CC5DE8', '#FF8787', '#20C997', '#FCC419',
  '#748FFC', '#FF8E53', '#A06A42', '#8E8E93', '#FD79A8', '#6C5CE7',
];

const getCategoryColor = (name: string, customMeta?: Record<string, { icon: string; color: string }>) => {
  if (customMeta?.[name]?.color) return customMeta[name].color;
  if (DEFAULT_CATEGORY_METADATA[name]?.color) return DEFAULT_CATEGORY_METADATA[name].color;
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
};

type TimeFrame = 'month' | 'quarter' | 'year' | 'all';
type AnalyticsTab = 'expense' | 'income' | 'surplus';
type SortOption = 'amount' | 'name' | 'count';

export default function MoneyAnalyticsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { moneyTransactions, categoryMetadata } = useMoneyStore();
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const [timeFrame, setTimeFrame] = useState<TimeFrame>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('expense');
  const [sortBy, setSortBy] = useState<SortOption>('amount');
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  const [showTimeframeModal, setShowTimeframeModal] = useState(false);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatAmount = (val: number, includeSign = false) => {
    if (isPrivacyMode) return '••••••';
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const symbol = showCurrencySymbol ? '₹' : '';
    if (includeSign) {
      const sign = val > 0 ? '+' : val < 0 ? '-' : '';
      return `${sign}${symbol}${formatted}`;
    }
    const prefix = val < 0 ? '-' : '';
    return `${prefix}${symbol}${formatted}`;
  };

  const getPeriodDateBounds = (date: Date, tf: TimeFrame) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    if (tf === 'month') {
      const start = new Date(y, m, 1, 0, 0, 0, 0);
      const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        dateLabel: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
      };
    } else if (tf === 'quarter') {
      const q = Math.floor(m / 3);
      const start = new Date(y, q * 3, 1, 0, 0, 0, 0);
      const end = new Date(y, (q + 1) * 3, 0, 23, 59, 59, 999);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        dateLabel: `Q${q + 1} ${y}`,
      };
    } else if (tf === 'year') {
      const start = new Date(y, 0, 1, 0, 0, 0, 0);
      const end = new Date(y, 11, 31, 23, 59, 59, 999);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        dateLabel: `${y}`,
      };
    }
    return {
      startDate: undefined,
      endDate: undefined,
      dateLabel: 'All Time',
    };
  };

  // ─── Timeframe Controls & Label ───
  const timeframeLabel = useMemo(() => {
    if (timeFrame === 'all') return 'All Time';
    if (timeFrame === 'year') return `${selectedDate.getFullYear()}`;
    if (timeFrame === 'quarter') {
      const q = Math.floor(selectedDate.getMonth() / 3) + 1;
      return `Q${q} ${selectedDate.getFullYear()}`;
    }
    return selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [timeFrame, selectedDate]);

  const handlePrevPeriod = () => {
    handleHaptic();
    setFocusedCategory(null);
    const newDate = new Date(selectedDate);
    newDate.setDate(1);
    if (timeFrame === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (timeFrame === 'quarter') {
      newDate.setMonth(newDate.getMonth() - 3);
    } else if (timeFrame === 'year') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setSelectedDate(newDate);
  };

  const handleNextPeriod = () => {
    handleHaptic();
    setFocusedCategory(null);
    const newDate = new Date(selectedDate);
    newDate.setDate(1);
    if (timeFrame === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (timeFrame === 'quarter') {
      newDate.setMonth(newDate.getMonth() + 3);
    } else if (timeFrame === 'year') {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setSelectedDate(newDate);
  };

  // ─── Filtered Transactions for Selected Timeframe ───
  const periodTransactions = useMemo(() => {
    const currYear = selectedDate.getFullYear();
    const currMonth = selectedDate.getMonth();
    const currQuarter = Math.floor(currMonth / 3);

    return moneyTransactions.filter((tx) => {
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();
      const txQuarter = Math.floor(txMonth / 3);

      if (timeFrame === 'all') return true;
      if (timeFrame === 'year') return txYear === currYear;
      if (timeFrame === 'quarter') return txYear === currYear && txQuarter === currQuarter;
      return txYear === currYear && txMonth === currMonth;
    });
  }, [moneyTransactions, timeFrame, selectedDate]);

  // ─── Overview Metrics ───
  const overviewMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    periodTransactions.forEach((tx) => {
      if (tx.type === 'income') {
        income += tx.amount;
        incomeCount += 1;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
        expenseCount += 1;
      }
    });

    const netSurplus = income - expense;
    const savingsRate = income > 0 ? (netSurplus / income) * 100 : expense > 0 ? -100 : 0;

    return {
      income,
      expense,
      incomeCount,
      expenseCount,
      netSurplus,
      savingsRate,
      txCount: periodTransactions.length,
    };
  }, [periodTransactions]);

  // ─── Category Breakdown Aggregations for Active Category Tab ───
  const currentCategoryType = activeTab === 'income' ? 'income' : 'expense';

  const categoryData = useMemo(() => {
    const totals: Record<string, { amount: number; count: number; color: string; icon: string }> = {};
    let totalAmount = 0;

    periodTransactions.forEach((tx) => {
      if (tx.type !== currentCategoryType) return;
      totalAmount += tx.amount;

      if (!totals[tx.category]) {
        const color = getCategoryColor(tx.category, categoryMetadata);
        const icon = categoryMetadata?.[tx.category]?.icon || DEFAULT_CATEGORY_METADATA[tx.category]?.icon;
        totals[tx.category] = { amount: 0, count: 0, color, icon: icon || '' };
      }
      totals[tx.category].amount += tx.amount;
      totals[tx.category].count += 1;
    });

    const list = Object.keys(totals).map((name) => ({
      name,
      amount: totals[name].amount,
      count: totals[name].count,
      color: totals[name].color,
      icon: totals[name].icon,
      percentage: totalAmount > 0 ? (totals[name].amount / totalAmount) * 100 : 0,
    }));

    if (sortBy === 'amount') {
      list.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'count') {
      list.sort((a, b) => b.count - a.count);
    }

    return { list, totalAmount };
  }, [periodTransactions, currentCategoryType, categoryMetadata, sortBy]);

  // ─── 12-Month Trend Aggregation ───
  const monthlyTrends = useMemo(() => {
    const list: {
      year: number;
      month: number;
      monthKey: string;
      monthLabel: string;
      fullLabel: string;
      income: number;
      expense: number;
      surplus: number;
      savingsRate: number;
    }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthKey = `${year}-${month}`;
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      const fullLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' });

      list.push({
        year,
        month,
        monthKey,
        monthLabel,
        fullLabel,
        income: 0,
        expense: 0,
        surplus: 0,
        savingsRate: 0,
      });
    }

    moneyTransactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const txKey = `${txDate.getFullYear()}-${txDate.getMonth()}`;
      const item = list.find((x) => x.monthKey === txKey);
      if (item) {
        if (tx.type === 'income') item.income += tx.amount;
        else if (tx.type === 'expense') item.expense += tx.amount;
      }
    });

    list.forEach((item) => {
      item.surplus = item.income - item.expense;
      item.savingsRate = item.income > 0 ? (item.surplus / item.income) * 100 : item.expense > 0 ? -100 : 0;
    });

    // Find first non-empty month
    let firstActiveIndex = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i].income > 0 || list[i].expense > 0) {
        firstActiveIndex = i;
        break;
      }
    }

    const activeList = list.slice(firstActiveIndex);
    return activeList.length > 0 ? activeList : list.slice(6);
  }, [moneyTransactions]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ─── Top Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BackButton />
          <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
            Money Analytics
          </ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.timeframePill, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
          onPress={() => {
            handleHaptic();
            setShowTimeframeModal(true);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Calendar size={13} color="#00C9A7" />
          <ThemedText style={[styles.timeframePillText, { color: currColors.text }]}>
            {timeFrame.toUpperCase()}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* ─── Period Navigator Banner (When Not All-Time) ─── */}
        {timeFrame !== 'all' && (
          <View style={[styles.periodNavigator, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <TouchableOpacity onPress={handlePrevPeriod} style={styles.navArrowBtn} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronLeft size={20} color={currColors.text} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <ThemedText type="semiBold" style={[styles.periodNavLabel, { color: currColors.text }]}>
                {timeframeLabel}
              </ThemedText>
              <ThemedText style={[styles.periodNavSubtitle, { color: currColors.textSecondary }]}>
                {overviewMetrics.txCount} {overviewMetrics.txCount === 1 ? 'transaction' : 'transactions'}
              </ThemedText>
            </View>
            <TouchableOpacity onPress={handleNextPeriod} style={styles.navArrowBtn} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronRight size={20} color={currColors.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── 3 Simplified Primary Tabs (Expense / Income / Surplus) ─── */}
        <View style={[styles.segmentedTabBar, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <TouchableOpacity
            style={[
              styles.segmentedTabBtn,
              activeTab === 'expense' && { backgroundColor: '#FF3B30' },
            ]}
            activeOpacity={0.75}
            onPress={() => {
              handleHaptic();
              setActiveTab('expense');
              setFocusedCategory(null);
            }}
          >
            <ThemedText
              style={[
                styles.segmentedTabText,
                {
                  color: activeTab === 'expense' ? '#FFFFFF' : currColors.textSecondary,
                  fontFamily: activeTab === 'expense' ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
                },
              ]}
            >
              Expense
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentedTabBtn,
              activeTab === 'income' && { backgroundColor: '#34C759' },
            ]}
            activeOpacity={0.75}
            onPress={() => {
              handleHaptic();
              setActiveTab('income');
              setFocusedCategory(null);
            }}
          >
            <ThemedText
              style={[
                styles.segmentedTabText,
                {
                  color: activeTab === 'income' ? '#FFFFFF' : currColors.textSecondary,
                  fontFamily: activeTab === 'income' ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
                },
              ]}
            >
              Income
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentedTabBtn,
              activeTab === 'surplus' && { backgroundColor: '#00C9A7' },
            ]}
            activeOpacity={0.75}
            onPress={() => {
              handleHaptic();
              setActiveTab('surplus');
              setFocusedCategory(null);
            }}
          >
            <ThemedText
              style={[
                styles.segmentedTabText,
                {
                  color: activeTab === 'surplus' ? '#FFFFFF' : currColors.textSecondary,
                  fontFamily: activeTab === 'surplus' ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
                },
              ]}
            >
              Surplus
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* ─── TAB 1 & 2: EXPENSE / INCOME BREAKDOWN ─── */}
        {(activeTab === 'expense' || activeTab === 'income') && (
          <View>
            {/* Header summary row & sort button */}
            <View style={styles.subFilterRow}>
              <View>
                <ThemedText type="semiBold" style={{ fontSize: 18, color: activeTab === 'expense' ? '#FF3B30' : '#34C759' }}>
                  {formatAmount(categoryData.totalAmount)}
                </ThemedText>
                <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_400Regular', color: currColors.textSecondary }}>
                  {activeTab === 'expense' ? overviewMetrics.expenseCount : overviewMetrics.incomeCount}{' '}
                  {(activeTab === 'expense' ? overviewMetrics.expenseCount : overviewMetrics.incomeCount) === 1
                    ? 'transaction'
                    : 'transactions'}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[styles.sortButton, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
                activeOpacity={0.7}
                onPress={() => {
                  handleHaptic();
                  setSortBy(sortBy === 'amount' ? 'count' : sortBy === 'count' ? 'name' : 'amount');
                }}
              >
                <ArrowUpDown size={12} color={currColors.textSecondary} />
                <ThemedText style={[styles.sortButtonText, { color: currColors.textSecondary }]}>
                  {sortBy === 'amount' ? 'By Amount' : sortBy === 'count' ? 'By Frequency' : 'A-Z'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Category Ranking Grouped Card */}
            <View style={styles.sectionHeaderMargin}>
              <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                {activeTab.toUpperCase()} BREAKDOWN
              </ThemedText>
            </View>

            <View style={[styles.groupedListCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              {categoryData.list.length === 0 ? (
                <View style={styles.emptyState}>
                  <ThemedText style={{ color: currColors.textSecondary, fontSize: 13, fontFamily: 'Outfit_400Regular' }}>
                    No {activeTab} transactions recorded for this period.
                  </ThemedText>
                </View>
              ) : (
                categoryData.list.map((item, index) => {
                  const isLast = index === categoryData.list.length - 1;
                  const isFocused = focusedCategory === item.name;
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.categoryRowItem,
                        !isLast && { borderBottomWidth: 1, borderBottomColor: currColors.border },
                        isFocused && { backgroundColor: `${item.color}14` },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        handleHaptic();
                        const bounds = getPeriodDateBounds(selectedDate, timeFrame);
                        router.push({
                          pathname: '/all-money-transactions',
                          params: {
                            category: item.name,
                            type: activeTab === 'income' ? 'income' : 'expense',
                            startDate: bounds.startDate,
                            endDate: bounds.endDate,
                            dateLabel: bounds.dateLabel,
                          },
                        });
                      }}
                    >
                      <View style={styles.categoryMain}>
                        <Category3DIcon
                          name={item.name}
                          icon={item.icon}
                          size={34}
                          style={{ marginRight: 12 }}
                        />
                        <View style={styles.categoryInfo}>
                          <ThemedText style={[styles.categoryName, { color: currColors.text }]} numberOfLines={1}>
                            {item.name}
                          </ThemedText>
                          <ThemedText style={[styles.categorySub, { color: currColors.textSecondary }]}>
                            {item.count} {item.count === 1 ? 'transaction' : 'transactions'}
                          </ThemedText>
                        </View>

                        <View style={styles.categoryValues}>
                          <ThemedText type="semiBold" style={[styles.primaryValue, { color: currColors.text }]}>
                            {item.percentage.toFixed(2)}%
                          </ThemedText>
                          <ThemedText style={[styles.secondaryValue, { color: currColors.textSecondary }]}>
                            {formatAmount(item.amount)}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Full-width Contribution Progress Bar matching analytics.tsx */}
                      <View style={[styles.contributionProgressBarContainer, { backgroundColor: currColors.cardSecondary }]}>
                        <View
                          style={[
                            styles.contributionProgressBarFill,
                            { width: `${Math.min(100, item.percentage)}%`, backgroundColor: item.color },
                          ]}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ─── TAB 3: SURPLUS & CASH FLOW HISTORY ─── */}
        {activeTab === 'surplus' && (
          <View>
            {/* Header summary row */}
            <View style={styles.subFilterRow}>
              <View>
                <ThemedText
                  style={{
                    fontSize: 18,
                    fontFamily: 'Outfit_600SemiBold',
                    color: overviewMetrics.netSurplus >= 0 ? '#34C759' : '#FF3B30',
                  }}
                >
                  {formatAmount(overviewMetrics.netSurplus, true)}
                </ThemedText>
                <ThemedText
                  style={{
                    fontSize: 11,
                    fontFamily: 'Outfit_400Regular',
                    color: currColors.textSecondary,
                  }}
                >
                  In: {formatAmount(overviewMetrics.income)} • Out: {formatAmount(overviewMetrics.expense)}
                </ThemedText>
              </View>

              <View
                style={[
                  styles.badgePill,
                  {
                    backgroundColor:
                      overviewMetrics.netSurplus >= 0
                        ? 'rgba(52, 199, 89, 0.12)'
                        : 'rgba(255, 59, 48, 0.12)',
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.badgeText,
                    { color: overviewMetrics.netSurplus >= 0 ? '#34C759' : '#FF3B30' },
                  ]}
                >
                  {overviewMetrics.netSurplus >= 0
                    ? `${overviewMetrics.savingsRate.toFixed(1)}% SAVED`
                    : 'DEFICIT'}
                </ThemedText>
              </View>
            </View>

            {/* Month-by-Month History */}
            <View style={styles.sectionHeaderMargin}>
              <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                MONTH-BY-MONTH CASH FLOW
              </ThemedText>
            </View>

            <View style={[styles.groupedListCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              {[...monthlyTrends].reverse().map((item, index) => {
                const isLast = index === monthlyTrends.length - 1;
                const isPositive = item.surplus >= 0;
                return (
                  <TouchableOpacity
                    key={item.monthKey}
                    style={[
                      styles.trendRowItem,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: currColors.border },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      handleHaptic();
                      const start = new Date(item.year, item.month, 1, 0, 0, 0, 0);
                      const end = new Date(item.year, item.month + 1, 0, 23, 59, 59, 999);
                      router.push({
                        pathname: '/all-money-transactions',
                        params: {
                          startDate: start.toISOString(),
                          endDate: end.toISOString(),
                          dateLabel: item.fullLabel,
                        },
                      });
                    }}
                  >
                    <View>
                      <ThemedText type="semiBold" style={[styles.trendMonthLabel, { color: currColors.text }]}>
                        {item.fullLabel}
                      </ThemedText>
                      <ThemedText style={[styles.trendMonthSub, { color: currColors.textSecondary }]}>
                        In: {formatAmount(item.income)} • Out: {formatAmount(item.expense)}
                      </ThemedText>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText
                        type="semiBold"
                        style={[
                          styles.trendSurplusText,
                          { color: isPositive ? '#34C759' : '#FF3B30' },
                        ]}
                      >
                        {formatAmount(item.surplus, true)}
                      </ThemedText>
                      <View
                        style={[
                          styles.miniRateBadge,
                          { backgroundColor: isPositive ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)' },
                        ]}
                      >
                        <ThemedText
                          style={{
                            fontSize: 10,
                            fontFamily: 'Outfit_600SemiBold',
                            color: isPositive ? '#34C759' : '#FF3B30',
                          }}
                        >
                          {item.savingsRate.toFixed(0)}% saved
                        </ThemedText>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── Timeframe Picker Modal ─── */}
      <Modal visible={showTimeframeModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimeframeModal(false)}
        >
          <View style={[styles.timeframeModalCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <ThemedText style={[styles.timeframeModalTitle, { color: currColors.textSecondary }]}>
              SELECT TIMEFRAME
            </ThemedText>

            {[
              { id: 'month', label: 'Monthly' },
              { id: 'quarter', label: 'Quarterly' },
              { id: 'year', label: 'Yearly' },
              { id: 'all', label: 'All Time' },
            ].map((tf) => {
              const isSelected = timeFrame === tf.id;
              return (
                <TouchableOpacity
                  key={tf.id}
                  style={[
                    styles.timeframeOptionRow,
                    isSelected && { backgroundColor: `${currColors.cardSecondary}` },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setTimeFrame(tf.id as TimeFrame);
                    setFocusedCategory(null);
                    setShowTimeframeModal(false);
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 15,
                      fontFamily: isSelected ? 'Outfit_600SemiBold' : 'Outfit_400Regular',
                      color: isSelected ? '#00C9A7' : currColors.text,
                    }}
                  >
                    {tf.label}
                  </ThemedText>
                  {isSelected && <Check size={18} color="#00C9A7" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  timeframePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  timeframePillText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  periodNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  navArrowBtn: {
    padding: 6,
  },
  periodNavLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  periodNavSubtitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  segmentedTabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  segmentedTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTabText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  subFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  sectionHeaderMargin: {
    marginHorizontal: 4,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  groupedListCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  categoryRowItem: {
    paddingVertical: 14,
  },
  categoryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  categoryIconSquare: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  categoryName: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  categorySub: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  categoryValues: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  primaryValue: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  secondaryValue: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  contributionProgressBarContainer: {
    height: 5,
    borderRadius: 2.5,
    marginTop: 12,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  contributionProgressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  trendRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  trendMonthLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  trendMonthSub: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  trendSurplusText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  miniRateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  timeframeModalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  timeframeModalTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    marginBottom: 12,
  },
  timeframeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
});
