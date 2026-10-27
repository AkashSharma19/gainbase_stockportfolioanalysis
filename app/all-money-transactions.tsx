import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Line } from 'react-native-svg';
import {
  SlidersHorizontal,
  X,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Plus,
  Receipt,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackButton } from '@/components/BackButton';
import { Category3DIcon } from '@/components/Category3DIcon';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { getTicketCardPath } from '@/constants/folderTheme';

type DateRangeKey =
  | 'this_month'
  | 'this_week'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_year'
  | 'all';

export default function AllTransactionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    type?: 'all' | 'income' | 'expense' | 'transfer';
    dateRange?: DateRangeKey;
    startDate?: string;
    endDate?: string;
    dateLabel?: string;
  }>();

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  const [cardWidth, setCardWidth] = useState<number>(Dimensions.get('window').width - 32);

  const {
    accounts,
    moneyTransactions,
    removeMoneyTransaction,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const togglePrivacyMode = usePortfolioStore((state) => state.togglePrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  // Custom date bounds state (e.g. from Money Analytics specific period navigation)
  const [customRange, setCustomRange] = useState<{
    startDate: string;
    endDate: string;
    label: string;
  } | null>(
    params.startDate && params.endDate
      ? {
          startDate: params.startDate,
          endDate: params.endDate,
          label: params.dateLabel || 'Selected Period',
        }
      : null
  );

  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>(
    params.type && ['all', 'income', 'expense', 'transfer'].includes(params.type)
      ? params.type
      : 'all'
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    params.category ? params.category : null
  );
  const [dateRange, setDateRange] = useState<DateRangeKey>(
    params.dateRange &&
      ['this_month', 'this_week', 'last_30_days', 'last_90_days', 'this_year', 'all'].includes(
        params.dateRange
      )
      ? params.dateRange
      : 'this_month'
  );

  useEffect(() => {
    if (params.category !== undefined) {
      setSelectedCategory(params.category || null);
    }
    if (params.type && ['all', 'income', 'expense', 'transfer'].includes(params.type)) {
      setActiveFilter(params.type);
    }
    if (params.startDate && params.endDate) {
      setCustomRange({
        startDate: params.startDate,
        endDate: params.endDate,
        label: params.dateLabel || 'Selected Period',
      });
      setDateRange('all');
    } else if (
      params.dateRange &&
      ['this_month', 'this_week', 'last_30_days', 'last_90_days', 'this_year', 'all'].includes(
        params.dateRange
      )
    ) {
      setCustomRange(null);
      setDateRange(params.dateRange as DateRangeKey);
    }
  }, [
    params.category,
    params.type,
    params.dateRange,
    params.startDate,
    params.endDate,
    params.dateLabel,
  ]);

  // Modal sheet visibility
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Check if any filter is active away from defaults
  const isFilterActive = useMemo(() => {
    return (
      activeFilter !== 'all' ||
      dateRange !== 'this_month' ||
      selectedCategory !== null ||
      customRange !== null
    );
  }, [activeFilter, dateRange, selectedCategory, customRange]);

  // Compute active filters list for display summary chips
  const activeFilters = useMemo(() => {
    const list: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (customRange && customRange.label) {
      list.push({
        key: 'dateRange',
        label: customRange.label,
        onClear: () => {
          setCustomRange(null);
          setDateRange('all');
        },
      });
    } else if (dateRange !== 'all') {
      const labels: Record<DateRangeKey, string> = {
        this_month: 'This Month',
        this_week: 'This Week',
        last_30_days: 'Last 30 Days',
        last_90_days: 'Last 90 Days',
        this_year: 'This Year',
        all: 'All Time',
      };
      list.push({
        key: 'dateRange',
        label: labels[dateRange],
        onClear: () => setDateRange('all'),
      });
    }

    if (activeFilter !== 'all') {
      const labels = {
        expense: 'Spent',
        income: 'Income',
        transfer: 'Transfer',
      };
      list.push({
        key: 'type',
        label: labels[activeFilter],
        onClear: () => {
          setActiveFilter('all');
          setSelectedCategory(null);
        },
      });
    }

    if (selectedCategory) {
      list.push({
        key: 'category',
        label: selectedCategory,
        onClear: () => setSelectedCategory(null),
      });
    }

    return list;
  }, [activeFilter, dateRange, selectedCategory, customRange]);

  // Helper check for date range inclusion
  const isWithinDateRange = useCallback(
    (dateStr: string, range: DateRangeKey) => {
      const txTime = new Date(dateStr).getTime();

      if (customRange && customRange.startDate && customRange.endDate) {
        const start = new Date(customRange.startDate).getTime();
        const end = new Date(customRange.endDate).getTime();
        return txTime >= start && txTime <= end;
      }

      switch (range) {
        case 'this_month': {
          const start = new Date();
          start.setDate(1);
          start.setHours(0, 0, 0, 0);

          const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
          return txTime >= start.getTime() && txTime <= end.getTime();
        }
        case 'this_week': {
          const start = new Date();
          const day = start.getDay();
          const diff = start.getDate() - day; // Sunday is 0
          start.setDate(diff);
          start.setHours(0, 0, 0, 0);

          const end = new Date(start);
          end.setDate(end.getDate() + 7);
          end.setHours(23, 59, 59, 999);

          return txTime >= start.getTime() && txTime <= end.getTime();
        }
        case 'last_30_days': {
          const start = new Date();
          start.setDate(start.getDate() - 30);
          start.setHours(0, 0, 0, 0);
          return txTime >= start.getTime();
        }
        case 'last_90_days': {
          const start = new Date();
          start.setDate(start.getDate() - 90);
          start.setHours(0, 0, 0, 0);
          return txTime >= start.getTime();
        }
        case 'this_year': {
          const start = new Date();
          start.setMonth(0);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);

          const end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
          return txTime >= start.getTime() && txTime <= end.getTime();
        }
        case 'all':
        default:
          return true;
      }
    },
    [customRange]
  );

  // List of unique categories for the active type filter and date range
  const availableCategories = useMemo(() => {
    let list = moneyTransactions;
    if (activeFilter !== 'all') {
      list = list.filter((tx) => tx.type === activeFilter);
    }
    list = list.filter((tx) => isWithinDateRange(tx.date, dateRange));

    const cats = list
      .map((tx) => (tx.type === 'transfer' ? 'Transfer' : tx.category))
      .filter(Boolean);
    return Array.from(new Set(cats)).sort();
  }, [moneyTransactions, activeFilter, dateRange, isWithinDateRange]);

  // Clean selected category if it's no longer present in availableCategories
  useEffect(() => {
    if (selectedCategory && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [availableCategories, selectedCategory]);

  // Filter & sort transactions chronologically (latest first)
  const filteredTxs = useMemo(() => {
    let list = moneyTransactions;

    if (activeFilter !== 'all') {
      list = list.filter((tx) => tx.type === activeFilter);
    }

    list = list.filter((tx) => isWithinDateRange(tx.date, dateRange));

    if (selectedCategory) {
      list = list.filter((tx) => {
        if (tx.type === 'transfer') {
          return selectedCategory === 'Transfer';
        }
        return tx.category === selectedCategory;
      });
    }

    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [moneyTransactions, activeFilter, dateRange, selectedCategory, isWithinDateRange]);

  // Helper for human-friendly group date header
  const getGroupDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const txDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const diffDays = Math.round((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';

    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    });
  };

  // Group filtered transactions by day
  const groupedTransactions = useMemo(() => {
    const map: Record<string, typeof filteredTxs> = {};
    const order: string[] = [];

    filteredTxs.forEach((tx) => {
      const d = new Date(tx.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      if (!map[dateKey]) {
        map[dateKey] = [];
        order.push(dateKey);
      }
      map[dateKey].push(tx);
    });

    return order.map((dateKey) => ({
      dateKey,
      label: getGroupDateLabel(map[dateKey][0].date),
      data: map[dateKey],
    }));
  }, [filteredTxs]);

  // Period stats (respects date range and category filter, evaluating full income & expense)
  const periodStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transferTotal = 0;

    moneyTransactions
      .filter((tx) => isWithinDateRange(tx.date, dateRange))
      .filter((tx) => {
        if (!selectedCategory) return true;
        if (tx.type === 'transfer') return selectedCategory === 'Transfer';
        return tx.category === selectedCategory;
      })
      .forEach((tx) => {
        if (tx.type === 'income') {
          income += tx.amount;
        } else if (tx.type === 'expense') {
          expense += tx.amount;
        } else if (tx.type === 'transfer') {
          transferTotal += tx.amount;
        }
      });

    return { income, expense, transferTotal, net: income - expense };
  }, [moneyTransactions, dateRange, selectedCategory, isWithinDateRange]);

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '••••••';
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const prefix = val < 0 ? '-' : '';
    const symbol = showCurrencySymbol ? '₹' : '';
    return `${prefix}${symbol}${formatted}`;
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteTransaction = (txId: string) => {
    handleHaptic();
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction and revert its balance impact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeMoneyTransaction(txId);
          },
        },
      ]
    );
  };

  // Streamlined Soft Rose Ticket Hero Card
  const renderTicketHeroCard = () => {
    const h = 152;
    const notchY = 76;
    const notchR = 8;
    const path = getTicketCardPath(cardWidth, h, notchY, notchR, 20);

    const palette = {
      bg: '#FFE4E6',
      text: '#881337',
      sub: '#9F1239',
      border: '#FDA4AF',
    };

    const getHeroLabel = () => {
      if (activeFilter === 'expense') return 'TOTAL SPENT';
      if (activeFilter === 'income') return 'TOTAL INCOME';
      if (activeFilter === 'transfer') return 'TOTAL TRANSFERS';
      return 'NET CASH FLOW';
    };

    const getHeroValue = () => {
      if (activeFilter === 'expense') return `-${formatAmount(periodStats.expense)}`;
      if (activeFilter === 'income') return `+${formatAmount(periodStats.income)}`;
      if (activeFilter === 'transfer') return formatAmount(periodStats.transferTotal);
      return `${periodStats.net >= 0 ? '+' : ''}${formatAmount(periodStats.net)}`;
    };

    return (
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - cardWidth) > 1) {
            setCardWidth(w);
          }
        }}
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          marginTop: 4,
          height: h,
          shadowColor: isDark ? '#000000' : palette.sub,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.06 : 0.1,
          shadowRadius: isDark ? 4 : 6,
          elevation: 2,
        }}
      >
        {/* SVG Ticket Shape Background */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={cardWidth} height={h}>
            <Path
              d={path}
              fill={palette.bg}
            />
            {/* Perforated dashed divider line */}
            <Line
              x1={notchR + 6}
              y1={notchY}
              x2={cardWidth - notchR - 6}
              y2={notchY}
              stroke={isDark ? palette.text + '35' : palette.sub + '45'}
              strokeWidth={1.2}
              strokeDasharray="5, 4"
            />
          </Svg>
        </View>

        {/* Top Ticket Section (Net Cash Flow / Total + Quick Actions) */}
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
              {getHeroLabel()}
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 24,
                fontFamily: 'Outfit_400Regular',
                color: palette.text,
              }}
              numberOfLines={1}
            >
              {getHeroValue()}
            </ThemedText>
          </View>

          {/* Privacy Toggle Action */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              handleHaptic();
              togglePrivacyMode();
            }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: palette.text + '14',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {isPrivacyMode ? (
              <EyeOff size={15} color={palette.text} />
            ) : (
              <Eye size={15} color={palette.text} />
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Ticket Body (Income & Expense Rows like Dashboard Top Card) */}
        <View
          style={{
            height: h - notchY,
            paddingHorizontal: 20,
            justifyContent: 'center',
          }}
        >
          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Income
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#047857' }]}>
              {isPrivacyMode ? '••••••' : `+${formatAmount(periodStats.income)}`}
            </ThemedText>
          </View>

          <View style={[styles.heroRow, { marginBottom: 0 }]}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Expenses
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#881337' }]}>
              {isPrivacyMode ? '••••••' : `-${formatAmount(periodStats.expense)}`}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const headerTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 32);

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      {/* ─── Header matching Signature EMIs & AI Chat Standard ─── */}
      <View style={[styles.header, { paddingTop: headerTopPadding }]}>
        <BackButton
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
        />

        <View style={styles.headerTitleWrap}>
          <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
            Transactions
          </ThemedText>
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: isDark ? currColors.cardSecondary : '#FFE4E6',
              },
            ]}
          >
            <ThemedText
              style={[
                styles.countBadgeText,
                { color: isDark ? currColors.text : '#881337' },
              ]}
            >
              {filteredTxs.length}
            </ThemedText>
          </View>
        </View>

        {/* Right Filter Trigger Action */}
        <TouchableOpacity
          style={[
            styles.filterTriggerBtn,
            {
              backgroundColor: isFilterActive
                ? isDark
                  ? '#88133730'
                  : '#FFE4E6'
                : isDark
                ? currColors.card
                : '#F3F4F6',
            },
          ]}
          onPress={() => {
            handleHaptic();
            setFilterModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <SlidersHorizontal
            size={18}
            color={isFilterActive ? (isDark ? '#FDA4AF' : '#881337') : currColors.text}
          />
          {isFilterActive && <View style={styles.activeFilterDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 64 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ─── Streamlined Top Ticket Hero Card ─── */}
        {renderTicketHeroCard()}

        {/* ─── Compact Segmented Capsule Type Switcher ─── */}
        <View style={styles.typeSwitcherWrap}>
          <View
            style={[
              styles.typeSwitcherTrack,
              {
                backgroundColor: isDark ? currColors.card : '#F3F4F6',
                borderColor: currColors.border,
              },
            ]}
          >
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'expense', label: 'Spent' },
                { key: 'income', label: 'Income' },
                { key: 'transfer', label: 'Transfer' },
              ] as const
            ).map((tab) => {
              const isSelected = activeFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.typeSwitcherPill,
                    isSelected && {
                      backgroundColor: isDark ? '#FFFFFF' : '#1C1917',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.12,
                      shadowRadius: 2,
                      elevation: 2,
                    },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setActiveFilter(tab.key);
                    setSelectedCategory(null);
                  }}
                  activeOpacity={0.8}
                >
                  <ThemedText
                    style={[
                      styles.typeSwitcherPillText,
                      {
                        color: isSelected
                          ? isDark
                            ? '#000000'
                            : '#FFFFFF'
                          : currColors.textSecondary,
                        fontFamily: isSelected ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
                      },
                    ]}
                  >
                    {tab.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Active Filters Summary Chips (Only when non-default filter active) ─── */}
        {activeFilters.length > 0 && (
          <View style={styles.activeFiltersSummary}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.activeFiltersScroll}
            >
              {activeFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.summaryChip,
                    {
                      backgroundColor: isDark ? currColors.cardSecondary : '#FFE4E6',
                      borderColor: isDark ? currColors.border : '#FDA4AF',
                    },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    filter.onClear();
                  }}
                >
                  <ThemedText
                    style={[
                      styles.summaryChipText,
                      { color: isDark ? currColors.text : '#881337' },
                    ]}
                  >
                    {filter.label}
                  </ThemedText>
                  <X
                    size={10}
                    color={isDark ? currColors.textSecondary : '#9F1239'}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => {
                  handleHaptic();
                  setActiveFilter('all');
                  setDateRange('this_month');
                  setSelectedCategory(null);
                  setCustomRange(null);
                }}
                style={styles.clearAllBtn}
              >
                <ThemedText style={styles.clearAllText}>Clear All</ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* ─── Transaction Groups or Empty State ─── */}
        {filteredTxs.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: currColors.card },
            ]}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: isDark ? currColors.cardSecondary : '#FFE4E6',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Receipt size={22} color={isDark ? currColors.textSecondary : '#881337'} />
            </View>
            <ThemedText
              style={{
                fontSize: 16,
                fontFamily: 'Outfit_600SemiBold',
                color: currColors.text,
                marginBottom: 4,
              }}
            >
              No Transactions Found
            </ThemedText>
            <ThemedText
              style={{
                color: currColors.textSecondary,
                textAlign: 'center',
                fontFamily: 'Outfit_400Regular',
                fontSize: 13,
                lineHeight: 18,
                marginBottom: 16,
                paddingHorizontal: 24,
              }}
            >
              {isFilterActive
                ? 'Try adjusting your date range or category filters.'
                : 'Start tracking your spending and income by logging your first transaction.'}
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                router.push('/add-money-transaction');
              }}
              style={[
                styles.emptyActionBtn,
                { backgroundColor: isDark ? '#FFFFFF' : '#1C1917' },
              ]}
              activeOpacity={0.8}
            >
              <ThemedText
                style={[
                  styles.emptyActionBtnText,
                  { color: isDark ? '#000000' : '#FFFFFF' },
                ]}
              >
                + Log Transaction
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.groupsContainer}>
            {groupedTransactions.map((group) => (
              <View key={group.dateKey} style={styles.dateGroupWrapper}>
                {/* Clean, De-cluttered Date Header */}
                <ThemedText
                  style={[styles.dateGroupHeader, { color: currColors.textSecondary }]}
                >
                  {group.label}
                </ThemedText>

                {/* Connected Card Group Container */}
                <View
                  style={[
                    styles.dateGroupCard,
                    {
                      backgroundColor: currColors.card,
                    },
                  ]}
                >
                  {group.data.map((tx, index) => {
                    const account = accounts.find((a) => a.id === tx.accountId);
                    const toAccount = tx.toAccountId
                      ? accounts.find((a) => a.id === tx.toAccountId)
                      : null;

                    const isIncome = tx.type === 'income';
                    const isExpense = tx.type === 'expense';
                    const isTransfer = tx.type === 'transfer';
                    const isLast = index === group.data.length - 1;

                    // Primary Title
                    const primaryTitle =
                      tx.note && tx.note.trim()
                        ? tx.note.trim()
                        : isTransfer
                        ? 'Transfer'
                        : tx.category;

                    // Secondary Subtitle
                    const secondarySubtitle =
                      tx.note && tx.note.trim()
                        ? isTransfer
                          ? `${account?.name || 'Account'} → ${toAccount?.name || 'Account'}`
                          : `${tx.category}${account?.name ? ` • ${account.name}` : ''}`
                        : isTransfer
                        ? `${account?.name || 'Account'} → ${toAccount?.name || 'Account'}`
                        : account?.name || '';

                    return (
                      <TouchableOpacity
                        key={tx.id}
                        style={[
                          styles.txRowItem,
                          {
                            borderBottomColor: currColors.border,
                            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          handleHaptic();
                          router.push({
                            pathname: '/add-money-transaction',
                            params: { id: tx.id },
                          });
                        }}
                        onLongPress={() => handleDeleteTransaction(tx.id)}
                      >
                        <View style={styles.txRowLeft}>
                          <Category3DIcon
                            name={isTransfer ? 'Transfer' : tx.category}
                            icon={isTransfer ? 'transfer' : undefined}
                            size={36}
                            style={{ marginRight: 12 }}
                          />
                          <View style={styles.txInfoCol}>
                            <ThemedText
                              style={[styles.txPrimaryText, { color: currColors.text }]}
                              numberOfLines={1}
                            >
                              {primaryTitle}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.txSecondaryText,
                                { color: currColors.textSecondary },
                              ]}
                              numberOfLines={1}
                            >
                              {secondarySubtitle}
                            </ThemedText>
                          </View>
                        </View>

                        {/* Clean Text Amount (No bulky pill badge) */}
                        <View style={styles.txRowRight}>
                          <ThemedText
                            style={[
                              styles.txAmountText,
                              {
                                color: isIncome
                                  ? isDark
                                    ? '#30D158'
                                    : '#15803D'
                                  : isExpense
                                  ? isDark
                                    ? '#FF453A'
                                    : '#BE123C'
                                  : isDark
                                  ? '#0A84FF'
                                  : '#007AFF',
                              },
                            ]}
                          >
                            {isIncome ? '+' : isExpense ? '-' : ''}
                            {formatAmount(tx.amount)}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ─── Floating Action Button (+ Log Transaction) ─── */}
      <TouchableOpacity
        style={[
          styles.floatingAddBtn,
          {
            backgroundColor: '#FFE4E6',
            bottom: Math.max(insets.bottom, 16) + 16,
          },
        ]}
        activeOpacity={0.85}
        onPress={() => {
          handleHaptic();
          router.push('/add-money-transaction');
        }}
      >
        <Plus size={24} color="#881337" strokeWidth={2.6} />
      </TouchableOpacity>

      {/* ─── Filters Bottom Sheet Modal ─── */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: currColors.card,
                    borderColor: currColors.border,
                    paddingBottom: Math.max(insets.bottom, 16) + 12,
                  },
                ]}
              >
                {/* Drag Indicator Bar */}
                <View
                  style={[
                    styles.dragHandle,
                    { backgroundColor: isDark ? currColors.border : '#D1D5DB' },
                  ]}
                />

                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                    Filter Transactions
                  </ThemedText>
                  <TouchableOpacity
                    style={[
                      styles.modalCloseBtn,
                      { backgroundColor: currColors.cardSecondary },
                    ]}
                    onPress={() => setFilterModalVisible(false)}
                  >
                    <X size={16} color={currColors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScroll}
                >
                  {/* Section 1: Transaction Type */}
                  <View style={styles.modalSection}>
                    <ThemedText
                      style={[styles.sectionTitle, { color: currColors.textSecondary }]}
                    >
                      TRANSACTION TYPE
                    </ThemedText>
                    <View style={styles.typeGrid}>
                      {(
                        [
                          { key: 'all', label: 'All', icon: Layers },
                          { key: 'expense', label: 'Spent', icon: ArrowUpRight },
                          { key: 'income', label: 'Income', icon: ArrowDownLeft },
                          { key: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
                        ] as const
                      ).map((filter) => {
                        const IconComponent = filter.icon;
                        const isSelected = activeFilter === filter.key;
                        return (
                          <TouchableOpacity
                            key={filter.key}
                            style={[
                              styles.modalGridButton,
                              {
                                backgroundColor: isSelected
                                  ? isDark
                                    ? '#FFFFFF'
                                    : '#1C1917'
                                  : currColors.cardSecondary,
                                borderColor: isSelected
                                  ? isDark
                                    ? '#FFFFFF'
                                    : '#1C1917'
                                  : currColors.border,
                              },
                            ]}
                            onPress={() => {
                              handleHaptic();
                              setActiveFilter(filter.key);
                              setSelectedCategory(null);
                            }}
                          >
                            <IconComponent
                              size={14}
                              color={
                                isSelected
                                  ? isDark
                                    ? '#000000'
                                    : '#FFFFFF'
                                  : currColors.textSecondary
                              }
                              style={{ marginRight: 6 }}
                            />
                            <ThemedText
                              style={[
                                styles.modalGridButtonText,
                                {
                                  color: isSelected
                                    ? isDark
                                      ? '#000000'
                                      : '#FFFFFF'
                                    : currColors.textSecondary,
                                  fontFamily: isSelected
                                    ? 'Outfit_600SemiBold'
                                    : 'Outfit_400Regular',
                                },
                              ]}
                            >
                              {filter.label}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Section 2: Date Range Presets */}
                  <View style={styles.modalSection}>
                    <ThemedText
                      style={[styles.sectionTitle, { color: currColors.textSecondary }]}
                    >
                      DATE RANGE
                    </ThemedText>
                    <View style={styles.presetsGrid}>
                      {(
                        [
                          { key: 'this_month', label: 'This Month' },
                          { key: 'this_week', label: 'This Week' },
                          { key: 'last_30_days', label: 'Last 30 Days' },
                          { key: 'last_90_days', label: 'Last 90 Days' },
                          { key: 'this_year', label: 'This Year' },
                          { key: 'all', label: 'All Time' },
                        ] as const
                      ).map((preset) => {
                        const isSelected = dateRange === preset.key && !customRange;
                        return (
                          <TouchableOpacity
                            key={preset.key}
                            style={[
                              styles.modalGridButton,
                              {
                                width: '48%',
                                backgroundColor: isSelected
                                  ? isDark
                                    ? '#FFFFFF'
                                    : '#1C1917'
                                  : currColors.cardSecondary,
                                borderColor: isSelected
                                  ? isDark
                                    ? '#FFFFFF'
                                    : '#1C1917'
                                  : currColors.border,
                              },
                            ]}
                            onPress={() => {
                              handleHaptic();
                              setCustomRange(null);
                              setDateRange(preset.key);
                            }}
                          >
                            <Calendar
                              size={14}
                              color={
                                isSelected
                                  ? isDark
                                    ? '#000000'
                                    : '#FFFFFF'
                                  : currColors.textSecondary
                              }
                              style={{ marginRight: 6 }}
                            />
                            <ThemedText
                              style={[
                                styles.modalGridButtonText,
                                {
                                  color: isSelected
                                    ? isDark
                                      ? '#000000'
                                      : '#FFFFFF'
                                    : currColors.textSecondary,
                                  fontFamily: isSelected
                                    ? 'Outfit_600SemiBold'
                                    : 'Outfit_400Regular',
                                },
                              ]}
                            >
                              {preset.label}
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Section 3: Categories */}
                  <View style={styles.modalSection}>
                    <ThemedText
                      style={[styles.sectionTitle, { color: currColors.textSecondary }]}
                    >
                      CATEGORY
                    </ThemedText>
                    {availableCategories.length === 0 ? (
                      <ThemedText
                        style={{
                          color: currColors.textSecondary,
                          fontSize: 13,
                          fontFamily: 'Outfit_400Regular',
                          marginTop: 4,
                        }}
                      >
                        No categories available for selected filters.
                      </ThemedText>
                    ) : (
                      <View style={styles.categoriesWrap}>
                        <TouchableOpacity
                          style={[
                            styles.categoryTag,
                            {
                              backgroundColor: !selectedCategory
                                ? isDark
                                  ? '#FFFFFF'
                                  : '#1C1917'
                                : currColors.cardSecondary,
                              borderColor: !selectedCategory
                                ? isDark
                                  ? '#FFFFFF'
                                  : '#1C1917'
                                : currColors.border,
                            },
                          ]}
                          onPress={() => {
                            handleHaptic();
                            setSelectedCategory(null);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.categoryTagText,
                              {
                                color: !selectedCategory
                                  ? isDark
                                    ? '#000000'
                                    : '#FFFFFF'
                                  : currColors.textSecondary,
                                fontFamily: !selectedCategory
                                  ? 'Outfit_600SemiBold'
                                  : 'Outfit_400Regular',
                              },
                            ]}
                          >
                            All Categories ({availableCategories.length})
                          </ThemedText>
                        </TouchableOpacity>

                        {availableCategories.map((cat) => {
                          const isSelected = selectedCategory === cat;
                          return (
                            <TouchableOpacity
                              key={cat}
                              style={[
                                styles.categoryTag,
                                {
                                  backgroundColor: isSelected
                                    ? isDark
                                      ? '#FFFFFF'
                                      : '#1C1917'
                                    : currColors.cardSecondary,
                                  borderColor: isSelected
                                    ? isDark
                                      ? '#FFFFFF'
                                      : '#1C1917'
                                    : currColors.border,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                },
                              ]}
                              onPress={() => {
                                handleHaptic();
                                setSelectedCategory(isSelected ? null : cat);
                              }}
                            >
                              <Category3DIcon
                                name={cat}
                                size={16}
                                style={{ marginRight: 6 }}
                              />
                              <ThemedText
                                style={[
                                  styles.categoryTagText,
                                  {
                                    color: isSelected
                                      ? isDark
                                        ? '#000000'
                                        : '#FFFFFF'
                                      : currColors.textSecondary,
                                    fontFamily: isSelected
                                      ? 'Outfit_600SemiBold'
                                      : 'Outfit_400Regular',
                                  },
                                ]}
                              >
                                {cat}
                              </ThemedText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </ScrollView>

                {/* Modal Footer Actions */}
                <View
                  style={[
                    styles.modalFooter,
                    { borderTopColor: currColors.border },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.modalClearBtn,
                      { borderColor: currColors.border, backgroundColor: currColors.cardSecondary },
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setCustomRange(null);
                      setActiveFilter('all');
                      setDateRange('this_month');
                      setSelectedCategory(null);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.modalClearBtnText,
                        { color: currColors.textSecondary },
                      ]}
                    >
                      Reset
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalApplyBtn,
                      { backgroundColor: isDark ? '#FFFFFF' : '#1C1917' },
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setFilterModalVisible(false);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.modalApplyBtnText,
                        { color: isDark ? '#000000' : '#FFFFFF' },
                      ]}
                    >
                      Show {filteredTxs.length}{' '}
                      {filteredTxs.length === 1 ? 'Transaction' : 'Transactions'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    paddingBottom: 12,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  filterTriggerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeFilterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF3B30',
  },
  scrollContent: {
    paddingTop: 4,
  },
  typeSwitcherWrap: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  typeSwitcherTrack: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    height: 38,
  },
  typeSwitcherPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  typeSwitcherPillText: {
    fontSize: 12.5,
  },
  activeFiltersSummary: {
    marginBottom: 12,
  },
  activeFiltersScroll: {
    paddingLeft: 16,
    paddingRight: 16,
    gap: 8,
    alignItems: 'center',
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryChipText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  clearAllText: {
    color: '#FF3B30',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  groupsContainer: {
    paddingHorizontal: 16,
  },
  dateGroupWrapper: {
    marginBottom: 16,
  },
  dateGroupHeader: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  dateGroupCard: {
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  txRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  txRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  txInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  txPrimaryText: {
    fontSize: 14.5,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  txSecondaryText: {
    fontSize: 11.5,
    fontFamily: 'Outfit_400Regular',
  },
  txRowRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  txAmountText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.2,
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: 28,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 18,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  floatingAddBtn: {
    position: 'absolute',
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 18,
    maxHeight: '82%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    paddingBottom: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalGridButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  modalGridButtonText: {
    fontSize: 13,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryTagText: {
    fontSize: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 12,
  },
  modalClearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClearBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalApplyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalApplyBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroRowLabel: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
  },
  heroRowValue: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
  },
});
