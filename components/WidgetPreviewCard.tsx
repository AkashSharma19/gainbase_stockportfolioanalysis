import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Smartphone,
  Sparkles,
  LayoutGrid,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Wallet,
  Layers,
} from 'lucide-react-native';

import { ThemedText } from './ThemedText';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useMoneyStore } from '../store/useMoneyStore';
import { syncGainbaseWidgetData } from '../lib/widgetSync';

type WidgetType = 'investments' | 'money' | 'dual';
type WidgetSize = 'medium' | 'small';

interface SamplePreset {
  id: string;
  name: string;
  badge: string;
  portfolioValue: string;
  portfolioInvested: string;
  dayChange: string;
  dayAmount: string;
  isPositive: boolean;
  totalReturn: string;
  totalReturnPct: string;
  totalReturnIsPositive: boolean;
  xirr: string;
  xirrIsPositive: boolean;
  netWorth: string;
  income: string;
  spend: string;
  netSavings: string;
  netSavingsIsPositive: boolean;
  savingsRate: string;
}

const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'live',
    name: 'Your Live Data',
    badge: 'LIVE',
    portfolioValue: '',
    portfolioInvested: '',
    dayChange: '',
    dayAmount: '',
    isPositive: true,
    totalReturn: '',
    totalReturnPct: '',
    totalReturnIsPositive: true,
    xirr: '',
    xirrIsPositive: true,
    netWorth: '',
    income: '',
    spend: '',
    netSavings: '',
    netSavingsIsPositive: true,
    savingsRate: '',
  },
  {
    id: 'growth',
    name: 'Aggressive Growth',
    badge: '+34.2% XIRR',
    portfolioValue: '₹8,42,500',
    portfolioInvested: '₹5,97,500',
    dayChange: '+3.45%',
    dayAmount: '+₹28,100',
    isPositive: true,
    totalReturn: '+₹2,45,000',
    totalReturnPct: '+41.0%',
    totalReturnIsPositive: true,
    xirr: '34.2%',
    xirrIsPositive: true,
    netWorth: '₹11,80,000',
    income: '₹85,000',
    spend: '₹32,000',
    netSavings: '+₹53,000',
    netSavingsIsPositive: true,
    savingsRate: '62%',
  },
  {
    id: 'balanced',
    name: 'Balanced Wealth',
    badge: '+21.8% XIRR',
    portfolioValue: '₹4,85,200',
    portfolioInvested: '₹3,98,800',
    dayChange: '+1.65%',
    dayAmount: '+₹7,890',
    isPositive: true,
    totalReturn: '+₹86,400',
    totalReturnPct: '+21.7%',
    totalReturnIsPositive: true,
    xirr: '21.8%',
    xirrIsPositive: true,
    netWorth: '₹7,25,000',
    income: '₹60,000',
    spend: '₹22,400',
    netSavings: '+₹37,600',
    netSavingsIsPositive: true,
    savingsRate: '63%',
  },
  {
    id: 'market_drop',
    name: 'Market Correction',
    badge: '-1.85% (Loss)',
    portfolioValue: '₹5,12,000',
    portfolioInvested: '₹5,70,200',
    dayChange: '-1.85%',
    dayAmount: '-₹9,640',
    isPositive: false,
    totalReturn: '-₹58,200',
    totalReturnPct: '-10.2%',
    totalReturnIsPositive: false,
    xirr: '-12.4%',
    xirrIsPositive: false,
    netWorth: '₹6,90,000',
    income: '₹55,000',
    spend: '₹62,500',
    netSavings: '-₹7,500',
    netSavingsIsPositive: false,
    savingsRate: '-14%',
  },
];

export function WidgetPreviewCard() {
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const [activeWidgetType, setActiveWidgetType] = useState<WidgetType>('investments');
  const [activeSize, setActiveSize] = useState<WidgetSize>('medium');
  const [selectedPresetId, setSelectedPresetId] = useState('live');
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  // Stable state selectors
  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);

  const summary = useMemo(() => calculateSummary(), [transactions, tickers, calculateSummary]);

  const accounts = useMoneyStore((state) => state.accounts);
  const loans = useMoneyStore((state) => state.loans);
  const moneyTransactions = useMoneyStore((state) => state.moneyTransactions);
  const getNetWorth = useMoneyStore((state) => state.getNetWorth);

  const netWorth = useMemo(() => getNetWorth(), [accounts, loans, getNetWorth]);

  const prefix = showCurrencySymbol ? '₹' : '';

  // Helpers for positive / negative formatting
  const formatSignedCurrency = (num: number): string => {
    if (isPrivacyMode) return '••••••';
    const isNeg = num < 0;
    const formatted = Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    return `${isNeg ? '-' : '+'}${prefix}${formatted}`;
  };

  const formatCurrencyWithOptionalNegative = (num: number): string => {
    if (isPrivacyMode) return '••••••';
    const isNeg = num < 0;
    const formatted = Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    return `${isNeg ? '-' : ''}${prefix}${formatted}`;
  };

  const formatSignedPercentage = (num: number, decimals = 2): string => {
    const isNeg = num < 0;
    return `${isNeg ? '-' : '+'}${Math.abs(num).toFixed(decimals)}%`;
  };

  // Live Calculations
  const livePortfolioVal = formatCurrencyWithOptionalNegative(summary.totalValue);
  const livePortfolioInvested = formatCurrencyWithOptionalNegative(summary.totalCost);

  const dayChangePct = summary.dayChangePercentage || 0;
  const dayChangeAmt = summary.dayChange || 0;
  const liveIsPos = dayChangeAmt >= 0;
  const liveDayChange = formatSignedPercentage(dayChangePct, 2);
  const liveDayAmount = formatSignedCurrency(dayChangeAmt);

  const totalReturnAmt = summary.totalReturn ?? summary.profitAmount ?? 0;
  const totalReturnPct = summary.profitPercentage ?? 0;
  const liveTotalReturnIsPos = totalReturnAmt >= 0;
  const liveTotalReturn = formatSignedCurrency(totalReturnAmt);
  const liveTotalReturnPct = formatSignedPercentage(totalReturnPct, 1);

  const xirrVal = summary.xirr || 0;
  const liveXirrIsPos = xirrVal >= 0;
  const liveXirr = `${liveXirrIsPos ? '' : '-'}${Math.abs(xirrVal).toFixed(1)}%`;

  const liveNetWorth = formatCurrencyWithOptionalNegative(netWorth);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  moneyTransactions.forEach((tx) => {
    const t = new Date(tx.date).getTime();
    if (t >= startOfMonth) {
      if (tx.type === 'income') monthlyIncome += tx.amount;
      else if (tx.type === 'expense') monthlyExpense += tx.amount;
    }
  });

  const liveIncome = formatCurrencyWithOptionalNegative(monthlyIncome);
  const liveSpend = formatCurrencyWithOptionalNegative(monthlyExpense);

  const netSavings = monthlyIncome - monthlyExpense;
  const liveNetSavingsIsPos = netSavings >= 0;
  const liveNetSavings = formatSignedCurrency(netSavings);

  const savingsRate = monthlyIncome > 0 ? (netSavings / monthlyIncome) * 100 : 0;
  const liveSavings = `${savingsRate >= 0 ? '' : '-'}${Math.abs(savingsRate).toFixed(0)}%`;

  // Active display data (Live or sample preset)
  const data = useMemo(() => {
    if (selectedPresetId === 'live') {
      return {
        portfolioValue: livePortfolioVal,
        portfolioInvested: livePortfolioInvested,
        dayChange: liveDayChange,
        dayAmount: liveDayAmount,
        isPositive: liveIsPos,
        totalReturn: liveTotalReturn,
        totalReturnPct: liveTotalReturnPct,
        totalReturnIsPositive: liveTotalReturnIsPos,
        xirr: liveXirr,
        xirrIsPositive: liveXirrIsPos,
        netWorth: liveNetWorth,
        income: liveIncome,
        spend: liveSpend,
        netSavings: liveNetSavings,
        netSavingsIsPositive: liveNetSavingsIsPos,
        savingsRate: liveSavings,
      };
    }
    const found = SAMPLE_PRESETS.find((p) => p.id === selectedPresetId);
    return found || SAMPLE_PRESETS[0];
  }, [
    selectedPresetId,
    livePortfolioVal,
    livePortfolioInvested,
    liveDayChange,
    liveDayAmount,
    liveIsPos,
    liveTotalReturn,
    liveTotalReturnPct,
    liveTotalReturnIsPos,
    liveXirr,
    liveXirrIsPos,
    liveNetWorth,
    liveIncome,
    liveSpend,
    liveNetSavings,
    liveNetSavingsIsPos,
    liveSavings,
  ]);

  const handleSync = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSyncing(true);
    await syncGainbaseWidgetData();
    setTimeout(() => {
      setIsSyncing(false);
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
    }, 400);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: currColors.card,
          borderColor: currColors.border,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(10, 132, 255, 0.12)' }]}>
            <Smartphone size={16} color="#0A84FF" />
          </View>
          <View>
            <ThemedText style={[styles.title, { color: currColors.text }]}>
              iOS Home Widgets
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: currColors.textSecondary }]}>
              Separate & Dual widgets for Home Screen
            </ThemedText>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSync}
          activeOpacity={0.7}
          style={[
            styles.syncButton,
            justSynced && { backgroundColor: 'rgba(52, 199, 89, 0.15)', borderColor: 'rgba(52, 199, 89, 0.3)' },
          ]}
        >
          {justSynced ? (
            <CheckCircle2 size={12} color="#34C759" />
          ) : (
            <Sparkles size={12} color="#0A84FF" />
          )}
          <ThemedText style={[styles.syncButtonText, justSynced && { color: '#34C759' }]}>
            {isSyncing ? 'Syncing...' : justSynced ? 'Synced!' : 'Sync'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Widget Type Selector (Investments / Money Manager / Dual) */}
      <View style={[styles.typeSelectorRow, { backgroundColor: currColors.cardSecondary }]}>
        <TouchableOpacity
          style={[
            styles.typeTab,
            activeWidgetType === 'investments' && { backgroundColor: '#0A84FF' },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveWidgetType('investments');
          }}
        >
          <TrendingUp size={13} color={activeWidgetType === 'investments' ? '#FFF' : currColors.textSecondary} />
          <ThemedText
            style={[
              styles.typeTabText,
              { color: activeWidgetType === 'investments' ? '#FFF' : currColors.textSecondary },
            ]}
          >
            Investments
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeTab,
            activeWidgetType === 'money' && { backgroundColor: '#00C9A7' },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveWidgetType('money');
          }}
        >
          <Wallet size={13} color={activeWidgetType === 'money' ? '#FFF' : currColors.textSecondary} />
          <ThemedText
            style={[
              styles.typeTabText,
              { color: activeWidgetType === 'money' ? '#FFF' : currColors.textSecondary },
            ]}
          >
            Money
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeTab,
            activeWidgetType === 'dual' && { backgroundColor: currColors.card },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveWidgetType('dual');
          }}
        >
          <Layers size={13} color={activeWidgetType === 'dual' ? currColors.text : currColors.textSecondary} />
          <ThemedText
            style={[
              styles.typeTabText,
              { color: activeWidgetType === 'dual' ? currColors.text : currColors.textSecondary },
            ]}
          >
            Dual View
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Size Selector (2x4 Medium / 2x2 Small) */}
      <View style={[styles.sizeTabsRow, { borderColor: currColors.border }]}>
        <TouchableOpacity
          style={[styles.sizeTab, activeSize === 'medium' && { backgroundColor: currColors.cardSecondary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveSize('medium');
          }}
        >
          <LayoutGrid size={13} color={activeSize === 'medium' ? currColors.text : currColors.textSecondary} />
          <ThemedText style={[styles.sizeTabText, { color: activeSize === 'medium' ? currColors.text : currColors.textSecondary }]}>
            Medium 2x4
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sizeTab, activeSize === 'small' && { backgroundColor: currColors.cardSecondary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveSize('small');
          }}
        >
          <Smartphone size={13} color={activeSize === 'small' ? currColors.text : currColors.textSecondary} />
          <ThemedText style={[styles.sizeTabText, { color: activeSize === 'small' ? currColors.text : currColors.textSecondary }]}>
            Small 2x2
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Preset Sample Selector */}
      <View style={styles.presetSection}>
        <ThemedText style={[styles.presetHeading, { color: currColors.textSecondary }]}>
          PREVIEW SCENARIOS:
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {SAMPLE_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPresetId(preset.id);
                }}
                style={[
                  styles.presetChip,
                  { backgroundColor: currColors.cardSecondary },
                  isSelected && {
                    backgroundColor: 'rgba(10, 132, 255, 0.15)',
                    borderColor: '#0A84FF',
                    borderWidth: 1,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.presetChipText,
                    { color: isSelected ? '#0A84FF' : currColors.textSecondary },
                  ]}
                >
                  {preset.name}
                </ThemedText>
                {preset.badge && (
                  <View style={[styles.microBadge, isSelected && { backgroundColor: '#0A84FF' }]}>
                    <ThemedText style={[styles.microBadgeText, isSelected && { color: '#FFF' }]}>
                      {preset.badge}
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Widget Live Preview Canvas ─── */}
      <View style={styles.previewCanvas}>
        {/* ════ 1. INVESTMENTS WIDGET ════ */}
        {activeWidgetType === 'investments' && activeSize === 'medium' && (
          <View style={styles.mediumWidget}>
            <View style={styles.widgetCol}>
              <View style={styles.pillHeader}>
                <Circle size={7} fill="#0A84FF" />
                <ThemedText style={[styles.colHeaderTitle, { color: '#0A84FF' }]} numberOfLines={1}>INVESTMENTS</ThemedText>
              </View>
              <View style={{ marginVertical: 4 }}>
                <ThemedText style={styles.colSubTitle} numberOfLines={1}>CURRENT VALUE</ThemedText>
                <ThemedText style={styles.widgetValueLarge} numberOfLines={1}>{data.portfolioValue}</ThemedText>
              </View>
              <View style={styles.metricRow}>
                <ThemedText style={styles.metricLabel} numberOfLines={1}>Invested:</ThemedText>
                <ThemedText style={styles.metricValWhite} numberOfLines={1}>{data.portfolioInvested}</ThemedText>
              </View>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.widgetCol}>
              <View style={styles.rowBetween}>
                <ThemedText style={styles.colSubTitle} numberOfLines={1}>RETURNS</ThemedText>
                <View style={[styles.xirrBadge, !data.xirrIsPositive && { backgroundColor: 'rgba(255, 59, 48, 0.2)' }]}>
                  <ThemedText style={[styles.xirrBadgeText, !data.xirrIsPositive && { color: '#FF3B30' }]} numberOfLines={1}>
                    XIRR {data.xirr}
                  </ThemedText>
                </View>
              </View>
              <View style={{ marginVertical: 3 }}>
                <ThemedText style={styles.metricLabel} numberOfLines={1}>1D Return</ThemedText>
                <View style={styles.metricRow}>
                  <ThemedText style={[styles.largeMetricText, { color: data.isPositive ? '#00C9A7' : '#FF3B30' }]} numberOfLines={1}>
                    {data.dayChange}
                  </ThemedText>
                  <ThemedText style={styles.dayAmountText} numberOfLines={1}>({data.dayAmount})</ThemedText>
                </View>
              </View>
              <View style={{ marginTop: 2 }}>
                <ThemedText style={styles.metricLabel} numberOfLines={1}>Total Return</ThemedText>
                <View style={styles.metricRow}>
                  <ThemedText style={[styles.largeMetricText, { color: data.totalReturnIsPositive ? '#00C9A7' : '#FF3B30' }]} numberOfLines={1}>
                    {data.totalReturn}
                  </ThemedText>
                  <ThemedText style={styles.dayAmountText} numberOfLines={1}>({data.totalReturnPct})</ThemedText>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeWidgetType === 'investments' && activeSize === 'small' && (
          <View style={styles.smallWidget}>
            <View style={styles.smallHeader}>
              <View style={styles.pillHeader}>
                <Circle size={6} fill="#0A84FF" />
                <ThemedText style={[styles.brandTitle, { color: '#0A84FF' }]} numberOfLines={1}>INVESTMENTS</ThemedText>
              </View>
              <View style={[styles.xirrBadge, !data.xirrIsPositive && { backgroundColor: 'rgba(255, 59, 48, 0.2)' }]}>
                <ThemedText style={[styles.xirrBadgeText, !data.xirrIsPositive && { color: '#FF3B30' }]} numberOfLines={1}>
                  {data.xirr}
                </ThemedText>
              </View>
            </View>

            <View style={{ marginVertical: 4 }}>
              <ThemedText style={styles.smallSectionLabel} numberOfLines={1}>CURRENT VALUE</ThemedText>
              <ThemedText style={styles.smallValueLarge} numberOfLines={1}>{data.portfolioValue}</ThemedText>
            </View>

            <View style={styles.rowBetween}>
              <ThemedText style={styles.microLabel} numberOfLines={1}>Invested:</ThemedText>
              <ThemedText style={styles.microVal} numberOfLines={1}>{data.portfolioInvested}</ThemedText>
            </View>

            <View style={styles.rowBetween}>
              <ThemedText style={styles.microLabel} numberOfLines={1}>1D Return:</ThemedText>
              <ThemedText style={[styles.microVal, { color: data.isPositive ? '#00C9A7' : '#FF3B30' }]} numberOfLines={1}>
                {data.dayChange}
              </ThemedText>
            </View>

            <View style={styles.rowBetween}>
              <ThemedText style={styles.microLabel} numberOfLines={1}>Total Return:</ThemedText>
              <ThemedText style={[styles.microVal, { color: data.totalReturnIsPositive ? '#00C9A7' : '#FF3B30' }]} numberOfLines={1}>
                {data.totalReturnPct}
              </ThemedText>
            </View>
          </View>
        )}

        {/* ════ 2. MONEY MANAGER WIDGET ════ */}
        {activeWidgetType === 'money' && activeSize === 'medium' && (
          <View style={styles.mediumWidget}>
            <View style={styles.widgetCol}>
              <View style={styles.pillHeader}>
                <Circle size={7} fill="#00C9A7" />
                <ThemedText style={[styles.colHeaderTitle, { color: '#00C9A7' }]} numberOfLines={1}>MONEY MANAGER</ThemedText>
              </View>
              <View style={{ marginVertical: 4 }}>
                <ThemedText style={styles.colSubTitle} numberOfLines={1}>TOTAL NET WORTH</ThemedText>
                <ThemedText style={styles.widgetValueLarge} numberOfLines={1}>{data.netWorth}</ThemedText>
              </View>
              <View style={{ gap: 2 }}>
                <View style={styles.metricRow}>
                  <ThemedText style={styles.metricLabel} numberOfLines={1}>Inflow:</ThemedText>
                  <ThemedText style={styles.metricValWhite} numberOfLines={1}>{data.income}</ThemedText>
                </View>
                <View style={styles.metricRow}>
                  <ThemedText style={styles.metricLabel} numberOfLines={1}>Outflow:</ThemedText>
                  <ThemedText style={styles.metricValWhite} numberOfLines={1}>{data.spend}</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.widgetCol}>
              <View style={styles.rowBetween}>
                <ThemedText style={styles.colSubTitle} numberOfLines={1}>CASHFLOW</ThemedText>
                <View
                  style={[
                    styles.xirrBadge,
                    {
                      backgroundColor: data.netSavingsIsPositive
                        ? 'rgba(0, 201, 167, 0.15)'
                        : 'rgba(255, 59, 48, 0.15)',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.xirrBadgeText,
                      { color: data.netSavingsIsPositive ? '#00C9A7' : '#FF3B30' },
                    ]}
                    numberOfLines={1}
                  >
                    {data.savingsRate} save
                  </ThemedText>
                </View>
              </View>
              <View style={{ marginVertical: 4 }}>
                <ThemedText style={styles.metricLabel} numberOfLines={1}>Net Saved This Month</ThemedText>
                <ThemedText
                  style={[
                    styles.widgetValueLarge,
                    { color: data.netSavingsIsPositive ? '#00C9A7' : '#FF3B30' },
                  ]}
                  numberOfLines={1}
                >
                  {data.netSavings}
                </ThemedText>
              </View>
              <View style={styles.metricRow}>
                <ThemedText style={styles.metricLabel} numberOfLines={1}>Month Spend:</ThemedText>
                <ThemedText style={styles.metricValWhite} numberOfLines={1}>{data.spend}</ThemedText>
              </View>
            </View>
          </View>
        )}

        {activeWidgetType === 'money' && activeSize === 'small' && (
          <View style={styles.smallWidget}>
            <View style={styles.smallHeader}>
              <View style={styles.pillHeader}>
                <Circle size={6} fill="#00C9A7" />
                <ThemedText style={[styles.brandTitle, { color: '#00C9A7' }]} numberOfLines={1}>MONEY</ThemedText>
              </View>
              <ThemedText
                style={[
                  styles.smallSaveRate,
                  { color: data.netSavingsIsPositive ? '#00C9A7' : '#FF3B30' },
                ]}
                numberOfLines={1}
              >
                {data.savingsRate} save
              </ThemedText>
            </View>

            <View style={{ marginVertical: 4 }}>
              <ThemedText style={styles.smallSectionLabel} numberOfLines={1}>TOTAL NET WORTH</ThemedText>
              <ThemedText style={styles.smallValueLarge} numberOfLines={1}>{data.netWorth}</ThemedText>
            </View>

            <View style={styles.rowBetween}>
              <ThemedText style={styles.microLabel} numberOfLines={1}>Income:</ThemedText>
              <ThemedText style={styles.microVal} numberOfLines={1}>{data.income}</ThemedText>
            </View>

            <View style={styles.rowBetween}>
              <ThemedText style={styles.microLabel} numberOfLines={1}>Month Spend:</ThemedText>
              <ThemedText style={styles.microVal} numberOfLines={1}>{data.spend}</ThemedText>
            </View>

            <View style={styles.rowBetween}>
              <ThemedText style={styles.microLabel} numberOfLines={1}>Net Saved:</ThemedText>
              <ThemedText
                style={[
                  styles.microVal,
                  { color: data.netSavingsIsPositive ? '#00C9A7' : '#FF3B30', fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {data.netSavings}
              </ThemedText>
            </View>
          </View>
        )}

        {/* ════ 3. DUAL OVERVIEW WIDGET ════ */}
        {activeWidgetType === 'dual' && activeSize === 'medium' && (
          <View style={styles.mediumWidget}>
            {/* Left: Investments */}
            <View style={styles.widgetCol}>
              <View style={styles.rowBetween}>
                <View style={styles.pillHeader}>
                  <Circle size={6} fill="#0A84FF" />
                  <ThemedText style={[styles.colHeaderTitle, { color: '#0A84FF' }]} numberOfLines={1}>INVESTMENTS</ThemedText>
                </View>
                <View style={[styles.xirrBadge, !data.xirrIsPositive && { backgroundColor: 'rgba(255, 59, 48, 0.2)' }]}>
                  <ThemedText style={[styles.xirrBadgeText, !data.xirrIsPositive && { color: '#FF3B30' }]} numberOfLines={1}>
                    XIRR {data.xirr}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.widgetValueLarge, { marginVertical: 3 }]} numberOfLines={1}>{data.portfolioValue}</ThemedText>
              <View style={styles.metricRow}>
                <ThemedText style={styles.metricLabel} numberOfLines={1}>1D:</ThemedText>
                <ThemedText style={[styles.dayChangeText, { color: data.isPositive ? '#00C9A7' : '#FF3B30' }]} numberOfLines={1}>
                  {data.dayChange}
                </ThemedText>
              </View>
              <View style={styles.metricRow}>
                <ThemedText style={styles.metricLabel} numberOfLines={1}>Total:</ThemedText>
                <ThemedText style={[styles.totalReturnText, { color: data.totalReturnIsPositive ? '#00C9A7' : '#FF3B30' }]} numberOfLines={1}>
                  {data.totalReturn}
                </ThemedText>
              </View>
            </View>

            <View style={styles.verticalDivider} />

            {/* Right: Money Manager */}
            <View style={styles.widgetCol}>
              <View style={styles.rowBetween}>
                <View style={styles.pillHeader}>
                  <Circle size={6} fill="#00C9A7" />
                  <ThemedText style={[styles.colHeaderTitle, { color: '#00C9A7' }]} numberOfLines={1}>MONEY</ThemedText>
                </View>
                <View
                  style={[
                    styles.xirrBadge,
                    {
                      backgroundColor: data.netSavingsIsPositive
                        ? 'rgba(0, 201, 167, 0.15)'
                        : 'rgba(255, 59, 48, 0.15)',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.xirrBadgeText,
                      { color: data.netSavingsIsPositive ? '#00C9A7' : '#FF3B30' },
                    ]}
                    numberOfLines={1}
                  >
                    {data.savingsRate} save
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.widgetValueLarge, { marginVertical: 3 }]} numberOfLines={1}>{data.netWorth}</ThemedText>
              <View style={styles.metricRow}>
                <ThemedText style={styles.metricLabel} numberOfLines={1}>Spend:</ThemedText>
                <ThemedText style={styles.metricValWhite} numberOfLines={1}>{data.spend}</ThemedText>
              </View>
              <View style={styles.metricRow}>
                <ThemedText style={styles.metricLabel} numberOfLines={1}>Net Saved:</ThemedText>
                <ThemedText
                  style={{
                    color: data.netSavingsIsPositive ? '#00C9A7' : '#FF3B30',
                    fontWeight: '700',
                  }}
                  numberOfLines={1}
                >
                  {data.netSavings}
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {activeWidgetType === 'dual' && activeSize === 'small' && (
          <View style={styles.smallWidget}>
            <View style={styles.smallHeader}>
              <View style={{ flexDirection: 'row', gap: 3 }}>
                <Circle size={5} fill="#0A84FF" />
                <Circle size={5} fill="#00C9A7" />
              </View>
              <ThemedText style={styles.brandTitle} numberOfLines={1}>GAINBASE</ThemedText>
              <ThemedText
                style={[
                  styles.smallXirrText,
                  !data.xirrIsPositive && { color: '#FF3B30' },
                ]}
                numberOfLines={1}
              >
                XIRR {data.xirr}
              </ThemedText>
            </View>

            <View style={{ marginVertical: 3 }}>
              <ThemedText style={styles.smallSectionLabel} numberOfLines={1}>CURRENT VALUE</ThemedText>
              <View style={styles.rowBetween}>
                <ThemedText style={styles.smallValueText} numberOfLines={1}>{data.portfolioValue}</ThemedText>
                <ThemedText style={[styles.smallDayChange, { color: data.isPositive ? '#00C9A7' : '#FF3B30' }]} numberOfLines={1}>
                  {data.dayChange}
                </ThemedText>
              </View>
            </View>

            <View style={styles.horizontalDivider} />

            <View style={{ marginVertical: 3 }}>
              <View style={styles.rowBetween}>
                <ThemedText style={styles.smallSectionLabel} numberOfLines={1}>NET WORTH</ThemedText>
                <ThemedText
                  style={[
                    styles.smallSaveRate,
                    { color: data.netSavingsIsPositive ? '#00C9A7' : '#FF3B30' },
                  ]}
                  numberOfLines={1}
                >
                  {data.savingsRate} save
                </ThemedText>
              </View>
              <ThemedText style={styles.smallValueText} numberOfLines={1}>{data.netWorth}</ThemedText>
            </View>
          </View>
        )}
      </View>

      {/* Helper Note */}
      <View style={styles.footerNote}>
        <HelpCircle size={12} color={currColors.textSecondary} />
        <ThemedText style={[styles.footerText, { color: currColors.textSecondary }]}>
          In your iPhone Home Widget Gallery, you can choose between dedicated Investments, Money Manager, or Dual Overview widgets.
        </ThemedText>
      </View>
    </View>
  );
}

function Circle({ size, fill }: { size: number; fill: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fill,
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  syncButtonText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: '#0A84FF',
  },

  // ─── Type Selector Row ───
  typeSelectorRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 5,
  },
  typeTabText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },

  // ─── Size Tabs Row ───
  sizeTabsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 2,
    gap: 4,
  },
  sizeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 7,
    gap: 4,
  },
  sizeTabText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },

  // ─── Preset Scenarios ───
  presetSection: {
    gap: 6,
  },
  presetHeading: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  presetChipText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  microBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  microBadgeText: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    color: '#8E8E93',
  },

  previewCanvas: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },

  // ─── Medium Widget (2x4) ───
  mediumWidget: {
    width: '100%',
    minHeight: 154,
    backgroundColor: '#15171C',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  widgetCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  pillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  colHeaderTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  colSubTitle: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    color: '#8E8E93',
    letterSpacing: 0.4,
  },
  xirrBadge: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  xirrBadgeText: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    color: '#0A84FF',
  },
  widgetValueLarge: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    color: '#8E8E93',
  },
  metricValWhite: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
  largeMetricText: {
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
  },
  dayChangeText: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
  },
  totalReturnText: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
  },
  dayAmountText: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    color: '#8E8E93',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // ─── Small Widget (2x2) ───
  smallWidget: {
    width: 156,
    height: 156,
    backgroundColor: '#15171C',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    justifyContent: 'space-between',
  },
  smallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitle: {
    fontSize: 8,
    fontFamily: 'Outfit_700Bold',
  },
  smallXirrText: {
    fontSize: 8,
    fontFamily: 'Outfit_700Bold',
    color: '#0A84FF',
  },
  smallSectionLabel: {
    fontSize: 7,
    fontFamily: 'Outfit_700Bold',
    color: '#8E8E93',
  },
  smallValueText: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
  },
  smallValueLarge: {
    fontSize: 17,
    fontFamily: 'Outfit_700Bold',
    color: '#FFFFFF',
  },
  smallDayChange: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
  },
  microLabel: {
    fontSize: 8,
    color: '#8E8E93',
  },
  microVal: {
    fontSize: 9,
    fontFamily: 'Outfit_600SemiBold',
    color: '#FFFFFF',
  },
  smallSaveRate: {
    fontSize: 8,
    fontFamily: 'Outfit_600SemiBold',
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    flex: 1,
  },
});
