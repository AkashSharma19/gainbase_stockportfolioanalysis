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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as LucideIcons from 'lucide-react-native';
import {
  ArrowLeft,
  Plus,
  Target,
  CheckCircle2,
  Calendar,
  Sparkles,
  Trash2,
  X,
  ChevronRight,
  TrendingUp,
  Percent,
  Check,
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
  'ShoppingBag',
  'CheckCircle2',
];

const QUICK_TRACK_PRESETS = [
  { label: '💰 Net Worth', formula: 'NetWorth', unit: 'currency' as GoalUnit, operator: '>=' as GoalOperator, icon: 'Crown', color: '#AF52DE', category: 'retirement' as GoalCategory },
  { label: '🛡️ Cash & Emergency', formula: 'Cash + Savings + Emergency', unit: 'currency' as GoalUnit, operator: '>=' as GoalOperator, icon: 'ShieldCheck', color: '#00C9A7', category: 'savings' as GoalCategory },
  { label: '📈 Stock Portfolio', formula: 'HoldingsValue', unit: 'currency' as GoalUnit, operator: '>=' as GoalOperator, icon: 'TrendingUp', color: '#34C759', category: 'investments' as GoalCategory },
  { label: '💳 Pay Off Debts', formula: 'TotalDebt', unit: 'currency' as GoalUnit, operator: '<=' as GoalOperator, icon: 'CreditCard', color: '#007AFF', category: 'debt' as GoalCategory },
  { label: '🚀 Portfolio XIRR', formula: 'PortfolioXIRR', unit: 'percentage' as GoalUnit, operator: '>=' as GoalOperator, icon: 'Activity', color: '#FF9500', category: 'investments' as GoalCategory },
  { label: '💵 Savings Rate', formula: 'MonthlySavingsRate', unit: 'percentage' as GoalUnit, operator: '>=' as GoalOperator, icon: 'Percent', color: '#00C9A7', category: 'savings' as GoalCategory },
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
  const { goals, addGoal, updateGoal } = useGoalStore();
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
  const [formula, setFormula] = useState('');
  const [targetsList, setTargetsList] = useState<string[]>(['']);
  const [unit, setUnit] = useState<GoalUnit>('currency');
  const [operator, setOperator] = useState<GoalOperator>('>=');
  const [icon, setIcon] = useState('Target');
  const [color, setColor] = useState('#00C9A7');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // AI Assistant States
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const editingGoal = useMemo(() => {
    if (!params.id) return null;
    return goals.find((g) => g.id === params.id) || null;
  }, [params.id, goals]);

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
      const isCustomFormula = !QUICK_TRACK_PRESETS.some((p) => p.formula === editingGoal.formula);
      setShowAdvanced(isCustomFormula);
    }
  }, [editingGoal]);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

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
      Alert.alert('AI Error', 'Could not parse goal automatically. Please enter details manually.');
    } finally {
      setIsGeneratingAi(false);
    }
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

  // Live evaluated preview inside formula editor
  const previewEvaluatedGoal: EvaluatedGoal = useMemo(() => {
    const parsed = targetsList
      .map((t) => parseInputAmount(t))
      .filter((t) => !isNaN(t) && (unit !== 'currency' || t >= 0));

    const sorted = [...parsed].sort((a, b) => (operator === '<=' ? b - a : a - b));
    const finalTarget = sorted.length > 0 ? sorted[sorted.length - 1] : 0;

    const mockGoal: FinancialGoal = {
      id: 'preview',
      name: name || 'Goal Preview',
      category,
      formula: formula || '',
      targetValue: finalTarget,
      targets: sorted.length > 0 ? sorted : [finalTarget],
      unit,
      operator,
      icon,
      color,
      isManuallyCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return evaluateGoal(mockGoal, liveValues);
  }, [targetsList, unit, operator, name, category, formula, icon, color, liveValues]);

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

  const addTargetMilestone = () => {
    handleHaptic();
    setTargetsList((prev) => [...prev, '']);
  };

  const updateTargetMilestone = (idx: number, val: string) => {
    const formatted = formatInputAmount(val, unit);
    setTargetsList((prev) => prev.map((t, i) => (i === idx ? formatted : t)));
  };

  const removeTargetMilestone = (idx: number) => {
    handleHaptic();
    if (targetsList.length > 1) {
      setTargetsList((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const appendToFormula = (variableOrOperator: string) => {
    handleHaptic();
    setFormula((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return variableOrOperator;
      if (['+', '-', '*', '/', '(', ')'].includes(variableOrOperator)) {
        return `${trimmed} ${variableOrOperator} `;
      }
      return `${trimmed} + ${variableOrOperator}`;
    });
  };

  const handleSaveGoal = () => {
    handleHaptic();
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a name for your financial goal.');
      return;
    }

    const parsedTargets = targetsList
      .map((t) => parseInputAmount(t))
      .filter((t) => !isNaN(t) && (unit !== 'currency' || t >= 0));

    if (parsedTargets.length === 0) {
      Alert.alert('Invalid Target', 'Please enter at least one valid milestone target value.');
      return;
    }

    if (!formula.trim()) {
      Alert.alert('Required Formula', 'Please specify a formula or select an asset to track.');
      return;
    }

    // Sort parsed targets
    const sortedTargets = [...parsedTargets].sort((a, b) => (operator === '<=' ? b - a : a - b));
    const finalTargetValue = sortedTargets[sortedTargets.length - 1];

    const goalData = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      formula: formula.trim(),
      targetValue: finalTargetValue,
      targets: sortedTargets,
      unit,
      operator,
      icon,
      color,
      targetDate: targetDate ? targetDate.toISOString() : undefined,
    };

    if (editingGoal) {
      updateGoal(editingGoal.id, goalData);
    } else {
      addGoal(goalData);
    }

    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: currColors.cardSecondary }]}
            onPress={() => {
              handleHaptic();
              router.back();
            }}
          >
            <ArrowLeft size={20} color={currColors.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
            {editingGoal ? 'Edit Goal' : 'Create Financial Goal'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.headerSaveBtn, { backgroundColor: '#00C9A7' }]}
            onPress={handleSaveGoal}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.headerSaveText}>Save</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* ✨ AI Natural Language Auto-Prefill Box ✨ */}
          <View style={[styles.aiCard, { backgroundColor: currColors.cardSecondary, borderColor: '#4B97FF35' }]}>
            <View style={styles.aiCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color="#4B97FF" />
                <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: '#4B97FF', letterSpacing: 0.5 }}>
                  AI GOAL ASSISTANT
                </ThemedText>
              </View>
              <ThemedText style={{ fontSize: 10, color: currColors.textSecondary }}>
                Plain English / Hinglish
              </ThemedText>
            </View>

            <TextInput
              style={[
                styles.aiInput,
                {
                  backgroundColor: currColors.card,
                  color: currColors.text,
                  borderColor: currColors.border,
                },
              ]}
              placeholder="e.g. Save ₹10L for emergency in 3 milestones: 2L, 5L and 10L..."
              placeholderTextColor={currColors.textSecondary}
              value={aiPrompt}
              onChangeText={setAiPrompt}
              multiline
            />

            {/* Quick Inspiration Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, marginVertical: 6 }}
            >
              {[
                '🛡️ Save ₹5L Emergency Fund in 3 milestones',
                '📈 ₹10 Lakh Stock Portfolio milestone',
                '💳 Clear all payables & debt down to ₹0',
                '🚀 Achieve 20% Portfolio XIRR',
                '👑 ₹50 Lakh Net Worth milestone',
                '💰 40% Monthly Savings Rate',
              ].map((p, idx) => (
                <TouchableOpacity
                  key={`ai-pill-${idx}`}
                  style={[
                    styles.aiPill,
                    {
                      backgroundColor: currColors.card,
                      borderColor: currColors.border,
                    },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    const cleanP = p.replace(/^[^\s]+\s/, '');
                    setAiPrompt(cleanP);
                    handleGenerateAiGoal(cleanP);
                  }}
                >
                  <ThemedText style={{ fontSize: 10.5, fontFamily: 'Outfit_500Medium', color: currColors.text }}>
                    {p}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Action button */}
            <TouchableOpacity
              style={[
                styles.aiActionBtn,
                (!aiPrompt.trim() || isGeneratingAi) && { opacity: 0.7 },
              ]}
              disabled={isGeneratingAi || !aiPrompt.trim()}
              onPress={() => handleGenerateAiGoal()}
            >
              <Sparkles size={13} color="#FFFFFF" />
              <ThemedText style={styles.aiActionBtnText}>
                {isGeneratingAi ? 'Parsing Intent with AI...' : 'Auto-Fill with AI ✨'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Live Formula Preview Strip */}
          <View style={[styles.previewCard, { backgroundColor: `${color}12`, borderColor: `${color}35`, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 16 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <ThemedText style={[styles.previewLabel, { color: color }]}>LIVE PREVIEW</ThemedText>
              <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_700Bold', color: currColors.text }}>
                {formatValue(previewEvaluatedGoal.currentValue, unit)} / {formatValue(previewEvaluatedGoal.targetValue, unit)} ({previewEvaluatedGoal.progressPercentage.toFixed(0)}%)
              </ThemedText>
            </View>

            {/* Segmented mini-bar inside preview */}
            {previewEvaluatedGoal.milestoneSegments && previewEvaluatedGoal.milestoneSegments.length > 1 ? (
              <View style={[styles.segmentedProgressRow, { marginTop: 6, marginBottom: 2 }]}>
                {previewEvaluatedGoal.milestoneSegments.map((seg, sIdx) => (
                  <View
                    key={`prev-seg-${sIdx}`}
                    style={[
                      styles.segmentTrack,
                      {
                        flex: Math.max(0.04, seg.spanRatio ?? 1),
                        height: 5,
                        backgroundColor: `${color}25`,
                        borderColor: seg.isAchieved ? `${color}80` : 'transparent',
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
              <View style={[styles.minimalProgressTrack, { height: 5, marginTop: 6, marginBottom: 2, backgroundColor: `${color}25` }]}>
                <View
                  style={[
                    styles.minimalProgressFill,
                    {
                      width: `${previewEvaluatedGoal.progressPercentage}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
            )}
          </View>

          {/* 1. Goal Name Field */}
          <View style={styles.formGroup}>
            <ThemedText style={[styles.inputLabel, { color: currColors.textSecondary }]}>GOAL TITLE</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: currColors.cardSecondary, color: currColors.text, borderColor: currColors.border }]}
              placeholder="e.g., 6-Month Emergency Reserve or ₹10L Portfolio"
              placeholderTextColor={currColors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* 2. What to Track (One-Tap Presets) */}
          <View style={styles.formGroup}>
            <ThemedText style={[styles.inputLabel, { color: currColors.textSecondary }]}>WHAT TO TRACK</ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_TRACK_PRESETS.map((p) => {
                const isSelected = formula === p.formula;
                const liveVal = evaluateFormula(p.formula, liveValues);
                const formattedLiveVal = formatValue(liveVal, p.unit);

                return (
                  <TouchableOpacity
                    key={p.formula}
                    style={[
                      styles.quickTrackPill,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isSelected ? `${p.color}20` : currColors.cardSecondary,
                        borderColor: isSelected ? p.color : currColors.border,
                        borderWidth: isSelected ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => {
                      handleHaptic();
                      if (isSelected) {
                        setFormula('');
                      } else {
                        setFormula(p.formula);
                        setUnit(p.unit);
                        setOperator(p.operator);
                        setIcon(p.icon);
                        setColor(p.color);
                        setCategory(p.category);
                        if (!name) {
                          setName(p.label.replace(/^[^\s]+\s/, ''));
                        }
                      }
                    }}
                  >
                    <ThemedText style={{ fontSize: 11.5, fontFamily: 'Outfit_600SemiBold', color: isSelected ? p.color : currColors.text }}>
                      {p.label}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 10.5, fontFamily: 'Outfit_700Bold', color: isSelected ? p.color : '#00C9A7', marginLeft: 4 }}>
                      ({formattedLiveVal})
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[
                  styles.quickTrackPill,
                  {
                    backgroundColor: showAdvanced ? `${color}20` : currColors.cardSecondary,
                    borderColor: showAdvanced ? color : currColors.border,
                  },
                ]}
                onPress={() => {
                  handleHaptic();
                  setShowAdvanced(!showAdvanced);
                }}
              >
                <ThemedText style={{ fontSize: 11.5, fontFamily: 'Outfit_600SemiBold', color: showAdvanced ? color : currColors.textSecondary }}>
                  ⚙️ Custom Formula
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Target Milestones & Inline Unit Toggle */}
          <View style={styles.formGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <ThemedText style={[styles.inputLabel, { color: currColors.textSecondary, marginBottom: 0 }]}>
                TARGET AMOUNT ({targetsList.length} {targetsList.length > 1 ? 'Milestones' : 'Target'})
              </ThemedText>
              <View style={[styles.unitToggleRow, { width: 110, height: 32 }]}>
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
                  <ThemedText style={[styles.unitBtnText, { fontSize: 10, color: unit === 'currency' ? '#FFFFFF' : currColors.textSecondary }]}>
                    ₹ (INR)
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
                  <ThemedText style={[styles.unitBtnText, { fontSize: 10, color: unit === 'percentage' ? '#FFFFFF' : currColors.textSecondary }]}>
                    % (Pct)
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {targetsList.map((targetVal, idx) => (
              <View key={`target-input-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {targetsList.length > 1 && (
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: `${color}18`,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <ThemedText style={{ fontSize: 10, fontFamily: 'Outfit_700Bold', color }}>
                      T{idx + 1}
                    </ThemedText>
                  </View>
                )}
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      flex: 1,
                      backgroundColor: currColors.cardSecondary,
                      color: currColors.text,
                      borderColor: currColors.border,
                    },
                  ]}
                  placeholder={
                    targetsList.length > 1
                      ? `Milestone ${idx + 1} (e.g. ${idx === 0 ? '1,00,000' : idx === 1 ? '5,00,000' : '10,00,000'})`
                      : unit === 'currency'
                      ? 'e.g. 1,00,000'
                      : 'e.g. 20'
                  }
                  placeholderTextColor={currColors.textSecondary}
                  keyboardType="numeric"
                  value={targetVal}
                  onChangeText={(val) => updateTargetMilestone(idx, val)}
                />
                {targetsList.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeTargetMilestone(idx)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: 'rgba(255, 59, 48, 0.1)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={13} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              onPress={addTargetMilestone}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4 }}
            >
              <Plus size={13} color={color} strokeWidth={2.5} />
              <ThemedText style={{ fontSize: 11.5, fontFamily: 'Outfit_600SemiBold', color }}>
                + Add Incremental Milestone
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* 4. Collapsible Advanced Settings (Icon, Color, Deadline, Condition) */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.accordionHeader,
              { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
            ]}
            onPress={() => {
              handleHaptic();
              setShowAdvanced(!showAdvanced);
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.colorCircle, { width: 16, height: 16, borderRadius: 8, backgroundColor: color }]} />
              <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: currColors.text }}>
                {showAdvanced ? 'Hide Customizations' : 'More Options (Icon, Color, Deadline, Formula)'}
              </ThemedText>
            </View>
            <ChevronRight
              size={16}
              color={currColors.textSecondary}
              style={{ transform: [{ rotate: showAdvanced ? '90deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {showAdvanced && (
            <View style={[styles.advancedSection, { borderColor: currColors.border }]}>
              {/* Goal Direction Condition */}
              <View style={[styles.formGroup, { marginTop: 8 }]}>
                <ThemedText style={[styles.inputLabel, { color: currColors.textSecondary }]}>GOAL TYPE</ThemedText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.directionBtn,
                      { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                      operator === '>=' && { borderColor: color, backgroundColor: `${color}15`, borderWidth: 2 },
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setOperator('>=');
                    }}
                  >
                    <ThemedText style={[styles.directionTitle, { color: operator === '>=' ? color : currColors.text }]}>
                      📈 Accumulate (≥)
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.directionBtn,
                      { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                      operator === '<=' && { borderColor: color, backgroundColor: `${color}15`, borderWidth: 2 },
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setOperator('<=');
                    }}
                  >
                    <ThemedText style={[styles.directionTitle, { color: operator === '<=' ? color : currColors.text }]}>
                      📉 Pay Off (≤)
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Target Deadline */}
              <View style={styles.formGroup}>
                <ThemedText style={[styles.inputLabel, { color: currColors.textSecondary }]}>
                  TARGET DEADLINE (OPTIONAL)
                </ThemedText>
                <TouchableOpacity
                  style={[styles.dateSelector, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
                  onPress={() => {
                    handleHaptic();
                    setShowDatePicker(!showDatePicker);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Calendar size={16} color={color} />
                    <ThemedText style={{ fontSize: 12.5, color: targetDate ? currColors.text : currColors.textSecondary }}>
                      {targetDate
                        ? targetDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'No deadline set'}
                    </ThemedText>
                  </View>
                  {targetDate && (
                    <TouchableOpacity
                      onPress={() => {
                        handleHaptic();
                        setTargetDate(undefined);
                      }}
                    >
                      <X size={15} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={targetDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                      if (Platform.OS !== 'ios') setShowDatePicker(false);
                      if (selectedDate) setTargetDate(selectedDate);
                    }}
                  />
                )}
              </View>

              {/* Theme Color */}
              <View style={styles.formGroup}>
                <ThemedText style={[styles.inputLabel, { color: currColors.textSecondary }]}>THEME COLOR</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {GOAL_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c, width: 28, height: 28, borderRadius: 14 },
                        color === c && { borderColor: currColors.text, borderWidth: 2.5 },
                      ]}
                      onPress={() => {
                        handleHaptic();
                        setColor(c);
                      }}
                    >
                      {color === c && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Icon Selector */}
              <View style={styles.formGroup}>
                <ThemedText style={[styles.inputLabel, { color: currColors.textSecondary }]}>ICON</ThemedText>
                <View style={styles.iconSelectorGrid}>
                  {GOAL_ICONS.map((icName) => {
                    const Ic = (LucideIcons as any)[icName] || LucideIcons.Target;
                    const isSel = icon === icName;
                    return (
                      <TouchableOpacity
                        key={icName}
                        style={[
                          styles.iconTile,
                          { backgroundColor: currColors.cardSecondary, borderColor: currColors.border, height: 38 },
                          isSel && { borderColor: color, backgroundColor: `${color}20`, borderWidth: 2 },
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

              {/* Custom Formula Editor */}
              <View style={styles.formGroup}>
                <ThemedText style={[styles.inputLabel, { color: currColors.textSecondary }]}>
                  CUSTOM MATHEMATICAL FORMULA
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: currColors.cardSecondary,
                      color: currColors.text,
                      borderColor: currColors.border,
                      fontFamily: 'Outfit_600SemiBold',
                    },
                  ]}
                  placeholder="e.g. Cash + Savings + Emergency"
                  placeholderTextColor={currColors.textSecondary}
                  value={formula}
                  onChangeText={setFormula}
                />

                <View style={[styles.operatorRow, { marginTop: 6 }]}>
                  {['+', '-', '*', '/', '(', ')'].map((op) => (
                    <TouchableOpacity
                      key={op}
                      style={[styles.operatorBtn, { height: 32, backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
                      onPress={() => appendToFormula(op)}
                    >
                      <ThemedText style={[styles.operatorText, { fontSize: 13, color: currColors.text }]}>{op}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={[styles.variableChipsContainer, { marginTop: 8 }]}>
                  {GOAL_VARIABLES.map((v) => {
                    const val = liveValues[v.key] || 0;
                    const formattedVal = formatValue(val, v.unit);
                    return (
                      <TouchableOpacity
                        key={v.key}
                        style={[
                          styles.variableChip,
                          {
                            paddingVertical: 4,
                            paddingHorizontal: 8,
                            backgroundColor: currColors.cardSecondary,
                            borderColor: currColors.border,
                          },
                        ]}
                        onPress={() => appendToFormula(v.key)}
                      >
                        <ThemedText style={[styles.variableChipText, { fontSize: 10, color: currColors.text }]}>
                          + {v.label}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 9.5, fontFamily: 'Outfit_600SemiBold', color: '#00C9A7', marginLeft: 4 }}>
                          ({formattedVal})
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  body: {
    padding: 16,
    paddingBottom: 40,
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

  // Preview Card
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
  },
  previewLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  segmentedProgressRow: {
    flexDirection: 'row',
    gap: 4,
    height: 5,
  },
  segmentTrack: {
    flex: 1,
    borderRadius: 2.5,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  segmentFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  minimalProgressTrack: {
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  minimalProgressFill: {
    height: '100%',
    borderRadius: 2.5,
  },

  // Form Fields
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  quickTrackPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  unitToggleRow: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  unitBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unitBtnText: {
    fontFamily: 'Outfit_600SemiBold',
  },

  // Accordion & Advanced Styles
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
  directionBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  directionTitle: {
    fontSize: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconTile: {
    width: (SCREEN_WIDTH - 32 - 40) / 6,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  operatorBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorText: {
    fontFamily: 'Outfit_700Bold',
  },
  variableChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  variableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  variableChipText: {
    fontFamily: 'Outfit_500Medium',
  },
});
