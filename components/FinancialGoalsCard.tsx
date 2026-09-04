import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Target, ArrowRight } from 'lucide-react-native';

import { ThemedText } from './ThemedText';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';
import { useGoalStore } from '../store/useGoalStore';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { EvaluatedGoal, GoalUnit } from '../types/goals';
import { extractLiveVariableValues, evaluateGoal } from '../lib/goalEvaluator';

export function FinancialGoalsCard() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'dark';
  const currColors = Colors[theme];

  // Stores
  const goals = useGoalStore((state) => state.goals) || [];
  const {
    accounts,
    loans,
    subscriptions,
    budgets,
    moneyTransactions,
    getNetWorth,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
  const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);

  const portfolioSummary = useMemo(() => {
    return calculateSummary();
  }, [calculateSummary, transactions, tickers]);

  // Extract live variables
  const liveValues = useMemo(() => {
    return extractLiveVariableValues({
      accounts: accounts || [],
      loans: loans || [],
      subscriptions: subscriptions || [],
      budgets: budgets || [],
      moneyTransactions: moneyTransactions || [],
      netWorth: getNetWorth(),
      totalHoldingsValue: portfolioSummary.totalValue || 0,
      totalInvested: portfolioSummary.totalCost || 0,
      portfolioXirr: portfolioSummary.xirr || 0,
      dayGain: portfolioSummary.dayChange || 0,
      dayGainPct: portfolioSummary.dayChangePercentage || 0,
      realizedGains: portfolioSummary.realizedReturn || 0,
      stocksCount: new Set(transactions.map((t) => t.symbol)).size,
    });
  }, [accounts, loans, subscriptions, budgets, moneyTransactions, getNetWorth, portfolioSummary, transactions]);

  // Evaluated Goals
  const evaluatedGoals: EvaluatedGoal[] = useMemo(() => {
    return (goals || []).map((g) => evaluateGoal(g, liveValues));
  }, [goals, liveValues]);

  // Featured Goal (Prefer active in-progress goal with highest progress, or first goal)
  const featuredGoal = useMemo(() => {
    if (evaluatedGoals.length === 0) return null;
    const activeGoals = evaluatedGoals.filter((g) => !g.isAchieved);
    if (activeGoals.length > 0) {
      return [...activeGoals].sort((a, b) => b.progressPercentage - a.progressPercentage)[0];
    }
    return evaluatedGoals[0];
  }, [evaluatedGoals]);

  const summary = useMemo(() => {
    const total = evaluatedGoals.length;
    const achieved = evaluatedGoals.filter((g) => g.isAchieved).length;
    return { total, achieved };
  }, [evaluatedGoals]);

  const formatValue = (val: number, goalUnit: GoalUnit) => {
    if (isPrivacyMode) return '••••••';
    if (goalUnit === 'percentage') {
      return `${val.toFixed(1)}%`;
    }
    const symbol = showCurrencySymbol ? '₹' : '';
    return `${symbol}${val.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`;
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/goals');
  };

  if (!featuredGoal) {
    return (
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: currColors.card,
            borderColor: currColors.border,
          },
        ]}
        activeOpacity={0.8}
        onPress={handlePress}
      >
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Target size={12} color={currColors.textSecondary} />
            <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
              FINANCIAL GOALS
            </ThemedText>
          </View>
          <View style={[styles.iconCircle, { backgroundColor: currColors.cardSecondary }]}>
            <ArrowRight size={12} color={currColors.tint} />
          </View>
        </View>

        <View style={styles.emptyRow}>
          <ThemedText style={[styles.emptyText, { color: currColors.textSecondary }]}>
            Track custom targets like Emergency Fund & Portfolio Value
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  }

  const goalColor = featuredGoal.color || '#00C9A7';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: currColors.card,
          borderColor: currColors.border,
        },
      ]}
      activeOpacity={0.8}
      onPress={handlePress}
    >
      {/* Minimal Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Target size={12} color={currColors.textSecondary} />
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            FINANCIAL GOALS
          </ThemedText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {summary.total > 1 && (
            <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
              {summary.achieved > 0 ? `${summary.achieved}/${summary.total} done` : `${summary.total} goals`}
            </ThemedText>
          )}
          <View style={[styles.iconCircle, { backgroundColor: currColors.cardSecondary }]}>
            <ArrowRight size={12} color={currColors.tint} />
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.mainRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <ThemedText style={[styles.goalName, { color: currColors.text }]} numberOfLines={1}>
              {featuredGoal.name}
            </ThemedText>
            <ThemedText style={[styles.subValue, { color: currColors.textSecondary }]}>
              {formatValue(featuredGoal.currentValue, featuredGoal.unit)} of {formatValue(featuredGoal.targetValue, featuredGoal.unit)}
            </ThemedText>
          </View>

          <View style={[styles.progressBadge, { backgroundColor: `${goalColor}18` }]}>
            <ThemedText style={[styles.progressBadgeText, { color: goalColor }]}>
              {featuredGoal.isAchieved ? '100%' : `${featuredGoal.progressPercentage}%`}
            </ThemedText>
          </View>
        </View>

        {/* Minimal Progress Bar */}
        <View style={[styles.progressBarTrack, { backgroundColor: currColors.cardSecondary }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, Math.max(0, featuredGoal.progressPercentage))}%`,
                backgroundColor: goalColor,
              },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    gap: 10,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalName: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  subValue: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressBadgeText: {
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyRow: {
    paddingVertical: 2,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 18,
  },
});
