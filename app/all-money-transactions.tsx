import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';

export default function AllTransactionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const {
    accounts,
    moneyTransactions,
    removeMoneyTransaction,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  // All transactions sorted chronologically (latest first)
  const sortedTxs = useMemo(() => {
    return [...moneyTransactions].sort((a, b) => b.date.localeCompare(a.date));
  }, [moneyTransactions]);

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '****';
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const prefix = val < 0 ? '-' : '';
    const symbol = showCurrencySymbol ? '₹' : '';
    return `${prefix}${symbol}${formatted}`;
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteTransaction = (txId: string) => {
    handleHaptic();
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction and revert its balance impact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeMoneyTransaction(txId);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={currColors.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
          All Transactions
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {sortedTxs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center' }}>
              No transactions logged yet.
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.txsList, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            {sortedTxs.map((tx, index) => {
              const account = accounts.find((a) => a.id === tx.accountId);
              const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null;
              
              const isIncome = tx.type === 'income';
              const isExpense = tx.type === 'expense';
              const isTransfer = tx.type === 'transfer';
              
              // Determine display details
              let typeLabel = '';
              let subtitle = '';
              let txColor = currColors.text;
              let displayAmount = tx.amount;

              if (isTransfer) {
                typeLabel = `Transfer`;
                subtitle = `${account?.name || 'Unknown'} → ${toAccount?.name || 'Unknown'}`;
                txColor = '#FF9500';
              } else {
                typeLabel = tx.category;
                subtitle = account?.name || '';
                txColor = isIncome ? '#34C759' : '#FF3B30';
                displayAmount = isIncome ? tx.amount : -tx.amount;
              }

              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[
                    styles.txItem,
                    { borderBottomColor: currColors.border, borderBottomWidth: index === sortedTxs.length - 1 ? 0 : 1 }
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
                        styles.txIcon,
                        {
                          backgroundColor:
                            isTransfer
                              ? 'rgba(255, 149, 0, 0.1)'
                              : isIncome
                              ? 'rgba(52, 199, 89, 0.1)'
                              : 'rgba(255, 59, 48, 0.1)',
                        },
                      ]}
                    >
                      {isTransfer ? (
                        <Activity size={18} color="#FF9500" />
                      ) : isIncome ? (
                        <ArrowDownLeft size={18} color="#34C759" />
                      ) : (
                        <ArrowUpRight size={18} color="#FF3B30" />
                      )}
                    </View>
                    <View style={styles.txInfo}>
                      <ThemedText style={[styles.txLabelText, { color: currColors.text }]} numberOfLines={1}>
                        {typeLabel}
                      </ThemedText>
                      <ThemedText style={[styles.txSubText, { color: currColors.textSecondary }]} numberOfLines={1}>
                        {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {subtitle ? ` • ${subtitle}` : ''}
                        {tx.note ? ` • ${tx.note}` : ''}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <ThemedText style={[styles.txAmountText, { color: txColor }]}>
                      {displayAmount > 0 ? '+' : ''}{formatAmount(displayAmount)}
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.deleteTxBtn}
                      onPress={() => handleDeleteTransaction(tx.id)}
                    >
                      <Trash2 size={14} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginTop: 8,
  },
  txsList: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txLabelText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  txSubText: {
    fontSize: 11,
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txAmountText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    marginRight: 8,
  },
  deleteTxBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
});
