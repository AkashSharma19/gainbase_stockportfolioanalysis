import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CreditCard,
  Landmark,
  PiggyBank,
  ArrowRightLeft,
  Wallet,
  Activity,
  Calendar,
  Info,
  Layers,
  Eye,
  EyeOff,
  PieChart,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Repeat,
  Tv,
  Music,
  Youtube,
  ShoppingBag,
  Cloud,
  Gamepad2,
  Sparkles,
} from 'lucide-react-native';

import { ThemedText } from './ThemedText';
import { CategoryIcon } from './CategoryIcon';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { MoneyTransaction } from '../types/money';
import { MoneyActivityCalendar } from './MoneyActivityCalendar';
import { FinancialInsights } from './FinancialInsights';

const getSubscriptionIcon = (logoName: string | undefined) => {
  switch (logoName) {
    case 'tv':
      return Tv;
    case 'music':
      return Music;
    case 'youtube':
      return Youtube;
    case 'shopping-bag':
      return ShoppingBag;
    case 'sparkles':
      return Sparkles;
    case 'cloud':
      return Cloud;
    case 'gamepad-2':
      return Gamepad2;
    case 'layers':
      return Layers;
    default:
      return Repeat;
  }
};

export function MoneyDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  // Stores
  const {
    accounts,
    moneyTransactions,
    loans,
    subscriptions,
    emiPayments,
    getNetWorth,
    getMonthlyEMIBurden,
    getMonthlySubscriptionBurden,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const togglePrivacyMode = usePortfolioStore((state) => state.togglePrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  // Filter state for transactions list
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

  // Computations
  const netWorth = getNetWorth();
  const monthlyEMIs = getMonthlyEMIBurden();
  const monthlySubscriptions = getMonthlySubscriptionBurden();

  // Upcoming Payments calculation (within next 14 days, and past 30 days overdue)
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    const fourteenDaysLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    fourteenDaysLater.setHours(23, 59, 59, 999);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const list: Array<{
      id: string;
      targetId: string;
      name: string;
      amount: number;
      date: Date;
      type: 'emi' | 'subscription';
      color: string;
      logo?: string;
    }> = [];

    // 1. Process active loans for EMIs
    loans.forEach((loan) => {
      if (loan.isActive && loan.emiAmount > 0) {
        const start = new Date(loan.startDate);
        const day = start.getDate();

        // Check if an EMI payment has already been logged in the current calendar month
        const hasPaidThisMonth = emiPayments.some(
          (p) =>
            p.loanId === loan.id &&
            new Date(p.date).getMonth() === today.getMonth() &&
            new Date(p.date).getFullYear() === today.getFullYear()
        );

        let nextDue = new Date(today.getFullYear(), today.getMonth(), day);
        if (nextDue.getMonth() !== today.getMonth()) {
          nextDue = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        // If paid this month, the next installment is next month
        if (hasPaidThisMonth) {
          nextDue = new Date(today.getFullYear(), today.getMonth() + 1, day);
          if (nextDue.getMonth() !== (today.getMonth() + 1) % 12) {
            nextDue = new Date(today.getFullYear(), today.getMonth() + 2, 0);
          }
        }

        // Ensure next due date is not before the loan starts
        if (nextDue < start) {
          nextDue = new Date(start);
        }

        const endLimit = new Date(loan.endDate);
        if (nextDue <= endLimit && nextDue >= thirtyDaysAgo && nextDue <= fourteenDaysLater) {
          list.push({
            id: `emi-${loan.id}`,
            targetId: loan.id,
            name: `${loan.name} EMI`,
            amount: loan.emiAmount,
            date: nextDue,
            type: 'emi',
            color: loan.type === 'home' ? '#FF9500' : loan.type === 'car' ? '#007AFF' : '#AF52DE',
          });
        }
      }
    });

    // 2. Process active subscriptions
    subscriptions.forEach((sub) => {
      if (sub.isActive && sub.amount > 0 && sub.nextPaymentDate) {
        const nextDue = new Date(sub.nextPaymentDate);
        if (nextDue >= thirtyDaysAgo && nextDue <= fourteenDaysLater) {
          list.push({
            id: `sub-${sub.id}`,
            targetId: sub.id,
            name: sub.name,
            amount: sub.amount,
            date: nextDue,
            type: 'subscription',
            color: sub.color || '#00C9A7',
            logo: sub.logo,
          });
        }
      }
    });

    // Sort chronologically
    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [loans, subscriptions, emiPayments]);

  // Monthly income/expense computations
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    let income = 0;
    let expense = 0;

    moneyTransactions.forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      if (txTime >= startOfMonth && txTime <= endOfMonth) {
        if (tx.type === 'income') income += tx.amount;
        else if (tx.type === 'expense') expense += tx.amount;
      }
    });

    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

    return { income, expense, savingsRate };
  }, [moneyTransactions]);

  // Filter and limit recent transactions to show only the last transaction date's data, capped at 3
  const filteredRecentTxs = useMemo(() => {
    let list = moneyTransactions;
    if (activeFilter !== 'all') {
      list = list.filter((tx) => tx.type === activeFilter);
    }

    if (list.length === 0) return [];

    const lastTxDateStr = new Date(list[0].date).toDateString();
    const sameDayTxs = list.filter((tx) => new Date(tx.date).toDateString() === lastTxDateStr);

    return sameDayTxs.slice(0, 3);
  }, [moneyTransactions, activeFilter]);

  // Chronologically group the filtered recent transactions
  const groupedTxs = useMemo(() => {
    const groups: { title: string; data: MoneyTransaction[] }[] = [];
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    filteredRecentTxs.forEach((tx) => {
      const dateObj = new Date(tx.date);
      const txDateStr = dateObj.toDateString();
      let title = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      if (txDateStr === today) {
        title = 'Today';
      } else if (txDateStr === yesterdayStr) {
        title = 'Yesterday';
      }

      const existing = groups.find((g) => g.title === title);
      if (existing) {
        existing.data.push(tx);
      } else {
        groups.push({ title, data: [tx] });
      }
    });
    return groups;
  }, [filteredRecentTxs]);

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

  const activeFilterBg = '#00C9A7';

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ─── Hero Card (flat, matching investments) ─── */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: currColors.card,
              borderColor: currColors.border,
            },
          ]}
        >
          <View style={styles.heroHeaderRow}>
            <ThemedText
              style={[
                styles.heroLabel,
                { color: currColors.textSecondary },
              ]}
            >
              TOTAL NET WORTH
            </ThemedText>
            <View style={styles.heroIcons}>
              <TouchableOpacity
                onPress={() => {
                  handleHaptic();
                  togglePrivacyMode();
                }}
                style={[
                  styles.iconButton,
                  { backgroundColor: currColors.cardSecondary },
                ]}
              >
                {isPrivacyMode ? (
                  <EyeOff size={16} color={currColors.text} />
                ) : (
                  <Eye size={16} color={currColors.text} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  handleHaptic();
                  router.push('/money-analytics');
                }}
                style={[
                  styles.iconButton,
                  { backgroundColor: currColors.cardSecondary },
                ]}
              >
                <PieChart size={16} color={currColors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ThemedText style={[styles.heroValue, { color: currColors.text }]}>
            {formatAmount(netWorth)}
          </ThemedText>

          <View
            style={[
              styles.dashedDivider,
              { borderColor: currColors.border },
            ]}
          />

          {/* Stat rows — matching investments heroRow pattern */}
          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              This month income
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#34C759' }]}>
              {isPrivacyMode ? '••••••' : `+${formatAmount(monthlyStats.income)}`}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              This month expenses
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#FF3B30' }]}>
              {isPrivacyMode ? '••••••' : `-${formatAmount(monthlyStats.expense)}`}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Monthly EMIs
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: currColors.text }]}>
              {formatAmount(monthlyEMIs)}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Monthly Subscriptions
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: currColors.text }]}>
              {formatAmount(monthlySubscriptions)}
            </ThemedText>
          </View>

          <View style={[styles.heroRow, { marginBottom: 0 }]}>
            <ThemedText style={[styles.heroRowLabel, { color: currColors.textSecondary }]}>
              Savings rate
            </ThemedText>
            <ThemedText
              style={[
                styles.heroRowValue,
                {
                  color: isPrivacyMode
                    ? currColors.text
                    : monthlyStats.savingsRate >= 20
                    ? '#34C759'
                    : monthlyStats.savingsRate > 0
                    ? '#FF9500'
                    : '#FF3B30',
                },
              ]}
            >
              {isPrivacyMode ? '••••••' : `${monthlyStats.savingsRate.toFixed(0)}%`}
            </ThemedText>
          </View>
        </View>

        {/* ─── Smart Insights ─── */}
        <FinancialInsights />

        {/* ─── Upcoming Payments (EMI + Subscriptions) ─── */}
        <View
          style={[
            styles.accordionContainer,
            {
              backgroundColor: currColors.card,
              borderColor: currColors.border,
            },
          ]}
        >
          <View style={styles.headerWithAction}>
            <ThemedText
              style={[
                styles.innerSectionTitle,
                { color: currColors.textSecondary },
              ]}
            >
              UPCOMING PAYMENTS (14 DAYS)
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                router.push('/(tabs)/money-loans');
              }}
              style={styles.viewMoreButton}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: currColors.cardSecondary },
                ]}
              >
                <ChevronRight size={14} color={currColors.tint} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ─── Upcoming Payments (EMI + Subscriptions) ─── */}
          {upcomingPayments.length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ThemedText style={{ color: currColors.textSecondary, fontSize: 13, fontFamily: 'Outfit_400Regular' }}>
                No payments due in the next 14 days.
              </ThemedText>
            </View>
          ) : (
            upcomingPayments.map((payment, index, arr) => {
              const isLast = index === arr.length - 1;
              const d1 = new Date(payment.date);
              d1.setHours(0, 0, 0, 0);
              const d2 = new Date();
              d2.setHours(0, 0, 0, 0);
              const diffDays = Math.round((d1.getTime() - d2.getTime()) / (24 * 60 * 60 * 1000));
              
              let dueLabel = `Due in ${diffDays} days`;
              let dueColor = currColors.textSecondary;

              if (diffDays === 0) {
                dueLabel = 'Due today';
                dueColor = '#FF9500';
              } else if (diffDays === 1) {
                dueLabel = 'Due tomorrow';
                dueColor = '#FF9500';
              } else if (diffDays < 0) {
                dueLabel = `Overdue by ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'}`;
                dueColor = '#FF3B30';
              }

              const IconComponent = payment.type === 'emi' ? Landmark : getSubscriptionIcon(payment.logo);

              return (
                <TouchableOpacity
                  key={payment.id}
                  style={[
                    styles.accountRow,
                    { borderBottomColor: currColors.border },
                    isLast && { borderBottomWidth: 0 },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    handleHaptic();
                    if (payment.type === 'emi') {
                      router.push(`/loan-details/${payment.targetId}`);
                    } else {
                      router.push(`/subscription-details/${payment.targetId}`);
                    }
                  }}
                >
                  <View style={[styles.accountRowLeft, { flex: 1, marginRight: 16 }]}>
                    <View style={[styles.accountIconBox, { backgroundColor: `${payment.color}15` }]}>
                      <IconComponent size={16} color={payment.color} />
                    </View>
                    <View style={{ flex: 1, gap: 2, marginLeft: 12 }}>
                      <ThemedText style={{ color: currColors.text, fontSize: 14, fontFamily: 'Outfit_500Medium' }} numberOfLines={1}>
                        {payment.name}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11, color: dueColor, fontFamily: 'Outfit_400Regular' }} numberOfLines={1}>
                        {dueLabel} • {payment.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={[styles.accountRowValue, { color: currColors.text, fontFamily: 'Outfit_600SemiBold', flexShrink: 0 }]}>
                    {formatAmount(payment.amount)}
                  </ThemedText>
                </TouchableOpacity>
              );
            })
          )}
        </View>



        {/* ─── Recent Transactions ─── */}
        <View style={styles.sectionHeaderRow}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            RECENT TRANSACTIONS
          </ThemedText>
          <TouchableOpacity onPress={() => { handleHaptic(); router.push('/all-money-transactions'); }}>
            <ThemedText style={styles.viewAllLink}>
              View All
            </ThemedText>
          </TouchableOpacity>
        </View>



        {filteredRecentTxs.length === 0 ? (
          <View style={[styles.emptyTxsCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Info size={32} color={currColors.textSecondary} style={{ marginBottom: 12 }} />
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', fontSize: 14, lineHeight: 20, paddingHorizontal: 12 }}>
              No transactions matching the selected filter found. Tap the '+' button below to log one.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.txsGroupsContainer}>
            {groupedTxs.map((group) => (
              <View key={group.title} style={styles.txGroup}>
                <ThemedText style={[styles.txGroupHeader, { color: currColors.textSecondary }]}>
                  {group.title.toUpperCase()}
                </ThemedText>
                <View style={[styles.txsListContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                  {group.data.map((tx, index) => {
                    const account = accounts.find((a) => a.id === tx.accountId);
                    const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null;
                    
                    return (
                      <TouchableOpacity
                        key={tx.id}
                        style={[
                          styles.txItem,
                          {
                            borderBottomColor: currColors.border,
                            borderBottomWidth: index === group.data.length - 1 ? 0 : 1,
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          handleHaptic();
                          router.push({ pathname: '/add-money-transaction', params: { id: tx.id } });
                        }}
                      >
                        <View style={styles.txLeft}>
                          <View
                            style={[
                              styles.txIconBox,
                              {
                                backgroundColor:
                                  tx.type === 'income'
                                    ? 'rgba(52, 199, 89, 0.1)'
                                    : tx.type === 'expense'
                                    ? 'rgba(255, 59, 48, 0.1)'
                                    : 'rgba(142, 142, 147, 0.1)',
                              },
                            ]}
                          >
                            {tx.type === 'transfer' ? (
                              <ArrowRightLeft size={18} color="#8E8E93" />
                            ) : (
                              <CategoryIcon
                                name={tx.category}
                                size={18}
                                color={tx.type === 'income' ? '#34C759' : '#FF3B30'}
                              />
                            )}
                          </View>
                          <View style={styles.txInfo}>
                            <ThemedText style={[styles.txCategory, { color: currColors.text }]} numberOfLines={1}>
                              {tx.type === 'transfer' ? `Transfer: ${account?.name} → ${toAccount?.name}` : tx.category}
                            </ThemedText>
                            <ThemedText style={[styles.txDate, { color: currColors.textSecondary }]} numberOfLines={1}>
                              {account?.name || 'Unknown Account'}
                              {tx.note ? ` • ${tx.note}` : ''}
                            </ThemedText>
                          </View>
                        </View>

                        <ThemedText
                          style={[
                            styles.txAmount,
                            {
                              color:
                                tx.type === 'income'
                                  ? '#34C759'
                                  : tx.type === 'expense'
                                  ? '#FF3B30'
                                  : currColors.text,
                            },
                          ]}
                        >
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                          {formatAmount(tx.amount)}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}



        {/* ─── Activity Calendar ─── */}
        <MoneyActivityCalendar transactions={moneyTransactions} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },

  // ─── Hero Card ───
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  heroLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 24,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 16,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 1,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroRowLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  heroRowValue: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },

  // ─── Accounts Overview (accordion-style card) ───
  accordionContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    paddingTop: 16,
  },
  headerWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    marginBottom: 4,
  },
  innerSectionTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 16,
  },
  viewMoreButton: {
    padding: 2,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  accountRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountRowLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    marginLeft: 12,
  },
  accountRowValue: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },

  // ─── Section Headers ───
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  viewAllLink: {
    color: '#00C9A7',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },

  // ─── Filter Chips ───
  filterStripContainer: {
    marginBottom: 14,
  },
  filterChipsScroll: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },

  // ─── Transaction Items ───
  txsGroupsContainer: {
    marginHorizontal: 16,
    gap: 16,
  },
  txGroup: {
    gap: 8,
  },
  txGroupHeader: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    marginLeft: 4,
  },
  txsListContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    marginLeft: 12,
    flex: 1,
  },
  txCategory: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  txDate: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  emptyTxsCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },

  // ─── EMI Card ───
  sectionContainer: {
    marginTop: 8,
  },
  emiCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  emiRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emiInfo: {
    flex: 1,
    marginLeft: 14,
  },
  emiTitleText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  emiSubText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  emiAmountText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
});
