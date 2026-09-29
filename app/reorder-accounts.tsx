import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Landmark,
  CreditCard,
  Wallet,
  Activity,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackButton } from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Account, AccountType } from '@/types/money';
import { BankLogo } from '@/components/BankLogo';

const TYPE_CONFIG: Record<AccountType, { label: string; color: string; icon: any }> = {
  savings: { label: 'Savings Accounts', color: '#007AFF', icon: Landmark },
  credit_card: { label: 'Credit Cards', color: '#FF9500', icon: CreditCard },
  wallet: { label: 'Cash & Wallets', color: '#00C9A7', icon: Wallet },
  investment: { label: 'Investment Accounts', color: '#AF52DE', icon: Activity },
  emergency_fund: { label: 'Emergency Fund', color: '#FF2D55', icon: PiggyBank },
  receivable: { label: 'Accounts Receivable', color: '#34C759', icon: ArrowDownLeft },
  payable: { label: 'Accounts Payable', color: '#FF3B30', icon: ArrowUpRight },
};

const DEFAULT_ORDER: AccountType[] = [
  'savings',
  'credit_card',
  'wallet',
  'investment',
  'emergency_fund',
  'receivable',
  'payable',
];

export default function ReorderAccountsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const headerTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24);

  const accounts = useMoneyStore((state) => state.accounts) || [];
  const accountTypesOrder = useMoneyStore((state) => state.accountTypesOrder);

  const setAccountTypesOrder = (order: AccountType[]) => {
    const fn = useMoneyStore.getState().setAccountTypesOrder;
    if (typeof fn === 'function') {
      fn(order);
    } else {
      useMoneyStore.setState({ accountTypesOrder: order });
    }
  };

  const reorderAccounts = (newAccs: Account[]) => {
    const fn = useMoneyStore.getState().reorderAccounts;
    if (typeof fn === 'function') {
      fn(newAccs);
    } else {
      useMoneyStore.setState({ accounts: newAccs });
    }
  };

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  // Compute effective account types order
  const effectiveTypesOrder = useMemo(() => {
    const base = accountTypesOrder && accountTypesOrder.length > 0
      ? accountTypesOrder
      : DEFAULT_ORDER;
    const allKeys = Object.keys(TYPE_CONFIG) as AccountType[];
    const missing = allKeys.filter((k) => !base.includes(k));
    return [...base, ...missing];
  }, [accountTypesOrder]);

  // Group accounts by type (preserving order within array)
  const groupedAccounts = useMemo(() => {
    const groups: { [key in AccountType]: Account[] } = {
      wallet: [],
      savings: [],
      investment: [],
      credit_card: [],
      emergency_fund: [],
      receivable: [],
      payable: [],
    };

    accounts.forEach((acc) => {
      if (!acc.isArchived) {
        if (groups[acc.type]) {
          groups[acc.type].push(acc);
        } else {
          groups.savings.push(acc);
        }
      }
    });

    return groups;
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

  // Move Account Type Category Up / Down
  const moveType = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= effectiveTypesOrder.length) return;

    const newOrder = [...effectiveTypesOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setAccountTypesOrder(newOrder);
    handleHaptic();
  };

  // Move Account Up / Down within its category
  const moveAccountWithinType = (account: Account, type: AccountType, direction: 'up' | 'down') => {
    const typeList = groupedAccounts[type] || [];
    const currentIdx = typeList.findIndex((a) => a.id === account.id);
    if (currentIdx === -1) return;
    if (direction === 'up' && currentIdx <= 0) return;
    if (direction === 'down' && currentIdx >= typeList.length - 1) return;

    const swapWith = typeList[direction === 'up' ? currentIdx - 1 : currentIdx + 1];
    const newAccounts = [...accounts];
    const posA = newAccounts.findIndex((a) => a.id === account.id);
    const posB = newAccounts.findIndex((a) => a.id === swapWith.id);

    if (posA !== -1 && posB !== -1) {
      const temp = newAccounts[posA];
      newAccounts[posA] = newAccounts[posB];
      newAccounts[posB] = temp;
      reorderAccounts(newAccounts);
      handleHaptic();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currColors.background, paddingTop: headerTopPadding }]}>
      {/* Minimal Top Header */}
      <View style={[styles.header, { borderBottomColor: currColors.border }]}>
        <BackButton />
        <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
          Reorder Accounts
        </ThemedText>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: '#00C9A7' }]}
          onPress={() => {
            handleHaptic();
            router.back();
          }}
          activeOpacity={0.8}
        >
          <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <ThemedText style={[styles.subNotice, { color: currColors.textSecondary }]}>
          Reorder categories and individual accounts to customize your dashboard hierarchy.
        </ThemedText>

        {effectiveTypesOrder.map((typeKey, typeIdx) => {
          const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.savings;
          const IconComp = config.icon;
          const typeAccounts = groupedAccounts[typeKey] || [];
          const isFirstType = typeIdx === 0;
          const isLastType = typeIdx === effectiveTypesOrder.length - 1;

          return (
            <View
              key={typeKey}
              style={[
                styles.sectionCard,
                { backgroundColor: currColors.card, borderColor: currColors.border },
              ]}
            >
              {/* Category Header Row */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.categoryIconWrap, { backgroundColor: `${config.color}15` }]}>
                    <IconComp size={16} color={config.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.categoryTitle, { color: currColors.text }]}>
                      {config.label}
                    </ThemedText>
                    <ThemedText style={[styles.categorySubtitle, { color: currColors.textSecondary }]}>
                      {typeAccounts.length} {typeAccounts.length === 1 ? 'account' : 'accounts'}
                    </ThemedText>
                  </View>
                </View>

                {/* Category Reorder Buttons */}
                <View style={styles.arrowButtonGroup}>
                  <TouchableOpacity
                    style={[
                      styles.arrowBtn,
                      { backgroundColor: currColors.cardSecondary },
                      isFirstType && { opacity: 0.25 },
                    ]}
                    disabled={isFirstType}
                    onPress={() => moveType(typeIdx, 'up')}
                    activeOpacity={0.7}
                  >
                    <ArrowUp size={15} color={currColors.text} strokeWidth={2.2} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.arrowBtn,
                      { backgroundColor: currColors.cardSecondary },
                      isLastType && { opacity: 0.25 },
                    ]}
                    disabled={isLastType}
                    onPress={() => moveType(typeIdx, 'down')}
                    activeOpacity={0.7}
                  >
                    <ArrowDown size={15} color={currColors.text} strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nested Accounts List */}
              {typeAccounts.length > 0 ? (
                <View
                  style={[
                    styles.accountListCard,
                    { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                  ]}
                >
                  {typeAccounts.map((acc, accIdx) => {
                    const isFirstAcc = accIdx === 0;
                    const isLastAcc = accIdx === typeAccounts.length - 1;
                    const isLastRow = accIdx === typeAccounts.length - 1;

                    return (
                      <View
                        key={acc.id}
                        style={[
                          styles.accountRow,
                          !isLastRow && [styles.rowBorder, { borderBottomColor: currColors.border }],
                        ]}
                      >
                        <View style={styles.accountRowLeft}>
                          {acc.logo ? (
                            <BankLogo logo={acc.logo} size={24} style={{ marginRight: 10 }} />
                          ) : (
                            <View
                              style={[
                                styles.accountDot,
                                { backgroundColor: acc.color || config.color },
                              ]}
                            />
                          )}
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <ThemedText
                              style={[styles.accountName, { color: currColors.text }]}
                              numberOfLines={1}
                            >
                              {acc.name}
                            </ThemedText>
                            <ThemedText
                              style={[styles.accountSub, { color: currColors.textSecondary }]}
                              numberOfLines={1}
                            >
                              {acc.institution ? `${acc.institution} • ` : ''}
                              {formatAmount(acc.balance)}
                            </ThemedText>
                          </View>
                        </View>

                        {/* Account Move Up / Down Buttons */}
                        <View style={styles.arrowButtonGroup}>
                          <TouchableOpacity
                            style={[
                              styles.smallArrowBtn,
                              { backgroundColor: currColors.card },
                              isFirstAcc && { opacity: 0.25 },
                            ]}
                            disabled={isFirstAcc}
                            onPress={() => moveAccountWithinType(acc, typeKey, 'up')}
                            activeOpacity={0.7}
                          >
                            <ArrowUp size={13} color={currColors.text} strokeWidth={2} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.smallArrowBtn,
                              { backgroundColor: currColors.card },
                              isLastAcc && { opacity: 0.25 },
                            ]}
                            disabled={isLastAcc}
                            onPress={() => moveAccountWithinType(acc, typeKey, 'down')}
                            activeOpacity={0.7}
                          >
                            <ArrowDown size={13} color={currColors.text} strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyNotice}>
                  <ThemedText style={{ fontSize: 12, color: currColors.textSecondary, fontStyle: 'italic' }}>
                    No accounts in this category
                  </ThemedText>
                </View>
              )}
            </View>
          );
        })}

        {/* Reset to Default Order Button */}
        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: currColors.card, borderColor: currColors.border }]}
          onPress={() => {
            handleHaptic();
            setAccountTypesOrder(DEFAULT_ORDER);
          }}
          activeOpacity={0.8}
        >
          <RotateCcw size={15} color={currColors.textSecondary} />
          <ThemedText style={[styles.resetButtonText, { color: currColors.textSecondary }]}>
            Reset Categories to Default Order
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.3,
  },
  doneBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  subNotice: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  categoryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  categorySubtitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  arrowButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountListCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accountRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  accountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  accountName: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  accountSub: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  smallArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyNotice: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
});
