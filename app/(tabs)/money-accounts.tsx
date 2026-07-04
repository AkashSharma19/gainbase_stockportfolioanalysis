import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  Wallet,
  Landmark,
  Activity,
  CreditCard,
  ChevronRight,
  PiggyBank,
  Info,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Account, AccountType } from '@/types/money';
import { BankLogo } from '@/components/BankLogo';

const TYPE_CONFIG = {
  wallet: { label: 'Cash & Wallets', color: '#00C9A7', icon: Wallet },
  savings: { label: 'Savings Accounts', color: '#007AFF', icon: Landmark },
  investment: { label: 'Investment Accounts', color: '#AF52DE', icon: Activity },
  credit_card: { label: 'Credit Cards', color: '#FF9500', icon: CreditCard },
  emergency_fund: { label: 'Emergency Fund', color: '#FF2D55', icon: PiggyBank },
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
      emergency_fund: [],
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

  const renderAccountItem = (item: Account, isLast: boolean) => {
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
        style={[
          styles.accountListItem,
          !isLast && { borderBottomWidth: 1, borderBottomColor: currColors.border }
        ]}
        activeOpacity={0.75}
        onPress={() => {
          handleHaptic();
          router.push(`/account-details/${item.id}`);
        }}
      >
        <View style={styles.cardMainRow}>
          <View style={styles.cardLeft}>
            {item.logo ? (
              <BankLogo logo={item.logo} size={30} style={{ marginRight: 14 }} />
            ) : (
              <View style={[styles.iconWrapper, { backgroundColor: `${item.color}15` }]}>
                <IconComponent size={18} color={item.color} />
              </View>
            )}
            <View style={styles.accountInfo}>
              <ThemedText type="semiBold" style={[styles.accountName, { color: currColors.text }]} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText style={[styles.accountSub, { color: currColors.textSecondary }]} numberOfLines={1}>
                {item.institution || config.label}
                {item.accountNumber ? ` • •••• ${item.accountNumber}` : ''}
              </ThemedText>
            </View>
          </View>

          <View style={styles.cardRight}>
            <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
              <ThemedText
                style={[
                  styles.accountBalance,
                  {
                    fontFamily: 'Outfit_600SemiBold',
                    color: isCreditCard 
                      ? (item.balance < 0 ? '#FF3B30' : currColors.text)
                      : (item.balance < 0 ? '#FF3B30' : currColors.text)
                  }
                ]}
              >
                {formatAmount(item.balance)}
              </ThemedText>
              {isCreditCard && item.creditLimit ? (
                <View style={{ alignItems: 'flex-end', marginTop: 3 }}>
                  <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_400Regular' }}>
                    Limit: {formatAmount(item.creditLimit)}
                  </ThemedText>
                  {blockedAmount > 0 && (
                    <ThemedText type="medium" style={{ fontSize: 9, color: '#FF9500', marginTop: 1, fontFamily: 'Outfit_500Medium' }}>
                      Blocked: {formatAmount(blockedAmount)}
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <ThemedText style={{ fontSize: 9, color: currColors.textSecondary }}>Utilization</ThemedText>
              <ThemedText style={{ fontSize: 9, color: utilization > 80 ? '#FF3B30' : currColors.textSecondary }}>
                {utilization.toFixed(0)}%
              </ThemedText>
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const overviewGradient = colorScheme === 'dark'
    ? ['#1C1C1E', '#2C2C2E'] as const
    : ['#FFFFFF', '#F2F2F7'] as const;

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
        {/* Aggregate Overview Gradient Bar */}
        <LinearGradient
          colors={colorScheme === 'dark' ? ['#0A2540', '#001529'] : ['#F4F9FF', '#EAF2F9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.premiumOverviewCard, { borderColor: currColors.border }]}
        >
          <View style={styles.netWorthHeader}>
            <ThemedText style={[styles.netWorthLabel, { color: colorScheme === 'dark' ? 'rgba(255,255,255,0.7)' : currColors.textSecondary }]}>
              NET WORTH
            </ThemedText>
            <ThemedText style={[styles.netWorthVal, { color: colorScheme === 'dark' ? '#FFFFFF' : currColors.text, fontFamily: 'Outfit_500Medium' }]}>
              {formatAmount(summary.totalAssets - summary.totalLiabilities)}
            </ThemedText>
          </View>
          
          <View style={[styles.cardDivider, { backgroundColor: currColors.border }]} />
          
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <View style={styles.metricDotText}>
                <View style={[styles.metricDot, { backgroundColor: '#00C9A7' }]} />
                <ThemedText style={[styles.metricLabel, { color: currColors.textSecondary }]}>Total Assets</ThemedText>
              </View>
              <ThemedText style={[styles.metricVal, { color: '#00C9A7', fontFamily: 'Outfit_600SemiBold' }]}>
                {formatAmount(summary.totalAssets)}
              </ThemedText>
            </View>
            
            <View style={[styles.verticalDivider, { borderColor: currColors.border, height: 24 }]} />
            
            <View style={styles.metricItem}>
              <View style={styles.metricDotText}>
                <View style={[styles.metricDot, { backgroundColor: '#FF3B30' }]} />
                <ThemedText style={[styles.metricLabel, { color: currColors.textSecondary }]}>Liabilities</ThemedText>
              </View>
              <ThemedText style={[styles.metricVal, { color: '#FF3B30', fontFamily: 'Outfit_600SemiBold' }]}>
                {formatAmount(summary.totalLiabilities)}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

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
              <View style={[styles.groupWrapperCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                {list.map((item, index) => renderAccountItem(item, index === list.length - 1))}
              </View>
            </View>
          );
        })}

        {accounts.filter(a => !a.isArchived).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Info size={44} color={currColors.textSecondary} style={{ marginBottom: 16 }} />
            <ThemedText style={[styles.emptyText, { color: currColors.textSecondary, fontFamily: 'Outfit_400Regular', lineHeight: 22 }]}>
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
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumOverviewCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  netWorthHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  netWorthLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  netWorthVal: {
    fontSize: 28,
  },
  cardDivider: {
    height: 1,
    width: '100%',
    opacity: 0.15,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDotText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  metricVal: {
    fontSize: 15,
  },
  verticalDivider: {
    borderRightWidth: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  groupWrapperCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  accountListItem: {
    flexDirection: 'column',
    padding: 16,
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
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
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
    fontSize: 15,
  },
  utilizationContainer: {
    width: '100%',
    marginTop: 12,
  },
  progressBarBG: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
