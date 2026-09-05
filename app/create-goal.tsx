import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as LucideIcons from 'lucide-react-native';
import {
  X,
  Check,
  Plus,
  Target,
  Calendar,
  Sparkles,
  Trash2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  SlidersHorizontal,
  Percent,
  PiggyBank,
  CreditCard,
  Crown,
  ShieldCheck,
  Activity,
  Coins,
  Landmark,
  Wallet,
  ShoppingBag,
  CheckCircle2,
  Search,
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
import { formatIndianAmount, parseIndianAmount } from '@/utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GOAL_COLOR_PALETTE: {
  hex: string;
  name: string;
  description: string;
}[] = [
  { hex: '#00C9A7', name: 'Gainbase Teal', description: 'Primary brand accent for savings & milestone goals' },
  { hex: '#34C759', name: 'Emerald Green', description: 'Growth, investment compounding & wealth building' },
  { hex: '#007AFF', name: 'Electric Blue', description: 'Institutional clarity for debts & capital tracking' },
  { hex: '#5856D6', name: 'Indigo Dream', description: 'Focused financial discipline & long-term targets' },
  { hex: '#AF52DE', name: 'Royal Purple', description: 'Net worth & wealth accumulation milestones' },
  { hex: '#FF2D55', name: 'Coral Pink', description: 'Lifestyle, vacations & luxury reward goals' },
  { hex: '#FF9500', name: 'Sunset Amber', description: 'High-performing portfolio yield & returns' },
  { hex: '#FFCC00', name: 'Golden Sun', description: 'Precious metals, golden milestones & buffer goals' },
  { hex: '#FF3B30', name: 'Crimson Red', description: 'Urgent debt elimination & risk reduction' },
  { hex: '#64D2FF', name: 'Sky Cyan', description: 'Liquid cash reserves & financial freedom' },
];

const GOAL_COLORS = GOAL_COLOR_PALETTE.map((c) => c.hex);

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
  'ShoppingBag',
  'CheckCircle2',
];

const CATEGORIES: { key: GoalCategory; label: string; icon: any; color: string }[] = [
  { key: 'savings', label: 'Savings & Emergency', icon: PiggyBank, color: '#00C9A7' },
  { key: 'investments', label: 'Stocks & Portfolio', icon: TrendingUp, color: '#34C759' },
  { key: 'debt', label: 'Debt & Liabilities', icon: CreditCard, color: '#007AFF' },
  { key: 'retirement', label: 'Wealth & Retirement', icon: Crown, color: '#AF52DE' },
  { key: 'custom', label: 'Custom Financial Goal', icon: Target, color: '#FF9500' },
];

const QUICK_TRACK_PRESETS: {
  label: string;
  formula: string;
  description: string;
  unit: GoalUnit;
  operator: GoalOperator;
  icon: string;
  iconComponent: any;
  color: string;
  category: GoalCategory;
}[] = [
  { label: 'Net Worth', formula: 'NetWorth', description: 'Total Assets minus Total Liabilities', unit: 'currency', operator: '>=', icon: 'Crown', iconComponent: Crown, color: '#AF52DE', category: 'retirement' },
  { label: 'Cash & Emergency', formula: 'Cash + Savings + Emergency', description: 'Liquid cash reserves buffer', unit: 'currency', operator: '>=', icon: 'ShieldCheck', iconComponent: ShieldCheck, color: '#00C9A7', category: 'savings' },
  { label: 'Stock Portfolio', formula: 'HoldingsValue', description: 'Direct stock & ETF holding value', unit: 'currency', operator: '>=', icon: 'TrendingUp', iconComponent: TrendingUp, color: '#34C759', category: 'investments' },
  { label: 'Total Liquid Assets', formula: 'LiquidCash', description: 'Combined cash, savings & emergency funds', unit: 'currency', operator: '>=', icon: 'Coins', iconComponent: Coins, color: '#34C759', category: 'savings' },
  { label: 'Pay Off All Debts', formula: 'TotalDebt', description: 'Total outstanding loans & card debt', unit: 'currency', operator: '<=', icon: 'CreditCard', iconComponent: CreditCard, color: '#007AFF', category: 'debt' },
  { label: 'Credit Card Debt (Excl. Blocked)', formula: 'CreditCardDebt', description: 'Active credit card spend balance', unit: 'currency', operator: '<=', icon: 'CreditCard', iconComponent: CreditCard, color: '#FF9500', category: 'debt' },
  { label: 'Blocked CC Loan Amount', formula: 'BlockedCCDebt', description: 'Principal balance blocked for loan EMIs', unit: 'currency', operator: '<=', icon: 'CreditCard', iconComponent: CreditCard, color: '#FF3B30', category: 'debt' },
  { label: 'Total CC Debt (Incl. Blocked)', formula: 'TotalCCDebt', description: 'Combined card spent balance + EMI loan debt', unit: 'currency', operator: '<=', icon: 'CreditCard', iconComponent: CreditCard, color: '#FF3B30', category: 'debt' },
  { label: 'Loan Outstanding', formula: 'LoanOutstanding', description: 'Unpaid active loan balances', unit: 'currency', operator: '<=', icon: 'TrendingDown', iconComponent: TrendingDown, color: '#FF3B30', category: 'debt' },
  { label: 'Portfolio XIRR', formula: 'PortfolioXIRR', description: 'Annualized investment compounding rate', unit: 'percentage', operator: '>=', icon: 'Activity', iconComponent: Activity, color: '#FF9500', category: 'investments' },
  { label: 'Monthly Savings Rate', formula: 'MonthlySavingsRate', description: 'Savings as percentage of monthly income', unit: 'percentage', operator: '>=', icon: 'Percent', iconComponent: Percent, color: '#00C9A7', category: 'savings' },
  { label: 'Debt-to-Income (DTI)', formula: 'DebtToIncome', description: 'Monthly EMI burden relative to income', unit: 'percentage', operator: '<=', icon: 'Percent', iconComponent: Percent, color: '#FF3B30', category: 'debt' },
  { label: 'Daily Safe-to-Spend', formula: 'SafeToSpend', description: 'Remaining daily disposable run-rate', unit: 'currency', operator: '>=', icon: 'Sparkles', iconComponent: Sparkles, color: '#00C9A7', category: 'savings' },
];

const DIRECTIONS: {
  key: GoalOperator;
  label: string;
  subtitle: string;
  icon: any;
  color: string;
}[] = [
  {
    key: '>=',
    label: 'Accumulate & Grow (≥)',
    subtitle: 'Track positive accumulation towards a target balance or higher (e.g. Net Worth, Emergency Fund, Stocks, Savings Rate).',
    icon: TrendingUp,
    color: '#34C759',
  },
  {
    key: '<=',
    label: 'Pay Off & Reduce (≤)',
    subtitle: 'Track reduction towards zero or keeping debt / expense below a limit (e.g. Credit Card Debt, Loan EMIs, Total Debt, DTI).',
    icon: TrendingDown,
    color: '#FF3B30',
  },
];

const formatInputAmount = (val: string, goalUnit: GoalUnit): string => {
  if (!val) return '';
  if (goalUnit === 'percentage') {
    return val.replace(/[^0-9.]/g, '');
  }
  return formatIndianAmount(val);
};

const parseInputAmount = (val: string): number => {
  return parseIndianAmount(val);
};

export default function CreateGoalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; template?: string }>();
  const theme = useColorScheme() ?? 'dark';
  const currColors = Colors[theme];

  // Stores
  const { goals, addGoal, updateGoal, draftCustomFormula, setDraftCustomFormula } = useGoalStore();
  const { accounts, loans, subscriptions, budgets, moneyTransactions, getNetWorth } = useMoneyStore();
  const { isPrivacyMode, showCurrencySymbol, transactions, calculateSummary } = usePortfolioStore();
  const { geminiApiKey, selectedModel } = useAiStore();

  const portfolioSummary = useMemo(() => {
    return calculateSummary();
  }, [calculateSummary]);

  // Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('savings');
  const [formula, setFormula] = useState('Cash + Savings + Emergency');
  const [targetsList, setTargetsList] = useState<string[]>(['']);
  const [unit, setUnit] = useState<GoalUnit>('currency');
  const [operator, setOperator] = useState<GoalOperator>('>=');
  const [icon, setIcon] = useState('ShieldCheck');
  const [color, setColor] = useState('#00C9A7');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [trackSearchQuery, setTrackSearchQuery] = useState('');

  // AI Assistant States
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const editingGoal = useMemo(() => {
    if (!params.id) return null;
    return goals.find((g) => g.id === params.id) || null;
  }, [params.id, goals]);

  // Handle incoming draft custom formula from dedicated formula studio
  useEffect(() => {
    if (draftCustomFormula) {
      setFormula(draftCustomFormula.formula);
      setUnit(draftCustomFormula.unit);
      setOperator(draftCustomFormula.operator);
      if (!name && draftCustomFormula.label) {
        setName(draftCustomFormula.label);
      }
      setDraftCustomFormula(null);
    }
  }, [draftCustomFormula]);

  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name);
      setDescription(editingGoal.description || '');
      setCategory(editingGoal.category);
      setFormula(editingGoal.formula);
      if (editingGoal.targets && editingGoal.targets.length > 0) {
        setTargetsList(editingGoal.targets.map((t) => formatInputAmount(t.toString(), editingGoal.unit)));
      } else {
        setTargetsList([formatInputAmount(editingGoal.targetValue.toString(), editingGoal.unit)]);
      }
      setUnit(editingGoal.unit);
      setOperator(editingGoal.operator || (editingGoal.targetValue === 0 || editingGoal.category === 'debt' ? '<=' : '>='));
      setIcon(editingGoal.icon);
      setColor(editingGoal.color);
      setTargetDate(editingGoal.targetDate ? new Date(editingGoal.targetDate) : undefined);
    }
  }, [editingGoal]);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectedCategoryObj = useMemo(() => {
    return CATEGORIES.find((c) => c.key === category) || CATEGORIES[0];
  }, [category]);

  const selectedDirectionObj = useMemo(() => {
    return DIRECTIONS.find((d) => d.key === operator) || DIRECTIONS[0];
  }, [operator]);

  const selectedColorObj = useMemo(() => {
    return GOAL_COLOR_PALETTE.find((c) => c.hex.toLowerCase() === color.toLowerCase()) || GOAL_COLOR_PALETTE[0];
  }, [color]);

  const selectedTrackPreset = useMemo(() => {
    return QUICK_TRACK_PRESETS.find((p) => p.formula === formula) || null;
  }, [formula]);

  const filteredTrackPresets = useMemo(() => {
    if (!trackSearchQuery.trim()) return QUICK_TRACK_PRESETS;
    const query = trackSearchQuery.toLowerCase();
    return QUICK_TRACK_PRESETS.filter(
      (p) =>
        p.label.toLowerCase().includes(query) ||
        p.formula.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );
  }, [trackSearchQuery]);

  const handleGenerateAiGoal = async (customPrompt?: string) => {
    const textToParse = (customPrompt || aiPrompt).trim();
    if (!textToParse) {
      Alert.alert('Prompt Required', 'Please type a description of your goal first.');
      return;
    }

    handleHaptic();
    setIsGeneratingAi(true);

    try {
      const parsed = await parseGoalPromptWithAI(textToParse, geminiApiKey, selectedModel);
      setName(parsed.name);
      setDescription(parsed.description || '');
      setCategory(parsed.category);
      setFormula(parsed.formula);
      setTargetsList(parsed.targets.map((t) => formatInputAmount(t.toString(), parsed.unit)));
      setUnit(parsed.unit);
      setOperator(parsed.operator);
      setIcon(parsed.icon);
      setColor(parsed.color);
      if (parsed.targetDate) {
        setTargetDate(new Date(parsed.targetDate));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      Alert.alert('AI Goal Error', 'Could not parse goal. Please configure fields manually.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Compile live context for formula evaluations
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

  // Target Milestones Helpers
  const addTargetMilestone = () => {
    handleHaptic();
    setTargetsList((prev) => [...prev, '']);
  };

  const removeTargetMilestone = (idx: number) => {
    handleHaptic();
    if (targetsList.length <= 1) return;
    setTargetsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTargetMilestone = (idx: number, val: string) => {
    const formatted = formatInputAmount(val, unit);
    setTargetsList((prev) => {
      const copy = [...prev];
      copy[idx] = formatted;
      return copy;
    });
  };

  // Live Evaluated Preview Goal
  const previewEvaluatedGoal: EvaluatedGoal = useMemo(() => {
    const parsedTargets = targetsList
      .map((t) => parseInputAmount(t))
      .filter((n) => !isNaN(n) && n >= 0);

    const primaryTarget = parsedTargets.length > 0 ? parsedTargets[parsedTargets.length - 1] : 0;

    const draftGoal: FinancialGoal = {
      id: editingGoal ? editingGoal.id : 'preview-goal',
      name: name.trim() || 'My Financial Goal',
      description: description.trim() || undefined,
      category,
      icon,
      color,
      formula: formula.trim() || '0',
      targetValue: primaryTarget,
      targets: parsedTargets.length > 0 ? parsedTargets : [primaryTarget],
      unit,
      operator,
      targetDate: targetDate ? targetDate.toISOString() : undefined,
      isManuallyCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return evaluateGoal(draftGoal, liveValues);
  }, [
    editingGoal,
    name,
    description,
    category,
    icon,
    color,
    formula,
    targetsList,
    unit,
    operator,
    targetDate,
    liveValues,
  ]);

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selected) {
      setTargetDate(selected);
    }
  };

  const formatValue = (val: number, goalUnit: GoalUnit) => {
    if (isPrivacyMode) return '••••••';
    if (goalUnit === 'percentage') return `${val.toFixed(1)}%`;
    if (goalUnit === 'number') return val.toString();
    const formatted = formatIndianAmount(Math.round(val));
    return showCurrencySymbol ? `₹${formatted}` : formatted;
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please provide a name for this goal.');
      return;
    }

    if (!formula.trim()) {
      Alert.alert('Required Field', 'Please specify what to track for this goal.');
      return;
    }

    const parsedTargets = targetsList
      .map((t) => parseInputAmount(t))
      .filter((n) => !isNaN(n) && n >= 0);

    if (parsedTargets.length === 0) {
      Alert.alert('Required Field', 'Please enter at least one target milestone.');
      return;
    }

    const primaryTarget = parsedTargets[parsedTargets.length - 1];

    handleHaptic();

    if (editingGoal) {
      updateGoal(editingGoal.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        formula: formula.trim(),
        targetValue: primaryTarget,
        targets: parsedTargets,
        unit,
        operator,
        icon,
        color,
        targetDate: targetDate ? targetDate.toISOString() : undefined,
      });
    } else {
      addGoal({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        formula: formula.trim(),
        targetValue: primaryTarget,
        targets: parsedTargets,
        unit,
        operator,
        icon,
        color,
        targetDate: targetDate ? targetDate.toISOString() : undefined,
      });
    }

    router.back();
  };

  const SelectedIconComp = (LucideIcons as any)[icon] || Target;

  return (
    <View style={[styles.mainContainer, { backgroundColor: currColors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style={theme === 'light' ? 'dark' : 'light'} />

        {/* Top iOS Navigation Header */}
        <View style={[styles.header, { borderBottomColor: currColors.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.cancelButton}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.headerButtonText, { color: currColors.textSecondary }]}>
              Cancel
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
            {editingGoal ? 'Edit Goal' : 'New Goal'}
          </ThemedText>

          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.headerButtonText, styles.saveButtonText, { color: '#00C9A7' }]}>
              Save
            </ThemedText>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* AI Assistant Card (Natural Language Prefill) */}
            <View style={[styles.aiCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <View style={styles.aiCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} color="#007AFF" />
                  <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#007AFF' }}>
                    AI Goal Assistant
                  </ThemedText>
                </View>
              </View>

              <TextInput
                style={[
                  styles.aiInput,
                  {
                    backgroundColor: currColors.cardSecondary,
                    color: currColors.text,
                    borderColor: currColors.border,
                  },
                ]}
                placeholder="e.g. Save ₹5 Lakhs for emergency fund by December"
                placeholderTextColor={currColors.textSecondary}
                value={aiPrompt}
                onChangeText={setAiPrompt}
                multiline
              />

              {/* Inspiration Prompts Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, marginVertical: 8 }}
              >
                {[
                  'Build 6M Emergency Buffer',
                  '₹10L Stock Portfolio',
                  'Pay off All Debt',
                  '20% Portfolio XIRR',
                ].map((promptChip) => (
                  <TouchableOpacity
                    key={promptChip}
                    style={[styles.aiPill, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
                    onPress={() => {
                      setAiPrompt(promptChip);
                      handleGenerateAiGoal(promptChip);
                    }}
                  >
                    <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_500Medium', color: currColors.textSecondary }}>
                      {promptChip}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.aiActionBtn, isGeneratingAi && { opacity: 0.6 }]}
                onPress={() => handleGenerateAiGoal()}
                disabled={isGeneratingAi}
                activeOpacity={0.8}
              >
                <Sparkles size={14} color="#FFFFFF" />
                <ThemedText style={styles.aiActionBtnText}>
                  {isGeneratingAi ? 'Analyzing Intent...' : 'Auto-Fill with AI'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Live Progress Preview Card */}
            <View style={[styles.previewCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <View style={styles.previewTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={[styles.previewIconCircle, { backgroundColor: `${color}18` }]}>
                    <SelectedIconComp size={20} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.previewGoalTitle, { color: currColors.text }]} numberOfLines={1}>
                      {name || 'My Financial Goal'}
                    </ThemedText>
                    <ThemedText style={[styles.previewGoalSub, { color: currColors.textSecondary }]} numberOfLines={1}>
                      {selectedTrackPreset ? selectedTrackPreset.label : 'Custom Formula'} • {selectedCategoryObj.label}
                    </ThemedText>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText style={[styles.previewValues, { color }]}>
                    {formatValue(previewEvaluatedGoal.currentValue, unit)} / {formatValue(previewEvaluatedGoal.targetValue, unit)}
                  </ThemedText>
                  <View style={[styles.progressPercentPill, { backgroundColor: `${color}18` }]}>
                    <ThemedText style={[styles.progressPercentText, { color }]}>
                      {previewEvaluatedGoal.isAchieved ? 'ACHIEVED' : `${Math.min(100, previewEvaluatedGoal.progressPercentage).toFixed(0)}%`}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Progress Track */}
              {previewEvaluatedGoal.milestoneSegments && previewEvaluatedGoal.milestoneSegments.length > 1 ? (
                <View style={styles.segmentedProgressRow}>
                  {previewEvaluatedGoal.milestoneSegments.map((seg, sIdx) => (
                    <View
                      key={`prev-seg-${sIdx}`}
                      style={[
                        styles.segmentTrack,
                        {
                          flex: Math.max(0.04, seg.spanRatio ?? 1),
                          backgroundColor: `${color}20`,
                          borderColor: seg.isAchieved ? color : 'transparent',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.segmentFill,
                          {
                            width: `${seg.fillPercentage}%`,
                            backgroundColor: color,
                          },
                        ]}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[styles.minimalProgressTrack, { backgroundColor: `${color}20` }]}>
                  <View
                    style={[
                      styles.minimalProgressFill,
                      {
                        width: `${Math.min(100, previewEvaluatedGoal.progressPercentage)}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
              )}
            </View>

            {/* GROUP 1: GOAL BASICS */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              GOAL DETAILS
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              {/* Goal Name Row */}
              <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Goal Name</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="e.g. 6-Month Emergency Reserve"
                  placeholderTextColor={currColors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                />
              </View>

              {/* Category Row */}
              <TouchableOpacity
                style={[styles.formRow, { borderBottomColor: currColors.border }]}
                onPress={() => {
                  handleHaptic();
                  setShowCategoryModal(true);
                }}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.label, { color: currColors.text }]}>Category</ThemedText>
                <View style={styles.valueContainer}>
                  <View style={styles.categoryBadge}>
                    <View style={[styles.categoryIconWrap, { backgroundColor: `${selectedCategoryObj.color}15` }]}>
                      {React.createElement(selectedCategoryObj.icon, { size: 14, color: selectedCategoryObj.color })}
                    </View>
                    <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                      {selectedCategoryObj.label}
                    </ThemedText>
                  </View>
                  <ChevronRight size={14} color={currColors.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* What to Track Row (Works like Category List) */}
              <TouchableOpacity
                style={[styles.formRow, { borderBottomColor: currColors.border }]}
                onPress={() => {
                  handleHaptic();
                  setShowTrackModal(true);
                }}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.label, { color: currColors.text }]}>What to Track</ThemedText>
                <View style={styles.valueContainer}>
                  <View style={styles.categoryBadge}>
                    <View style={[styles.categoryIconWrap, { backgroundColor: `${selectedTrackPreset?.color || color}15` }]}>
                      {selectedTrackPreset ? (
                        React.createElement(selectedTrackPreset.iconComponent, { size: 14, color: selectedTrackPreset.color })
                      ) : (
                        <SlidersHorizontal size={14} color={color} />
                      )}
                    </View>
                    <ThemedText style={[styles.valueText, { color: currColors.text }]} numberOfLines={1}>
                      {selectedTrackPreset ? selectedTrackPreset.label : 'Custom Formula'}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: '#00C9A7', marginLeft: 4 }}>
                      ({formatValue(previewEvaluatedGoal.currentValue, unit)})
                    </ThemedText>
                  </View>
                  <ChevronRight size={14} color={currColors.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Description Row */}
              <View style={[styles.formRow, styles.formRowLast]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Notes (Optional)</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="e.g. For peace of mind"
                  placeholderTextColor={currColors.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                  textAlign="right"
                />
              </View>
            </View>

            {/* GROUP 2: TARGET & MILESTONES */}
            <View style={styles.groupHeaderRow}>
              <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary, marginBottom: 0 }]}>
                TARGET MILESTONES ({targetsList.length})
              </ThemedText>
              {/* Unit Toggle Switcher */}
              <View style={[styles.unitToggleRow, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.unitBtn,
                    unit === 'currency' && { backgroundColor: color },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setUnit('currency');
                    setTargetsList((prev) => prev.map((t) => formatInputAmount(t, 'currency')));
                  }}
                >
                  <ThemedText style={[styles.unitBtnText, { color: unit === 'currency' ? '#FFFFFF' : currColors.textSecondary }]}>
                    ₹ INR
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitBtn,
                    unit === 'percentage' && { backgroundColor: color },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setUnit('percentage');
                    setTargetsList((prev) => prev.map((t) => formatInputAmount(t, 'percentage')));
                  }}
                >
                  <ThemedText style={[styles.unitBtnText, { color: unit === 'percentage' ? '#FFFFFF' : currColors.textSecondary }]}>
                    % Pct
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.formGroup, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              {targetsList.map((targetVal, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === targetsList.length - 1;

                return (
                  <View
                    key={`target-input-${idx}`}
                    style={[
                      styles.formRow,
                      isFirst && styles.formRowFirst,
                      { borderBottomColor: currColors.border, borderBottomWidth: 1 },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.milestoneIndexBadge, { backgroundColor: `${color}15` }]}>
                        <ThemedText style={[styles.milestoneIndexText, { color }]}>
                          T{idx + 1}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.label, { color: currColors.text }]}>
                        {targetsList.length > 1 ? `Milestone ${idx + 1}` : 'Target Amount'}
                      </ThemedText>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
                      <TextInput
                        style={[styles.input, { color: currColors.text, flex: 1 }]}
                        placeholder={unit === 'currency' ? 'e.g. 5,00,000' : 'e.g. 20'}
                        placeholderTextColor={currColors.textSecondary}
                        keyboardType="numeric"
                        value={targetVal}
                        onChangeText={(val) => updateTargetMilestone(idx, val)}
                        textAlign="right"
                      />
                      {targetsList.length > 1 && (
                        <TouchableOpacity
                          onPress={() => removeTargetMilestone(idx)}
                          style={styles.deleteMilestoneBtn}
                        >
                          <Trash2 size={13} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              <TouchableOpacity
                style={[styles.formRow, styles.formRowLast, { justifyContent: 'center', paddingVertical: 12 }]}
                onPress={addTargetMilestone}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} color="#00C9A7" />
                  <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#00C9A7' }}>
                    Add Incremental Milestone
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>

            {/* GROUP 3: PREFERENCES & STYLING */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              PREFERENCES & STYLING
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              {/* Goal Type / Direction Row */}
              <TouchableOpacity
                style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}
                onPress={() => {
                  handleHaptic();
                  setShowDirectionModal(true);
                }}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.label, { color: currColors.text }]}>Direction</ThemedText>
                <View style={styles.valueContainer}>
                  <View style={styles.categoryBadge}>
                    <View style={[styles.categoryIconWrap, { backgroundColor: `${selectedDirectionObj.color}15` }]}>
                      {React.createElement(selectedDirectionObj.icon, { size: 14, color: selectedDirectionObj.color })}
                    </View>
                    <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                      {selectedDirectionObj.label}
                    </ThemedText>
                  </View>
                  <ChevronRight size={14} color={currColors.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Target Deadline Date */}
              <View style={[styles.formRow, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Target Deadline</ThemedText>
                <View style={{ flex: 1 }}>
                  {Platform.OS === 'ios' ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <DateTimePicker
                        value={targetDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        themeVariant={theme}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      style={{ alignItems: 'flex-end' }}
                    >
                      <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                        {targetDate
                          ? targetDate.toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'No deadline set'}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {showDatePicker && Platform.OS !== 'ios' && (
                <DateTimePicker
                  value={targetDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}

              {/* Color Theme Selector */}
              <TouchableOpacity
                style={[styles.formRow, { borderBottomColor: currColors.border }]}
                onPress={() => {
                  handleHaptic();
                  setShowColorModal(true);
                }}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.label, { color: currColors.text }]}>Color Theme</ThemedText>
                <View style={styles.valueContainer}>
                  <View style={styles.categoryBadge}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: selectedColorObj.hex, marginRight: 6 }} />
                    <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                      {selectedColorObj.name}
                    </ThemedText>
                  </View>
                  <ChevronRight size={14} color={currColors.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Icon Selector Grid */}
              <View style={[styles.formRow, styles.formRowLast, { flexDirection: 'column', alignItems: 'stretch', paddingVertical: 12, gap: 8 }]}>
                <ThemedText style={[styles.label, { color: currColors.text, marginBottom: 4 }]}>
                  Goal Icon
                </ThemedText>
                <View style={styles.iconSelectorGrid}>
                  {GOAL_ICONS.map((icName) => {
                    const Ic = (LucideIcons as any)[icName] || Target;
                    const isSel = icon === icName;
                    return (
                      <TouchableOpacity
                        key={icName}
                        style={[
                          styles.iconTile,
                          { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                          isSel && { borderColor: color, backgroundColor: `${color}20`, borderWidth: 1.5 },
                        ]}
                        onPress={() => {
                          handleHaptic();
                          setIcon(icName);
                        }}
                      >
                        <Ic size={18} color={isSel ? color : currColors.text} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Category Picker Modal (Matches Account Type Modal) */}
        <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Goal Category</ThemedText>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.modalCloseButton}>
                <X size={20} color={currColors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = category === item.key;
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    style={[styles.listItem, { borderBottomColor: currColors.border }]}
                    onPress={() => {
                      handleHaptic();
                      setCategory(item.key);
                      setShowCategoryModal(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[styles.typeIconCircle, { backgroundColor: `${item.color}15` }]}>
                        <IconComponent size={18} color={item.color} />
                      </View>
                      <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>
                        {item.label}
                      </ThemedText>
                    </View>
                    {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Modal>

        {/* Direction Picker Modal (Matches Account Type Modal with detailed description) */}
        <Modal visible={showDirectionModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Goal Direction</ThemedText>
              <TouchableOpacity onPress={() => setShowDirectionModal(false)} style={styles.modalCloseButton}>
                <X size={20} color={currColors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={DIRECTIONS}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = operator === item.key;
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    style={[styles.listItem, { borderBottomColor: currColors.border, paddingVertical: 14 }]}
                    onPress={() => {
                      handleHaptic();
                      setOperator(item.key);
                      setShowDirectionModal(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1, marginRight: 8 }}>
                      <View style={[styles.typeIconCircle, { backgroundColor: `${item.color}15`, marginTop: 2 }]}>
                        <IconComponent size={18} color={item.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>
                          {item.label}
                        </ThemedText>
                        <ThemedText style={[styles.itemSub, { color: currColors.textSecondary }]}>
                          {item.subtitle}
                        </ThemedText>
                      </View>
                    </View>
                    {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} style={{ marginTop: 6 }} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Modal>

        {/* Color Theme Modal (Presentation pageSheet matching Category, Direction & Account Type Selection) */}
        <Modal visible={showColorModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Goal Color Theme</ThemedText>
              <TouchableOpacity onPress={() => setShowColorModal(false)} style={styles.modalCloseButton}>
                <X size={20} color={currColors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={GOAL_COLOR_PALETTE}
              keyExtractor={(item) => item.hex}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = color.toLowerCase() === item.hex.toLowerCase();
                return (
                  <TouchableOpacity
                    style={[styles.listItem, { borderBottomColor: currColors.border, paddingVertical: 14 }]}
                    onPress={() => {
                      handleHaptic();
                      setColor(item.hex);
                      setShowColorModal(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                      <View style={[styles.typeIconCircle, { backgroundColor: item.hex }]}>
                        {isSelected && <Check size={18} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>
                          {item.name}
                        </ThemedText>
                        <ThemedText style={[styles.itemSub, { color: currColors.textSecondary }]}>
                          {item.description}
                        </ThemedText>
                      </View>
                    </View>
                    {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Modal>

        {/* What to Track Modal (Presentation pageSheet matching Category & Account Type Selection) */}
        <Modal visible={showTrackModal} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                What to Track
              </ThemedText>
              <TouchableOpacity onPress={() => setShowTrackModal(false)} style={styles.modalCloseButton}>
                <X size={20} color={currColors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchBarContainer, { backgroundColor: currColors.cardSecondary }]}>
              <Search size={16} color={currColors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: currColors.text }]}
                placeholder="Search metrics to track..."
                placeholderTextColor={currColors.textSecondary}
                value={trackSearchQuery}
                onChangeText={setTrackSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>

            {/* Presets List */}
            <FlatList
              data={filteredTrackPresets}
              keyExtractor={(item) => item.formula}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = formula === item.formula;
                const IconComp = item.iconComponent;
                const liveVal = evaluateFormula(item.formula, liveValues);
                const formatted = formatValue(liveVal, item.unit);

                return (
                  <TouchableOpacity
                    style={[styles.listItem, { borderBottomColor: currColors.border }]}
                    onPress={() => {
                      handleHaptic();
                      setFormula(item.formula);
                      setUnit(item.unit);
                      setOperator(item.operator);
                      setIcon(item.icon);
                      setColor(item.color);
                      setCategory(item.category);
                      if (!name) {
                        setName(item.label);
                      }
                      setShowTrackModal(false);
                      setTrackSearchQuery('');
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                      <View style={[styles.typeIconCircle, { backgroundColor: `${item.color}15` }]}>
                        <IconComp size={18} color={item.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>
                          {item.label}
                        </ThemedText>
                        <ThemedText style={[styles.itemSub, { color: currColors.textSecondary }]} numberOfLines={1}>
                          {item.description}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.liveValPill, { backgroundColor: currColors.cardSecondary }]}>
                        <ThemedText style={[styles.liveValPillText, { color: '#00C9A7' }]}>
                          {formatted}
                        </ThemedText>
                      </View>
                      {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Dedicated Custom Formula Studio Navigation Button */}
            <TouchableOpacity
              style={[styles.customFormulaBtn, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
              onPress={() => {
                setShowTrackModal(false);
                setTrackSearchQuery('');
                setDraftCustomFormula({
                  formula,
                  unit,
                  operator,
                  label: name || 'Custom Goal',
                });
                router.push('/custom-goal-formula');
              }}
            >
              <SlidersHorizontal size={16} color="#00C9A7" style={{ marginRight: 6 }} />
              <ThemedText style={{ color: '#00C9A7', fontSize: 15, fontFamily: 'Outfit_600SemiBold' }}>
                + Custom Variables & Formula Studio
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  saveButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  headerButtonText: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  saveButtonText: {
    fontFamily: 'Outfit_600SemiBold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },

  // AI Assistant Card
  aiCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    minHeight: 48,
    textAlignVertical: 'top',
  },
  aiPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 38,
    marginTop: 4,
  },
  aiActionBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },

  // Preview Card
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewGoalTitle: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  previewGoalSub: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  previewValues: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  progressPercentPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  progressPercentText: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
  },
  segmentedProgressRow: {
    flexDirection: 'row',
    gap: 4,
    height: 6,
  },
  segmentTrack: {
    flex: 1,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  segmentFill: {
    height: '100%',
    borderRadius: 3,
  },
  minimalProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  minimalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Grouped Layout
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  formGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 48,
  },
  formRowFirst: {},
  formRowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  input: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    paddingVertical: 12,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },

  // Category Badge
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Unit Toggle
  unitToggleRow: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    height: 28,
  },
  unitBtn: {
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitBtnText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Milestones
  milestoneIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneIndexText: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
  },
  deleteMilestoneBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Direction Toggle
  directionToggleGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  directionToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  directionToggleText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Color circles & Icon grid
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    width: '100%',
  },
  iconTile: {
    width: '15%',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Standard iOS Modal (Matches Add Account Screen)
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalCloseButton: {
    padding: 4,
  },
  searchBarContainer: {
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
  },
  listContent: {
    paddingBottom: 30,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  itemSub: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
    lineHeight: 16,
  },
  typeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  liveValPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveValPillText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  customFormulaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
