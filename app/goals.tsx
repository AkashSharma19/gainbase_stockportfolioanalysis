import React, { memo, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as LucideIcons from 'lucide-react-native';
import {
  ArrowLeft,
  Plus,
  Target,
  CheckCircle2,
  Circle,
  ChevronRight,
  Edit2,
  Trash2,
  Sparkles,
} from 'lucide-react-native';
import { BackButton } from '@/components/BackButton';

import { ThemedText } from '../components/ThemedText';
import Colors from '../constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Category3DIcon } from '@/components/Category3DIcon';
import { useGoalStore } from '../store/useGoalStore';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { FinancialGoal, GoalUnit, EvaluatedGoal } from '../types/goals';
import { extractLiveVariableValues, evaluateGoal } from '../lib/goalEvaluator';

type FilterTab = 'all' | 'in_progress' | 'achieved';

// STANDALONE GOAL ROW ITEM MATCHING GAINBASE LIST PATTERNS
const GoalRowItem = memo(
  ({
    goal,
    isLast,
    currColors,
    formatValue,
    onEdit,
    onDelete,
    onToggleCompleted,
  }: {
    goal: EvaluatedGoal;
    isLast: boolean;
    currColors: any;
    formatValue: (val: number, unit: GoalUnit) => string;
    onEdit: (goal: FinancialGoal) => void;
    onDelete: (goal: FinancialGoal) => void;
    onToggleCompleted: (id: string) => void;
  }) => {
    const swipeableRef = useRef<Swipeable>(null);

    const handlePressEdit = () => {
      swipeableRef.current?.close();
      onEdit(goal);
    };

    const handlePressDelete = () => {
      swipeableRef.current?.close();
      onDelete(goal);
    };

    const renderRightActions = () => (
      <View style={styles.rightActions}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.actionButton, styles.editButton]}
          onPress={handlePressEdit}
        >
          <Edit2 size={16} color="#FFF" />
          <ThemedText style={styles.actionText}>Edit</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handlePressDelete}
        >
          <Trash2 size={16} color="#FFF" />
          <ThemedText style={styles.actionText}>Delete</ThemedText>
        </TouchableOpacity>
      </View>
    );

    const goalColor = goal.color || '#00C9A7';

    // Calculate remaining text
    let remainingText = '';
    if (goal.isAchieved) {
      remainingText = 'Target Achieved ✓';
    } else if (goal.operator === '<=' || goal.targetValue === 0) {
      remainingText = `${formatValue(goal.remainingValue, goal.unit)} to clear`;
    } else if (goal.milestoneSegments && goal.milestoneSegments.length > 1) {
      const activeTarget = goal.activeMilestoneTarget;
      const diff = Math.max(0, activeTarget - goal.currentValue);
      remainingText = `${formatValue(diff, goal.unit)} to T${goal.activeMilestoneIndex + 1}`;
    } else {
      remainingText = `${formatValue(goal.remainingValue, goal.unit)} to target`;
    }

    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={30}
        overshootRight={false}
      >
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onEdit(goal)}
          style={[
            styles.goalRow,
            !isLast && { borderBottomWidth: 1, borderBottomColor: currColors.border },
            { backgroundColor: currColors.card },
          ]}
        >
          {/* Main Top Row */}
          <View style={styles.cardMainRow}>
            {/* Left 3D Icon */}
            <Category3DIcon
              name={goal.icon}
              icon={goal.icon}
              size={36}
              style={{ marginRight: 12 }}
            />

            {/* Middle Info Column */}
            <View style={styles.infoCol}>
              <View style={styles.titleLine}>
                <ThemedText
                  type="semiBold"
                  style={[
                    styles.goalTitle,
                    { color: currColors.text },
                    goal.isAchieved && styles.completedGoalText,
                  ]}
                  numberOfLines={1}
                >
                  {goal.name}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.notificationAsync(
                      goal.isAchieved
                        ? Haptics.NotificationFeedbackType.Warning
                        : Haptics.NotificationFeedbackType.Success
                    );
                    onToggleCompleted(goal.id);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.checkToggle}
                >
                  {goal.isAchieved ? (
                    <CheckCircle2 size={16} color={goalColor} strokeWidth={2.2} />
                  ) : (
                    <Circle size={16} color={currColors.textSecondary} strokeWidth={1.8} />
                  )}
                </TouchableOpacity>
              </View>

              <ThemedText style={[styles.goalSub, { color: currColors.textSecondary }]} numberOfLines={1}>
                {remainingText}
              </ThemedText>
            </View>

            {/* Right Value & Chevron */}
            <View style={styles.cardRight}>
              <View style={styles.valueStack}>
                <ThemedText style={[styles.currentValText, { color: currColors.text }]}>
                  {formatValue(goal.currentValue, goal.unit)}
                </ThemedText>
                <ThemedText style={[styles.pctText, { color: goal.isAchieved ? '#34C759' : goalColor }]}>
                  {goal.progressPercentage.toFixed(0)}%
                </ThemedText>
              </View>
              <ChevronRight size={16} color={currColors.textSecondary} style={styles.chevron} />
            </View>
          </View>

          {/* Progress Bar (Single or Multi-Segment) */}
          {goal.milestoneSegments && goal.milestoneSegments.length > 1 ? (
            <View style={styles.segmentedProgressRow}>
              {goal.milestoneSegments.map((seg, sIdx) => (
                <View
                  key={`seg-${sIdx}`}
                  style={[
                    styles.segmentTrack,
                    {
                      flex: Math.max(0.04, seg.spanRatio ?? 1),
                      backgroundColor: currColors.cardSecondary,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.segmentFill,
                      {
                        width: `${seg.fillPercentage}%`,
                        backgroundColor: goalColor,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.progressBackground, { backgroundColor: currColors.cardSecondary }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, goal.progressPercentage)}%`,
                    backgroundColor: goalColor,
                  },
                ]}
              />
            </View>
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  }
);

export default function GoalsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  // Stores
  const { goals, deleteGoal, toggleGoalCompleted } = useGoalStore();
  const { accounts, loans, subscriptions, budgets, moneyTransactions, getNetWorth } = useMoneyStore();
  const { isPrivacyMode, showCurrencySymbol, transactions, calculateSummary } = usePortfolioStore();

  const portfolioSummary = useMemo(() => {
    return calculateSummary();
  }, [calculateSummary]);

  // Tab Filter
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Compute live values dictionary
  const liveValues = useMemo(() => {
    return extractLiveVariableValues({
      accounts,
      loans,
      subscriptions,
      budgets,
      moneyTransactions,
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

  // Evaluate all goals
  const evaluatedGoals: EvaluatedGoal[] = useMemo(() => {
    return (goals || []).map((g) => evaluateGoal(g, liveValues));
  }, [goals, liveValues]);

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    if (filterTab === 'in_progress') {
      return evaluatedGoals.filter((g) => !g.isAchieved);
    }
    if (filterTab === 'achieved') {
      return evaluatedGoals.filter((g) => g.isAchieved);
    }
    return evaluatedGoals;
  }, [evaluatedGoals, filterTab]);

  // Summary Metrics
  const summary = useMemo(() => {
    const total = evaluatedGoals.length;
    const achieved = evaluatedGoals.filter((g) => g.isAchieved).length;
    const inProgress = total - achieved;
    const pct = total > 0 ? (achieved / total) * 100 : 0;
    return { total, achieved, inProgress, pct };
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

  const openAddModal = () => {
    handleHaptic();
    router.push('/create-goal');
  };

  const openEditModal = (goal: FinancialGoal) => {
    handleHaptic();
    router.push(`/create-goal?id=${goal.id}`);
  };

  const handleDeleteGoal = (goal: FinancialGoal) => {
    handleHaptic();
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            deleteGoal(goal.id);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      {/* Header Matching Gainbase Patterns */}
      <View style={styles.header}>
        <BackButton />
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          Financial Goals
        </ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
          onPress={openAddModal}
          activeOpacity={0.7}
        >
          <Plus size={20} color="#00C9A7" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Overall Goals Summary Card (Matching Budgets & Loans Screens) */}
        {summary.total > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <View style={styles.summaryHeader}>
              <View>
                <ThemedText style={[styles.summarySubTitle, { color: currColors.textSecondary }]}>
                  MILESTONES & TARGETS
                </ThemedText>
                <ThemedText style={[styles.summaryVal, { color: currColors.text }]}>
                  {summary.achieved} of {summary.total} Completed
                </ThemedText>
              </View>
              <View
                style={[
                  styles.badgePill,
                  { backgroundColor: summary.pct === 100 ? 'rgba(52, 199, 89, 0.15)' : 'rgba(0, 201, 167, 0.15)' },
                ]}
              >
                <ThemedText
                  style={{
                    fontSize: 11,
                    fontFamily: 'Outfit_600SemiBold',
                    color: summary.pct === 100 ? '#34C759' : '#00C9A7',
                  }}
                >
                  {summary.pct.toFixed(0)}% Done
                </ThemedText>
              </View>
            </View>

            <View style={[styles.progressBackground, { backgroundColor: currColors.cardSecondary, marginTop: 12 }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, summary.pct)}%`,
                    backgroundColor: summary.pct === 100 ? '#34C759' : '#00C9A7',
                  },
                ]}
              />
            </View>

            <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />

            <View style={styles.summaryFooter}>
              <ThemedText style={[styles.footerLabel, { color: currColors.textSecondary }]}>
                {summary.inProgress} In Progress • {summary.achieved} Achieved
              </ThemedText>
              {summary.pct === 100 && summary.total > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={12} color="#FFCC00" />
                  <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#FFCC00' }}>
                    All Unlocked!
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Filter Chips Matching Explore & History */}
        {summary.total > 0 && (
          <View style={styles.filterRow}>
            {(
              [
                { key: 'all', label: `All (${summary.total})` },
                { key: 'in_progress', label: `In Progress (${summary.inProgress})` },
                { key: 'achieved', label: `Achieved (${summary.achieved})` },
              ] as const
            ).map((tab) => {
              const isActive = filterTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? '#00C9A7' : currColors.card,
                      borderColor: isActive ? '#00C9A7' : currColors.border,
                    },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setFilterTab(tab.key);
                  }}
                  activeOpacity={0.7}
                >
                  <ThemedText
                    style={[
                      styles.filterChipText,
                      { color: isActive ? '#FFFFFF' : currColors.textSecondary },
                      isActive && { fontFamily: 'Outfit_600SemiBold' },
                    ]}
                  >
                    {tab.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <ThemedText type="medium" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            TARGET GOALS ({filteredGoals.length})
          </ThemedText>
        </View>

        {/* Goals List in Group Wrapper Card */}
        {filteredGoals.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Target size={40} color={currColors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
            <ThemedText style={[styles.emptyTitle, { color: currColors.text }]}>
              {filterTab === 'achieved' ? 'No goals completed yet' : 'No financial goals found'}
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: currColors.textSecondary }]}>
              {filterTab === 'achieved'
                ? 'Keep building up your accounts or check off your completed milestones.'
                : 'Create dynamic goals with custom formulas like Net Worth, Emergency Fund, or Portfolio targets.'}
            </ThemedText>
            <TouchableOpacity
              style={[styles.emptyActionBtn, { backgroundColor: '#00C9A7' }]}
              onPress={openAddModal}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.emptyActionText}>+ Create Your First Goal</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.groupWrapperCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            {filteredGoals.map((goal, index) => (
              <GoalRowItem
                key={goal.id}
                goal={goal}
                isLast={index === filteredGoals.length - 1}
                currColors={currColors}
                formatValue={formatValue}
                onEdit={openEditModal}
                onDelete={handleDeleteGoal}
                onToggleCompleted={toggleGoalCompleted}
              />
            ))}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Summary Card (Matching Budgets & Loans Design)
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summarySubTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  summaryVal: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBackground: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },

  // Filter Chips Row
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },

  // Section Header
  sectionHeader: {
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Group Wrapper Card
  groupWrapperCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  goalRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    flex: 1,
  },
  completedGoalText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  checkToggle: {
    marginLeft: 6,
    marginRight: 8,
  },
  goalSub: {
    fontSize: 11.5,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  valueStack: {
    alignItems: 'flex-end',
    marginRight: 6,
  },
  currentValText: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
  },
  pctText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 1,
  },
  chevron: {
    marginLeft: 2,
  },

  // Segmented Progress Track
  segmentedProgressRow: {
    flexDirection: 'row',
    gap: 4,
    height: 5,
    marginTop: 4,
  },
  segmentTrack: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    borderRadius: 2.5,
  },

  // Swipe Actions
  rightActions: {
    flexDirection: 'row',
    width: 130,
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'Outfit_500Medium',
  },

  // Empty State Card
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  emptyActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyActionText: {
    fontSize: 12.5,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
});
