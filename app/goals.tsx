import React, { memo, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
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
  Calendar,
  Sparkles,
  Edit2,
  Trash2,
  ChevronRight,
  TrendingUp,
  Percent,
  Wallet,
  Landmark,
  ShieldCheck,
  Coins,
  Activity,
  Crown,
  CreditCard,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Info,
} from 'lucide-react-native';

import { ThemedText } from '../components/ThemedText';
import Colors from '../constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useGoalStore } from '../store/useGoalStore';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useAiStore } from '../store/useAiStore';
import { FinancialGoal, GoalCategory, GoalUnit, GoalOperator, EvaluatedGoal } from '../types/goals';
import { GOAL_VARIABLES, extractLiveVariableValues, evaluateGoal, evaluateFormula } from '../lib/goalEvaluator';
import { parseGoalPromptWithAI } from '../lib/goalAiParser';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GOAL_COLORS = [
  '#00C9A7',
  '#34C759',
  '#007AFF',
  '#5856D6',
  '#AF52DE',
  '#FF2D55',
  '#FF9500',
  '#FFCC00',
  '#FF3B30',
  '#64D2FF',
];

const GOAL_ICONS = [
  'Target',
  'ShieldCheck',
  'TrendingUp',
  'Activity',
  'Coins',
  'Landmark',
  'Wallet',
  'Crown',
  'Percent',
  'CreditCard',
  'Sparkles',
  'ShoppingBag',
];

const PRESET_TEMPLATES = [
  {
    name: 'Build 6-Month Emergency Fund',
    formula: 'Cash + Savings + Emergency',
    targetValue: 300000,
    targets: [100000, 200000, 300000],
    unit: 'currency' as GoalUnit,
    category: 'savings' as GoalCategory,
    icon: 'ShieldCheck',
    color: '#00C9A7',
  },
  {
    name: '₹10 Lakh Stock Portfolio',
    formula: 'HoldingsValue',
    targetValue: 1000000,
    targets: [250000, 500000, 1000000],
    unit: 'currency' as GoalUnit,
    category: 'investments' as GoalCategory,
    icon: 'TrendingUp',
    color: '#34C759',
  },
  {
    name: 'Achieve 18% Annualized XIRR',
    formula: 'PortfolioXIRR',
    targetValue: 18,
    targets: [12, 15, 18],
    unit: 'percentage' as GoalUnit,
    category: 'investments' as GoalCategory,
    icon: 'Activity',
    color: '#FF9500',
  },
  {
    name: 'Net Worth ₹50 Lakh Milestone',
    formula: 'NetWorth',
    targetValue: 5000000,
    targets: [1000000, 2500000, 5000000],
    unit: 'currency' as GoalUnit,
    category: 'retirement' as GoalCategory,
    icon: 'Crown',
    color: '#AF52DE',
  },
  {
    name: 'Become 100% Debt-Free',
    formula: 'TotalDebt',
    targetValue: 0,
    targets: [50000, 20000, 0],
    unit: 'currency' as GoalUnit,
    operator: '<=' as GoalOperator,
    category: 'debt' as GoalCategory,
    icon: 'CreditCard',
    color: '#007AFF',
  },
];

const QUICK_TRACK_PRESETS = [
  { label: '💰 Net Worth', formula: 'NetWorth', unit: 'currency' as GoalUnit, operator: '>=' as GoalOperator, icon: 'Crown', color: '#AF52DE', category: 'retirement' as GoalCategory },
  { label: '🛡️ Cash & Emergency', formula: 'Cash + Savings + Emergency', unit: 'currency' as GoalUnit, operator: '>=' as GoalOperator, icon: 'ShieldCheck', color: '#00C9A7', category: 'savings' as GoalCategory },
  { label: '📈 Stock Portfolio', formula: 'HoldingsValue', unit: 'currency' as GoalUnit, operator: '>=' as GoalOperator, icon: 'TrendingUp', color: '#34C759', category: 'investments' as GoalCategory },
  { label: '💳 Pay Off Debts', formula: 'TotalDebt', unit: 'currency' as GoalUnit, operator: '<=' as GoalOperator, icon: 'CreditCard', color: '#007AFF', category: 'debt' as GoalCategory },
  { label: '🚀 Portfolio XIRR', formula: 'PortfolioXIRR', unit: 'percentage' as GoalUnit, operator: '>=' as GoalOperator, icon: 'Activity', color: '#FF9500', category: 'investments' as GoalCategory },
  { label: '💵 Savings Rate', formula: 'MonthlySavingsRate', unit: 'percentage' as GoalUnit, operator: '>=' as GoalOperator, icon: 'Percent', color: '#00C9A7', category: 'savings' as GoalCategory },
];

// STANDALONE GOAL ITEM WITH SWIPE ACTIONS MATCHING HISTORY SCREEN
const GoalItemCard = memo(
  ({
    goal,
    currColors,
    formatValue,
    onEdit,
    onDelete,
    onToggleCompleted,
  }: {
    goal: EvaluatedGoal;
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
          <Edit2 size={18} color="#FFF" />
          <ThemedText style={styles.actionText}>Edit</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handlePressDelete}
        >
          <Trash2 size={18} color="#FFF" />
          <ThemedText style={styles.actionText}>Delete</ThemedText>
        </TouchableOpacity>
      </View>
    );

    // Calculate remaining to next target text
    let remainingText = '';
    if (goal.isAchieved) {
      remainingText = 'Target Reached ✓';
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
        containerStyle={[
          styles.swipeContainer,
          {
            borderColor: goal.isAchieved ? `${goal.color}50` : currColors.border,
            backgroundColor: currColors.card,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onEdit(goal)}
          style={[
            styles.minimalGoalCard,
            {
              backgroundColor: currColors.card,
            },
          ]}
        >
          {/* Top Row: Name + Checkmark on left, Current Value on right */}
          <View style={styles.minimalHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.notificationAsync(
                    goal.isAchieved
                      ? Haptics.NotificationFeedbackType.Warning
                      : Haptics.NotificationFeedbackType.Success
                  );
                  onToggleCompleted(goal.id);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ marginRight: 8 }}
              >
                {goal.isAchieved ? (
                  <CheckCircle2 size={18} color={goal.color || '#34C759'} strokeWidth={2.2} />
                ) : (
                  <Circle size={18} color={currColors.textSecondary} strokeWidth={1.8} />
                )}
              </TouchableOpacity>
              <ThemedText
                style={[
                  styles.minimalGoalName,
                  { color: currColors.text },
                  goal.isAchieved && styles.completedGoalText,
                ]}
                numberOfLines={1}
              >
                {goal.name}
              </ThemedText>
            </View>

            <ThemedText style={[styles.minimalCurrentValue, { color: goal.color }]}>
              {formatValue(goal.currentValue, goal.unit)}
            </ThemedText>
          </View>

          {/* Middle Row: Progress Bar (Segmented if multi-target) */}
          {goal.milestoneSegments && goal.milestoneSegments.length > 1 ? (
            <View style={styles.minimalSegmentedRow}>
              {goal.milestoneSegments.map((seg, sIdx) => (
                <View
                  key={`seg-${sIdx}`}
                  style={[
                    styles.minimalSegmentTrack,
                    {
                      backgroundColor: currColors.cardSecondary,
                      borderColor: seg.isAchieved ? `${goal.color}60` : 'transparent',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.minimalSegmentFill,
                      {
                        width: `${seg.fillPercentage}%`,
                        backgroundColor: goal.color,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.minimalProgressTrack, { backgroundColor: currColors.cardSecondary }]}>
              <View
                style={[
                  styles.minimalProgressFill,
                  {
                    width: `${goal.progressPercentage}%`,
                    backgroundColor: goal.color,
                  },
                ]}
              />
            </View>
          )}

          {/* Bottom Row: Percentage on left, Remaining to Next Target on right */}
          <View style={styles.minimalFooterRow}>
            <ThemedText
              style={[
                styles.minimalPctText,
                { color: goal.isAchieved ? goal.color : currColors.text },
              ]}
            >
              {goal.progressPercentage.toFixed(1)}%
            </ThemedText>
            <ThemedText
              style={[
                styles.minimalRemainingText,
                { color: goal.isAchieved ? goal.color : currColors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {remainingText}
            </ThemedText>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  }
);

export default function GoalsScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'dark';
  const currColors = Colors[theme];

  // Stores
  const { goals, addGoal, updateGoal, deleteGoal, toggleGoalCompleted } = useGoalStore();
  const { accounts, loans, subscriptions, budgets, moneyTransactions, getNetWorth } = useMoneyStore();
  const { isPrivacyMode, showCurrencySymbol, transactions, calculateSummary } = usePortfolioStore();
  const { geminiApiKey, selectedModel } = useAiStore();

  const portfolioSummary = useMemo(() => {
    return calculateSummary();
  }, [calculateSummary]);

  // Tab Filter
  const [filterTab, setFilterTab] = useState<'all' | 'in_progress' | 'achieved'>('all');

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

  const openAddModal = (template?: (typeof PRESET_TEMPLATES)[0]) => {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerIconBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={currColors.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>Financial Goals</ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#00C9A7' }]}
          onPress={() => openAddModal()}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          <ThemedText style={styles.addBtnText}>New</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Milestone Hero Banner */}
        <View style={[styles.heroCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <View style={styles.heroTopRow}>
            <View>
              <ThemedText style={[styles.heroSubLabel, { color: currColors.textSecondary }]}>
                GOALS MILESTONE
              </ThemedText>
              <ThemedText style={[styles.heroTitle, { color: currColors.text }]}>
                {summary.achieved} of {summary.total} Completed
              </ThemedText>
            </View>
            <View style={[styles.heroBadge, { backgroundColor: summary.pct === 100 ? 'rgba(52, 199, 89, 0.15)' : 'rgba(0, 201, 167, 0.15)' }]}>
              <ThemedText style={[styles.heroBadgeText, { color: summary.pct === 100 ? '#34C759' : '#00C9A7' }]}>
                {summary.pct.toFixed(0)}% Done
              </ThemedText>
            </View>
          </View>

          {/* Master Progress Bar */}
          <View style={[styles.masterTrack, { backgroundColor: currColors.cardSecondary }]}>
            <View
              style={[
                styles.masterFill,
                {
                  width: `${summary.pct}%`,
                  backgroundColor: summary.pct === 100 ? '#34C759' : '#00C9A7',
                },
              ]}
            />
          </View>

          <View style={styles.heroFooterRow}>
            <ThemedText style={[styles.heroFooterText, { color: currColors.textSecondary }]}>
              {summary.inProgress} in progress • {summary.achieved} achieved
            </ThemedText>
            {summary.pct === 100 && summary.total > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Sparkles size={14} color="#FFCC00" />
                <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#FFCC00' }}>
                  All targets unlocked!
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              { backgroundColor: filterTab === 'all' ? currColors.text : currColors.cardSecondary },
            ]}
            onPress={() => {
              handleHaptic();
              setFilterTab('all');
            }}
          >
            <ThemedText
              style={[
                styles.tabText,
                { color: filterTab === 'all' ? currColors.background : currColors.textSecondary },
              ]}
            >
              All ({summary.total})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              { backgroundColor: filterTab === 'in_progress' ? currColors.text : currColors.cardSecondary },
            ]}
            onPress={() => {
              handleHaptic();
              setFilterTab('in_progress');
            }}
          >
            <ThemedText
              style={[
                styles.tabText,
                { color: filterTab === 'in_progress' ? currColors.background : currColors.textSecondary },
              ]}
            >
              In Progress ({summary.inProgress})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              { backgroundColor: filterTab === 'achieved' ? currColors.text : currColors.cardSecondary },
            ]}
            onPress={() => {
              handleHaptic();
              setFilterTab('achieved');
            }}
          >
            <ThemedText
              style={[
                styles.tabText,
                { color: filterTab === 'achieved' ? currColors.background : currColors.textSecondary },
              ]}
            >
              Achieved ({summary.achieved})
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Goals List */}
        {filteredGoals.length === 0 ? (
          <View style={[styles.emptyStateCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Target size={40} color={currColors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
            <ThemedText style={[styles.emptyTitle, { color: currColors.text }]}>
              {filterTab === 'achieved' ? 'No goals completed yet' : 'No goals found'}
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: currColors.textSecondary }]}>
              {filterTab === 'achieved'
                ? 'Keep tracking your progress or check off any completed goal.'
                : 'Create a custom financial goal using formulas like Cash + Savings + Emergency.'}
            </ThemedText>
            <TouchableOpacity
              style={[styles.emptyActionBtn, { backgroundColor: '#00C9A7' }]}
              onPress={() => openAddModal()}
            >
              <ThemedText style={styles.emptyActionText}>+ Create Your First Goal</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          filteredGoals.map((goal) => (
            <GoalItemCard
              key={goal.id}
              goal={goal}
              currColors={currColors}
              formatValue={formatValue}
              onEdit={openEditModal}
              onDelete={handleDeleteGoal}
              onToggleCompleted={toggleGoalCompleted}
            />
          ))
        )}

        {/* Quick Starter Templates */}
        <View style={styles.templatesSection}>
          <ThemedText style={[styles.sectionHeading, { color: currColors.textSecondary }]}>
            POPULAR FORMULA TEMPLATES
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {PRESET_TEMPLATES.map((tpl, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.templateCard,
                  { backgroundColor: currColors.card, borderColor: currColors.border },
                ]}
                activeOpacity={0.75}
                onPress={() => openAddModal(tpl)}
              >
                <View style={[styles.templateIconBox, { backgroundColor: `${tpl.color}15` }]}>
                  <Target size={16} color={tpl.color} />
                </View>
                <ThemedText style={[styles.templateName, { color: currColors.text }]} numberOfLines={1}>
                  {tpl.name}
                </ThemedText>
                <ThemedText style={[styles.templateFormula, { color: currColors.textSecondary }]} numberOfLines={1}>
                  {tpl.formula}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
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
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'Outfit_600SemiBold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Hero Milestone Card
  heroCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroSubLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    marginTop: 2,
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroBadgeText: {
    fontSize: 12,
    fontFamily: 'Outfit_700Bold',
  },
  masterTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 14,
  },
  masterFill: {
    height: '100%',
    borderRadius: 4,
  },
  heroFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  heroFooterText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Empty state
  emptyStateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyActionText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },

  // Goal Card
  goalCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBtn: {
    marginRight: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  goalTitleCol: {
    flex: 1,
  },
  goalName: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  completedGoalText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  formulaTag: {
    marginTop: 2,
  },
  formulaTagText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 6,
  },
  smallIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 14,
    marginBottom: 6,
  },
  statSub: {
    fontSize: 9,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
  },
  statCurrent: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    marginTop: 2,
  },
  statTarget: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Segmented Progress Track Styles
  segmentedProgressRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    marginBottom: 8,
  },
  segmentTrack: {
    flex: 1,
    height: 7,
    borderRadius: 3.5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentFill: {
    height: '100%',
    borderRadius: 3.5,
  },

  // Milestone Tag Checklist Pills
  milestoneTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    marginTop: 2,
  },
  milestoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  milestoneTagText: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
  },
  goalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPctText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  daysBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },

  // Templates Section
  templatesSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    marginBottom: 10,
  },
  templateCard: {
    width: 170,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  templateIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  templateFormula: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#00C9A7',
  },
  modalSaveText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'Outfit_600SemiBold',
  },
  modalBody: {
    padding: 16,
    paddingBottom: 40,
  },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  previewValue: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    marginVertical: 4,
  },
  previewFormulaText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  operatorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  operatorBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorText: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
  },
  chipSectionLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  variableChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  variableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  variableChipText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  unitToggleRow: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  unitBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  unitBtnText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  dateSelector: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  directionBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  directionTitle: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  iconTile: {
    width: (SCREEN_WIDTH - 32 - 40) / 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // AI Assistant Box Styles
  aiCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 16,
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    fontFamily: 'Outfit_500Medium',
    minHeight: 52,
    textAlignVertical: 'top',
  },
  aiPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  aiActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4B97FF',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  aiActionBtnText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
  // Swipeable & Minimal Goal Card Styles
  swipeContainer: {
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rightActions: {
    flexDirection: 'row',
    width: 140,
    height: '100%',
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
    marginTop: 4,
    fontFamily: 'Outfit_500Medium',
  },
  minimalGoalCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  minimalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  minimalGoalName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    flex: 1,
  },
  minimalCurrentValue: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    marginLeft: 8,
  },
  minimalProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  minimalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  minimalSegmentedRow: {
    flexDirection: 'row',
    gap: 4,
    height: 6,
    marginBottom: 8,
  },
  minimalSegmentTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  minimalSegmentFill: {
    height: '100%',
    borderRadius: 3,
  },
  minimalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minimalPctText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  minimalRemainingText: {
    fontSize: 11.5,
    fontFamily: 'Outfit_500Medium',
  },

  // Modal Streamlined Styles
  quickTrackPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 10,
  },
  advancedSection: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 16,
  },
});
