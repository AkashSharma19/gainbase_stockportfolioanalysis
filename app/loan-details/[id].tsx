import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  ChevronDown,
  Info,
  X,
  Check,
  Zap,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackButton } from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { EMIPayment } from '@/types/money';
import { Category3DIcon } from '@/components/Category3DIcon';
import { LOAN_3D_ICON_MAP } from '@/constants/Category3DIcons';
import { AccountPickerModal } from '@/components/AccountPickerModal';
import { AccountSelectCard } from '@/components/AccountSelectCard';
import { FolderDetailsCard, CircularProgress3DIcon } from '@/components/FolderDetailsCard';
import { getCardPaletteFromItem } from '@/constants/folderTheme';
import { formatIndianAmount, parseIndianAmount } from '@/utils/formatters';
import { getNextLoanDuePayment } from '@/lib/finance';

const TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  home: { label: 'Home Loan', color: '#007AFF', emoji: '🏠' },
  car: { label: 'Car Loan', color: '#34C759', emoji: '🚗' },
  personal: { label: 'Personal Loan', color: '#FF9500', emoji: '💰' },
  education: { label: 'Education Loan', color: '#AF52DE', emoji: '🎓' },
  other: { label: 'Other Loan', color: '#8E8E93', emoji: '🏦' },
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type ScheduleTab = 'upcoming' | 'paid';

export interface LoanDetailsProps {
  loanId?: string;
  onBack?: () => void;
}

export function LoanDetailsContent({ loanId, onBack }: LoanDetailsProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = loanId || params.id;
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 32);
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const {
    loans,
    accounts,
    emiPayments,
    removeLoan,
    addEMIPayment,
    addMoneyTransaction,
    categories,
    removeMoneyTransaction,
    moneyTransactions,
    removeEMIPayment,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const isDark = colorScheme === 'dark';

  const loan = useMemo(() => {
    return loans.find((l) => l.id === id);
  }, [id, loans]);

  const palette = useMemo(() => {
    if (!loan) return { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' };
    return getCardPaletteFromItem({
      type: 'loan',
      loanType: loan.type,
      name: loan.name,
      icon: loan.icon || LOAN_3D_ICON_MAP[loan.type],
    });
  }, [loan]);

  const loanPayments = useMemo(() => {
    return emiPayments
      .filter((p) => p.loanId === id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [id, emiPayments]);

  const [scheduleTab, setScheduleTab] = useState<ScheduleTab>('upcoming');

  // Log Payment Modal states
  const [showLogPaymentModal, setShowLogPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('EMI Payments');
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  // Auto-heal loan record if payments exist but outstanding wasn't updated
  useEffect(() => {
    if (loan && loanPayments.length > 0) {
      const totalPrincipalPaid = loanPayments.reduce((sum, p) => sum + (p.principalPortion || p.amount), 0);
      const expectedOutstanding = Math.max(0, loan.principalAmount - totalPrincipalPaid);
      if (loan.outstandingAmount > expectedOutstanding + 0.01) {
        useMoneyStore.setState((state) => ({
          loans: state.loans.map((l) =>
            l.id === loan.id ? { ...l, outstandingAmount: expectedOutstanding } : l
          ),
        }));
      }
    }
  }, [loan, loanPayments]);

  const totalPrincipalPaid = useMemo(() => {
    return loanPayments.reduce((sum, p) => sum + (p.principalPortion || p.amount), 0);
  }, [loanPayments]);

  const totalInterestPaid = useMemo(() => {
    return loanPayments.reduce((sum, p) => sum + (p.interestPortion || 0), 0);
  }, [loanPayments]);

  const effectiveOutstanding = useMemo(() => {
    if (!loan) return 0;
    if (loanPayments.length > 0) {
      return Math.max(0, Math.min(loan.outstandingAmount, loan.principalAmount - totalPrincipalPaid));
    }
    return loan.outstandingAmount;
  }, [loan, loanPayments, totalPrincipalPaid]);

  // Compute remaining months
  const monthsRemaining = useMemo(() => {
    if (!loan || effectiveOutstanding <= 0 || loan.emiAmount <= 0) return 0;
    const r = (loan.interestRate / 12) / 100;
    const emi = loan.emiAmount;
    if (r > 0 && emi <= effectiveOutstanding * r) {
      return Math.round(effectiveOutstanding / emi);
    }
    let balance = effectiveOutstanding;
    let count = 0;
    while (balance > 0 && count < 480) {
      const interest = balance * r;
      const principal = emi - interest;
      if (principal <= 0) break;
      balance -= Math.min(balance, principal);
      count++;
    }
    return count;
  }, [loan, effectiveOutstanding]);

  // Next Due Date & Days Left calculation
  const nextDueDateInfo = useMemo(() => {
    if (!loan || effectiveOutstanding <= 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(loan.startDate);
    const day = start.getDate();

    const hasPaidThisMonth = loanPayments.some(
      (p) =>
        new Date(p.date).getMonth() === today.getMonth() &&
        new Date(p.date).getFullYear() === today.getFullYear()
    );

    let nextDue = new Date(today.getFullYear(), today.getMonth(), day);
    if (nextDue.getMonth() !== today.getMonth()) {
      nextDue = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    if (hasPaidThisMonth) {
      nextDue = new Date(today.getFullYear(), today.getMonth() + 1, day);
      if (nextDue.getMonth() !== (today.getMonth() + 1) % 12) {
        nextDue = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      }
    }

    if (nextDue < start) {
      nextDue = new Date(start);
    }

    const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      date: nextDue,
      dateFormatted: nextDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      daysLeft: diffDays,
      isDueSoon: diffDays >= 0 && diffDays <= 5,
    };
  }, [loan, loanPayments, effectiveOutstanding]);

  // Amortization Schedule Calculation
  const amortizationSchedule = useMemo(() => {
    if (!loan) return [];

    const schedule = [];
    
    // 1. Process past paid payments (oldest first)
    const pastPaymentsAsc = [...loanPayments].reverse();
    
    // Compute running balance
    const balances: number[] = [];
    let b = effectiveOutstanding;
    for (let i = pastPaymentsAsc.length - 1; i >= 0; i--) {
      const p = pastPaymentsAsc[i];
      const startBal = b + (p.principalPortion || p.amount);
      balances[i] = startBal;
      b = startBal;
    }

    let regularEmiCount = 0;
    const pastScheduleRows = [];
    for (let i = 0; i < pastPaymentsAsc.length; i++) {
      const p = pastPaymentsAsc[i];
      const startBalance = balances[i];
      const endBalance = startBalance - (p.principalPortion || p.amount);

      const labelDate = new Date(p.date);
      const monthLabel = `${MONTH_NAMES[labelDate.getMonth()]} ${labelDate.getFullYear()}`;

      // Identify prepayment: 0 interest portion or explicit prepayment
      const isPrepayment = (loan.interestRate > 0 && p.interestPortion === 0) ||
                           (p.interestPortion === 0 && Math.abs(p.amount - loan.emiAmount) > 1);

      let emiNumber: number | null = null;
      if (!isPrepayment) {
        regularEmiCount++;
        emiNumber = regularEmiCount;
      }

      pastScheduleRows.unshift({
        id: p.id,
        emiNumber,
        isPrepayment,
        isPaid: true,
        isUpcoming: false,
        monthLabel,
        startBalance,
        emi: p.amount,
        principalPortion: p.principalPortion || p.amount,
        interestPortion: p.interestPortion || 0,
        endBalance,
        paymentRef: p,
      });
    }
    
    schedule.push(...pastScheduleRows);

    // 2. Generate future projections starting from the next unpaid month
    let balance = effectiveOutstanding;
    const rate = (loan.interestRate / 12) / 100;
    const emi = loan.emiAmount;
    
    const computedNextDue = getNextLoanDuePayment(loan, loanPayments, new Date());
    let nextUnpaidDate: Date;
    if (computedNextDue) {
      nextUnpaidDate = new Date(computedNextDue.getFullYear(), computedNextDue.getMonth(), 1);
    } else if (pastPaymentsAsc.length > 0) {
      const latestPaymentDate = new Date(pastPaymentsAsc[pastPaymentsAsc.length - 1].date);
      nextUnpaidDate = new Date(latestPaymentDate.getFullYear(), latestPaymentDate.getMonth() + 1, 1);
    } else {
      const startDate = new Date(loan.startDate);
      nextUnpaidDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    }

    const baseYear = nextUnpaidDate.getFullYear();
    const baseMonth = nextUnpaidDate.getMonth();

    let i = 0;
    while (balance > 0.01 && i < 480) {
      const interestPortion = balance * rate;
      const principalPortion = Math.min(balance, emi - interestPortion);
      const startBalance = balance;
      balance = Math.max(0, balance - principalPortion);

      const mIdx = baseMonth + i;
      const year = baseYear + Math.floor(mIdx / 12);
      const monthName = MONTH_NAMES[((mIdx % 12) + 12) % 12];
      const monthLabel = `${monthName} ${year}`;

      schedule.push({
        id: `projected-${i}`,
        emiNumber: regularEmiCount + i + 1,
        isPrepayment: false,
        isPaid: false,
        isUpcoming: i === 0,
        monthLabel,
        startBalance,
        emi: interestPortion + principalPortion,
        principalPortion,
        interestPortion,
        endBalance: balance,
      });
      i++;
    }

    return schedule;
  }, [loan, loanPayments, effectiveOutstanding]);

  // Upcoming count
  const upcomingCount = useMemo(() => {
    return amortizationSchedule.filter((r) => !r.isPaid).length;
  }, [amortizationSchedule]);

  // Filtered schedule based on active tab
  const filteredSchedule = useMemo(() => {
    if (scheduleTab === 'upcoming') {
      return amortizationSchedule.filter((r) => !r.isPaid);
    }
    if (scheduleTab === 'paid') {
      return amortizationSchedule.filter((r) => r.isPaid);
    }
    return amortizationSchedule;
  }, [amortizationSchedule, scheduleTab]);

  const INITIAL_ROW_COUNT = 24;
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROW_COUNT);

  // Reset pagination when switching tabs
  useEffect(() => {
    setVisibleCount(INITIAL_ROW_COUNT);
  }, [scheduleTab]);

  // Progressive windowing: only render visible rows to keep mount time < 10ms
  const displayedSchedule = useMemo(() => {
    return filteredSchedule.slice(0, visibleCount);
  }, [filteredSchedule, visibleCount]);

  const config = loan ? (TYPE_CONFIG[loan.type] || TYPE_CONFIG.other) : TYPE_CONFIG.other;

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

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteLoan = () => {
    handleHaptic();
    if (!loan) return;
    
    Alert.alert(
      'Delete Loan',
      `Are you sure you want to delete "${loan.name}" and all its payments history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeLoan(loan.id);
            if (onBack) {
              onBack();
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleDeletePayment = (payment: EMIPayment) => {
    handleHaptic();
    Alert.alert(
      'Delete Payment Log',
      'Are you sure you want to delete this payment log? This will revert its impact on your account balance and loan status.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            let txId = payment.transactionId;
            if (!txId) {
              const pTime = new Date(payment.date).getTime();
              const matchedTx = moneyTransactions.find((t) => {
                const tTime = new Date(t.date).getTime();
                return Math.abs(pTime - tTime) < 5000 && t.amount === payment.amount;
              });
              if (matchedTx) {
                txId = matchedTx.id;
              }
            }

            if (txId) {
              removeMoneyTransaction(txId);
            } else {
              removeEMIPayment(payment.id);
            }
          },
        },
      ]
    );
  };

  const handleLogPayment = () => {
    handleHaptic();
    if (!loan) return;

    if (effectiveOutstanding <= 0) {
      Alert.alert('Loan Completed', 'This loan is already paid off!');
      return;
    }

    setPaymentAmount(formatIndianAmount(loan.emiAmount.toString()));
    setSelectedAccountId(loan.linkedAccountId || accounts[0]?.id || '');
    setSelectedCategory('EMI Payments');
    setShowLogPaymentModal(true);
    setShowAccountSelector(false);
    setShowCategorySelector(false);
  };

  const handleConfirmLogPayment = () => {
    handleHaptic();
    if (!loan) return;

    const A = parseIndianAmount(paymentAmount);
    if (isNaN(A) || A <= 0) {
      Alert.alert('Required Field', 'Please enter a valid payment amount.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Required Field', 'Please select a source account.');
      return;
    }

    const rate = (loan.interestRate / 12) / 100;
    const interestPortion = Math.min(effectiveOutstanding * rate, A);
    const principalPortion = Math.min(effectiveOutstanding, A - interestPortion);
    const finalAmount = interestPortion + principalPortion;

    const txId = Math.random().toString(36).substring(2, 9);
    const payment: EMIPayment = {
      id: Math.random().toString(36).substring(2, 9),
      loanId: loan.id,
      amount: finalAmount,
      principalPortion,
      interestPortion,
      date: new Date().toISOString(),
      status: 'paid',
      transactionId: txId,
    };
    addEMIPayment(payment);

    addMoneyTransaction({
      id: txId,
      type: 'expense',
      amount: finalAmount,
      category: selectedCategory,
      accountId: selectedAccountId,
      date: new Date().toISOString(),
      note: `EMI payment for ${loan.name}` + (finalAmount > loan.emiAmount ? ' (includes extra prepayment)' : ''),
      isRecurring: false,
    });

    setShowLogPaymentModal(false);
  };

  if (!loan) {
    return (
      <View style={[styles.container, { backgroundColor: currColors.background }]}>
        <View style={[styles.header, { paddingTop: headerTopPadding, paddingBottom: 12 }]}>
          <BackButton onPress={onBack} />
        </View>
        <View style={styles.centered}>
          <ThemedText style={{ color: currColors.textSecondary }}>Loan not found.</ThemedText>
        </View>
      </View>
    );
  }

  // Calculate overall paid progress
  const paidPercentage = loan.principalAmount > 0 ? (totalPrincipalPaid / loan.principalAmount) * 100 : 0;
  const linkedAccount = accounts.find((a) => a.id === loan.linkedAccountId);

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerTopPadding, paddingBottom: 12 }]}>
        <BackButton onPress={onBack} />
        
        <View style={{ flex: 1 }} />

        {/* Joined Edit & Delete Action Capsule */}
        <View
          style={[
            styles.actionCapsule,
            {
              backgroundColor: currColors.cardSecondary,
              borderColor: currColors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.capsuleBtn}
            onPress={() => {
              handleHaptic();
              router.push({ pathname: '/add-loan', params: { id: loan.id } });
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
          >
            <Edit2 size={16} color={currColors.text} strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={[styles.capsuleDivider, { backgroundColor: currColors.border }]} />

          <TouchableOpacity
            style={styles.capsuleBtn}
            onPress={handleDeleteLoan}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
          >
            <Trash2 size={16} color="#FF3B30" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. Folder Dossier Hero Card (Matching Folder Details UI) ─── */}
        <FolderDetailsCard
          palette={palette}
          headerTitle={loan.name}
          headerSubtitle={
            <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_500Medium', color: palette.sub }}>
              {formatAmount(loan.emiAmount)}/monthly
            </ThemedText>
          }
          tabRightContent={
            <CircularProgress3DIcon
              name={loan.icon || LOAN_3D_ICON_MAP[loan.type] || 'loan'}
              progress={paidPercentage / 100}
              color={palette.text}
              size={48}
              iconSize={28}
            />
          }
        >
          {/* Outstanding Balance */}
          <ThemedText style={[styles.heroValue, { color: palette.text, fontFamily: 'Outfit_700Bold', fontSize: 28, marginBottom: 10 }]}>
            {formatAmount(effectiveOutstanding)}
          </ThemedText>

          {/* Progress Bar */}
          <View style={[styles.progressBarBG, { backgroundColor: isDark ? 'rgba(0,0,0,0.18)' : palette.sub + '22' }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, Math.max(2, paidPercentage))}%`,
                  backgroundColor: palette.text,
                },
              ]}
            />
          </View>

          {/* Progress Micro Labels */}
          <View style={styles.progressMetaRow}>
            <ThemedText style={[styles.progressMetaText, { color: palette.sub }]}>
              {paidPercentage.toFixed(0)}% paid ({formatAmount(totalPrincipalPaid)})
            </ThemedText>
            <ThemedText style={[styles.progressMetaText, { color: palette.sub }]}>
              {monthsRemaining} of {loan.tenureMonths} mos left
            </ThemedText>
          </View>

          {/* Dashed Divider */}
          <View style={[styles.dashedDivider, { borderColor: palette.sub + '28' }]} />

          {/* Metrics Rows */}
          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Interest rate
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: palette.text }]}>
              {loan.interestRate}% p.a.
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Original loan
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: palette.text }]}>
              {formatAmount(loan.principalAmount)}
            </ThemedText>
          </View>

          <View style={[styles.heroRow, { marginBottom: 0 }]}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Next due
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: nextDueDateInfo?.isDueSoon ? '#FF9500' : palette.text }]}>
              {nextDueDateInfo ? `${nextDueDateInfo.dateFormatted} (${nextDueDateInfo.daysLeft > 0 ? `in ${nextDueDateInfo.daysLeft}d` : 'Today'})` : 'Paid off'}
            </ThemedText>
          </View>

          {/* Integrated Dossier Action Buttons */}
          {effectiveOutstanding > 0 && (
            <View style={[styles.cardActionsRow, { borderTopColor: palette.sub + '22' }]}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: palette.text }]}
                activeOpacity={0.85}
                onPress={handleLogPayment}
              >
                <Calendar size={15} color={palette.bg} />
                <ThemedText style={[styles.primaryActionBtnText, { color: palette.bg }]}>
                  Log EMI ({formatAmount(loan.emiAmount)})
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryActionBtn,
                  {
                    backgroundColor: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.7)',
                    borderColor: palette.sub + '35',
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => {
                  handleHaptic();
                  router.push(`/prepay-loan/${loan.id}`);
                }}
              >
                <Zap size={15} color={palette.text} />
                <ThemedText style={[styles.secondaryActionBtnText, { color: palette.text }]}>
                  Prepay
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </FolderDetailsCard>

        {/* ─── 3. Tabbed Amortization Schedule & History ─── */}
        <View style={styles.scheduleHeaderRow}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            PAYMENT SCHEDULE ({filteredSchedule.length})
          </ThemedText>
          {/* Segmented Filter Pills */}
          <View
            style={[
              styles.scheduleToggleBar,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.scheduleTogglePill,
                scheduleTab === 'upcoming' && [
                  styles.scheduleTogglePillActive,
                  { backgroundColor: currColors.card },
                ],
              ]}
              onPress={() => {
                handleHaptic();
                setScheduleTab('upcoming');
              }}
            >
              <ThemedText
                style={{
                  fontSize: 11,
                  color: scheduleTab === 'upcoming' ? currColors.text : currColors.textSecondary,
                  fontFamily: scheduleTab === 'upcoming' ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
                }}
              >
                Upcoming ({upcomingCount})
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.scheduleTogglePill,
                scheduleTab === 'paid' && [
                  styles.scheduleTogglePillActive,
                  { backgroundColor: currColors.card },
                ],
              ]}
              onPress={() => {
                handleHaptic();
                setScheduleTab('paid');
              }}
            >
              <ThemedText
                style={{
                  fontSize: 11,
                  color: scheduleTab === 'paid' ? currColors.text : currColors.textSecondary,
                  fontFamily: scheduleTab === 'paid' ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
                }}
              >
                Paid ({loanPayments.length})
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {filteredSchedule.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Info size={32} color={currColors.textSecondary} style={{ marginBottom: 6 }} />
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', fontSize: 13 }}>
              {scheduleTab === 'paid' ? 'No EMI payments logged yet.' : 'No schedule rows available.'}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.scheduleListContainer}>
            {displayedSchedule.map((row) => {
              const [rawMonth, rawYear] = (row.monthLabel || '').split(' ');
              const monthAbbr = (rawMonth || '').slice(0, 3).toUpperCase();
              const yearShort = rawYear ? `'${rawYear.slice(-2)}` : (row.emiNumber ? `#${row.emiNumber}` : '');

              return (
                <View
                  key={row.id || row.monthLabel}
                  style={[
                    styles.scheduleCard,
                    {
                      backgroundColor: currColors.card,
                      borderColor: row.isPrepayment
                        ? (isDark ? 'rgba(255, 149, 0, 0.4)' : '#FDBA74')
                        : row.isUpcoming
                        ? (isDark ? 'rgba(255, 255, 255, 0.12)' : currColors.border)
                        : currColors.border,
                    },
                  ]}
                >
                  {/* Left: Date / Status Tile */}
                  <View
                    style={[
                      styles.dateTile,
                      {
                        backgroundColor: row.isPrepayment
                          ? (isDark ? 'rgba(255, 149, 0, 0.16)' : '#FEF3C7')
                          : row.isPaid
                          ? (isDark ? 'rgba(52, 199, 89, 0.16)' : 'rgba(52, 199, 89, 0.12)')
                          : row.isUpcoming
                          ? (isDark ? currColors.cardSecondary : palette.bg)
                          : currColors.cardSecondary,
                        borderWidth: row.isUpcoming && isDark ? 1 : 0,
                        borderColor: row.isUpcoming && isDark ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                      },
                    ]}
                  >
                    {row.isPrepayment ? (
                      <Zap size={18} color="#FF9500" />
                    ) : row.isPaid ? (
                      <Check size={18} color="#34C759" strokeWidth={2.5} />
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <ThemedText
                          style={[
                            styles.dateTileMonth,
                            { color: row.isUpcoming ? (isDark ? palette.bg : palette.text) : currColors.textSecondary },
                          ]}
                        >
                          {monthAbbr}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.dateTileYear,
                            { color: row.isUpcoming ? (isDark ? '#FFFFFF' : palette.text) : currColors.textSecondary },
                          ]}
                        >
                          {yearShort}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  {/* Center Details */}
                  <View style={styles.cardDetailsCol}>
                    <View style={styles.titleWithBadgeRow}>
                      <ThemedText style={[styles.cardMonthTitle, { color: currColors.text }]}>
                        {row.monthLabel}
                      </ThemedText>
                      {row.isPrepayment ? (
                        <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 149, 0, 0.16)' }]}>
                          <ThemedText style={[styles.statusBadgeText, { color: '#FF9500' }]}>PREPAY</ThemedText>
                        </View>
                      ) : row.isUpcoming ? (
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : palette.bg },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.statusBadgeText,
                              { color: isDark ? palette.bg : palette.text },
                            ]}
                          >
                            NEXT EMI
                          </ThemedText>
                        </View>
                      ) : row.isPaid ? (
                        <View style={[styles.statusBadge, { backgroundColor: 'rgba(52, 199, 89, 0.14)' }]}>
                          <ThemedText style={[styles.statusBadgeText, { color: '#34C759' }]}>PAID</ThemedText>
                        </View>
                      ) : null}
                    </View>
                    <ThemedText style={[styles.cardBreakdownText, { color: currColors.textSecondary }]}>
                      {row.isPrepayment
                        ? `Principal Prepayment: ${formatAmount(row.principalPortion)}`
                        : `P: ${formatAmount(row.principalPortion)} • I: ${formatAmount(row.interestPortion)}`}
                    </ThemedText>
                  </View>

                  {/* Right Amount & Balance */}
                  <View style={styles.cardAmountCol}>
                    <ThemedText
                      style={[
                        styles.cardAmountText,
                        { color: row.isPaid ? '#34C759' : currColors.text },
                      ]}
                    >
                      {formatAmount(row.emi)}
                    </ThemedText>
                    <ThemedText style={[styles.cardBalanceText, { color: currColors.textSecondary }]}>
                      Bal: {formatAmount(row.endBalance)}
                    </ThemedText>
                  </View>

                  {row.isPaid && row.paymentRef && (
                    <TouchableOpacity
                      onPress={() => handleDeletePayment(row.paymentRef!)}
                      style={styles.deletePaymentBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={13} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Progressive Loading Controls */}
            {filteredSchedule.length > visibleCount && (
              <View style={styles.loadMoreRow}>
                <TouchableOpacity
                  style={[
                    styles.loadMoreBtn,
                    {
                      backgroundColor: currColors.card,
                      borderColor: currColors.border,
                    },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setVisibleCount((prev) => prev + 36);
                  }}
                  activeOpacity={0.75}
                >
                  <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_500Medium', color: currColors.text }}>
                    Show more ({Math.min(36, filteredSchedule.length - visibleCount)})
                  </ThemedText>
                  <ChevronDown size={14} color={currColors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.loadMoreBtn,
                    {
                      backgroundColor: isDark ? palette.bg + '18' : palette.bg,
                      borderColor: isDark ? palette.sub + '40' : palette.sub + '35',
                    },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setVisibleCount(filteredSchedule.length);
                  }}
                  activeOpacity={0.75}
                >
                  <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: isDark ? palette.bg : palette.text }}>
                    Show all ({filteredSchedule.length})
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── Log EMI Payment Modal ─── */}
      <Modal visible={showLogPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', justifyContent: 'flex-end' }}
          >
            <View style={[styles.modalContent, { backgroundColor: currColors.card }]}>
              {showCategorySelector ? (
                <View style={{ width: '100%', minHeight: 300, maxHeight: 450 }}>
                  <View style={[styles.modalHeader, { borderBottomColor: currColors.border, marginBottom: 12 }]}>
                    <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                      Select Category
                    </ThemedText>
                    <TouchableOpacity onPress={() => setShowCategorySelector(false)}>
                      <X size={22} color={currColors.text} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={categories.expense}
                    keyExtractor={(item) => item}
                    bounces={false}
                    style={{ maxHeight: 350 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.modalItem, { borderBottomColor: currColors.border }]}
                        onPress={() => {
                          handleHaptic();
                          setSelectedCategory(item);
                          setShowCategorySelector(false);
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Category3DIcon name={item} size={28} style={{ marginRight: 10 }} />
                          <ThemedText style={{ color: currColors.text, fontSize: 15, fontFamily: 'Outfit_400Regular' }}>{item}</ThemedText>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              ) : (
                <>
                  <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
                    <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                      Log Loan Payment
                    </ThemedText>
                    <TouchableOpacity onPress={() => setShowLogPaymentModal(false)}>
                      <X size={22} color={currColors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalInputGroup}>
                    <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>PAYMENT AMOUNT</ThemedText>
                    <TextInput
                      style={[styles.modalAmountInput, { color: currColors.text, borderBottomColor: currColors.border }]}
                      placeholder="e.g. 25,000"
                      placeholderTextColor={currColors.textSecondary}
                      keyboardType="numeric"
                      value={paymentAmount}
                      onChangeText={(val) => setPaymentAmount(formatIndianAmount(val))}
                    />
                  </View>

                  <View style={styles.modalInputGroup}>
                    <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>PAY FROM ACCOUNT</ThemedText>
                    <AccountSelectCard
                      selectedAccount={accounts.find(a => a.id === selectedAccountId)}
                      onPress={() => {
                        handleHaptic();
                        setShowAccountSelector(true);
                      }}
                      label="Select Account"
                      style={{ backgroundColor: currColors.cardSecondary, borderColor: currColors.border }}
                    />
                  </View>

                  <View style={styles.modalInputGroup}>
                    <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>EXPENSE CATEGORY</ThemedText>
                    <TouchableOpacity
                      style={[styles.modalSelectBox, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}
                      onPress={() => {
                        handleHaptic();
                        setShowCategorySelector(true);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {selectedCategory ? (
                          <Category3DIcon name={selectedCategory} size={20} style={{ marginRight: 8 }} />
                        ) : null}
                        <ThemedText style={{ color: selectedCategory ? currColors.text : currColors.textSecondary, fontSize: 15, fontFamily: 'Outfit_400Regular' }}>
                          {selectedCategory || 'Select Category'}
                        </ThemedText>
                      </View>
                      <ChevronDown size={18} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Dynamic split details info card */}
                  {(() => {
                    const parsedAmt = parseIndianAmount(paymentAmount) || 0;
                    const r_rate = (loan.interestRate / 12) / 100;
                    const standardInterest = effectiveOutstanding * r_rate;
                    
                    const dispInterest = Math.min(standardInterest, parsedAmt);
                    const dispPrincipal = Math.min(effectiveOutstanding, parsedAmt - dispInterest);
                    const extraPrepayment = Math.max(0, parsedAmt - loan.emiAmount);

                    return (
                      <View style={[styles.splitInfoCard, { backgroundColor: currColors.cardSecondary }]}>
                        <View style={styles.splitRow}>
                          <ThemedText style={{ fontSize: 12, color: currColors.textSecondary, fontFamily: 'Outfit_400Regular' }}>Interest Portion:</ThemedText>
                          <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#FF3B30' }}>
                            {formatAmount(dispInterest)}
                          </ThemedText>
                        </View>
                        <View style={styles.splitRow}>
                          <ThemedText style={{ fontSize: 12, color: currColors.textSecondary, fontFamily: 'Outfit_400Regular' }}>Principal Portion:</ThemedText>
                          <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#34C759' }}>
                            {formatAmount(dispPrincipal)}
                          </ThemedText>
                        </View>
                        {extraPrepayment > 0 ? (
                          <View style={[styles.splitRow, { borderTopWidth: 1, borderTopColor: currColors.border, paddingTop: 8, marginTop: 4, borderStyle: 'dashed' }]}>
                            <ThemedText style={{ fontSize: 12, color: '#00C9A7', fontFamily: 'Outfit_500Medium' }}>Extra Principal Adjustment:</ThemedText>
                            <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_500Medium', color: '#00C9A7' }}>
                              +{formatAmount(extraPrepayment)}
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                    );
                  })()}

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, { backgroundColor: config.color }]}
                    onPress={handleConfirmLogPayment}
                  >
                    <ThemedText style={styles.modalSubmitBtnText}>Confirm Payment</ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>

          {/* Unified Account Picker Modal (Nested inside parent modal for iOS presentation) */}
          <AccountPickerModal
            visible={showAccountSelector}
            onClose={() => setShowAccountSelector(false)}
            onSelectAccount={(acc) => {
              setSelectedAccountId(acc.id);
            }}
            onAddNewAccount={() => {
              setShowAccountSelector(false);
              setShowLogPaymentModal(false);
              router.push('/add-account');
            }}
            selectedAccountId={selectedAccountId}
            title="Choose Account"
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCapsule: {
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  capsuleBtn: {
    width: 36,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsuleDivider: {
    width: 1,
    height: 16,
    opacity: 0.8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  outstandingCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginTop: 4,
    marginBottom: 14,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  indicatorPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  indicatorText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
    marginBottom: 12,
  },
  progressBarBG: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressMetaText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 1,
    marginVertical: 14,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroRowLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  heroRowValue: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },

  // Lender badge in header
  lenderBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lenderBadgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
  },

  // Dossier Integrated Action Buttons
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  primaryActionBtn: {
    flex: 1.6,
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  secondaryActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Schedule & Tabs
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scheduleToggleBar: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
  },
  scheduleTogglePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  scheduleTogglePillActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  scheduleListContainer: {
    paddingBottom: 24,
  },
  scheduleCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dateTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateTileMonth: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  dateTileYear: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  cardDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  cardMonthTitle: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  cardBreakdownText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  cardAmountCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  cardAmountText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  cardBalanceText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  deletePaymentBtn: {
    padding: 6,
    marginLeft: 6,
  },
  loadMoreRow: {
    marginHorizontal: 16,
    marginTop: 6,
    flexDirection: 'row',
    gap: 10,
  },
  loadMoreBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
    marginBottom: 20,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  modalAmountInput: {
    fontSize: 22,
    fontFamily: 'Outfit_400Regular',
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  modalSelectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  splitInfoCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalSubmitBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
});

export default function LoanDetailsScreen() {
  const router = useRouter();
  return <LoanDetailsContent onBack={() => router.back()} />;
}
