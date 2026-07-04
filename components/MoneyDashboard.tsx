import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CreditCard,
  Landmark,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Activity,
  Calendar,
  ArrowRightLeft,
  Info,
  Layers,
  Eye,
  EyeOff,
  PieChart,
} from 'lucide-react-native';

import { ThemedText } from './ThemedText';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { MoneyTransaction } from '../types/money';
import { MoneyActivityCalendar } from './MoneyActivityCalendar';
import { FinancialInsights } from './FinancialInsights';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function MoneyDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  // Stores
  const {
    accounts,
    moneyTransactions,
    loans,
    getNetWorth,
    getMonthlyEMIBurden,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const togglePrivacyMode = usePortfolioStore((state) => state.togglePrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  // Filter state for transactions list
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

  // Computations
  const netWorth = getNetWorth();
  const monthlyEMIs = getMonthlyEMIBurden();

  const accountTotals = useMemo(() => {
    const totals = {
      wallet: 0,
      savings: 0,
      investment: 0,
      credit_card: 0,
      emergency_fund: 0,
    };
    accounts.forEach((acc) => {
      if (!acc.isArchived) {
        // @ts-ignore
        totals[acc.type] = (totals[acc.type] || 0) + acc.balance;
      }
    });
    return totals;
  }, [accounts]);

  // Filter and limit recent transactions
  const filteredRecentTxs = useMemo(() => {
    let list = moneyTransactions;
    if (activeFilter !== 'all') {
      list = list.filter((tx) => tx.type === activeFilter);
    }
    return list.slice(0, 5);
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

  // Gradient background colors for Net Worth Card based on theme
  const netWorthGradient = colorScheme === 'dark'
    ? ['#052E2B', '#0A4E46'] as const
    : ['#E6F4F2', '#D1EFEA'] as const;

  const activeFilterBg = '#00C9A7';

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Net Worth Gradient Card */}
        <LinearGradient
          colors={netWorthGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.netWorthCard, colorScheme === 'light' && { borderWidth: 0 }]}
        >
          <View style={styles.netWorthHeaderRow}>
            <ThemedText type="medium" style={[styles.cardTitle, { color: colorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,77,64,0.7)', fontFamily: 'Outfit_500Medium' }]}>
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
                  { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,77,64,0.06)' },
                ]}
              >
                {isPrivacyMode ? (
                  <EyeOff size={16} color={colorScheme === 'dark' ? '#FFF' : '#004D40'} />
                ) : (
                  <Eye size={16} color={colorScheme === 'dark' ? '#FFF' : '#004D40'} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  handleHaptic();
                  router.push('/money-analytics');
                }}
                style={[
                  styles.iconButton,
                  { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,77,64,0.06)' },
                ]}
              >
                <PieChart size={16} color={colorScheme === 'dark' ? '#FFF' : '#004D40'} />
              </TouchableOpacity>
            </View>
          </View>
          <ThemedText style={[styles.netWorthVal, { color: colorScheme === 'dark' ? '#FFF' : '#004D40', fontFamily: 'Outfit_500Medium' }]}>
            {formatAmount(netWorth)}
          </ThemedText>
          
          <View style={[styles.divider, { borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,77,64,0.1)' }]} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <ThemedText style={[styles.summaryLabel, { color: colorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,77,64,0.7)' }]}>
                Accounts Value
              </ThemedText>
              <ThemedText style={[styles.summaryValue, { color: colorScheme === 'dark' ? '#A7FFEB' : '#00796B', fontFamily: 'Outfit_500Medium' }]}>
                {formatAmount(accounts.reduce((acc, a) => acc + (a.isArchived ? 0 : a.balance), 0))}
              </ThemedText>
            </View>
            <View style={styles.summaryCol}>
              <ThemedText style={[styles.summaryLabel, { color: colorScheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,77,64,0.7)' }]}>
                Outstanding Loans
              </ThemedText>
              <ThemedText style={[styles.summaryValue, { color: colorScheme === 'dark' ? '#FF8A80' : '#C62828', fontFamily: 'Outfit_500Medium' }]}>
                {formatAmount(loans.filter(l => l.isActive).reduce((acc, l) => acc + l.outstandingAmount, 0))}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        <FinancialInsights />

        {/* Accounts Summary Cards List */}
        <View style={styles.sectionHeader}>
          <ThemedText type="bold" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            ACCOUNTS BY TYPE
          </ThemedText>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {/* Card: Wallets */}
          <TouchableOpacity
            style={[styles.accountSummaryCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            activeOpacity={0.8}
            onPress={() => {
              handleHaptic();
              router.push('/(tabs)/money-accounts');
            }}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconRoundBox, { backgroundColor: '#00C9A715' }]}>
                <Wallet size={16} color="#00C9A7" />
              </View>
              <ThemedText type="medium" style={[styles.accountTypeLabel, { color: currColors.text }]}>Cash / Wallets</ThemedText>
            </View>
            <ThemedText style={[styles.accountTypeBalance, { color: currColors.text, fontFamily: 'Outfit_600SemiBold' }]}>
              {formatAmount(accountTotals.wallet)}
            </ThemedText>
          </TouchableOpacity>

          {/* Card: Savings Accounts */}
          <TouchableOpacity
            style={[styles.accountSummaryCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            activeOpacity={0.8}
            onPress={() => {
              handleHaptic();
              router.push('/(tabs)/money-accounts');
            }}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconRoundBox, { backgroundColor: '#007AFF15' }]}>
                <Landmark size={16} color="#007AFF" />
              </View>
              <ThemedText type="medium" style={[styles.accountTypeLabel, { color: currColors.text }]}>Savings</ThemedText>
            </View>
            <ThemedText style={[styles.accountTypeBalance, { color: currColors.text, fontFamily: 'Outfit_600SemiBold' }]}>
              {formatAmount(accountTotals.savings)}
            </ThemedText>
          </TouchableOpacity>

          {/* Card: Investment Accounts */}
          <TouchableOpacity
            style={[styles.accountSummaryCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            activeOpacity={0.8}
            onPress={() => {
              handleHaptic();
              router.push('/(tabs)/money-accounts');
            }}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconRoundBox, { backgroundColor: '#AF52DE15' }]}>
                <Activity size={16} color="#AF52DE" />
              </View>
              <ThemedText type="medium" style={[styles.accountTypeLabel, { color: currColors.text }]}>Investments</ThemedText>
            </View>
            <ThemedText style={[styles.accountTypeBalance, { color: currColors.text, fontFamily: 'Outfit_600SemiBold' }]}>
              {formatAmount(accountTotals.investment)}
            </ThemedText>
          </TouchableOpacity>

          {/* Card: Credit Cards */}
          <TouchableOpacity
            style={[styles.accountSummaryCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            activeOpacity={0.8}
            onPress={() => {
              handleHaptic();
              router.push('/(tabs)/money-accounts');
            }}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconRoundBox, { backgroundColor: '#FF950015' }]}>
                <CreditCard size={16} color="#FF9500" />
              </View>
              <ThemedText type="medium" style={[styles.accountTypeLabel, { color: currColors.text }]}>Credit Cards</ThemedText>
            </View>
            <ThemedText style={[styles.accountTypeBalance, { color: currColors.text, fontFamily: 'Outfit_600SemiBold' }]}>
              {formatAmount(accountTotals.credit_card)}
            </ThemedText>
          </TouchableOpacity>

          {/* Card: Emergency Fund */}
          <TouchableOpacity
            style={[styles.accountSummaryCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
            activeOpacity={0.8}
            onPress={() => {
              handleHaptic();
              router.push('/(tabs)/money-accounts');
            }}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconRoundBox, { backgroundColor: '#FF2D5515' }]}>
                <PiggyBank size={16} color="#FF2D55" />
              </View>
              <ThemedText type="medium" style={[styles.accountTypeLabel, { color: currColors.text }]}>Emergency Fund</ThemedText>
            </View>
            <ThemedText style={[styles.accountTypeBalance, { color: currColors.text, fontFamily: 'Outfit_600SemiBold' }]}>
              {formatAmount(accountTotals.emergency_fund)}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>

        {/* EMI Calendar Card */}
        {loans.filter(l => l.isActive).length > 0 ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderNoMargin}>
              <ThemedText type="bold" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                MONTHLY EMI LIABILITIES
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  handleHaptic();
                  router.push('/(tabs)/money-loans');
                }}
              >
                <ThemedText type="medium" style={{ color: '#00C9A7', fontSize: 13 }}>
                  View Loans
                </ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.cardContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}
              onPress={() => router.push('/(tabs)/money-loans')}
            >
              <View style={styles.emiRow}>
                <View style={[styles.iconRoundBox, { backgroundColor: '#FF950015', width: 44, height: 44 }]}>
                  <Calendar size={22} color="#FF9500" />
                </View>
                <View style={styles.emiInfo}>
                  <ThemedText type="semiBold" style={[styles.emiTitleText, { color: currColors.text, fontSize: 15 }]}>
                    Total Monthly EMIs
                  </ThemedText>
                  <ThemedText style={[styles.emiCountText, { color: currColors.textSecondary }]}>
                    {loans.filter(l => l.isActive).length} active loans outstanding
                  </ThemedText>
                </View>
                <ThemedText style={[styles.emiBurdenText, { color: currColors.text, fontFamily: 'Outfit_700Bold', fontSize: 16 }]}>
                  {formatAmount(monthlyEMIs)}
                </ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Recent Transactions List with Type Filters */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 8 }}>
          <ThemedText type="bold" style={[styles.sectionTitle, { color: currColors.textSecondary, marginBottom: 0 }]}>
            RECENT TRANSACTIONS
          </ThemedText>
          <TouchableOpacity onPress={() => { handleHaptic(); router.push('/all-money-transactions'); }}>
            <ThemedText type="medium" style={{ color: '#00C9A7', fontSize: 13 }}>
              View All
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Dynamic Filter Chips strip */}
        <View style={styles.filterStripContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsScroll}
          >
            {([
              { key: 'all', label: 'All', icon: Layers },
              { key: 'expense', label: 'Expenses', icon: ArrowUpRight },
              { key: 'income', label: 'Income', icon: ArrowDownLeft },
              { key: 'transfer', label: 'Transfers', icon: ArrowRightLeft },
            ] as const).map((filter) => {
              const IconComponent = filter.icon;
              const isSelected = activeFilter === filter.key;
              const iconColor = isSelected ? '#FFFFFF' : currColors.textSecondary;
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? activeFilterBg : currColors.cardSecondary,
                      borderColor: isSelected ? activeFilterBg : currColors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingLeft: 10,
                    },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setActiveFilter(filter.key);
                  }}
                >
                  <IconComponent size={12} color={iconColor} style={{ marginRight: 6 }} />
                  <ThemedText
                    style={[
                      styles.filterChipText,
                      {
                        color: isSelected ? '#FFFFFF' : currColors.textSecondary,
                        fontFamily: isSelected ? 'Outfit_500Medium' : 'Outfit_400Regular',
                      },
                    ]}
                  >
                    {filter.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {filteredRecentTxs.length === 0 ? (
          <View style={[styles.emptyTxsCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Info size={32} color={currColors.textSecondary} style={{ marginBottom: 12 }} />
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', lineHeight: 20, paddingHorizontal: 12 }}>
              No transactions matching the selected filter found. Tap the '+' button below to log one.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.txsGroupsContainer}>
            {groupedTxs.map((group) => (
              <View key={group.title} style={styles.txGroup}>
                <ThemedText type="bold" style={[styles.txGroupHeader, { color: currColors.textSecondary }]}>
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
                            {tx.type === 'income' ? (
                              <ArrowDownLeft size={20} color="#34C759" />
                            ) : tx.type === 'expense' ? (
                              <ArrowUpRight size={20} color="#FF3B30" />
                            ) : (
                              <ArrowRightLeft size={18} color="#8E8E93" />
                            )}
                          </View>
                          <View style={styles.txInfo}>
                            <ThemedText type="semiBold" style={[styles.txCategory, { color: currColors.text }]} numberOfLines={1}>
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
                              fontFamily: 'Outfit_600SemiBold',
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
  netWorthCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  netWorthVal: {
    fontSize: 32,
    letterSpacing: -0.5,
  },
  divider: {
    borderBottomWidth: 1,
    marginVertical: 18,
    borderStyle: 'dashed',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionHeaderNoMargin: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  horizontalScroll: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  accountSummaryCard: {
    width: 144,
    height: 96,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginRight: 10,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconRoundBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountTypeLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    flex: 1,
  },
  accountTypeBalance: {
    fontSize: 15,
  },
  sectionContainer: {
    marginTop: 8,
  },
  cardContainer: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
  },
  emiCountText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  emiBurdenText: {
    fontSize: 14,
  },
  emptyTxsCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  txsGroupsContainer: {
    marginHorizontal: 16,
    gap: 16,
  },
  txGroup: {
    gap: 8,
  },
  txGroupHeader: {
    fontSize: 9,
    letterSpacing: 1,
    marginLeft: 4,
  },
  txsListContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
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
  },
  txDate: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
  },
  netWorthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
  filterStripContainer: {
    marginBottom: 14,
  },
  filterChipsScroll: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
});
