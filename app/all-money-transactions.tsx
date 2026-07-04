import React, { useMemo, useState } from 'react';
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
  ArrowRightLeft,
  Info,
  Layers,
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

  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

  // Filter & sort transactions chronologically (latest first)
  const filteredTxs = useMemo(() => {
    let list = moneyTransactions;
    if (activeFilter !== 'all') {
      list = list.filter((tx) => tx.type === activeFilter);
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [moneyTransactions, activeFilter]);

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

  const activeFilterBg = '#00C9A7';

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredTxs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Info size={36} color={currColors.textSecondary} style={{ marginBottom: 12 }} />
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', lineHeight: 22 }}>
              No transactions match the selected filter.
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.txsList, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            {filteredTxs.map((tx, index) => {
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
                txColor = currColors.text;
                displayAmount = tx.amount;
              } else {
                typeLabel = tx.category;
                subtitle = account?.name || '';
                txColor = isIncome ? '#34C759' : '#FF3B30';
                displayAmount = tx.amount;
              }

              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[
                    styles.txItem,
                    { borderBottomColor: currColors.border, borderBottomWidth: index === filteredTxs.length - 1 ? 0 : 1 }
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
                              ? 'rgba(142, 142, 147, 0.1)'
                              : isIncome
                              ? 'rgba(52, 199, 89, 0.1)'
                              : 'rgba(255, 59, 48, 0.1)',
                        },
                      ]}
                    >
                      {isTransfer ? (
                        <ArrowRightLeft size={18} color="#8E8E93" />
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
                      {isIncome ? '+' : isExpense ? '-' : ''}{formatAmount(displayAmount)}
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.deleteTxBtn}
                      onPress={() => handleDeleteTransaction(tx.id)}
                    >
                      <Trash2 size={13} color={currColors.textSecondary} />
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
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  filterStripContainer: {
    marginBottom: 8,
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
  scrollContent: {
    paddingBottom: 40,
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  txsList: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
