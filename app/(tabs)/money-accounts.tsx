import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  Wallet,
  Landmark,
  Activity,
  CreditCard,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackButton } from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Account, AccountType } from '@/types/money';

const TYPE_CONFIG = {
  wallet: { label: 'Cash & Wallets', color: '#00C9A7', icon: Wallet },
  savings: { label: 'Savings Accounts', color: '#007AFF', icon: Landmark },
  investment: { label: 'Investment Accounts', color: '#AF52DE', icon: Activity },
  credit_card: { label: 'Credit Cards', color: '#FF9500', icon: CreditCard },
};

export default function AccountsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { accounts, loans } = useMoneyStore();
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  // Group accounts by type
  const groupedAccounts = useMemo(() => {
    const groups: { [key in AccountType]: Account[] } = {
      wallet: [],
      savings: [],
      investment: [],
      credit_card: [],
    };
    
    accounts.forEach((acc) => {
      if (!acc.isArchived) {
        groups[acc.type].push(acc);
      }
    });
    
    return groups;
  }, [accounts]);

  // Aggregate assets and liabilities
  const summary = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0; // Credit Card debts are liabilities (when negative balance)
    
    accounts.forEach((acc) => {
      if (!acc.isArchived) {
        if (acc.type === 'credit_card') {
          if (acc.balance < 0) {
            totalLiabilities += Math.abs(acc.balance);
          } else {
            totalAssets += acc.balance;
          }
        } else {
          if (acc.balance >= 0) {
            totalAssets += acc.balance;
          } else {
            totalLiabilities += Math.abs(acc.balance);
          }
        }
      }
    });

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    };
  }, [accounts]);

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

  const renderAccountItem = (item: Account) => {
    const config = TYPE_CONFIG[item.type];
    const IconComponent = config.icon;
    const isCreditCard = item.type === 'credit_card';
    
    // Find outstanding principal blocked on this credit card from linked loans
    const blockedAmount = isCreditCard
      ? loans.filter(l => l.isActive && l.linkedAccountId === item.id).reduce((sum, l) => sum + l.outstandingAmount, 0)
      : 0;

    // Utilization rate for credit cards (includes spent balance + blocked EMI amount)
    const totalUtilized = Math.abs(item.balance) + blockedAmount;
    const utilization = isCreditCard && item.creditLimit && item.creditLimit > 0
      ? (totalUtilized / item.creditLimit) * 100
      : 0;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.accountCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
        activeOpacity={0.7}
        onPress={() => {
          handleHaptic();
          router.push(`/account-details/${item.id}`);
        }}
      >
        <View style={styles.cardMainRow}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconWrapper, { backgroundColor: `${item.color}15` }]}>
              <IconComponent size={20} color={item.color} />
            </View>
            <View style={styles.accountInfo}>
              <ThemedText type="semiBold" style={[styles.accountName, { color: currColors.text }]} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText style={[styles.accountSub, { color: currColors.textSecondary }]} numberOfLines={1}>
                {item.institution || config.label}
                {item.accountNumber ? ` • ${item.accountNumber}` : ''}
              </ThemedText>
            </View>
          </View>

          <View style={styles.cardRight}>
            <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
              <ThemedText
                style={[
                  styles.accountBalance,
                  {
                    color: isCreditCard 
                      ? (item.balance < 0 ? '#FF3B30' : currColors.text)
                      : (item.balance < 0 ? '#FF3B30' : currColors.text)
                  }
                ]}
              >
                {formatAmount(item.balance)}
              </ThemedText>
              {isCreditCard && item.creditLimit ? (
                <View style={{ alignItems: 'flex-end', marginTop: 2 }}>
                  <ThemedText style={{ fontSize: 10, color: currColors.textSecondary }}>
                    Limit: {formatAmount(item.creditLimit)}
                  </ThemedText>
                  {blockedAmount > 0 && (
                    <ThemedText type="medium" style={{ fontSize: 9, color: '#FF9500', marginTop: 1 }}>
                      Blocked (EMI): {formatAmount(blockedAmount)}
                    </ThemedText>
                  )}
                </View>
              ) : null}
            </View>
            <ChevronRight size={16} color={currColors.textSecondary} />
          </View>
        </View>

        {isCreditCard && item.creditLimit && item.creditLimit > 0 ? (
          <View style={styles.utilizationContainer}>
            <View style={[styles.progressBarBG, { backgroundColor: currColors.cardSecondary }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${Math.min(100, utilization)}%`,
                    backgroundColor: utilization > 80 ? '#FF3B30' : utilization > 50 ? '#FF9500' : '#34C759'
                  }
                ]} 
              />
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          Accounts
        </ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => {
            handleHaptic();
            router.push('/add-account');
          }}
        >
          <Plus size={20} color="#00C9A7" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Aggregate Overview Bar */}
        <View style={[styles.overviewBar, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <View style={styles.overviewCol}>
            <ThemedText style={[styles.overviewLabel, { color: currColors.textSecondary }]}>Total Assets</ThemedText>
            <ThemedText style={[styles.overviewVal, { color: '#00C9A7' }]}>{formatAmount(summary.totalAssets)}</ThemedText>
          </View>
          <View style={[styles.verticalDivider, { borderColor: currColors.border }]} />
          <View style={styles.overviewCol}>
            <ThemedText style={[styles.overviewLabel, { color: currColors.textSecondary }]}>Total Card Debt</ThemedText>
            <ThemedText style={[styles.overviewVal, { color: '#FF3B30' }]}>{formatAmount(summary.totalLiabilities)}</ThemedText>
          </View>
        </View>

        {/* Render accounts grouped by type */}
        {(Object.keys(TYPE_CONFIG) as AccountType[]).map((type) => {
          const list = groupedAccounts[type];
          if (list.length === 0) return null;
          const config = TYPE_CONFIG[type];
          
          return (
            <View key={type} style={styles.groupContainer}>
              <ThemedText type="bold" style={[styles.groupTitle, { color: currColors.textSecondary }]}>
                {config.label.toUpperCase()} ({list.length})
              </ThemedText>
              {list.map(renderAccountItem)}
            </View>
          );
        })}

        {accounts.filter(a => !a.isArchived).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Wallet size={48} color={currColors.textSecondary} style={{ marginBottom: 16 }} />
            <ThemedText style={[styles.emptyText, { color: currColors.textSecondary }]}>
              No accounts added yet. Tap the '+' button at the top to add your wallet, bank accounts, or credit cards.
            </ThemedText>
          </View>
        ) : null}
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
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Outfit_600SemiBold',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  overviewCol: {
    flex: 1,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  overviewVal: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  verticalDivider: {
    borderRightWidth: 1,
    height: '100%',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 18,
    marginBottom: 8,
  },
  accountCard: {
    flexDirection: 'column',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.2,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  accountSub: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  accountBalance: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  utilizationContainer: {
    width: '100%',
    marginTop: 12,
  },
  progressBarBG: {
    height: 5,
    borderRadius: 2.5,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
