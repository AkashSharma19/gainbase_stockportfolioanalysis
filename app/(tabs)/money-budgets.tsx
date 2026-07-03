import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  PiggyBank,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Budget } from '@/types/money';

export default function BudgetsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { budgets, getCategorySpending } = useMoneyStore();
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const activeBudget = useMemo(() => {
    if (budgets.length === 0) return null;
    if (activeBudgetId) {
      return budgets.find((b) => b.id === activeBudgetId) || budgets[0];
    }
    const current = budgets.find((b) => b.isActive);
    return current || budgets[0];
  }, [budgets, activeBudgetId]);

  const spendingDetails = useMemo(() => {
    if (!activeBudget) return { totalSpent: 0, categories: [] };
    
    const spentMap = getCategorySpending(
      activeBudget.id,
      selectedDate.getFullYear(),
      selectedDate.getMonth()
    );
    let totalSpent = 0;

    const categoriesWithSpending = activeBudget.categories.map((cat) => {
      const spent = spentMap[cat.name] || 0;
      totalSpent += spent;
      return {
        ...cat,
        spent,
      };
    });

    return {
      totalSpent,
      categories: categoriesWithSpending,
    };
  }, [activeBudget, getCategorySpending, selectedDate]);

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '****';
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

  const handlePrevMonth = () => {
    handleHaptic();
    setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)));
  };

  const handleNextMonth = () => {
    handleHaptic();
    setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)));
  };

  const overallPercentage = useMemo(() => {
    if (!activeBudget || activeBudget.totalLimit === 0) return 0;
    return (spendingDetails.totalSpent / activeBudget.totalLimit) * 100;
  }, [activeBudget, spendingDetails]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          Budgets
        </ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => {
            handleHaptic();
            router.push('/add-budget');
          }}
        >
          <Plus size={20} color="#00C9A7" />
        </TouchableOpacity>
      </View>

      {budgets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <PiggyBank size={48} color={currColors.textSecondary} style={{ marginBottom: 16 }} />
          <ThemedText style={[styles.emptyText, { color: currColors.textSecondary }]}>
            No budgets created yet. Tap the '+' button above to create your first monthly budget and allocate limits per category.
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Budget Selector Tabs if multiple budgets */}
          {budgets.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScroll}
            >
              {budgets.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.tabItem,
                    { borderColor: currColors.border, backgroundColor: currColors.card },
                    activeBudget?.id === b.id && { borderColor: '#00C9A7', backgroundColor: '#00C9A710' },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setActiveBudgetId(b.id);
                  }}
                >
                  <ThemedText
                    type={activeBudget?.id === b.id ? 'semiBold' : 'medium'}
                    style={{
                      color: activeBudget?.id === b.id ? '#00C9A7' : currColors.textSecondary,
                    }}
                  >
                    {b.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {activeBudget && (
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

              {/* Overview Progress Card */}
              <TouchableOpacity
                style={[styles.overviewCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                activeOpacity={0.8}
                onPress={() => {
                  handleHaptic();
                  router.push(`/budget-details/${activeBudget.id}`);
                }}
              >
                <View style={styles.overviewHeader}>
                  <View>
                    <ThemedText type="bold" style={[styles.cardSubTitle, { color: currColors.textSecondary }]}>
                      {activeBudget.name.toUpperCase()} OVERALL SPENDING
                    </ThemedText>
                    <ThemedText style={[styles.cardVal, { color: currColors.text }]}>
                      {formatAmount(spendingDetails.totalSpent)}
                    </ThemedText>
                    <ThemedText style={[styles.cardLimit, { color: currColors.textSecondary }]}>
                      of {formatAmount(activeBudget.totalLimit)} budget
                    </ThemedText>
                  </View>
                  
                  <View style={[styles.percentageRing, { borderColor: overallPercentage > 90 ? '#FF3B30' : '#00C9A7' }]}>
                    <ThemedText style={[styles.ringText, { color: overallPercentage > 90 ? '#FF3B30' : '#00C9A7' }]}>
                      {overallPercentage.toFixed(0)}%
                    </ThemedText>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressBackground, { backgroundColor: currColors.cardSecondary, marginTop: 20 }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, overallPercentage)}%`,
                        backgroundColor: overallPercentage > 100 ? '#FF3B30' : overallPercentage > 80 ? '#FF9500' : '#00C9A7',
                      },
                    ]}
                  />
                </View>

                <View style={styles.cardFooter}>
                  <ThemedText style={{ fontSize: 12, color: currColors.textSecondary }}>
                    {overallPercentage > 100 
                      ? `Overspent by ${formatAmount(spendingDetails.totalSpent - activeBudget.totalLimit)}`
                      : `${formatAmount(activeBudget.totalLimit - spendingDetails.totalSpent)} remaining`}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ThemedText type="medium" style={{ fontSize: 12, color: '#00C9A7', marginRight: 4 }}>
                      Analyze Details
                    </ThemedText>
                    <ChevronRight size={14} color="#00C9A7" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Categories list */}
              <View style={styles.sectionHeader}>
                <ThemedText type="bold" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                  CATEGORY ALLOCATIONS
                </ThemedText>
              </View>

              {spendingDetails.categories.map((cat) => {
                const percentage = cat.limit > 0 ? (cat.spent / cat.limit) * 100 : 0;
                const isOverspent = cat.spent > cat.limit;
                
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      handleHaptic();
                      router.push(`/budget-details/${activeBudget.id}`);
                    }}
                  >
                    <View style={styles.catHeader}>
                      <View style={styles.catHeaderLeft}>
                        <View style={[styles.catIconWrapper, { backgroundColor: `${cat.color}15` }]}>
                          <ThemedText style={{ fontSize: 16 }}>{cat.icon}</ThemedText>
                        </View>
                        <ThemedText type="semiBold" style={[styles.catNameText, { color: currColors.text }]}>
                          {cat.name}
                        </ThemedText>
                      </View>
                      <View style={styles.catHeaderRight}>
                        <ThemedText style={[styles.catSpentVal, { color: isOverspent ? '#FF3B30' : currColors.text }]}>
                          {formatAmount(cat.spent)}
                        </ThemedText>
                        <ThemedText style={[styles.catLimitVal, { color: currColors.textSecondary }]}>
                          / {formatAmount(cat.limit)}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={[styles.progressBackground, { backgroundColor: currColors.cardSecondary }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(100, percentage)}%`,
                            backgroundColor: isOverspent ? '#FF3B30' : percentage > 85 ? '#FF9500' : '#00C9A7',
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.catFooter}>
                      <ThemedText style={{ fontSize: 11, color: isOverspent ? '#FF3B30' : currColors.textSecondary }}>
                        {isOverspent 
                          ? `Overspent by ${formatAmount(cat.spent - cat.limit)}` 
                          : `${formatAmount(cat.limit - cat.spent)} remaining`}
                      </ThemedText>
                      {isOverspent && <AlertTriangle size={14} color="#FF3B30" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
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
    fontSize: 24,
    fontFamily: 'Outfit_600SemiBold',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  tabsScroll: {
    paddingLeft: 16,
    paddingRight: 8,
    marginBottom: 16,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  overviewCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSubTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardVal: {
    fontSize: 24,
    fontFamily: 'Outfit_400Regular',
  },
  cardLimit: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  percentageRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  progressBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  categoryCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  catHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1.2,
  },
  catIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catNameText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    flex: 1,
  },
  catHeaderRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    flex: 1,
  },
  catSpentVal: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  catLimitVal: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  catFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 120,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
  },
  monthArrow: {
    padding: 6,
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
});
