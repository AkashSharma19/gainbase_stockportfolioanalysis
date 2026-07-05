import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  PieChart as PieIcon,
} from 'lucide-react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { CategoryIcon } from '@/components/CategoryIcon';

const DEFAULT_CATEGORY_METADATA: Record<string, { icon: string; color: string }> = {
  'Food & Dining': { icon: 'Utensils', color: '#FF3B30' },
  'Rent & Bills': { icon: 'Receipt', color: '#007AFF' },
  'Shopping': { icon: 'ShoppingBag', color: '#FF9500' },
  'Entertainment': { icon: 'Clapperboard', color: '#AF52DE' },
  'Travel': { icon: 'Plane', color: '#34C759' },
  'Medical': { icon: 'Pill', color: '#FF2D55' },
  'Education': { icon: 'GraduationCap', color: '#5AC8FA' },
  'Food': { icon: 'UtensilsCrossed', color: '#FF6B6B' },
  'Junk': { icon: 'Cookie', color: '#FF922B' },
  'Shopping - Electronics': { icon: 'Laptop', color: '#5856D6' },
  'Shopping - Clothes': { icon: 'Shirt', color: '#FD79A8' },
  'Subscriptions - OTT': { icon: 'Tv', color: '#CC5DE8' },
  'Subscriptions - WiFi': { icon: 'Wifi', color: '#4DABF7' },
  'House': { icon: 'Home', color: '#20C997' },
  'Electricity Bill': { icon: 'Zap', color: '#FFCC00' },
  'Transport - Fuel': { icon: 'Fuel', color: '#FF8E53' },
  'Transport - Cab': { icon: 'Car', color: '#FCC419' },
  'Maintainance': { icon: 'Wrench', color: '#8E8E93' },
  'Maintenance': { icon: 'Wrench', color: '#8E8E93' },
  'Travel/ Trips': { icon: 'Compass', color: '#748FFC' },
  'Family': { icon: 'Users', color: '#B33771' },
  'Gifts': { icon: 'Gift', color: '#E84393' },
  'EMI Payments': { icon: 'CalendarRange', color: '#A06A42' },
  'Others': { icon: 'Tag', color: '#2D3436' },
  'Other': { icon: 'Tag', color: '#2D3436' },
};

const CATEGORY_COLORS = [
  '#FF3B30', // System Red
  '#007AFF', // System Blue
  '#FF9500', // System Orange
  '#34C759', // System Green
  '#AF52DE', // System Purple
  '#FF2D55', // System Pink
  '#5AC8FA', // System Teal
  '#FFCC00', // System Yellow
  '#5856D6', // System Indigo
  '#00C9A7', // Emerald
  '#FF6B6B', // Pastel Red
  '#4DABF7', // Pastel Blue
  '#FF922B', // Pastel Orange
  '#51CF66', // Pastel Green
  '#CC5DE8', // Pastel Purple
  '#FF8787', // Coral Pink
  '#20C997', // Mint
  '#FCC419', // Amber
  '#748FFC', // Cornflower Blue
  '#FF8E53', // Flame Orange
  '#A06A42', // Brown
  '#8E8E93', // Cool Grey
  '#FF7675', // Soft Red
  '#74B9FF', // Soft Blue
  '#FDCB6E', // Soft Yellow
  '#55E6C1', // Soft Mint
  '#B33771', // Magenta
  '#FD79A8', // Soft Pink
  '#E17055', // Soft Teracotta
  '#00B894', // Teal Green
  '#0984E3', // Deep Blue
  '#D63031', // Crimson
  '#E84393', // Orchid Pink
  '#2D3436', // Charcoal
  '#6C5CE7', // Royal Purple
  '#10AC84', // Dark Mint
];

const getCategoryColor = (name: string) => {
  const meta = DEFAULT_CATEGORY_METADATA[name];
  if (meta) return meta.color;
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
};

type AnalyticsTab = 'distribution' | 'expense' | 'surplus';

export default function MoneyAnalyticsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { moneyTransactions } = useMoneyStore();
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('distribution');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '****';
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const prefix = val < 0 ? '-' : '';
    const symbol = showCurrencySymbol ? '₹' : '';
    return `${prefix}${symbol}${formatted}`;
  };

  const getFullMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    const d = new Date(year, month, 1);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePrevMonth = () => {
    handleHaptic();
    setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)));
  };

  const handleNextMonth = () => {
    handleHaptic();
    setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)));
  };

  // Group transactions by date into last 12 months chronologically relative to current date (today)
  const monthlyData = useMemo(() => {
    const data: { monthKey: string; monthLabel: string; income: number; expense: number; surplus: number }[] = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthKey = `${year}-${month}`;
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      
      data.push({
        monthKey,
        monthLabel,
        income: 0,
        expense: 0,
        surplus: 0,
      });
    }

    moneyTransactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();
      const txKey = `${txYear}-${txMonth}`;
      
      const item = data.find((x) => x.monthKey === txKey);
      if (item) {
        if (tx.type === 'income') {
          item.income += tx.amount;
        } else if (tx.type === 'expense') {
          item.expense += tx.amount;
        }
      }
    });

    data.forEach((item) => {
      item.surplus = item.income - item.expense;
    });

    let firstActiveIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i].income > 0 || data[i].expense > 0) {
        firstActiveIndex = i;
        break;
      }
    }

    if (firstActiveIndex === -1) {
      return data.slice(11);
    }

    return data.slice(firstActiveIndex);
  }, [moneyTransactions]);

  // Reverse chronological list for history breakdown
  const trendHistoryList = useMemo(() => {
    return [...monthlyData].reverse();
  }, [monthlyData]);

  // Compute category spending for selected calendar month
  const currentMonthExpenses = useMemo(() => {
    const currYear = selectedDate.getFullYear();
    const currMonth = selectedDate.getMonth();
    
    const totals: Record<string, { amount: number; color: string; icon: string }> = {};
    
    moneyTransactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === currYear && txDate.getMonth() === currMonth) {
        if (!totals[tx.category]) {
          const meta = DEFAULT_CATEGORY_METADATA[tx.category];
          const color = meta ? meta.color : getCategoryColor(tx.category);
          const icon = meta ? meta.icon : '🏷️';
          totals[tx.category] = {
            amount: 0,
            color,
            icon,
          };
        }
        totals[tx.category].amount += tx.amount;
      }
    });
    
    return totals;
  }, [moneyTransactions, selectedDate]);

  const totalCurrentMonthExpense = useMemo(() => {
    return Object.values(currentMonthExpenses).reduce((acc, c) => acc + c.amount, 0);
  }, [currentMonthExpenses]);

  // List of expenses sorted by amount descending
  const sortedCategoryExpenses = useMemo(() => {
    const list = Object.keys(currentMonthExpenses).map((name) => ({
      name,
      amount: currentMonthExpenses[name].amount,
      color: currentMonthExpenses[name].color,
      icon: currentMonthExpenses[name].icon,
    }));

    list.sort((a, b) => {
      if (a.amount !== b.amount) {
        return b.amount - a.amount; // Descending by amount
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [currentMonthExpenses]);

  // Pie chart data
  const pieChartData = useMemo(() => {
    const data = sortedCategoryExpenses.map((item) => ({
      value: item.amount,
      color: item.color,
      text: item.name,
    }));

    if (data.length === 0) {
      return [{ value: 1, color: currColors.cardSecondary, text: 'No Spending' }];
    }
    return data.filter((d) => d.value > 0);
  }, [sortedCategoryExpenses, currColors]);

  // Expense trend data
  const expenseBarData = useMemo(() => {
    return monthlyData.map((d) => ({
      value: d.expense,
      label: d.monthLabel,
      frontColor: '#FF3B30',
    }));
  }, [monthlyData]);

  // Surplus trend data
  const surplusBarData = useMemo(() => {
    return monthlyData.map((d) => ({
      value: Math.max(0, d.surplus),
      label: d.monthLabel,
      frontColor: d.surplus >= 0 ? '#34C759' : '#FF3B30',
    }));
  }, [monthlyData]);

  const tabs = [
    { id: 'distribution', label: 'Category' },
    { id: 'expense', label: 'Expense Trend' },
    { id: 'surplus', label: 'Surplus Trend' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => {
            handleHaptic();
            router.back();
          }}
        >
          <ArrowLeft size={20} color={currColors.text} />
        </TouchableOpacity>
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          Money Analytics
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs Selector Bar */}
      <View style={[styles.tabBarContainer, { backgroundColor: currColors.cardSecondary }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                isActive && { backgroundColor: '#00C9A7' }
              ]}
              onPress={() => {
                handleHaptic();
                setActiveTab(tab.id as AnalyticsTab);
              }}
            >
              <ThemedText
                type="medium"
                style={[
                  styles.tabButtonText,
                  { color: isActive ? '#FFFFFF' : currColors.textSecondary }
                ]}
              >
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        
        {activeTab === 'distribution' && (
          <View>
            {/* Month Switcher Banner */}
            <View style={[styles.monthSwitcher, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
                <ChevronLeft size={20} color={currColors.text} />
              </TouchableOpacity>
              <ThemedText type="semiBold" style={[styles.monthLabel, { color: currColors.text }]}>
                {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </ThemedText>
              <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
                <ChevronRight size={20} color={currColors.text} />
              </TouchableOpacity>
            </View>

            {/* Donut Chart Card */}
            <LinearGradient
              colors={colorScheme === 'dark' ? ['#1C1C1E', '#000000'] : ['#FFFFFF', '#F2F2F7']}
              style={[styles.chartContainer, { borderColor: currColors.border }]}
            >
              <View style={styles.pieWrapper}>
                <PieChart
                  data={pieChartData}
                  donut
                  sectionAutoFocus
                  radius={SCREEN_WIDTH * 0.22}
                  innerRadius={SCREEN_WIDTH * 0.15}
                  innerCircleColor={colorScheme === 'dark' ? '#000000' : '#FFFFFF'}
                  centerLabelComponent={() => (
                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                      <ThemedText style={{ fontSize: 13, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                        Spent
                      </ThemedText>
                      <ThemedText style={{ fontSize: 18, color: currColors.text, fontFamily: 'Outfit_600SemiBold', marginTop: 2 }}>
                        {formatAmount(totalCurrentMonthExpense)}
                      </ThemedText>
                    </View>
                  )}
                />
              </View>
            </LinearGradient>

            {/* Distribution Details list */}
            <View style={[styles.holdingsList, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              {sortedCategoryExpenses.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ThemedText style={{ color: currColors.textSecondary }}>No transactions recorded for this month.</ThemedText>
                </View>
              ) : (
                sortedCategoryExpenses.map((item, index) => {
                  const isLast = index === sortedCategoryExpenses.length - 1;
                  const percentage = totalCurrentMonthExpense > 0 ? (item.amount / totalCurrentMonthExpense) * 100 : 0;
                  return (
                    <View
                      key={item.name}
                      style={[
                        styles.holdingItem,
                        !isLast && [styles.holdingItemBorder, { borderBottomColor: currColors.border }]
                      ]}
                    >
                      <View style={styles.holdingRow}>
                        <View style={styles.holdingMain}>
                          <View style={[styles.categoryIconCircle, { backgroundColor: `${item.color}15` }]}>
                            <CategoryIcon name={item.icon} color={item.color} size={16} />
                          </View>
                          <View style={{ flex: 1, paddingRight: 10 }}>
                            <ThemedText type="semiBold" style={[styles.holdingName, { color: currColors.text }]}>
                              {item.name}
                            </ThemedText>
                            <View style={styles.rowProgressBarBG}>
                              <View style={[styles.rowProgressBarFill, { width: `${percentage}%`, backgroundColor: item.color }]} />
                            </View>
                          </View>
                        </View>

                        <View style={styles.holdingValues}>
                          <ThemedText style={[styles.holdingValueText, { color: currColors.text }]}>
                            {formatAmount(item.amount)}
                          </ThemedText>
                          <ThemedText style={[styles.holdingPercentageText, { color: currColors.textSecondary }]}>
                            {percentage.toFixed(1)}%
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {activeTab === 'expense' && (
          <View>
            {/* Expense Trend Card */}
            <LinearGradient
              colors={colorScheme === 'dark' ? ['#1C1C1E', '#000000'] : ['#FFFFFF', '#F2F2F7']}
              style={[styles.trendChartContainer, { borderColor: currColors.border }]}
            >
              <View style={styles.trendHeader}>
                <TrendingDown size={16} color="#FF3B30" />
                <ThemedText type="bold" style={[styles.trendTitle, { color: currColors.textSecondary }]}>
                  EXPENSE TREND (LAST {monthlyData.length} MONTHS)
                </ThemedText>
              </View>
              <View style={styles.trendWrapper}>
                <BarChart
                  data={expenseBarData}
                  barWidth={18}
                  spacing={14}
                  noOfSections={4}
                  initialSpacing={10}
                  hideRules
                  yAxisThickness={0}
                  xAxisThickness={0}
                  yAxisTextStyle={{ color: currColors.textSecondary, fontSize: 9, fontFamily: 'Outfit_400Regular' }}
                  xAxisLabelTextStyle={{ color: currColors.textSecondary, fontSize: 9, fontFamily: 'Outfit_400Regular' }}
                  formatYLabel={(val) => formatAmount(Number(val))}
                />
              </View>
            </LinearGradient>

            {/* List of Monthly Expenses */}
            <View style={styles.sectionHeaderMargin}>
              <ThemedText type="bold" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                MONTHLY BREAKDOWN
              </ThemedText>
            </View>

            <View style={[styles.holdingsList, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              {trendHistoryList.map((item, index) => {
                const isLast = index === trendHistoryList.length - 1;
                return (
                  <View
                    key={item.monthKey}
                    style={[
                      styles.holdingItem,
                      !isLast && [styles.holdingItemBorder, { borderBottomColor: currColors.border }]
                    ]}
                  >
                    <View style={styles.holdingRow}>
                      <ThemedText type="semiBold" style={{ color: currColors.text, fontSize: 13 }}>
                        {getFullMonthLabel(item.monthKey)}
                      </ThemedText>
                      <ThemedText style={{ color: '#FF3B30', fontSize: 13, fontFamily: 'Outfit_400Regular' }}>
                        {formatAmount(item.expense)}
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {activeTab === 'surplus' && (
          <View>
            {/* Surplus Trend Card */}
            <LinearGradient
              colors={colorScheme === 'dark' ? ['#1C1C1E', '#000000'] : ['#FFFFFF', '#F2F2F7']}
              style={[styles.trendChartContainer, { borderColor: currColors.border }]}
            >
              <View style={styles.trendHeader}>
                <PiggyBank size={16} color="#34C759" />
                <ThemedText type="bold" style={[styles.trendTitle, { color: currColors.textSecondary }]}>
                  SURPLUS TREND (LAST {monthlyData.length} MONTHS)
                </ThemedText>
              </View>
              <View style={styles.trendWrapper}>
                <BarChart
                  data={surplusBarData}
                  barWidth={18}
                  spacing={14}
                  noOfSections={4}
                  initialSpacing={10}
                  hideRules
                  yAxisThickness={0}
                  xAxisThickness={0}
                  yAxisTextStyle={{ color: currColors.textSecondary, fontSize: 9, fontFamily: 'Outfit_400Regular' }}
                  xAxisLabelTextStyle={{ color: currColors.textSecondary, fontSize: 9, fontFamily: 'Outfit_400Regular' }}
                  formatYLabel={(val) => formatAmount(Number(val))}
                />
              </View>
            </LinearGradient>

            {/* List of Monthly Surplus */}
            <View style={styles.sectionHeaderMargin}>
              <ThemedText type="bold" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                MONTHLY BREAKDOWN
              </ThemedText>
            </View>

            <View style={[styles.holdingsList, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              {trendHistoryList.map((item, index) => {
                const isLast = index === trendHistoryList.length - 1;
                const isPositive = item.surplus >= 0;
                return (
                  <View
                    key={item.monthKey}
                    style={[
                      styles.holdingItem,
                      !isLast && [styles.holdingItemBorder, { borderBottomColor: currColors.border }]
                    ]}
                  >
                    <View style={styles.holdingRow}>
                      <ThemedText type="semiBold" style={{ color: currColors.text, fontSize: 13 }}>
                        {getFullMonthLabel(item.monthKey)}
                      </ThemedText>
                      <View style={{ alignItems: 'flex-end' }}>
                        <ThemedText style={{ color: isPositive ? '#34C759' : '#FF3B30', fontSize: 13, fontFamily: 'Outfit_400Regular' }}>
                          {isPositive ? '+' : '-'}{formatAmount(item.surplus)}
                        </ThemedText>
                        <ThemedText style={{ color: currColors.textSecondary, fontSize: 10, marginTop: 2 }}>
                          In: {formatAmount(item.income)} | Out: {formatAmount(item.expense)}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  monthArrow: {
    padding: 6,
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  tabBarContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 12,
  },
  chartContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginHorizontal: 4,
    marginBottom: 12,
    marginTop: 8,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 6,
  },
  viewModeText: {
    fontSize: 12,
  },
  holdingsList: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  holdingItem: {
    paddingVertical: 12,
  },
  holdingItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  holdingMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.3,
    gap: 12,
  },
  categoryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingName: {
    fontSize: 13,
    marginBottom: 4,
  },
  rowProgressBarBG: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    width: '80%',
    overflow: 'hidden',
  },
  rowProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  holdingValues: {
    alignItems: 'flex-end',
    flex: 1,
  },
  holdingValueText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 2,
  },
  holdingPercentageText: {
    fontSize: 10,
  },
  trendChartContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  trendTitle: {
    fontSize: 10,
    letterSpacing: 1,
  },
  trendWrapper: {
    alignItems: 'center',
    paddingRight: 10,
  },
  sectionHeaderMargin: {
    marginHorizontal: 4,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
