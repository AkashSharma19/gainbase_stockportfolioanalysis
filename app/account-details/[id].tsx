import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Edit2,
  Trash2,
  Receipt,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackButton } from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Category3DIcon } from '@/components/Category3DIcon';
import { BankLogo } from '@/components/BankLogo';
import { CATEGORY_3D_ICONS_LIST } from '@/constants/Category3DIcons';
import { getEffectiveLoanOutstanding } from '@/lib/finance';
import { MoneyTransaction } from '@/types/money';

export default function AccountDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 32);
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  const {
    accounts,
    moneyTransactions,
    loans,
    emiPayments,
    removeAccount,
    removeMoneyTransaction,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  const getAllocationData = usePortfolioStore((state) => state.getAllocationData);

  const brokerAllocations = useMemo(() => {
    return getAllocationData('Broker');
  }, [getAllocationData, transactions, tickers]);

  const account = useMemo(() => {
    return accounts.find((acc) => acc.id === id);
  }, [id, accounts]);

  // Account palette in unified native theme
  const palette = useMemo(() => {
    return {
      bg: currColors.card,
      text: currColors.text,
      sub: currColors.textSecondary,
      border: currColors.border,
    };
  }, [currColors]);

  // Filter transactions associated with this account (sorted newest first)
  const accountTxs = useMemo(() => {
    return moneyTransactions
      .filter(
        (tx) => tx.accountId === id || (tx.type === 'transfer' && tx.toAccountId === id)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [id, moneyTransactions]);

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

  // Blocked amounts from active loans linked to this credit card account
  const blockedAmount = useMemo(() => {
    if (!account || account.type !== 'credit_card') return 0;
    return loans
      .filter((l) => l.isActive && l.linkedAccountId === account.id)
      .reduce((sum, l) => sum + getEffectiveLoanOutstanding(l, emiPayments), 0);
  }, [account, loans, emiPayments]);

  // Credit card utilization %
  const utilization = useMemo(() => {
    if (
      !account ||
      account.type !== 'credit_card' ||
      !account.creditLimit ||
      account.creditLimit <= 0
    ) {
      return 0;
    }
    const totalUtilized = Math.abs(account.balance) + blockedAmount;
    return (totalUtilized / account.creditLimit) * 100;
  }, [account, blockedAmount]);

  // Investment account broker allocation stats
  const brokerAlloc = useMemo(() => {
    if (!account || account.type !== 'investment' || !account.linkedBroker) return null;
    return brokerAllocations.find(
      (b) => b.name.toLowerCase().trim() === account.linkedBroker!.toLowerCase().trim()
    );
  }, [account, brokerAllocations]);

  // Effective balance (evaluated live for linked broker investment accounts)
  const effectiveBalance = useMemo(() => {
    if (!account) return 0;
    if (account.type === 'investment' && account.linkedBroker && brokerAlloc) {
      return brokerAlloc.value;
    }
    return account.balance;
  }, [account, brokerAlloc]);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDeleteAccount = () => {
    handleHaptic();
    if (!account) return;

    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${account.name}"? This will not delete associated transactions but they will lose their account link.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeAccount(account.id);
            router.back();
          },
        },
      ]
    );
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

  // Helper for human-friendly group date header matching all-money-transactions
  const getGroupDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const txDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const diffDays = Math.round((today.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';

    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    });
  };

  // Group transactions by day for modern date-grouped card architecture
  const groupedTransactions = useMemo(() => {
    const map: Record<string, MoneyTransaction[]> = {};
    const order: string[] = [];

    accountTxs.forEach((tx) => {
      const d = new Date(tx.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      if (!map[dateKey]) {
        map[dateKey] = [];
        order.push(dateKey);
      }
      map[dateKey].push(tx);
    });

    return order.map((dateKey) => ({
      dateKey,
      label: getGroupDateLabel(map[dateKey][0].date),
      data: map[dateKey],
    }));
  }, [accountTxs]);

  // Subtitle metadata for Hero Card with deduplication against account name
  const heroSubtitle = useMemo(() => {
    if (!account) return '';
    const parts: string[] = [];
    const nameLower = (account.name || '').toLowerCase().trim();

    // Check if a string or its significant words are already in the account name (normalized across spaces and punctuation)
    const isRedundantWithName = (str?: string) => {
      if (!str) return true;
      const clean = str.toLowerCase().trim();
      if (!clean) return true;

      // 1. Direct normalized comparison ignoring spaces, punctuation, casing (e.g. "IND Money" vs "INDmoney")
      const normName = nameLower.replace(/[^a-z0-9]/g, '');
      const normStr = clean.replace(/[^a-z0-9]/g, '');
      if (normName && normStr && (normName.includes(normStr) || normStr.includes(normName))) {
        return true;
      }

      // 2. Strip generic stop words from both and compare normalized stems
      const stopWords =
        /bank|financial|services|limited|ltd|corp|corporation|account|accounts|fund|funds|card|cards|reserve|digital|investment|investments|portfolio|broker|money/gi;
      const strippedName = nameLower.replace(stopWords, '').replace(/[^a-z0-9]/g, '');
      const strippedStr = clean.replace(stopWords, '').replace(/[^a-z0-9]/g, '');
      if (
        strippedName &&
        strippedStr &&
        (strippedName.includes(strippedStr) || strippedStr.includes(strippedName))
      ) {
        return true;
      }

      // 3. Significant word-level overlap
      const words = clean
        .replace(stopWords, '')
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 2);
      return (
        words.length > 0 &&
        words.some((w) => normName.includes(w.replace(/[^a-z0-9]/g, '')))
      );
    };

    // 1. Institution / Bank / Broker (only if not redundant with name)
    if (account.institution && !isRedundantWithName(account.institution)) {
      parts.push(account.institution);
    } else if (account.type === 'investment' && account.linkedBroker && !isRedundantWithName(account.linkedBroker)) {
      parts.push(account.linkedBroker);
    }

    // 2. Account number: e.g. "•••• 4021"
    if (account.accountNumber) {
      const cleanNum = account.accountNumber.replace(/[^0-9]/g, '');
      const last4 = cleanNum.length >= 4 ? cleanNum.slice(-4) : cleanNum;
      if (last4) {
        parts.push(`•••• ${last4}`);
      }
    }

    // 3. Fallback type only if nothing else is shown and type is not redundant with name
    if (parts.length === 0 && !account.institution && !account.accountNumber) {
      if (account.type === 'wallet' && !nameLower.includes('wallet') && !nameLower.includes('cash')) {
        parts.push('Digital Wallet');
      }
    }

    return parts.join(' • ');
  }, [account]);

  if (!account) {
    return (
      <View style={[styles.container, { backgroundColor: currColors.background }]}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
        <View style={[styles.header, { paddingTop: headerTopPadding, paddingBottom: 12 }]}>
          <BackButton />
        </View>
        <View style={styles.centered}>
          <ThemedText style={{ color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
            Account not found.
          </ThemedText>
        </View>
      </View>
    );
  }

  const isCreditCard = account.type === 'credit_card';

  // Render Account Icon or Brand Logo
  const renderAccountIcon = () => {
    if (account.logo) {
      return <BankLogo logo={account.logo} size={28} />;
    }

    if (account.type === 'wallet') {
      const walletIcon =
        account.icon && account.icon.toLowerCase() !== 'wallet' ? account.icon : 'wallet';
      return <Category3DIcon name={walletIcon} icon={walletIcon} size={36} />;
    }

    if (account.type === 'receivable' || account.type === 'payable') {
      const peerIcon =
        account.icon || (account.type === 'receivable' ? 'receivable' : 'payable');
      return <Category3DIcon name={peerIcon} icon={peerIcon} size={36} />;
    }

    if (account.icon && CATEGORY_3D_ICONS_LIST.find((i) => i.id === account.icon)) {
      return <Category3DIcon name={account.icon} icon={account.icon} size={36} />;
    }

    if (isCreditCard) {
      return <Category3DIcon name="credit_card" icon="credit_card" size={36} />;
    }

    if (account.type === 'investment') {
      return <Category3DIcon name="investments" icon="investments" size={36} />;
    }

    return <Category3DIcon name="banknote" icon="banknote" size={36} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />

      {/* ─── Header: Back Button on left, Joined Action Capsule on right ─── */}
      <View style={[styles.header, { paddingTop: headerTopPadding, paddingBottom: 12 }]}>
        <BackButton />

        <View style={{ flex: 1 }} />

        {/* Joined Edit & Delete Action Capsule Pill */}
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
              router.push({ pathname: '/add-account', params: { id: account.id } });
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
          >
            <Edit2 size={16} color={currColors.text} strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={[styles.capsuleDivider, { backgroundColor: currColors.border }]} />

          <TouchableOpacity
            style={styles.capsuleBtn}
            onPress={handleDeleteAccount}
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
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* ─── 1. Account Summary Hero Card (Unified Native Theme) ─── */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: currColors.card,
              borderColor: currColors.border,
            },
          ]}
        >
          {/* Header Row: Title & Subtitle on left, Account Icon/Logo on right */}
          <View style={styles.heroHeaderRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <ThemedText
                style={[styles.heroHeaderTitle, { color: palette.text }]}
                numberOfLines={2}
              >
                {account.name}
              </ThemedText>
              {heroSubtitle ? (
                <ThemedText
                  style={[styles.heroHeaderSubtitle, { color: palette.sub }]}
                  numberOfLines={1}
                >
                  {heroSubtitle}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.heroIconWrapper}>
              {renderAccountIcon()}
            </View>
          </View>

          {/* Balance Section */}
          <View
            style={[
              styles.heroBalanceBlock,
              !isCreditCard &&
                !(account.type === 'investment' && account.linkedBroker) && {
                  marginBottom: 0,
                },
            ]}
          >
            <ThemedText style={[styles.heroBalanceLabel, { color: palette.sub }]}>
              {account.type === 'investment' && account.linkedBroker
                ? `PORTFOLIO CURRENT VALUE (LINKED: ${account.linkedBroker.toUpperCase()})`
                : isCreditCard
                ? 'CURRENT OUTSTANDING'
                : 'AVAILABLE BALANCE'}
            </ThemedText>
            <ThemedText
              style={[styles.heroBalanceValue, { color: palette.text }]}
              numberOfLines={1}
            >
              {formatAmount(effectiveBalance)}
            </ThemedText>
          </View>

          {/* Investment Context: Invested Capital & Returns Badge */}
          {account.type === 'investment' && account.linkedBroker && (
            <View style={styles.investmentStatsRow}>
              <ThemedText style={[styles.investedLabel, { color: palette.sub }]}>
                Invested:{' '}
                <ThemedText style={[styles.investedVal, { color: palette.text }]}>
                  {formatAmount(account.balance)}
                </ThemedText>
              </ThemedText>

              {brokerAlloc && (
                <View
                  style={[
                    styles.returnPillBadge,
                    {
                      backgroundColor:
                        brokerAlloc.pnl >= 0 ? '#34C75924' : '#FF3B3024',
                    },
                  ]}
                >
                  {brokerAlloc.pnl >= 0 ? (
                    <TrendingUp size={12} color="#34C759" style={{ marginRight: 4 }} />
                  ) : (
                    <TrendingDown size={12} color="#FF3B30" style={{ marginRight: 4 }} />
                  )}
                  <ThemedText
                    style={[
                      styles.returnPillText,
                      { color: brokerAlloc.pnl >= 0 ? '#34C759' : '#FF3B30' },
                    ]}
                  >
                    {brokerAlloc.pnl >= 0 ? '+' : ''}
                    {formatAmount(brokerAlloc.pnl)} ({brokerAlloc.pnl >= 0 ? '+' : ''}
                    {brokerAlloc.pnlPercentage.toFixed(1)}%)
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {/* Credit Card Context: 3-column stats & utilization meter */}
          {isCreditCard && account.creditLimit ? (
            <View style={styles.creditCardSection}>
              {/* 3-Column Metrics */}
              <View style={styles.creditStatsGrid}>
                <View style={styles.creditStatCol}>
                  <ThemedText style={[styles.creditStatLabel, { color: palette.sub }]}>
                    Credit Limit
                  </ThemedText>
                  <ThemedText style={[styles.creditStatValue, { color: palette.text }]}>
                    {formatAmount(account.creditLimit)}
                  </ThemedText>
                </View>

                {blockedAmount > 0 && (
                  <View style={styles.creditStatCol}>
                    <ThemedText style={[styles.creditStatLabel, { color: palette.sub }]}>
                      Blocked (EMI)
                    </ThemedText>
                    <ThemedText style={[styles.creditStatValue, { color: '#FF9500' }]}>
                      {formatAmount(blockedAmount)}
                    </ThemedText>
                  </View>
                )}

                <View style={styles.creditStatCol}>
                  <ThemedText style={[styles.creditStatLabel, { color: palette.sub }]}>
                    Available Limit
                  </ThemedText>
                  <ThemedText style={[styles.creditStatValue, { color: palette.text }]}>
                    {formatAmount(
                      Math.max(
                        0,
                        account.creditLimit - (Math.abs(account.balance) + blockedAmount)
                      )
                    )}
                  </ThemedText>
                </View>
              </View>

              {/* Utilization Progress Bar */}
              <View
                style={[
                  styles.creditMeterTrack,
                  { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
                ]}
              >
                <View
                  style={[
                    styles.creditMeterFill,
                    {
                      width: `${Math.min(100, Math.max(0, utilization))}%`,
                      backgroundColor:
                        utilization > 70
                          ? '#FF3B30'
                          : utilization > 30
                          ? '#FF9500'
                          : '#34C759',
                    },
                  ]}
                />
              </View>

              {/* Warning Pill if Utilization is high or moderate */}
              {utilization > 30 && (
                <View
                  style={[
                    styles.utilizationWarningPill,
                    {
                      backgroundColor:
                        utilization > 70 ? '#FF3B3020' : '#FF950020',
                      borderColor:
                        utilization > 70 ? '#FF3B3040' : '#FF950040',
                    },
                  ]}
                >
                  <AlertCircle
                    size={13}
                    color={utilization > 70 ? '#FF3B30' : '#FF9500'}
                    style={{ marginRight: 6 }}
                  />
                  <ThemedText
                    style={[
                      styles.utilizationWarningText,
                      { color: utilization > 70 ? '#FF3B30' : '#FF9500' },
                    ]}
                  >
                    {utilization.toFixed(0)}% utilization (
                    {utilization > 70 ? 'High' : 'Moderate'}).
                  </ThemedText>
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* ─── 2. Transaction History Section ─── */}
        <View style={styles.sectionHeaderRow}>
          <ThemedText
            style={[styles.sectionHeaderTitle, { color: currColors.textSecondary }]}
          >
            TRANSACTION HISTORY
          </ThemedText>
          <View
            style={[
              styles.countBadgePill,
              { backgroundColor: currColors.cardSecondary },
            ]}
          >
            <ThemedText
              style={[styles.countBadgePillText, { color: currColors.textSecondary }]}
            >
              {accountTxs.length}
            </ThemedText>
          </View>
        </View>

        {/* Transaction History Groups or Empty State */}
        {accountTxs.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: currColors.card,
                borderColor: isDark ? 'transparent' : currColors.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: currColors.cardSecondary },
              ]}
            >
              <Receipt size={22} color={currColors.textSecondary} />
            </View>
            <ThemedText style={[styles.emptyTitle, { color: currColors.text }]}>
              No Transactions Yet
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: currColors.textSecondary }]}>
              Transactions associated with this account will automatically appear here.
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.emptyActionBtn,
                { backgroundColor: isDark ? '#FFFFFF' : '#1C1917' },
              ]}
              onPress={() => {
                handleHaptic();
                router.push({
                  pathname: '/add-money-transaction',
                  params: { defaultAccountId: account.id },
                });
              }}
              activeOpacity={0.8}
            >
              <ThemedText
                style={[
                  styles.emptyActionBtnText,
                  { color: isDark ? '#000000' : '#FFFFFF' },
                ]}
              >
                + Log First Transaction
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.groupsContainer}>
            {groupedTransactions.map((group) => (
              <View key={group.dateKey} style={styles.dateGroupWrapper}>
                {/* Date Header */}
                <ThemedText
                  style={[styles.dateGroupHeader, { color: currColors.textSecondary }]}
                >
                  {group.label}
                </ThemedText>

                {/* Connected Card Group */}
                <View
                  style={[
                    styles.dateGroupCard,
                    {
                      backgroundColor: currColors.card,
                      borderColor: isDark ? 'transparent' : currColors.border,
                    },
                  ]}
                >
                  {group.data.map((tx, index) => {
                    const isSource = tx.accountId === id;
                    const isIncome = tx.type === 'income';
                    const isTransfer = tx.type === 'transfer';
                    const isLast = index === group.data.length - 1;

                    // Counterparty account for transfers
                    const otherAccount = isTransfer
                      ? isSource
                        ? accounts.find((a) => a.id === tx.toAccountId)
                        : accounts.find((a) => a.id === tx.accountId)
                      : null;

                    // Primary Title
                    const primaryTitle =
                      tx.note && tx.note.trim()
                        ? tx.note.trim()
                        : isTransfer
                        ? isSource
                          ? `Transfer to ${otherAccount?.name || 'Account'}`
                          : `Transfer from ${otherAccount?.name || 'Account'}`
                        : tx.category;

                    // Secondary Subtitle
                    const secondarySubtitle =
                      tx.note && tx.note.trim()
                        ? isTransfer
                          ? isSource
                            ? `Sent to ${otherAccount?.name || 'Account'}`
                            : `Received from ${otherAccount?.name || 'Account'}`
                          : tx.category
                        : isTransfer
                        ? 'Account Transfer'
                        : isIncome
                        ? 'Income'
                        : 'Expense';

                    // Display amount & color
                    let displayAmount = tx.amount;
                    let txColor = currColors.text;

                    if (isTransfer) {
                      displayAmount = isSource ? -tx.amount : tx.amount;
                      txColor = isSource ? '#FF9500' : '#34C759';
                    } else if (isIncome) {
                      displayAmount = tx.amount;
                      txColor = '#34C759';
                    } else {
                      displayAmount = -tx.amount;
                      txColor = '#FF3B30';
                    }

                    return (
                      <TouchableOpacity
                        key={tx.id}
                        style={[
                          styles.txRowItem,
                          {
                            borderBottomColor: currColors.border,
                            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                          },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          handleHaptic();
                          router.push({
                            pathname: '/add-money-transaction',
                            params: { id: tx.id },
                          });
                        }}
                        onLongPress={() => handleDeleteTransaction(tx.id)}
                      >
                        {/* Left: 3D Category Icon */}
                        <View style={styles.txRowLeft}>
                          <Category3DIcon
                            name={isTransfer ? 'Transfer' : tx.category}
                            icon={isTransfer ? 'transfer' : undefined}
                            size={36}
                            style={{ marginRight: 12 }}
                          />
                          <View style={styles.txInfoCol}>
                            <ThemedText
                              style={[styles.txPrimaryText, { color: currColors.text }]}
                              numberOfLines={1}
                            >
                              {primaryTitle}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.txSecondaryText,
                                { color: currColors.textSecondary },
                              ]}
                              numberOfLines={1}
                            >
                              {secondarySubtitle}
                            </ThemedText>
                          </View>
                        </View>

                        {/* Right: Amount */}
                        <View style={styles.txRowRight}>
                          <ThemedText style={[styles.txAmountText, { color: txColor }]}>
                            {displayAmount > 0 ? '+' : ''}
                            {formatAmount(displayAmount)}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  },
  actionCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 4,
    height: 38,
  },
  capsuleBtn: {
    paddingHorizontal: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsuleDivider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
  },
  scrollContent: {
    paddingTop: 8,
  },

  // ─── Hero Card ───
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 20,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroHeaderTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.3,
  },
  heroHeaderSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    marginTop: 3,
  },
  heroIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBalanceBlock: {
    marginBottom: 16,
  },
  heroBalanceLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroBalanceValue: {
    fontSize: 28,
    fontFamily: 'Outfit_400Regular',
    letterSpacing: -0.5,
  },

  // Investment Context
  investmentStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  investedLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  investedVal: {
    fontFamily: 'Outfit_600SemiBold',
  },
  returnPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  returnPillText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Credit Card Context
  creditCardSection: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  creditStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  creditStatCol: {
    flex: 1,
  },
  creditStatLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    marginBottom: 3,
  },
  creditStatValue: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  creditMeterTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  creditMeterFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  utilizationWarningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  utilizationWarningText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    flex: 1,
  },

  // ─── Transaction Section Header ───
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  countBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgePillText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },

  // ─── Modern Date Grouped Card System ───
  groupsContainer: {
    marginHorizontal: 16,
  },
  dateGroupWrapper: {
    marginBottom: 16,
  },
  dateGroupHeader: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 2,
  },
  dateGroupCard: {
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  txRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  txRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  txInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  txPrimaryText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  txSecondaryText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  txRowRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  txAmountText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },

  // ─── Empty State ───
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 240,
  },
  emptyActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
});
