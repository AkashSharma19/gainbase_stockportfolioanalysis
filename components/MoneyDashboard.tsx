import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  CreditCard,
  Landmark,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Wallet,
  Activity,
  Calendar,
  ChevronRight,
} from 'lucide-react-native';

import { ThemedText } from './ThemedText';
import { AppSwitcher } from './AppSwitcher';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { formatIndianNumber } from '../lib/finance';
import { MoneyTransaction } from '../types/money';

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
    budgets,
    getNetWorth,
    getMonthlyEMIBurden,
    getActiveBudget,
    getCategorySpending,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  // Computations
  const netWorth = getNetWorth();
  const monthlyEMIs = getMonthlyEMIBurden();


  // Group accounts by type for aggregate counts
  const accountTotals = useMemo(() => {
    const totals = {
      wallet: 0,
      savings: 0,
      investment: 0,
      credit_card: 0,
    };
    accounts.forEach((acc) => {
      if (!acc.isArchived) {
        totals[acc.type] = (totals[acc.type] || 0) + acc.balance;
      }
    });
    return totals;
  }, [accounts]);


  const recentTxs = useMemo(() => {
    return moneyTransactions.slice(0, 5);
  }, [moneyTransactions]);

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '****';
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

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Net Worth Card (Teal Gradient Theme) */}
        <View style={[styles.netWorthCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <ThemedText style={[styles.cardTitle, { color: currColors.textSecondary }]}>
            TOTAL NET WORTH
          </ThemedText>
          <ThemedText style={[styles.netWorthVal, { color: currColors.text }]}>
            {formatAmount(netWorth)}
          </ThemedText>
          
          <View style={[styles.divider, { borderColor: currColors.border }]} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <ThemedText style={[styles.summaryLabel, { color: currColors.textSecondary }]}>
                Accounts Value
              </ThemedText>
              <ThemedText style={[styles.summaryValue, { color: '#00C9A7' }]}>
                {formatAmount(accounts.reduce((acc, a) => acc + (a.isArchived ? 0 : a.balance), 0))}
              </ThemedText>
            </View>
            <View style={styles.summaryCol}>
              <ThemedText style={[styles.summaryLabel, { color: currColors.textSecondary }]}>
                Outstanding Loans
              </ThemedText>
              <ThemedText style={[styles.summaryValue, { color: '#FF3B30' }]}>
                {formatAmount(loans.filter(l => l.isActive).reduce((acc, l) => acc + l.outstandingAmount, 0))}
              </ThemedText>
            </View>
          </View>
        </View>



        {/* Accounts Summary Cards List */}
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
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
              <Wallet size={20} color="#00C9A7" />
              <ThemedText style={[styles.accountTypeLabel, { color: currColors.text }]}>Cash / Wallets</ThemedText>
            </View>
            <ThemedText style={[styles.accountTypeBalance, { color: currColors.text }]}>
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
              <Landmark size={20} color="#007AFF" />
              <ThemedText style={[styles.accountTypeLabel, { color: currColors.text }]}>Savings</ThemedText>
            </View>
            <ThemedText style={[styles.accountTypeBalance, { color: currColors.text }]}>
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
              <Activity size={20} color="#AF52DE" />
              <ThemedText style={[styles.accountTypeLabel, { color: currColors.text }]}>Investments</ThemedText>
            </View>
            <ThemedText style={[styles.accountTypeBalance, { color: currColors.text }]}>
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
              <CreditCard size={20} color="#FF9500" />
              <ThemedText style={[styles.accountTypeLabel, { color: currColors.text }]}>Credit Cards</ThemedText>
            </View>
            <ThemedText style={[styles.accountTypeBalance, { color: currColors.text }]}>
              {formatAmount(accountTotals.credit_card)}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>


        {/* EMI Calendar Card */}
        {loans.filter(l => l.isActive).length > 0 ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderNoMargin}>
              <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                MONTHLY EMI LIABILITIES
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  handleHaptic();
                  router.push('/(tabs)/money-loans');
                }}
              >
                <ThemedText style={{ color: '#00C9A7', fontSize: 13, fontFamily: 'Outfit_500Medium' }}>
                  View Loans
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View style={[styles.cardContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <View style={styles.emiRow}>
                <Calendar size={22} color="#FF9500" />
                <View style={styles.emiInfo}>
                  <ThemedText style={[styles.emiTitleText, { color: currColors.text }]}>
                    Total Monthly EMIs
                  </ThemedText>
                  <ThemedText style={[styles.emiCountText, { color: currColors.textSecondary }]}>
                    {loans.filter(l => l.isActive).length} active loans
                  </ThemedText>
                </View>
                <ThemedText style={[styles.emiBurdenText, { color: currColors.text }]}>
                  {formatAmount(monthlyEMIs)}
                </ThemedText>
              </View>
            </View>
          </View>
        ) : null}

        {/* Recent Transactions List */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 28, marginBottom: 12 }}>
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary, marginBottom: 0 }]}>
            RECENT TRANSACTIONS
          </ThemedText>
          <TouchableOpacity onPress={() => { handleHaptic(); router.push('/all-money-transactions'); }}>
            <ThemedText style={{ color: '#00C9A7', fontSize: 13, fontFamily: 'Outfit_500Medium' }}>
              View All
            </ThemedText>
          </TouchableOpacity>
        </View>

        {recentTxs.length === 0 ? (
          <View style={[styles.emptyTxsCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center' }}>
              No transactions added yet. Tap the '+' button to log your first income/expense.
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.txsListContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            {recentTxs.map((tx, index) => {
              const account = accounts.find((a) => a.id === tx.accountId);
              const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null;
              const isIncome = tx.type === 'income';
              const isExpense = tx.type === 'expense';
              
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[
                    styles.txItem,
                    { borderBottomColor: currColors.border, borderBottomWidth: index === recentTxs.length - 1 ? 0 : 1 }
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
                              ? '#34C7591A'
                              : tx.type === 'expense'
                              ? '#FF3B301A'
                              : '#8E8E931A',
                        },
                      ]}
                    >
                      {tx.type === 'income' ? (
                        <ArrowDownLeft size={20} color="#34C759" />
                      ) : tx.type === 'expense' ? (
                        <ArrowUpRight size={20} color="#FF3B30" />
                      ) : (
                        <Activity size={20} color="#8E8E93" />
                      )}
                    </View>
                    <View style={styles.txInfo}>
                      <ThemedText style={[styles.txCategory, { color: currColors.text }]} numberOfLines={1}>
                        {tx.type === 'transfer' ? `Transfer: ${account?.name} → ${toAccount?.name}` : tx.category}
                      </ThemedText>
                      <ThemedText style={[styles.txDate, { color: currColors.textSecondary }]}>
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
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
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  netWorthCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 1,
    marginBottom: 8,
  },
  netWorthVal: {
    fontSize: 24,
    fontFamily: 'Outfit_500Medium',
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
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionIconWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
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
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 1,
  },
  horizontalScroll: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  accountSummaryCard: {
    width: 140,
    height: 90,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginRight: 10,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountTypeLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  accountTypeBalance: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  sectionContainer: {
    marginTop: 8,
  },
  cardContainer: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  budgetOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  spentText: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  limitText: {
    fontSize: 12,
    marginTop: 2,
  },
  percentageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  percentageText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
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
    fontFamily: 'Outfit_600SemiBold',
  },
  emiCountText: {
    fontSize: 12,
    marginTop: 2,
  },
  emiBurdenText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  emptyTxsCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txsListContainer: {
    marginHorizontal: 16,
    borderRadius: 20,
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
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
});
