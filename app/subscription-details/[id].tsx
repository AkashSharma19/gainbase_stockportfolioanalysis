import React, { useMemo, useState } from 'react';
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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
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
  RotateCcw,
  Ban,
  Wallet,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackButton } from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Subscription, SubscriptionPayment } from '@/types/money';
import { Category3DIcon } from '@/components/Category3DIcon';
import { AccountPickerModal } from '@/components/AccountPickerModal';
import { AccountSelectCard } from '@/components/AccountSelectCard';
import { FolderDetailsCard, CircularProgress3DIcon } from '@/components/FolderDetailsCard';
import { getCardPaletteFromItem } from '@/constants/folderTheme';
import { advanceDateByCycle } from '@/lib/finance';
import { formatIndianAmount, parseIndianAmount } from '@/utils/formatters';

type ScheduleTab = 'upcoming' | 'paid';

export interface SubscriptionDetailsProps {
  subscriptionId?: string;
  onBack?: () => void;
}

export function SubscriptionDetailsContent({ subscriptionId, onBack }: SubscriptionDetailsProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = subscriptionId || params.id;
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 32);
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  const {
    subscriptions,
    accounts,
    subscriptionPayments,
    removeSubscription,
    addSubscriptionPayment,
    addMoneyTransaction,
    updateSubscription,
    removeMoneyTransaction,
    moneyTransactions,
    removeSubscriptionPayment,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const subscription = useMemo(() => {
    return subscriptions.find((s) => s.id === id);
  }, [id, subscriptions]);

  const palette = useMemo(() => {
    if (!subscription) return { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' };
    return getCardPaletteFromItem({
      type: 'subscription',
      name: subscription.name,
      category: subscription.category,
      icon: subscription.logo,
      color: subscription.color,
    });
  }, [subscription]);

  const payments = useMemo(() => {
    return subscriptionPayments
      .filter((p) => p.subscriptionId === id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [id, subscriptionPayments]);

  const [scheduleTab, setScheduleTab] = useState<ScheduleTab>('upcoming');
  const [showLogPaymentModal, setShowLogPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Next renewal info
  const nextDueDateInfo = useMemo(() => {
    if (!subscription || !subscription.isActive) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDue = new Date(subscription.nextPaymentDate);
    nextDue.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      date: nextDue,
      dateFormatted: nextDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      fullFormatted: nextDue.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      daysLeft: diffDays,
      isDueSoon: diffDays >= 0 && diffDays <= 3,
    };
  }, [subscription]);

interface ScheduleRow {
  id: string;
  cycleNumber: number;
  isPaid: boolean;
  isUpcoming: boolean;
  dateFormatted: string;
  amount: number;
  paymentRef?: SubscriptionPayment;
}

  // Renewal & payment schedule calculation (Paid + Projected upcoming)
  const schedule = useMemo((): ScheduleRow[] => {
    if (!subscription) return [];

    const pastAsc = [...payments].reverse(); // oldest first
    const pastRows: ScheduleRow[] = pastAsc.map((p, idx) => ({
      id: p.id,
      cycleNumber: idx + 1,
      isPaid: true,
      isUpcoming: false,
      dateFormatted: new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      amount: p.amount,
      paymentRef: p,
    }));

    // Generate upcoming projections if active
    const projectedRows: ScheduleRow[] = [];
    if (subscription.isActive) {
      let currDate = subscription.nextPaymentDate;
      const count =
        subscription.billingCycle === 'weekly'
          ? 8
          : subscription.billingCycle === 'monthly'
          ? 12
          : subscription.billingCycle === 'quarterly'
          ? 4
          : 3;

      for (let i = 0; i < count; i++) {
        projectedRows.push({
          id: `projected-${i}`,
          cycleNumber: pastAsc.length + i + 1,
          isPaid: false,
          isUpcoming: i === 0,
          dateFormatted: new Date(currDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          amount: subscription.amount,
        });
        currDate = advanceDateByCycle(currDate, subscription.billingCycle);
      }
    }

    return [...pastRows.reverse(), ...projectedRows];
  }, [subscription, payments]);

  // Upcoming count
  const upcomingCount = useMemo(() => {
    return schedule.filter((r) => !r.isPaid).length;
  }, [schedule]);

  // Filtered schedule based on active tab
  const filteredSchedule = useMemo(() => {
    if (scheduleTab === 'upcoming') return schedule.filter((r) => !r.isPaid);
    if (scheduleTab === 'paid') return schedule.filter((r) => r.isPaid);
    return schedule;
  }, [schedule, scheduleTab]);

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

  const handleDeleteSubscription = () => {
    handleHaptic();
    if (!subscription) return;
    Alert.alert(
      'Delete Subscription',
      `Are you sure you want to delete "${subscription.name}" and all its payment history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeSubscription(subscription.id);
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

  const handleDeletePayment = (payment: SubscriptionPayment) => {
    handleHaptic();
    Alert.alert(
      'Delete Payment Log',
      'Are you sure you want to delete this payment log? This will revert its impact on your account balance and subscription billing cycle.',
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
              removeSubscriptionPayment(payment.id);
            }
          },
        },
      ]
    );
  };

  const handleLogPayment = () => {
    handleHaptic();
    if (!subscription) return;

    if (!subscription.isActive) {
      Alert.alert('Subscription Cancelled', 'This subscription has already been cancelled.');
      return;
    }

    setPaymentAmount(formatIndianAmount(subscription.amount.toString()));
    setSelectedAccountId(subscription.linkedAccountId || accounts[0]?.id || '');
    setShowLogPaymentModal(true);
    setShowAccountSelector(false);
  };

  const handleConfirmLogPayment = () => {
    handleHaptic();
    if (!subscription) return;

    const A = parseIndianAmount(paymentAmount);
    if (isNaN(A) || A <= 0) {
      Alert.alert('Required Field', 'Please enter a valid payment amount.');
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('Required Field', 'Please select a source account.');
      return;
    }

    const txId = Math.random().toString(36).substring(2, 9);
    const payment: SubscriptionPayment = {
      id: Math.random().toString(36).substring(2, 9),
      subscriptionId: subscription.id,
      amount: A,
      date: new Date().toISOString(),
      status: 'paid',
      transactionId: txId,
    };
    addSubscriptionPayment(payment);

    addMoneyTransaction({
      id: txId,
      type: 'expense',
      amount: A,
      category: subscription.category,
      accountId: selectedAccountId,
      date: new Date().toISOString(),
      note: `Subscription payment for ${subscription.name}`,
      isRecurring: false,
    });

    setShowLogPaymentModal(false);
  };

  const handleCancelSubscription = () => {
    handleHaptic();
    if (!subscription) return;
    Alert.alert(
      'Cancel Subscription',
      `Mark "${subscription.name}" as cancelled? Future payments will stop.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateSubscription(subscription.id, { isActive: false });
          },
        },
      ]
    );
  };

  const handleReactivateSubscription = () => {
    handleHaptic();
    if (!subscription) return;
    Alert.alert(
      'Reactivate Subscription',
      `Mark "${subscription.name}" as active again?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const nextDateIso = advanceDateByCycle(new Date().toISOString(), subscription.billingCycle);
            updateSubscription(subscription.id, { isActive: true, nextPaymentDate: nextDateIso });
          },
        },
      ]
    );
  };

  if (!subscription) {
    return (
      <View style={[styles.container, { backgroundColor: currColors.background }]}>
        <View style={[styles.header, { paddingTop: headerTopPadding, paddingBottom: 12 }]}>
          <BackButton onPress={onBack} />
        </View>
        <View style={styles.centered}>
          <ThemedText style={{ color: currColors.textSecondary }}>Subscription not found.</ThemedText>
        </View>
      </View>
    );
  }

  const linkedAccount = accounts.find((a) => a.id === subscription.linkedAccountId);
  const themeColor = subscription.color || '#00C9A7';
  const yearlyCost =
    subscription.amount *
    (subscription.billingCycle === 'weekly'
      ? 52
      : subscription.billingCycle === 'monthly'
      ? 12
      : subscription.billingCycle === 'quarterly'
      ? 4
      : 1);

  const cycleSuffix =
    subscription.billingCycle === 'weekly'
      ? '/wk'
      : subscription.billingCycle === 'monthly'
      ? '/mo'
      : subscription.billingCycle === 'quarterly'
      ? '/qtr'
      : '/yr';

  const cycleLabel = subscription.billingCycle
    ? subscription.billingCycle.charAt(0).toUpperCase() + subscription.billingCycle.slice(1)
    : 'Monthly';

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

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
              router.push({ pathname: '/add-subscription', params: { id: subscription.id } });
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
          >
            <Edit2 size={16} color={currColors.text} strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={[styles.capsuleDivider, { backgroundColor: currColors.border }]} />

          <TouchableOpacity
            style={styles.capsuleBtn}
            onPress={handleDeleteSubscription}
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
        bounces={false}
        overScrollMode="never"
      >
        {/* ─── 1. Folder Dossier Hero Card (Matching Folder Details UI) ─── */}
        <FolderDetailsCard
          palette={palette}
          headerTitle={subscription.name}
          headerSubtitle={
            <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_500Medium', color: palette.sub }}>
              {formatAmount(subscription.amount)}{cycleSuffix}
            </ThemedText>
          }
          tabRightContent={
            <CircularProgress3DIcon
              name={subscription.category || subscription.name}
              icon={subscription.logo}
              progress={subscription.isActive ? 1 : 0}
              color={palette.text}
              size={48}
              iconSize={28}
            />
          }
        >
          {/* Top Row with Amount and Status */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <ThemedText style={[styles.heroValue, { color: palette.text, fontFamily: 'Outfit_700Bold', fontSize: 28 }]}>
                {formatAmount(subscription.amount)}
              </ThemedText>
              <ThemedText style={[styles.heroValueSuffix, { color: palette.sub }]}>
                {cycleSuffix}
              </ThemedText>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: subscription.isActive
                    ? isDark ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.15)'
                    : isDark ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 59, 48, 0.15)',
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.statusPillText,
                  { color: subscription.isActive ? '#15803D' : '#B91C1C' },
                ]}
              >
                {subscription.isActive ? 'ACTIVE' : 'CANCELLED'}
              </ThemedText>
            </View>
          </View>

          {/* Dashed Divider */}
          <View style={[styles.dashedDivider, { borderColor: palette.sub + '28' }]} />

          {/* Clean Stat Rows */}
          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Billing cycle
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: palette.text, fontFamily: 'Outfit_600SemiBold' }]}>
              {cycleLabel}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Next renewal
            </ThemedText>
            <ThemedText
              style={[
                styles.heroRowValue,
                { color: nextDueDateInfo?.isDueSoon ? '#FF9500' : palette.text },
              ]}
            >
              {nextDueDateInfo
                ? `${nextDueDateInfo.dateFormatted} (${nextDueDateInfo.daysLeft > 0 ? `in ${nextDueDateInfo.daysLeft}d` : 'Today'})`
                : 'Cancelled'}
            </ThemedText>
          </View>

          <View style={[styles.heroRow, { marginBottom: 0 }]}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Yearly cost
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: palette.text }]}>
              {formatAmount(yearlyCost)}/yr
            </ThemedText>
          </View>

          {/* Integrated Dossier Action Buttons */}
          <View style={[styles.cardActionsRow, { borderTopColor: palette.sub + '22' }]}>
            {subscription.isActive ? (
              <>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: palette.text }]}
                  activeOpacity={0.85}
                  onPress={handleLogPayment}
                >
                  <Calendar size={15} color={palette.bg} />
                  <ThemedText style={[styles.primaryActionBtnText, { color: palette.bg }]}>
                    Log Payment ({formatAmount(subscription.amount)})
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
                  onPress={handleCancelSubscription}
                >
                  <Ban size={15} color="#FF3B30" />
                  <ThemedText style={[styles.secondaryActionBtnText, { color: '#FF3B30' }]}>
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: palette.text, flex: 1 }]}
                activeOpacity={0.85}
                onPress={handleReactivateSubscription}
              >
                <RotateCcw size={15} color={palette.bg} />
                <ThemedText style={[styles.primaryActionBtnText, { color: palette.bg }]}>
                  Reactivate Subscription
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </FolderDetailsCard>

        {/* ─── 3. Tabbed Renewal & Payment Schedule ─── */}
        <View style={styles.scheduleHeaderRow}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            RENEWAL SCHEDULE ({filteredSchedule.length})
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
                Paid ({payments.length})
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {filteredSchedule.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Info size={32} color={currColors.textSecondary} style={{ marginBottom: 6 }} />
            <ThemedText
              style={{
                color: currColors.textSecondary,
                textAlign: 'center',
                fontFamily: 'Outfit_400Regular',
                fontSize: 13,
              }}
            >
              {scheduleTab === 'paid'
                ? 'No payments logged yet.'
                : 'No upcoming renewal cycles available.'}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.scheduleListContainer}>
            {filteredSchedule.map((row, index) => {
              const [dayStr, monthStr, yearStr] = (row.dateFormatted || '').split(' ');
              const monthAbbr = (monthStr || '').slice(0, 3).toUpperCase();

              return (
                <View
                  key={row.id || index}
                  style={[
                    styles.scheduleCard,
                    {
                      backgroundColor: currColors.card,
                      borderColor: row.isUpcoming
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
                        backgroundColor: row.isPaid
                          ? (isDark ? 'rgba(52, 199, 89, 0.16)' : 'rgba(52, 199, 89, 0.12)')
                          : row.isUpcoming
                          ? (isDark ? currColors.cardSecondary : palette.bg)
                          : currColors.cardSecondary,
                        borderWidth: row.isUpcoming && isDark ? 1 : 0,
                        borderColor: row.isUpcoming && isDark ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                      },
                    ]}
                  >
                    {row.isPaid ? (
                      <Check size={18} color="#34C759" strokeWidth={2.5} />
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <ThemedText
                          style={[
                            styles.dateTileMonth,
                            { color: row.isUpcoming ? (isDark ? palette.bg : palette.text) : currColors.textSecondary },
                          ]}
                        >
                          {monthAbbr || `CYCLE`}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.dateTileYear,
                            { color: row.isUpcoming ? (isDark ? '#FFFFFF' : palette.text) : currColors.textSecondary },
                          ]}
                        >
                          {dayStr || `#${row.cycleNumber}`}
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  {/* Center Details */}
                  <View style={styles.cardDetailsCol}>
                    <View style={styles.titleWithBadgeRow}>
                      <ThemedText style={[styles.cardMonthTitle, { color: currColors.text }]}>
                        {row.dateFormatted}
                      </ThemedText>
                      {row.isUpcoming ? (
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
                            NEXT RENEWAL
                          </ThemedText>
                        </View>
                      ) : row.isPaid ? (
                        <View style={[styles.statusBadge, { backgroundColor: 'rgba(52, 199, 89, 0.14)' }]}>
                          <ThemedText style={[styles.statusBadgeText, { color: '#34C759' }]}>PAID</ThemedText>
                        </View>
                      ) : null}
                    </View>
                    <ThemedText style={[styles.cardBreakdownText, { color: currColors.textSecondary }]}>
                      {row.isPaid
                        ? 'Payment Confirmed'
                        : subscription.billingCycle
                        ? `${subscription.billingCycle.charAt(0).toUpperCase() + subscription.billingCycle.slice(1)} Renewal`
                        : 'Upcoming Renewal'}
                    </ThemedText>
                  </View>

                  {/* Right Amount & Status */}
                  <View style={styles.cardAmountCol}>
                    <ThemedText
                      style={[
                        styles.cardAmountText,
                        { color: row.isPaid ? '#34C759' : currColors.text },
                      ]}
                    >
                      {formatAmount(row.amount)}
                    </ThemedText>
                    <ThemedText style={[styles.cardBalanceText, { color: currColors.textSecondary }]}>
                      {row.isPaid ? 'Completed' : 'Upcoming'}
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
          </View>
        )}
      </ScrollView>

      {/* ─── Log Payment Modal ─── */}
      <Modal visible={showLogPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', justifyContent: 'flex-end' }}
          >
            <View style={[styles.modalContent, { backgroundColor: currColors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                  Log Subscription Payment
                </ThemedText>
                <TouchableOpacity onPress={() => setShowLogPaymentModal(false)}>
                  <X size={22} color={currColors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalInputGroup}>
                <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>
                  PAYMENT AMOUNT
                </ThemedText>
                <TextInput
                  style={[
                    styles.modalAmountInput,
                    { color: currColors.text, borderBottomColor: currColors.border },
                  ]}
                  placeholder="0"
                  placeholderTextColor={currColors.textSecondary}
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={(val) => setPaymentAmount(formatIndianAmount(val))}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <ThemedText style={[styles.modalLabel, { color: currColors.textSecondary }]}>
                  PAY FROM ACCOUNT
                </ThemedText>
                <AccountSelectCard
                  selectedAccount={accounts.find((a) => a.id === selectedAccountId)}
                  onPress={() => {
                    handleHaptic();
                    setShowAccountSelector(true);
                  }}
                  label="Select Account"
                  style={{ backgroundColor: currColors.cardSecondary, borderColor: currColors.border }}
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: themeColor }]}
                activeOpacity={0.8}
                onPress={handleConfirmLogPayment}
              >
                <ThemedText style={styles.modalSubmitBtnText}>Confirm Payment</ThemedText>
              </TouchableOpacity>
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
  heroCard: {
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
  },
  heroValueSuffix: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    marginLeft: 4,
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
  // Category badge & status pills
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
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
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
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
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
});

export default function SubscriptionDetailsScreen() {
  const router = useRouter();
  return <SubscriptionDetailsContent onBack={() => router.back()} />;
}

