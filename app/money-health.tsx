import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Activity,
  Percent,
  Landmark,
  CreditCard,
  PiggyBank,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MoneyHealthScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const {
    accounts,
    moneyTransactions,
    loans,
    getMonthlyEMIBurden,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Subscribe to portfolio transactions and tickers so net worth updates live
  const portfolioTransactions = usePortfolioStore((state) => state.transactions);
  const portfolioTickers = usePortfolioStore((state) => state.tickers);

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '••••••';
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const prefix = val < 0 ? '-' : '';
    const symbol = showCurrencySymbol ? '₹' : '';
    return `${prefix}${symbol}${formatted}`;
  };

  const renderAccountCategoryDetails = (types: string[]) => {
    const matchingAccounts = accounts.filter(
      (acc) => !acc.isArchived && types.includes(acc.type)
    );

    if (matchingAccounts.length === 0) {
      return (
        <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginLeft: 12, fontStyle: 'italic', marginVertical: 2 }}>
          No accounts added
        </ThemedText>
      );
    }

    return matchingAccounts.map((acc) => (
      <View key={acc.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 16, marginVertical: 2 }}>
        <ThemedText style={{ fontSize: 11, color: currColors.textSecondary }}>• {acc.name}</ThemedText>
        <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
          {formatAmount(acc.balance)}
        </ThemedText>
      </View>
    ));
  };

  const renderCreditCardDetails = () => {
    const matchingAccounts = accounts.filter(
      (acc) => !acc.isArchived && acc.type === 'credit_card'
    );

    if (matchingAccounts.length === 0) {
      return (
        <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginLeft: 12, fontStyle: 'italic', marginVertical: 2 }}>
          No credit cards added
        </ThemedText>
      );
    }

    return matchingAccounts.map((acc) => (
      <View key={acc.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 16, marginVertical: 2 }}>
        <ThemedText style={{ fontSize: 11, color: currColors.textSecondary }}>
          • {acc.name} (Limit: {formatAmount(acc.creditLimit || 0)})
        </ThemedText>
        <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
          {formatAmount(Math.abs(acc.balance))} spent
        </ThemedText>
      </View>
    ));
  };

  const renderInvestmentDetails = () => {
    let brokerAllocations: any[] = [];
    try {
      brokerAllocations = usePortfolioStore.getState().getAllocationData('Broker');
    } catch (e) {
      console.error('Failed to get broker allocations in health screen helper:', e);
    }

    const matchingAccounts = accounts.filter(
      (acc) => !acc.isArchived && acc.type === 'investment'
    );

    if (matchingAccounts.length === 0) {
      return (
        <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginLeft: 12, fontStyle: 'italic', marginVertical: 2 }}>
          No investment accounts added
        </ThemedText>
      );
    }

    return matchingAccounts.map((acc) => {
      let balance = acc.balance;
      if (acc.linkedBroker) {
        const alloc = brokerAllocations.find(
          (b) => b.name.toLowerCase().trim() === acc.linkedBroker!.toLowerCase().trim()
        );
        balance = alloc ? alloc.value : 0;
      }
      return (
        <View key={acc.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 16, marginVertical: 2 }}>
          <ThemedText style={{ fontSize: 11, color: currColors.textSecondary }}>
            • {acc.name} {acc.linkedBroker ? `(Linked ${acc.linkedBroker})` : ''}
          </ThemedText>
          <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
            {formatAmount(balance)}
          </ThemedText>
        </View>
      );
    });
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Computations
  const healthData = useMemo(() => {
    // 1. Calculate Average Monthly Income & Expense (Based on last 90 Days / 3 Months)
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).getTime();

    let totalIncome90d = 0;
    let totalExpense90d = 0;
    let daysDiff = 90;

    const txTimes = moneyTransactions.map((t) => new Date(t.date).getTime());
    if (txTimes.length > 0) {
      const oldestTx = Math.min(...txTimes);
      const computedDays = Math.max(1, (now.getTime() - oldestTx) / (24 * 60 * 60 * 1000));
      daysDiff = Math.min(90, Math.round(computedDays));
    }

    moneyTransactions.forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      if (txTime >= now.getTime() - daysDiff * 24 * 60 * 60 * 1000) {
        if (tx.type === 'income') totalIncome90d += tx.amount;
        else if (tx.type === 'expense') totalExpense90d += tx.amount;
      }
    });

    const incomeAvgMonthly = daysDiff > 0 ? (totalIncome90d / daysDiff) * 30 : 0;
    const expenseAvgMonthly = daysDiff > 0 ? (totalExpense90d / daysDiff) * 30 : 0;

    // A. Savings Rate (All-time cumulative savings rate)
    let allTimeIncome = 0;
    let allTimeExpense = 0;
    moneyTransactions.forEach((tx) => {
      if (tx.type === 'income') allTimeIncome += tx.amount;
      else if (tx.type === 'expense') allTimeExpense += tx.amount;
    });
    const allTimeSavings = allTimeIncome - allTimeExpense;
    const savingsRate = allTimeIncome > 0 ? (allTimeSavings / allTimeIncome) * 100 : 0;

    // B. Emergency Fund Cover (Liquid net assets / avg monthly expense)
    // Liquid cash = wallet + savings + emergency_fund
    let liquidCash = 0;
    let ccDebt = 0;
    let ccLimit = 0;
    let receivables = 0;
    let payables = 0;
    let investmentsVal = 0;

    let brokerAllocations: any[] = [];
    try {
      brokerAllocations = usePortfolioStore.getState().getAllocationData('Broker');
    } catch (e) {
      console.error('Failed to get broker allocations in health screen:', e);
    }

    accounts.forEach((acc) => {
      if (!acc.isArchived) {
        if (acc.type === 'wallet' || acc.type === 'savings' || acc.type === 'emergency_fund') {
          liquidCash += Math.max(0, acc.balance);
        } else if (acc.type === 'credit_card') {
          ccDebt += Math.abs(acc.balance);
          ccLimit += acc.creditLimit || 0;
        } else if (acc.type === 'receivable') {
          receivables += Math.max(0, acc.balance);
        } else if (acc.type === 'payable') {
          payables += Math.abs(acc.balance);
        } else if (acc.type === 'investment') {
          if (acc.linkedBroker) {
            const allocation = brokerAllocations.find(
              (b) => b.name.toLowerCase().trim() === acc.linkedBroker!.toLowerCase().trim()
            );
            investmentsVal += allocation ? allocation.value : 0;
          } else {
            investmentsVal += Math.max(0, acc.balance);
          }
        }
      }
    });

    const monthlyExpense = expenseAvgMonthly || 10000; // default fallback to prevent NaN
    // Net short term liquidity = liquid cash + receivables - payables (excluding long term investments)
    const netShortTermLiquidity = liquidCash + receivables - payables;
    const emergencyCoverMonths = Math.max(0, liquidCash / monthlyExpense);

    // C. Debt-to-Income (DTI) Ratio (EMI / Income)
    const emiBurden = getMonthlyEMIBurden();
    const dtiRatio = incomeAvgMonthly > 0 ? (emiBurden / incomeAvgMonthly) * 100 : 0;

    // D. Credit Utilization (CC Debt / CC Limit)
    // Find outstanding principal blocked on CCs from linked loans
    let blockedEmiAmount = 0;
    loans.forEach((loan) => {
      if (loan.isActive && loan.linkedAccountId) {
        const acc = accounts.find((a) => a.id === loan.linkedAccountId);
        if (acc && acc.type === 'credit_card') {
          blockedEmiAmount += loan.outstandingAmount;
        }
      }
    });

    const totalCCSpent = ccDebt + blockedEmiAmount;
    const creditUtilization = ccLimit > 0 ? (totalCCSpent / ccLimit) * 100 : 0;

    // E. Asset Allocation (Investments vs Total Assets)
    const totalAssets = liquidCash + receivables + investmentsVal;
    const investmentRatio = totalAssets > 0 ? (investmentsVal / totalAssets) * 100 : 0;

    // F. Short-Term Liquidity (Quick Ratio)
    const shortTermLiabilities = ccDebt + payables;
    const quickRatio = shortTermLiabilities > 0 ? netShortTermLiquidity / shortTermLiabilities : netShortTermLiquidity > 0 ? 9.9 : 0;

    // --- Scoring Algorithm (Max 100) ---
    // 1. Savings Rate Score (Max 20 points)
    let savingsScore = 0;
    if (savingsRate >= 20) savingsScore = 20;
    else if (savingsRate > 0) savingsScore = (savingsRate / 20) * 20;

    // 2. Emergency Fund Score (Max 20 points)
    let emergencyScore = 0;
    if (emergencyCoverMonths >= 3) emergencyScore = 20;
    else emergencyScore = (emergencyCoverMonths / 3) * 20;

    // 3. DTI Score (Max 20 points)
    let dtiScore = 0;
    if (dtiRatio <= 15) dtiScore = 20;
    else if (dtiRatio >= 45) dtiScore = 0;
    else dtiScore = 20 * (1 - (dtiRatio - 15) / 30);

    // 4. Credit Utilization Score (Max 15 points)
    let utilizationScore = 15; // Default full marks if no credit limits
    if (ccLimit > 0) {
      if (creditUtilization <= 30) utilizationScore = 15;
      else if (creditUtilization >= 80) utilizationScore = 0;
      else utilizationScore = 15 * (1 - (creditUtilization - 30) / 50);
    }

    // 5. Asset Allocation Score (Max 15 points)
    let allocationScore = 15;
    if (totalAssets > 0) {
      const ratio = investmentsVal / totalAssets;
      if (ratio >= 0.30 && ratio <= 0.70) allocationScore = 15;
      else if ((ratio >= 0.10 && ratio < 0.30) || (ratio > 0.70 && ratio <= 0.85)) allocationScore = 10;
      else allocationScore = 5;
    }

    // 6. Quick Ratio Score (Max 10 points)
    let quickRatioScore = 10;
    if (shortTermLiabilities > 0) {
      if (quickRatio >= 1.5) quickRatioScore = 10;
      else if (quickRatio >= 1.0) quickRatioScore = 7;
      else quickRatioScore = 2;
    }

    const totalScore = Math.round(savingsScore + emergencyScore + dtiScore + utilizationScore + allocationScore + quickRatioScore);

    // Grade Assignment
    let grade = 'D';
    let gradeColor = '#FF3B30';
    if (totalScore >= 90) {
      grade = 'A+';
      gradeColor = '#34C759';
    } else if (totalScore >= 80) {
      grade = 'A';
      gradeColor = '#34C759';
    } else if (totalScore >= 70) {
      grade = 'B';
      gradeColor = '#00C9A7';
    } else if (totalScore >= 55) {
      grade = 'C';
      gradeColor = '#FF9500';
    }

    return {
      income30d: incomeAvgMonthly,
      expense30d: expenseAvgMonthly,
      savingsRate,
      liquidCash,
      netShortTermLiquidity,
      emergencyCoverMonths,
      emiBurden,
      dtiRatio,
      creditUtilization,
      ccLimit,
      totalAssets,
      investmentRatio,
      shortTermLiabilities,
      quickRatio,
      allTimeIncome,
      allTimeExpense,
      ccDebt,
      blockedEmiAmount,
      investmentsVal,
      receivables,
      payables,
      totalScore,
      grade,
      gradeColor,
      metrics: {
        savings: { score: Math.round(savingsScore), value: savingsRate, status: savingsRate >= 20 ? 'Optimal' : savingsRate >= 10 ? 'Fair' : 'Under' },
        emergency: { score: Math.round(emergencyScore), value: emergencyCoverMonths, status: emergencyCoverMonths >= 3 ? 'Optimal' : emergencyCoverMonths >= 1 ? 'Warning' : 'Critical' },
        dti: { score: Math.round(dtiScore), value: dtiRatio, status: dtiRatio <= 20 ? 'Safe' : dtiRatio <= 35 ? 'Moderate' : 'High' },
        utilization: { score: Math.round(utilizationScore), value: creditUtilization, status: ccLimit === 0 ? 'No Debt' : creditUtilization <= 30 ? 'Optimal' : creditUtilization <= 50 ? 'Warning' : 'Critical' },
        allocation: { score: Math.round(allocationScore), value: investmentRatio, status: totalAssets === 0 ? 'No Assets' : investmentRatio >= 30 && investmentRatio <= 70 ? 'Optimal' : 'Imbalanced' },
        quickRatio: { score: Math.round(quickRatioScore), value: quickRatio, status: shortTermLiabilities === 0 ? 'No Debt' : quickRatio >= 1.5 ? 'Optimal' : quickRatio >= 1.0 ? 'Warning' : 'Critical' },
      }
    };
  }, [moneyTransactions, accounts, loans, getMonthlyEMIBurden]);

  const ratingGradient = colorScheme === 'dark'
    ? ['#1C1C1E', '#000000'] as const
    : ['#FFFFFF', '#F2F2F7'] as const;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => {
            handleHaptic();
            router.back();
          }}
        >
          <ArrowLeft size={20} color={currColors.text} />
        </TouchableOpacity>
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          Financial Health
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Score Radial Grade Banner */}
        <LinearGradient colors={ratingGradient} style={[styles.scoreHeroCard, { borderColor: currColors.border }]}>
          <View style={styles.scoreRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.scoreLabel, { color: currColors.textSecondary }]}>
                CASH HEALTH GRADE
              </ThemedText>
              <ThemedText type="semiBold" style={[styles.scoreTitle, { color: currColors.text }]}>
                {healthData.totalScore}/100 Score
              </ThemedText>
              <ThemedText style={[styles.scoreSubtitle, { color: currColors.textSecondary }]}>
                Evaluated from cash flows, outstanding liabilities, and emergency reserves.
              </ThemedText>
            </View>
            <View style={[styles.gradeCircle, { borderColor: healthData.gradeColor }]}>
              <ThemedText type="bold" style={[styles.gradeText, { color: healthData.gradeColor }]}>
                {healthData.grade}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* ─── Metric Breakdowns ─── */}
        <View style={styles.sectionHeader}>
          <ThemedText type="bold" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            HEALTH METRICS BREAKDOWN
          </ThemedText>
        </View>

        <View style={styles.metricsContainer}>
          {/* 1. Savings Rate */}
          <TouchableOpacity
            style={[styles.metricCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveModal('savings');
            }}
          >
            <View style={styles.metricHeader}>
              <View style={styles.metricHeaderLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                  <Percent size={18} color="#34C759" />
                </View>
                <View>
                  <ThemedText type="semiBold" style={{ fontSize: 15, color: currColors.text }}>Savings Rate</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginTop: 2 }}>Target: &gt;= 20%</ThemedText>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText type="semiBold" style={{ fontSize: 16, color: currColors.text }}>
                  {healthData.savingsRate.toFixed(0)}%
                </ThemedText>
                <ThemedText style={{
                  fontSize: 10,
                  fontFamily: 'Outfit_600SemiBold',
                  color: healthData.metrics.savings.status === 'Optimal' ? '#34C759' : healthData.metrics.savings.status === 'Fair' ? '#FF9500' : '#FF3B30',
                  marginTop: 2
                }}>
                  {healthData.metrics.savings.status}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: currColors.cardSecondary }]}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, (healthData.savingsRate / 20) * 100))}%`, backgroundColor: '#34C759' }]} />
            </View>
            <ThemedText style={[styles.metricAdvice, { color: currColors.textSecondary }]}>
              {healthData.savingsRate >= 20
                ? 'Excellent saving habits! You are retaining a healthy portion of your monthly income.'
                : 'Consider identifying and pausing non-essential subscriptions or spending to bump up your savings rate.'}
            </ThemedText>
            <View style={[styles.formulaBox, { backgroundColor: currColors.cardSecondary }]}>
              <ThemedText style={[styles.formulaText, { color: currColors.textSecondary }]}>
                Formula: (All-Time Income - All-Time Expense) / All-Time Income
              </ThemedText>
            </View>
          </TouchableOpacity>

          {/* 2. Emergency Cushion */}
          <TouchableOpacity
            style={[styles.metricCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveModal('emergency');
            }}
          >
            <View style={styles.metricHeader}>
              <View style={styles.metricHeaderLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                  <PiggyBank size={18} color="#007AFF" />
                </View>
                <View>
                  <ThemedText type="semiBold" style={{ fontSize: 15, color: currColors.text }}>Emergency Cushion</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginTop: 2 }}>Target: &gt;= 3 Months</ThemedText>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText type="semiBold" style={{ fontSize: 16, color: currColors.text }}>
                  {healthData.emergencyCoverMonths.toFixed(1)} Months
                </ThemedText>
                <ThemedText style={{
                  fontSize: 10,
                  fontFamily: 'Outfit_600SemiBold',
                  color: healthData.metrics.emergency.status === 'Optimal' ? '#34C759' : healthData.metrics.emergency.status === 'Warning' ? '#FF9500' : '#FF3B30',
                  marginTop: 2
                }}>
                  {healthData.metrics.emergency.status}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: currColors.cardSecondary }]}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, (healthData.emergencyCoverMonths / 3) * 100))}%`, backgroundColor: '#007AFF' }]} />
            </View>
            <ThemedText style={[styles.metricAdvice, { color: currColors.textSecondary }]}>
              {healthData.emergencyCoverMonths >= 3
                ? 'Great security cushion. Your reserves can support you through unexpected financial shocks.'
                : `Your current emergency buffer is low (${formatAmount(healthData.liquidCash)}). Try storing away at least 3 months of expenses.`}
            </ThemedText>

            <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: currColors.border, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText style={{ fontSize: 12, color: currColors.textSecondary }}>6-Month Safety Target:</ThemedText>
                <ThemedText style={{ fontSize: 12, color: currColors.text, fontFamily: 'Outfit_600SemiBold' }}>
                  {formatAmount(healthData.expense30d * 6)}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText style={{ fontSize: 12, color: currColors.textSecondary }}>Current Liquid Cash:</ThemedText>
                <ThemedText style={{ fontSize: 12, color: currColors.text, fontFamily: 'Outfit_600SemiBold' }}>
                  {formatAmount(healthData.liquidCash)}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                <ThemedText style={{ fontSize: 12, color: currColors.textSecondary }}>
                  {healthData.liquidCash >= (healthData.expense30d * 6) ? 'Surplus Amount:' : 'Shortfall Amount:'}
                </ThemedText>
                <ThemedText style={{
                  fontSize: 12,
                  fontFamily: 'Outfit_600SemiBold',
                  color: healthData.liquidCash >= (healthData.expense30d * 6) ? '#34C759' : '#FF3B30'
                }}>
                  {healthData.liquidCash >= (healthData.expense30d * 6)
                    ? `+${formatAmount(healthData.liquidCash - (healthData.expense30d * 6))}`
                    : `-${formatAmount((healthData.expense30d * 6) - healthData.liquidCash)}`
                  }
                </ThemedText>
              </View>
            </View>
            <View style={[styles.formulaBox, { backgroundColor: currColors.cardSecondary }]}>
              <ThemedText style={[styles.formulaText, { color: currColors.textSecondary }]}>
                Formula: (Savings + Wallet + Emergency Fund) / Avg. Monthly Expense
              </ThemedText>
            </View>
          </TouchableOpacity>

          {/* 3. Debt-to-Income (DTI) */}
          <TouchableOpacity
            style={[styles.metricCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveModal('dti');
            }}
          >
            <View style={styles.metricHeader}>
              <View style={styles.metricHeaderLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(175, 82, 222, 0.1)' }]}>
                  <Landmark size={18} color="#AF52DE" />
                </View>
                <View>
                  <ThemedText type="semiBold" style={{ fontSize: 15, color: currColors.text }}>Debt-to-Income (DTI)</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginTop: 2 }}>Target: &lt;= 30%</ThemedText>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText type="semiBold" style={{ fontSize: 16, color: currColors.text }}>
                  {healthData.dtiRatio.toFixed(0)}%
                </ThemedText>
                <ThemedText style={{
                  fontSize: 10,
                  fontFamily: 'Outfit_600SemiBold',
                  color: healthData.metrics.dti.status === 'Safe' ? '#34C759' : healthData.metrics.dti.status === 'Moderate' ? '#FF9500' : '#FF3B30',
                  marginTop: 2
                }}>
                  {healthData.metrics.dti.status}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: currColors.cardSecondary }]}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, (1 - Math.min(1, healthData.dtiRatio / 50)) * 100))}%`, backgroundColor: '#AF52DE' }]} />
            </View>
            <ThemedText style={[styles.metricAdvice, { color: currColors.textSecondary }]}>
              {healthData.dtiRatio <= 30
                ? 'Your monthly EMI repayment burden is in a healthy, manageable range.'
                : 'A high DTI limits financial flexibility. Focus on clearing outstanding loan principals early.'}
            </ThemedText>
            <View style={[styles.formulaBox, { backgroundColor: currColors.cardSecondary }]}>
              <ThemedText style={[styles.formulaText, { color: currColors.textSecondary }]}>
                Formula: Total Monthly EMI Obligations / Avg. Monthly Income
              </ThemedText>
            </View>
          </TouchableOpacity>

          {/* 4. Credit Utilization */}
          <TouchableOpacity
            style={[styles.metricCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveModal('utilization');
            }}
          >
            <View style={styles.metricHeader}>
              <View style={styles.metricHeaderLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                  <CreditCard size={18} color="#FF9500" />
                </View>
                <View>
                  <ThemedText type="semiBold" style={{ fontSize: 15, color: currColors.text }}>Credit Utilization</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginTop: 2 }}>Target: &lt;= 30%</ThemedText>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText type="semiBold" style={{ fontSize: 16, color: currColors.text }}>
                  {healthData.ccLimit > 0 ? `${healthData.creditUtilization.toFixed(0)}%` : 'N/A'}
                </ThemedText>
                <ThemedText style={{
                  fontSize: 10,
                  fontFamily: 'Outfit_600SemiBold',
                  color: healthData.metrics.utilization.status === 'Optimal' || healthData.metrics.utilization.status === 'No Debt' ? '#34C759' : healthData.metrics.utilization.status === 'Warning' ? '#FF9500' : '#FF3B30',
                  marginTop: 2
                }}>
                  {healthData.metrics.utilization.status}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: currColors.cardSecondary }]}>
              <View style={[styles.progressFill, { width: `${healthData.ccLimit > 0 ? Math.max(0, Math.min(100, healthData.creditUtilization)) : 0}%`, backgroundColor: '#FF9500' }]} />
            </View>
            <ThemedText style={[styles.metricAdvice, { color: currColors.textSecondary }]}>
              {healthData.ccLimit === 0
                ? 'No credit card limits configured. Log credit card accounts to evaluate utilization.'
                : healthData.creditUtilization <= 30
                ? 'Excellent credit discipline. Your usage keeps your credit score in prime condition.'
                : 'Consider paying credit card bills twice a month to reduce reporting utilization percentages.'}
            </ThemedText>
            <View style={[styles.formulaBox, { backgroundColor: currColors.cardSecondary }]}>
              <ThemedText style={[styles.formulaText, { color: currColors.textSecondary }]}>
                Formula: (Credit Card Balance + Blocked EMIs) / Total Credit Limits
              </ThemedText>
            </View>
          </TouchableOpacity>

          {/* 5. Asset Allocation (Compounding Yield) */}
          <TouchableOpacity
            style={[styles.metricCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveModal('allocation');
            }}
          >
            <View style={styles.metricHeader}>
              <View style={styles.metricHeaderLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(90, 200, 250, 0.1)' }]}>
                  <TrendingUp size={18} color="#5AC8FA" />
                </View>
                <View>
                  <ThemedText type="semiBold" style={{ fontSize: 15, color: currColors.text }}>Asset Allocation</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginTop: 2 }}>Target: 30% - 70% Invested</ThemedText>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText type="semiBold" style={{ fontSize: 16, color: currColors.text }}>
                  {healthData.totalAssets > 0 ? `${healthData.investmentRatio.toFixed(0)}%` : 'N/A'}
                </ThemedText>
                <ThemedText style={{
                  fontSize: 10,
                  fontFamily: 'Outfit_600SemiBold',
                  color: healthData.metrics.allocation.status === 'Optimal' ? '#34C759' : '#FF9500',
                  marginTop: 2
                }}>
                  {healthData.metrics.allocation.status}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: currColors.cardSecondary }]}>
              <View style={[styles.progressFill, { width: `${healthData.totalAssets > 0 ? Math.max(0, Math.min(100, healthData.investmentRatio)) : 0}%`, backgroundColor: '#5AC8FA' }]} />
            </View>
            <ThemedText style={[styles.metricAdvice, { color: currColors.textSecondary }]}>
              {healthData.totalAssets === 0
                ? 'No monetary assets tracked. Log savings or investments to analyze wealth allocations.'
                : healthData.investmentRatio >= 30 && healthData.investmentRatio <= 70
                ? 'Optimal asset allocation. You maintain a solid compounding engine alongside liquid safety funds.'
                : healthData.investmentRatio < 30
                ? 'You are holding too much low-yield cash. Consider investing surplus funds in stocks or index mutual funds.'
                : 'Over-allocated in investments with low emergency cash reserves. Liquidate some assets to form cash reserves.'}
            </ThemedText>
            <View style={[styles.formulaBox, { backgroundColor: currColors.cardSecondary }]}>
              <ThemedText style={[styles.formulaText, { color: currColors.textSecondary }]}>
                Formula: Long-Term Investments / (Liquid Cash + Receivables + Investments)
              </ThemedText>
            </View>
          </TouchableOpacity>

          {/* 6. Short-Term Liquidity (Quick Ratio) */}
          <TouchableOpacity
            style={[styles.metricCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            activeOpacity={0.75}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveModal('quickRatio');
            }}
          >
            <View style={styles.metricHeader}>
              <View style={styles.metricHeaderLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                  <ShieldCheck size={18} color="#34C759" />
                </View>
                <View>
                  <ThemedText type="semiBold" style={{ fontSize: 15, color: currColors.text }}>Short-Term Liquidity</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginTop: 2 }}>Target Quick Ratio: &gt;= 1.5x</ThemedText>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText type="semiBold" style={{ fontSize: 16, color: currColors.text }}>
                  {healthData.shortTermLiabilities > 0 ? `${healthData.quickRatio.toFixed(1)}x` : 'Perfect'}
                </ThemedText>
                <ThemedText style={{
                  fontSize: 10,
                  fontFamily: 'Outfit_600SemiBold',
                  color: healthData.metrics.quickRatio.status === 'Optimal' || healthData.metrics.quickRatio.status === 'No Debt' ? '#34C759' : healthData.metrics.quickRatio.status === 'Warning' ? '#FF9500' : '#FF3B30',
                  marginTop: 2
                }}>
                  {healthData.metrics.quickRatio.status}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: currColors.cardSecondary }]}>
              <View style={[styles.progressFill, { width: `${healthData.shortTermLiabilities > 0 ? Math.max(0, Math.min(100, (healthData.quickRatio / 1.5) * 100)) : 100}%`, backgroundColor: '#34C759' }]} />
            </View>
            <ThemedText style={[styles.metricAdvice, { color: currColors.textSecondary }]}>
              {healthData.shortTermLiabilities === 0
                ? 'Perfect short-term liquidity with zero outstanding credit card debts or accounts payable.'
                : healthData.quickRatio >= 1.5
                ? 'Excellent coverage. Short term liquid assets easily cover your immediate liabilities.'
                : 'Caution: Short term debts are high compared to liquid cash. Pay off card bills to avoid high interest charges.'}
            </ThemedText>
            <View style={[styles.formulaBox, { backgroundColor: currColors.cardSecondary }]}>
              <ThemedText style={[styles.formulaText, { color: currColors.textSecondary }]}>
                Formula (Quick Ratio): (Liquid Cash + Receivables - Payables) / (Credit Card Balances + Payables)
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Dynamic Calculation Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={activeModal !== null}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveModal(null)} />
          <View style={[styles.modalContent, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              {/* Drag Indicator / Bar */}
              <View style={[styles.dragHandle, { backgroundColor: currColors.border }]} />

              {/* Header */}
              <View style={styles.modalHeader}>
                <ThemedText type="bold" style={[styles.modalTitle, { color: currColors.text }]}>
                  {activeModal === 'savings' && 'Savings Rate Calculation'}
                  {activeModal === 'emergency' && 'Emergency Cushion Calculation'}
                  {activeModal === 'dti' && 'Debt-to-Income Calculation'}
                  {activeModal === 'utilization' && 'Credit Utilization Calculation'}
                  {activeModal === 'allocation' && 'Asset Allocation Calculation'}
                  {activeModal === 'quickRatio' && 'Short-Term Liquidity (Quick Ratio)'}
                </ThemedText>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: currColors.cardSecondary }]}
                  onPress={() => setActiveModal(null)}
                >
                  <ThemedText style={{ fontSize: 13, color: currColors.text }}>✕</ThemedText>
                </TouchableOpacity>
              </View>

              {/* Data Table */}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {activeModal === 'savings' && (
                  <>
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>All-Time Income</ThemedText>
                      <ThemedText style={{ color: currColors.text, fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.allTimeIncome)}
                      </ThemedText>
                    </View>
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>All-Time Expenses</ThemedText>
                      <ThemedText style={{ color: '#FF3B30', fontFamily: 'Outfit_600SemiBold' }}>
                        -{formatAmount(healthData.allTimeExpense)}
                      </ThemedText>
                    </View>
                    <View style={styles.dividerLight} />
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>All-Time Net Savings</ThemedText>
                      <ThemedText style={{ color: '#34C759', fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.allTimeIncome - healthData.allTimeExpense)}
                      </ThemedText>
                    </View>
                    <View style={[styles.formulaBox, { backgroundColor: currColors.cardSecondary, marginTop: 16 }]}>
                      <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_700Bold', marginBottom: 4 }}>FORMULA USED:</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_500Medium' }}>
                        (Savings / Income) × 100 = {healthData.savingsRate.toFixed(1)}%
                      </ThemedText>
                    </View>
                  </>
                )}

                {activeModal === 'emergency' && (
                  <>
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary, fontFamily: 'Outfit_600SemiBold' }}>Total Liquid Cash</ThemedText>
                      <ThemedText style={{ color: currColors.text, fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.liquidCash)}
                      </ThemedText>
                    </View>
                    {/* Category breakdowns */}
                    <View style={{ marginVertical: 4 }}>
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_600SemiBold', marginTop: 4 }}>Savings Accounts:</ThemedText>
                      {renderAccountCategoryDetails(['savings'])}
                      
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_600SemiBold', marginTop: 4 }}>Cash & Wallets:</ThemedText>
                      {renderAccountCategoryDetails(['wallet'])}

                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_600SemiBold', marginTop: 4 }}>Emergency Funds:</ThemedText>
                      {renderAccountCategoryDetails(['emergency_fund'])}
                    </View>
                    <View style={styles.dividerLight} />
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>Avg. Monthly Expense (3M)</ThemedText>
                      <ThemedText style={{ color: '#FF3B30', fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.expense30d)}
                      </ThemedText>
                    </View>
                    <View style={styles.dividerLight} />
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>Cushion Runway</ThemedText>
                      <ThemedText style={{ color: '#007AFF', fontFamily: 'Outfit_600SemiBold' }}>
                        {healthData.emergencyCoverMonths.toFixed(1)} Months
                      </ThemedText>
                    </View>
                    <View style={[styles.formulaBox, { backgroundColor: currColors.cardSecondary, marginTop: 16 }]}>
                      <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_700Bold', marginBottom: 4 }}>FORMULA USED:</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_500Medium' }}>
                        (Savings + Wallet + Emergency Fund) / Avg. Monthly Expense = {healthData.emergencyCoverMonths.toFixed(1)} Months
                      </ThemedText>
                    </View>
                  </>
                )}

                {activeModal === 'dti' && (
                  <>
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary, fontFamily: 'Outfit_600SemiBold' }}>Total Monthly EMIs</ThemedText>
                      <ThemedText style={{ color: '#FF9500', fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.emiBurden)}
                      </ThemedText>
                    </View>
                    {/* Active Loans */}
                    <View style={{ marginVertical: 4 }}>
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_600SemiBold', marginTop: 4 }}>Active Loans (EMI contributions):</ThemedText>
                      {loans.filter(l => l.isActive).length === 0 ? (
                        <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginLeft: 12, fontStyle: 'italic', marginVertical: 2 }}>No active loans</ThemedText>
                      ) : (
                        loans.filter(l => l.isActive).map(l => (
                          <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 16, marginVertical: 2 }}>
                            <ThemedText style={{ fontSize: 11, color: currColors.textSecondary }}>• {l.name}</ThemedText>
                            <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                              {formatAmount(l.emiAmount)}/mo
                            </ThemedText>
                          </View>
                        ))
                      )}
                    </View>
                    <View style={styles.dividerLight} />
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>Avg. Monthly Income (3M)</ThemedText>
                      <ThemedText style={{ color: currColors.text, fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.income30d)}
                      </ThemedText>
                    </View>
                    <View style={styles.dividerLight} />
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>Debt-to-Income Ratio</ThemedText>
                      <ThemedText style={{ color: healthData.dtiRatio <= 30 ? '#34C759' : '#FF3B30', fontFamily: 'Outfit_600SemiBold' }}>
                        {healthData.dtiRatio.toFixed(1)}%
                      </ThemedText>
                    </View>
                    <View style={[styles.formulaBox, { backgroundColor: currColors.cardSecondary, marginTop: 16 }]}>
                      <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_700Bold', marginBottom: 4 }}>FORMULA USED:</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_500Medium' }}>
                        (EMI / Income) × 100 = {healthData.dtiRatio.toFixed(1)}%
                      </ThemedText>
                    </View>
                  </>
                )}

                {activeModal === 'utilization' && (
                  <>
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary, fontFamily: 'Outfit_600SemiBold' }}>Credit Card Accounts details:</ThemedText>
                    </View>
                    <View style={{ marginVertical: 4 }}>
                      {renderCreditCardDetails()}
                    </View>
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>Blocked EMI Balances</ThemedText>
                      <ThemedText style={{ color: currColors.text, fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.blockedEmiAmount)}
                      </ThemedText>
                    </View>
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>Total CC Spent (A)</ThemedText>
                      <ThemedText style={{ color: '#FF9500', fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.ccDebt + healthData.blockedEmiAmount)}
                      </ThemedText>
                    </View>
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>Total Limits (B)</ThemedText>
                      <ThemedText style={{ color: currColors.text, fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.ccLimit)}
                      </ThemedText>
                    </View>
                    <View style={styles.dividerLight} />
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>Utilization Ratio</ThemedText>
                      <ThemedText style={{ color: healthData.creditUtilization <= 30 ? '#34C759' : '#FF3B30', fontFamily: 'Outfit_600SemiBold' }}>
                        {healthData.ccLimit > 0 ? `${healthData.creditUtilization.toFixed(1)}%` : '0.0%'}
                      </ThemedText>
                    </View>
                    <View style={[styles.formulaBox, { backgroundColor: currColors.cardSecondary, marginTop: 16 }]}>
                      <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_700Bold', marginBottom: 4 }}>FORMULA USED:</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_500Medium' }}>
                        (Spent / Limits) × 100 = {healthData.creditUtilization.toFixed(1)}%
                      </ThemedText>
                    </View>
                  </>
                )}

                {activeModal === 'allocation' && (
                  <>
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary, fontFamily: 'Outfit_600SemiBold' }}>Investments Val (A)</ThemedText>
                      <ThemedText style={{ color: '#5AC8FA', fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.investmentsVal)}
                      </ThemedText>
                    </View>
                    <View style={{ marginVertical: 4 }}>
                      {renderInvestmentDetails()}
                    </View>
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary, fontFamily: 'Outfit_600SemiBold' }}>Liquid Cash</ThemedText>
                      <ThemedText style={{ color: currColors.text, fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.liquidCash)}
                      </ThemedText>
                    </View>
                    <View style={{ marginVertical: 4 }}>
                      {renderAccountCategoryDetails(['savings', 'wallet', 'emergency_fund'])}
                    </View>
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary, fontFamily: 'Outfit_600SemiBold' }}>Receivables</ThemedText>
                      <ThemedText style={{ color: currColors.text, fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.receivables)}
                      </ThemedText>
                    </View>
                    <View style={{ marginVertical: 4 }}>
                      {renderAccountCategoryDetails(['receivable'])}
                    </View>
                    <View style={styles.dividerLight} />
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>Total Assets (B)</ThemedText>
                      <ThemedText style={{ color: currColors.text, fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.totalAssets)}
                      </ThemedText>
                    </View>
                    <View style={styles.dividerLight} />
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>Investment Ratio</ThemedText>
                      <ThemedText style={{ color: healthData.investmentRatio >= 30 && healthData.investmentRatio <= 70 ? '#34C759' : '#FF9500', fontFamily: 'Outfit_600SemiBold' }}>
                        {healthData.investmentRatio.toFixed(1)}%
                      </ThemedText>
                    </View>
                    <View style={[styles.formulaBox, { backgroundColor: currColors.cardSecondary, marginTop: 16 }]}>
                      <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_700Bold', marginBottom: 4 }}>FORMULA USED:</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_500Medium' }}>
                        (Investments / Total Assets) × 100 = {healthData.investmentRatio.toFixed(1)}%
                      </ThemedText>
                    </View>
                  </>
                )}

                {activeModal === 'quickRatio' && (
                  <>
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary, fontFamily: 'Outfit_600SemiBold' }}>Short-Term Assets (A)</ThemedText>
                      <ThemedText style={{ color: '#34C759', fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.liquidCash + healthData.receivables - healthData.payables)}
                      </ThemedText>
                    </View>
                    <View style={{ marginVertical: 4 }}>
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_600SemiBold', marginTop: 4 }}>Savings, Cash & Emergency:</ThemedText>
                      {renderAccountCategoryDetails(['savings', 'wallet', 'emergency_fund'])}
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_600SemiBold', marginTop: 4 }}>Receivables:</ThemedText>
                      {renderAccountCategoryDetails(['receivable'])}
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_600SemiBold', marginTop: 4 }}>Payables:</ThemedText>
                      {renderAccountCategoryDetails(['payable'])}
                    </View>
                    <View style={styles.dividerLight} />
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary, fontFamily: 'Outfit_600SemiBold' }}>Short-Term Liabilities (B)</ThemedText>
                      <ThemedText style={{ color: '#FF3B30', fontFamily: 'Outfit_600SemiBold' }}>
                        {formatAmount(healthData.shortTermLiabilities)}
                      </ThemedText>
                    </View>
                    <View style={{ marginVertical: 4 }}>
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_600SemiBold', marginTop: 4 }}>Credit Cards:</ThemedText>
                      {renderCreditCardDetails()}
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_600SemiBold', marginTop: 4 }}>Payables:</ThemedText>
                      {renderAccountCategoryDetails(['payable'])}
                    </View>
                    <View style={styles.dividerLight} />
                    <View style={styles.modalRow}>
                      <ThemedText style={{ color: currColors.textSecondary }}>Quick Ratio</ThemedText>
                      <ThemedText style={{ color: healthData.quickRatio >= 1.5 ? '#34C759' : '#FF9500', fontFamily: 'Outfit_600SemiBold' }}>
                        {healthData.shortTermLiabilities > 0 ? `${healthData.quickRatio.toFixed(1)}x` : 'Infinite'}
                      </ThemedText>
                    </View>
                    <View style={[styles.formulaBox, { backgroundColor: currColors.cardSecondary, marginTop: 16 }]}>
                      <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, fontFamily: 'Outfit_700Bold', marginBottom: 4 }}>FORMULA USED:</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: currColors.text, fontFamily: 'Outfit_500Medium' }}>
                        Short-Term Assets / Short-Term Liabilities = {healthData.shortTermLiabilities > 0 ? `${healthData.quickRatio.toFixed(1)}x` : 'Perfect'}
                      </ThemedText>
                    </View>
                  </>
                )}
              </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  scoreHeroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    fontSize: 9,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  scoreTitle: {
    fontSize: 24,
    marginBottom: 10,
  },
  scoreSubtitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 16,
    marginRight: 12,
  },
  gradeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 26,
  },
  sectionHeader: {
    marginBottom: 12,
    marginHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  metricsContainer: {
    gap: 16,
  },
  metricCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  metricHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricAdvice: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 16,
  },
  formulaBox: {
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
  },
  formulaText: {
    fontSize: 9.5,
    fontFamily: 'Outfit_500Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    flex: 1,
    marginRight: 10,
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
    gap: 12,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dividerLight: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 6,
  },
});
