import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as LucideIcons from 'lucide-react-native';
import {
  ArrowLeft,
  Check,
  Search,
  SlidersHorizontal,
  Plus,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Delete,
  Coins,
  Percent,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';

import { ThemedText } from '../components/ThemedText';
import Colors from '../constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useGoalStore } from '../store/useGoalStore';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { GoalUnit, GoalOperator } from '../types/goals';
import { GOAL_VARIABLES, extractLiveVariableValues, evaluateFormula } from '../lib/goalEvaluator';
import { formatIndianAmount } from '@/utils/formatters';

const SCREEN_WIDTH = Dimensions.get('window').width;

const VARIABLE_CATEGORIES = [
  { key: 'all', label: 'All (28+)' },
  { key: 'money', label: 'Cash & Accounts' },
  { key: 'investments', label: 'Stocks & Portfolio' },
  { key: 'debt', label: 'Debts & Loans' },
  { key: 'budget', label: 'Budgets & Cash Flow' },
];

interface FormulaToken {
  id: string;
  type: 'variable' | 'operator' | 'number' | 'unknown';
  value: string;
  variableDef?: typeof GOAL_VARIABLES[0];
}

export default function CustomGoalFormulaScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'dark';
  const currColors = Colors[theme];

  // Stores
  const { draftCustomFormula, setDraftCustomFormula } = useGoalStore();
  const { accounts, loans, subscriptions, budgets, moneyTransactions, getNetWorth } = useMoneyStore();
  const { isPrivacyMode, showCurrencySymbol, transactions, calculateSummary } = usePortfolioStore();

  const portfolioSummary = useMemo(() => {
    return calculateSummary();
  }, [calculateSummary]);

  // Extract live store context
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

  // Screen State
  const [formula, setFormula] = useState(draftCustomFormula?.formula || 'Cash + Savings + Emergency');
  const [unit, setUnit] = useState<GoalUnit>(draftCustomFormula?.unit || 'currency');
  const [operator, setOperator] = useState<GoalOperator>(draftCustomFormula?.operator || '>=');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const varDefMap = useMemo(() => {
    const map = new Map<string, typeof GOAL_VARIABLES[0]>();
    GOAL_VARIABLES.forEach((v) => map.set(v.key, v));
    return map;
  }, []);

  // Parse formula string into visual tokens
  const tokens: FormulaToken[] = useMemo(() => {
    if (!formula.trim()) return [];
    const rawTokens = formula.match(/([+\-*/()]|[a-zA-Z0-9_.]+)/g) || [];
    return rawTokens.map((t, idx) => {
      const trimmed = t.trim();
      if (['+', '-', '*', '/', '(', ')'].includes(trimmed)) {
        return { id: `token-${idx}-${trimmed}`, type: 'operator', value: trimmed };
      }
      if (varDefMap.has(trimmed)) {
        return { id: `token-${idx}-${trimmed}`, type: 'variable', value: trimmed, variableDef: varDefMap.get(trimmed) };
      }
      if (!isNaN(Number(trimmed))) {
        return { id: `token-${idx}-${trimmed}`, type: 'number', value: trimmed };
      }
      return { id: `token-${idx}-${trimmed}`, type: 'unknown', value: trimmed };
    });
  }, [formula, varDefMap]);

  // Evaluate formula live
  const evaluationResult = useMemo(() => {
    if (!formula.trim()) {
      return { val: 0, isValid: true, empty: true };
    }
    try {
      const val = evaluateFormula(formula, liveValues);
      if (isNaN(val)) {
        return { val: 0, isValid: false, empty: false };
      }
      return { val, isValid: true, empty: false };
    } catch {
      return { val: 0, isValid: false, empty: false };
    }
  }, [formula, liveValues]);

  const formatValue = (val: number, varUnit: GoalUnit) => {
    if (isPrivacyMode) return '••••••';
    if (varUnit === 'percentage') return `${val.toFixed(1)}%`;
    if (varUnit === 'number') return val.toString();
    const formatted = formatIndianAmount(Math.round(val));
    return showCurrencySymbol ? `₹${formatted}` : formatted;
  };

  // Filter variables
  const filteredVariables = useMemo(() => {
    return GOAL_VARIABLES.filter((v) => {
      const matchesSearch =
        v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeCategoryTab === 'all') return true;
      if (activeCategoryTab === 'money') return ['Cash', 'Savings', 'Emergency', 'LiquidCash', 'SafeToSpend', 'NetWorth', 'TotalAssets'].includes(v.key);
      if (activeCategoryTab === 'investments') return v.category === 'investments';
      if (activeCategoryTab === 'debt') return ['MonthlyEMI', 'TotalDebt', 'LoanOutstanding', 'CreditCardDebt', 'BlockedCCDebt', 'TotalCCDebt', 'ActiveLoansCount', 'DebtToIncome'].includes(v.key);
      if (activeCategoryTab === 'budget') return ['MonthlyIncome', 'MonthlyExpense', 'MonthlySavings', 'MonthlySavingsRate', 'MonthlySubscriptions', 'BudgetSpent', 'BudgetLimit'].includes(v.key);

      return true;
    });
  }, [searchQuery, activeCategoryTab]);

  const appendVariable = (vKey: string) => {
    handleHaptic();
    setFormula((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return vKey;
      const rawTokens = trimmed.match(/([+\-*/()]|[a-zA-Z0-9_.]+)/g) || [];
      const last = rawTokens[rawTokens.length - 1];
      if (['+', '-', '*', '/', '('].includes(last)) {
        return `${trimmed} ${vKey}`;
      }
      return `${trimmed} + ${vKey}`;
    });
  };

  const appendOperator = (op: string) => {
    handleHaptic();
    setFormula((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) {
        if (op === '(') return '(';
        return '';
      }
      const rawTokens = trimmed.match(/([+\-*/()]|[a-zA-Z0-9_.]+)/g) || [];
      const last = rawTokens[rawTokens.length - 1];
      if (['+', '-', '*', '/'].includes(last) && ['+', '-', '*', '/'].includes(op)) {
        rawTokens[rawTokens.length - 1] = op;
        return rawTokens.join(' ');
      }
      if (['(', ')'].includes(op)) {
        return `${trimmed} ${op}`;
      }
      return `${trimmed} ${op} `;
    });
  };

  const removeTokenAtIndex = (idx: number) => {
    handleHaptic();
    setFormula((prev) => {
      const rawTokens = prev.match(/([+\-*/()]|[a-zA-Z0-9_.]+)/g) || [];
      if (idx < 0 || idx >= rawTokens.length) return prev;
      rawTokens.splice(idx, 1);
      return rawTokens.join(' ');
    });
  };

  const handleBackspace = () => {
    handleHaptic();
    setFormula((prev) => {
      const rawTokens = prev.match(/([+\-*/()]|[a-zA-Z0-9_.]+)/g) || [];
      if (rawTokens.length === 0) return '';
      rawTokens.pop();
      return rawTokens.join(' ');
    });
  };

  const handleClear = () => {
    handleHaptic();
    setFormula('');
  };

  const handleApply = () => {
    if (!formula.trim()) {
      return;
    }
    handleHaptic();
    setDraftCustomFormula({
      formula: formula.trim(),
      unit,
      operator,
      label: 'Custom Formula',
    });
    router.back();
  };

  const getVariableIcon = (iconName: string) => {
    const IconComp = (LucideIcons as any)[iconName] || Coins;
    return IconComp;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />

      {/* Screen Header */}
      <View style={[styles.header, { borderBottomColor: currColors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={currColors.text} />
        </TouchableOpacity>

        <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
          Custom Formula Studio
        </ThemedText>

        <TouchableOpacity
          onPress={handleApply}
          style={styles.headerBtn}
          activeOpacity={0.7}
          disabled={!evaluationResult.isValid || evaluationResult.empty}
        >
          <ThemedText
            style={[
              styles.applyBtnText,
              {
                color: evaluationResult.isValid && !evaluationResult.empty ? '#00C9A7' : currColors.textSecondary,
              },
            ]}
          >
            Apply
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Live Formula Workspace Card (Visual Pills Editor) */}
        <ThemedText style={[styles.sectionLabel, { color: currColors.textSecondary }]}>
          FORMULA EXPRESSION
        </ThemedText>
        <View style={[styles.formulaCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <View style={styles.expressionContainer}>
            {tokens.length === 0 ? (
              <ThemedText style={[styles.placeholderText, { color: currColors.textSecondary }]}>
                Tap variables below to build your expression...
              </ThemedText>
            ) : (
              tokens.map((token, idx) => {
                if (token.type === 'variable') {
                  const varDef = token.variableDef;
                  const IconComp = varDef ? getVariableIcon(varDef.iconName) : Coins;
                  const label = varDef ? varDef.label : token.value;

                  return (
                    <TouchableOpacity
                      key={`${token.id}-${idx}`}
                      style={styles.variablePill}
                      onPress={() => removeTokenAtIndex(idx)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.pillIconCircle}>
                        <IconComp size={12} color="#00C9A7" />
                      </View>
                      <ThemedText style={styles.pillText} numberOfLines={1}>
                        {label}
                      </ThemedText>
                      <View style={styles.pillRemoveBtn}>
                        <X size={10} color="#00C9A7" strokeWidth={2.5} />
                      </View>
                    </TouchableOpacity>
                  );
                }

                if (token.type === 'operator') {
                  return (
                    <TouchableOpacity
                      key={`${token.id}-${idx}`}
                      style={[styles.operatorPill, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
                      onPress={() => removeTokenAtIndex(idx)}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={[styles.operatorPillText, { color: currColors.text }]}>
                        {token.value}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                }

                return (
                  <TouchableOpacity
                    key={`${token.id}-${idx}`}
                    style={[styles.numberPill, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
                    onPress={() => removeTokenAtIndex(idx)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={[styles.numberPillText, { color: currColors.text }]}>
                      {token.value}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Clear Button */}
          {tokens.length > 0 && (
            <View style={styles.clearRow}>
              <TouchableOpacity onPress={handleClear} style={styles.clearActionBtn} activeOpacity={0.7}>
                <X size={12} color={currColors.textSecondary} />
                <ThemedText style={[styles.clearActionText, { color: currColors.textSecondary }]}>
                  Clear Formula
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Live Evaluation Result Banner */}
          <View
            style={[
              styles.evalBanner,
              {
                backgroundColor: evaluationResult.empty
                  ? currColors.cardSecondary
                  : evaluationResult.isValid
                  ? 'rgba(0, 201, 167, 0.08)'
                  : 'rgba(255, 59, 48, 0.08)',
                borderColor: evaluationResult.empty
                  ? currColors.border
                  : evaluationResult.isValid
                  ? 'rgba(0, 201, 167, 0.25)'
                  : 'rgba(255, 59, 48, 0.25)',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              {evaluationResult.empty ? (
                <SlidersHorizontal size={14} color={currColors.textSecondary} />
              ) : evaluationResult.isValid ? (
                <CheckCircle2 size={14} color="#00C9A7" />
              ) : (
                <AlertCircle size={14} color="#FF3B30" />
              )}
              <ThemedText
                style={[
                  styles.evalBannerText,
                  {
                    color: evaluationResult.empty
                      ? currColors.textSecondary
                      : evaluationResult.isValid
                      ? '#00C9A7'
                      : '#FF3B30',
                  },
                ]}
              >
                {evaluationResult.empty
                  ? 'Tap variables or operators below to evaluate'
                  : evaluationResult.isValid
                  ? `Live Evaluated Value: ${formatValue(evaluationResult.val, unit)}`
                  : 'Invalid syntax. Check operators & token sequence'}
              </ThemedText>
            </View>
          </View>

          {/* Operators Toolbar */}
          <View style={styles.operatorToolbar}>
            {['+', '-', '*', '/', '(', ')'].map((op) => (
              <TouchableOpacity
                key={op}
                style={[
                  styles.opBtn,
                  { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                ]}
                onPress={() => appendOperator(op)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.opBtnText, { color: currColors.text }]}>{op}</ThemedText>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[
                styles.opBtn,
                { backgroundColor: currColors.cardSecondary, borderColor: currColors.border, minWidth: 44 },
              ]}
              onPress={handleBackspace}
              activeOpacity={0.7}
            >
              <Delete size={15} color={currColors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Goal Evaluation Preferences (Unit & Operator) */}
        <ThemedText style={[styles.sectionLabel, { color: currColors.textSecondary, marginTop: 18 }]}>
          EVALUATION SETTINGS
        </ThemedText>
        <View style={[styles.settingsGroup, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          {/* Unit Switcher */}
          <View style={[styles.settingRow, { borderBottomColor: currColors.border }]}>
            <ThemedText style={[styles.settingLabel, { color: currColors.text }]}>Metric Unit</ThemedText>
            <View style={[styles.segmentedCtrl, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}>
              <TouchableOpacity
                style={[styles.segmentBtn, unit === 'currency' && { backgroundColor: '#00C9A7' }]}
                onPress={() => {
                  handleHaptic();
                  setUnit('currency');
                }}
              >
                <ThemedText style={[styles.segmentBtnText, { color: unit === 'currency' ? '#FFFFFF' : currColors.textSecondary }]}>
                  ₹ Currency
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, unit === 'percentage' && { backgroundColor: '#00C9A7' }]}
                onPress={() => {
                  handleHaptic();
                  setUnit('percentage');
                }}
              >
                <ThemedText style={[styles.segmentBtnText, { color: unit === 'percentage' ? '#FFFFFF' : currColors.textSecondary }]}>
                  % Percentage
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Goal Direction Operator Switcher */}
          <View style={styles.settingRow}>
            <ThemedText style={[styles.settingLabel, { color: currColors.text }]}>Goal Direction</ThemedText>
            <View style={[styles.segmentedCtrl, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}>
              <TouchableOpacity
                style={[styles.segmentBtn, operator === '>=' && { backgroundColor: '#00C9A7' }]}
                onPress={() => {
                  handleHaptic();
                  setOperator('>=');
                }}
              >
                <ThemedText style={[styles.segmentBtnText, { color: operator === '>=' ? '#FFFFFF' : currColors.textSecondary }]}>
                  Accumulate (≥)
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, operator === '<=' && { backgroundColor: '#00C9A7' }]}
                onPress={() => {
                  handleHaptic();
                  setOperator('<=');
                }}
              >
                <ThemedText style={[styles.segmentBtnText, { color: operator === '<=' ? '#FFFFFF' : currColors.textSecondary }]}>
                  Pay Off (≤)
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Available Live Variables Section */}
        <ThemedText style={[styles.sectionLabel, { color: currColors.textSecondary, marginTop: 18 }]}>
          AVAILABLE STORE VARIABLES ({filteredVariables.length})
        </ThemedText>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}>
          <Search size={16} color={currColors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: currColors.text }]}
            placeholder="Search variables (e.g. debt, cash, xirr)..."
            placeholderTextColor={currColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Category Domain Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabsScroll}
        >
          {VARIABLE_CATEGORIES.map((cat) => {
            const isActive = activeCategoryTab === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryTab,
                  {
                    backgroundColor: isActive ? '#00C9A7' : currColors.cardSecondary,
                    borderColor: isActive ? '#00C9A7' : currColors.border,
                  },
                ]}
                onPress={() => {
                  handleHaptic();
                  setActiveCategoryTab(cat.key);
                }}
              >
                <ThemedText
                  style={[
                    styles.categoryTabText,
                    { color: isActive ? '#FFFFFF' : currColors.textSecondary },
                  ]}
                >
                  {cat.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Variables List */}
        <View style={[styles.variablesListGroup, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          {filteredVariables.map((v, idx) => {
            const liveVal = liveValues[v.key] || 0;
            const formattedVal = formatValue(liveVal, v.unit);
            const IconComp = getVariableIcon(v.iconName);
            const isLast = idx === filteredVariables.length - 1;

            return (
              <TouchableOpacity
                key={v.key}
                style={[
                  styles.variableRow,
                  !isLast && { borderBottomColor: currColors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
                onPress={() => appendVariable(v.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.varIconWrap, { backgroundColor: 'rgba(0, 201, 167, 0.1)' }]}>
                  <IconComp size={16} color="#00C9A7" />
                </View>

                <View style={styles.varTextCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ThemedText style={[styles.varName, { color: currColors.text }]}>
                      {v.key}
                    </ThemedText>
                    <ThemedText style={[styles.varLabelSub, { color: currColors.textSecondary }]}>
                      • {v.label}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.varDesc, { color: currColors.textSecondary }]} numberOfLines={1}>
                    {v.description}
                  </ThemedText>
                </View>

                <View style={styles.varRightCol}>
                  <View style={[styles.varLiveValPill, { backgroundColor: currColors.cardSecondary }]}>
                    <ThemedText style={[styles.varLiveValText, { color: '#00C9A7' }]}>
                      {formattedVal}
                    </ThemedText>
                  </View>
                  <View style={[styles.insertBadge, { backgroundColor: 'rgba(0, 201, 167, 0.15)' }]}>
                    <Plus size={12} color="#00C9A7" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    padding: 4,
    minWidth: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },
  applyBtnText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'right',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  formulaCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  expressionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    minHeight: 52,
    paddingVertical: 4,
  },
  placeholderText: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
  },
  variablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 201, 167, 0.12)',
    borderColor: 'rgba(0, 201, 167, 0.35)',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 5,
    gap: 5,
  },
  pillIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 201, 167, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: {
    fontSize: 12.5,
    fontFamily: 'Outfit_600SemiBold',
    color: '#00C9A7',
    maxWidth: SCREEN_WIDTH * 0.5,
  },
  pillRemoveBtn: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  operatorPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorPillText: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
  },
  numberPill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberPillText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  clearRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  clearActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  clearActionText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  evalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 12,
  },
  evalBannerText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  operatorToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  opBtn: {
    flex: 1,
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  opBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  settingsGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 48,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  segmentedCtrl: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
    height: 32,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentBtnText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    height: '100%',
  },
  categoryTabsScroll: {
    gap: 6,
    paddingBottom: 10,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryTabText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  variablesListGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  variableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  varIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  varTextCol: {
    flex: 1,
    marginRight: 8,
  },
  varName: {
    fontSize: 13.5,
    fontFamily: 'Outfit_600SemiBold',
  },
  varLabelSub: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  varDesc: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  varRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  varLiveValPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  varLiveValText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  insertBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
