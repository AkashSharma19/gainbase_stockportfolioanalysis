import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  PiggyBank,
  TrendingDown,
  ChevronRight,
  Lightbulb,
} from 'lucide-react-native';

import { ThemedText } from './ThemedText';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 48; // Leaves offset preview for next card

export function FinancialInsights() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  // Stores
  const {
    accounts,
    moneyTransactions,
    loans,
    budgets,
    getActiveBudget,
    getCategorySpending,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

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

  // Generate dynamic insights
  const insights = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      message: string;
      type: 'success' | 'warning' | 'tip';
      icon: any;
      actionLabel: string;
      actionPath: any;
    }> = [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfMonth = new Date(currentYear, currentMonth, 1).getTime();
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).getTime();

    // 1. Savings Rate Health
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    moneyTransactions.forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      if (txTime >= startOfMonth && txTime <= endOfMonth) {
        if (tx.type === 'income') {
          monthlyIncome += tx.amount;
        } else if (tx.type === 'expense') {
          monthlyExpense += tx.amount;
        }
      }
    });

    if (monthlyIncome > 0) {
      const savingsRate = ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100;
      if (savingsRate >= 20) {
        list.push({
          id: 'savings_high',
          title: 'High Savings Rate',
          message: `Awesome! You've saved ${savingsRate.toFixed(0)}% of your income this month. Keep it up!`,
          type: 'success',
          icon: Sparkles,
          actionLabel: 'View Analytics',
          actionPath: '/money-analytics',
        });
      } else if (savingsRate < 10 && savingsRate > 0) {
        list.push({
          id: 'savings_low',
          title: 'Low Savings Rate',
          message: `Your savings rate is at ${savingsRate.toFixed(0)}% this month. Try trimming discretionary spends.`,
          type: 'tip',
          icon: TrendingDown,
          actionLabel: 'View Analytics',
          actionPath: '/money-analytics',
        });
      } else if (savingsRate <= 0) {
        list.push({
          id: 'savings_deficit',
          title: 'Spending Deficit',
          message: `You spent more than you earned this month. Review your category limits.`,
          type: 'warning',
          icon: AlertTriangle,
          actionLabel: 'Check Budgets',
          actionPath: '/(tabs)/money-budgets',
        });
      }
    }

    // 2. Budget Threshold Warnings
    const activeBudget = getActiveBudget();
    if (activeBudget) {
      const categorySpentMap = getCategorySpending(activeBudget.id, currentYear, currentMonth);
      activeBudget.categories.forEach((cat) => {
        if (cat.limit <= 0) return;
        const spent = categorySpentMap[cat.name] || 0;
        const pct = (spent / cat.limit) * 100;
        if (pct >= 100) {
          list.push({
            id: `budget_over_${cat.id}`,
            title: `${cat.name} Overspent`,
            message: `You've exceeded your ${cat.name} budget limit of ${formatAmount(cat.limit)} by ${formatAmount(spent - cat.limit)}.`,
            type: 'warning',
            icon: AlertTriangle,
            actionLabel: 'Adjust Limit',
            actionPath: '/add-budget',
          });
        } else if (pct >= 85) {
          list.push({
            id: `budget_near_${cat.id}`,
            title: `${cat.name} Nearing Limit`,
            message: `You've utilized ${pct.toFixed(0)}% of your ${cat.name} budget. ${formatAmount(cat.limit - spent)} remaining.`,
            type: 'tip',
            icon: TrendingUp,
            actionLabel: 'View Details',
            actionPath: '/(tabs)/money-budgets',
          });
        }
      });
    }

    // 3. Unbudgeted Spend Suggestions
    if (activeBudget) {
      const categorySpentMap = getCategorySpending(activeBudget.id, currentYear, currentMonth);
      const budgetLimits: { [name: string]: number } = {};
      activeBudget.categories.forEach((c) => {
        budgetLimits[c.name] = c.limit;
      });

      Object.keys(categorySpentMap).forEach((catName) => {
        const spent = categorySpentMap[catName] || 0;
        const limit = budgetLimits[catName] || 0;
        if (limit === 0 && spent >= 2000) {
          list.push({
            id: `unbudgeted_${catName}`,
            title: `Unbudgeted ${catName}`,
            message: `You spent ${formatAmount(spent)} on ${catName} this month without a budget limit configured.`,
            type: 'tip',
            icon: PiggyBank,
            actionLabel: 'Configure Limit',
            actionPath: '/add-budget',
          });
        }
      });
    }

    // 4. Credit Card High Utilization
    accounts.forEach((acc) => {
      if (acc.type === 'credit_card' && !acc.isArchived && acc.creditLimit && acc.creditLimit > 0 && acc.balance < 0) {
        const util = (Math.abs(acc.balance) / acc.creditLimit) * 100;
        if (util > 50) {
          list.push({
            id: `cc_util_${acc.id}`,
            title: `High Card Utilization`,
            message: `Your ${acc.name} is at ${util.toFixed(0)}% utilization. Keep it below 30% to protect credit scores.`,
            type: 'warning',
            icon: AlertTriangle,
            actionLabel: 'View Cards',
            actionPath: '/(tabs)/money-accounts',
          });
        }
      }
    });

    // 5. Low EMI Emergency Buffer
    const activeLoans = loans.filter((l) => l.isActive);
    if (activeLoans.length > 0) {
      const monthlyEMIs = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);
      const totalLiquidCash = accounts
        .filter((a) => !a.isArchived && a.includeInAssets !== false && (a.type === 'wallet' || a.type === 'savings'))
        .reduce((sum, a) => sum + a.balance, 0);
      if (monthlyEMIs > 0 && totalLiquidCash < monthlyEMIs * 1.5) {
        list.push({
          id: `low_emi_buffer`,
          title: `Low EMI Cash Cover`,
          message: `Your liquid cash balance is below 1.5x of your monthly EMIs (${formatAmount(monthlyEMIs)}). Consider building a cash buffer.`,
          type: 'warning',
          icon: AlertTriangle,
          actionLabel: 'View Loans',
          actionPath: '/(tabs)/money-loans',
        });
      }
    }

    return list;
  }, [accounts, moneyTransactions, loans, budgets]);

  const getThemeStyles = (type: 'success' | 'warning' | 'tip') => {
    if (colorScheme === 'dark') {
      switch (type) {
        case 'success':
          return { bg: '#061D1A', border: '#00C9A740', icon: '#00C9A7' };
        case 'warning':
          return { bg: '#250B0B', border: '#FF3B3040', icon: '#FF3B30' };
        case 'tip':
          return { bg: '#1F1306', border: '#FF950040', icon: '#FF9500' };
      }
    } else {
      switch (type) {
        case 'success':
          return { bg: '#EAF8F6', border: '#00C9A730', icon: '#007A65' };
        case 'warning':
          return { bg: '#FDF2F2', border: '#FF3B3030', icon: '#C62828' };
        case 'tip':
          return { bg: '#FEF8F0', border: '#FF950030', icon: '#B26A00' };
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <ThemedText type="bold" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
          SMART INSIGHTS
        </ThemedText>
      </View>

      {insights.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <Lightbulb size={24} color="#FF9500" style={{ marginBottom: 8 }} />
          <ThemedText style={[styles.emptyTitle, { color: currColors.text }]}>
            All Systems Clear
          </ThemedText>
          <ThemedText style={[styles.emptyDesc, { color: currColors.textSecondary }]}>
            Log more transactions or configure budget limits to get personalized financial advice.
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
          contentContainerStyle={styles.scrollContent}
        >
          {insights.map((item) => {
            const stylesForType = getThemeStyles(item.type);
            const IconComponent = item.icon;

            return (
              <View
                key={item.id}
                style={[
                  styles.insightCard,
                  {
                    backgroundColor: stylesForType.bg,
                    borderColor: stylesForType.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <IconComponent size={16} color={stylesForType.icon} style={{ marginRight: 8 }} />
                    <ThemedText
                      style={[
                        styles.insightTitle,
                        { color: stylesForType.icon, fontFamily: 'Outfit_600SemiBold' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText
                  style={[styles.insightMessage, { color: currColors.text, fontFamily: 'Outfit_400Regular' }]}
                >
                  {item.message}
                </ThemedText>

                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: stylesForType.icon }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    handleHaptic();
                    router.push(item.actionPath);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.actionLabel,
                      { color: stylesForType.icon, fontFamily: 'Outfit_600SemiBold' },
                    ]}
                  >
                    {item.actionLabel}
                  </ThemedText>
                  <ChevronRight size={12} color={stylesForType.icon} />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingBottom: 8,
    gap: 12,
  },
  insightCard: {
    width: CARD_WIDTH,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 124,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  insightTitle: {
    fontSize: 13,
    flex: 1,
  },
  insightMessage: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionLabel: {
    fontSize: 10,
    marginRight: 2,
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
