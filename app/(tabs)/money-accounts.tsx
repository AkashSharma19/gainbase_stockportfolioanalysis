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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Line } from 'react-native-svg';
import {
  Plus,
  Wallet,
  Landmark,
  Activity,
  CreditCard,
  PiggyBank,
  Info,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
  Eye,
  EyeOff,
  PieChart,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Account, AccountType } from '@/types/money';
import { BankLogo } from '@/components/BankLogo';
import { Category3DIcon } from '@/components/Category3DIcon';
import { CATEGORY_3D_ICONS_LIST } from '@/constants/Category3DIcons';
import { getEffectiveLoanOutstanding } from '@/lib/finance';
import { getTicketCardPath } from '@/constants/folderTheme';


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

export default function AccountsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const [cardWidth, setCardWidth] = useState<number>(Dimensions.get('window').width - 32);

  const accounts = useMoneyStore((state) => state.accounts) || [];
  const loans = useMoneyStore((state) => state.loans) || [];
  const emiPayments = useMoneyStore((state) => state.emiPayments) || [];
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
  const togglePrivacyMode = usePortfolioStore((state) => state.togglePrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
  
  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  const getAllocationData = usePortfolioStore((state) => state.getAllocationData);

  const brokerAllocations = useMemo(() => {
    return getAllocationData('Broker');
  }, [getAllocationData, transactions, tickers]);

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

  // Aggregate assets and liabilities
  const summary = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0; // Credit Card debts are liabilities (when negative balance)
    
    accounts.forEach((acc) => {
      if (!acc.isArchived && acc.includeInAssets !== false) {
        const balance = acc.type === 'investment' && acc.linkedBroker
          ? (brokerAllocations.find(b => b.name.toLowerCase().trim() === acc.linkedBroker!.toLowerCase().trim())?.value ?? 0)
          : acc.balance;

        if (acc.type === 'credit_card' || acc.type === 'payable') {
          if (balance < 0) {
            totalLiabilities += Math.abs(balance);
          } else {
            totalAssets += balance;
          }
        } else {
          if (balance >= 0) {
            totalAssets += balance;
          } else {
            totalLiabilities += Math.abs(balance);
          }
        }
      }
    });

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    };
  }, [accounts, brokerAllocations]);

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

  const renderTicketHeroCard = () => {
    const h = 152;
    const notchY = 82;
    const notchR = 9;
    const path = getTicketCardPath(cardWidth, h, notchY, notchR, 22);
    const palette = { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' };

    return (
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - cardWidth) > 1) {
            setCardWidth(w);
          }
        }}
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          marginTop: 4,
          height: h,
          shadowColor: isDark ? '#000000' : palette.sub,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.06 : 0.12,
          shadowRadius: isDark ? 4 : 8,
          elevation: 2,
        }}
      >
        {/* SVG Ticket Shape Background */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={cardWidth} height={h}>
            <Path d={path} fill={palette.bg} />
            {/* Perforated dashed divider line */}
            <Line
              x1={notchR + 6}
              y1={notchY}
              x2={cardWidth - notchR - 6}
              y2={notchY}
              stroke={isDark ? palette.text + '35' : palette.sub + '45'}
              strokeWidth={1.2}
              strokeDasharray="5, 4"
            />
          </Svg>
        </View>

        {/* Top Ticket Section: Net Worth + Quick Actions */}
        <View
          style={{
            height: notchY,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <ThemedText
              style={{
                fontSize: 10,
                fontFamily: 'Outfit_700Bold',
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: palette.sub,
                marginBottom: 2,
              }}
            >
              TOTAL NET WORTH
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 24,
                fontFamily: 'Outfit_400Regular',
                color: palette.text,
              }}
              numberOfLines={1}
            >
              {formatAmount(summary.totalAssets - summary.totalLiabilities)}
            </ThemedText>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                togglePrivacyMode();
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: palette.text + '14',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              {isPrivacyMode ? (
                <EyeOff size={15} color={palette.text} />
              ) : (
                <Eye size={15} color={palette.text} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                router.push('/money-analytics');
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: palette.text + '14',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <PieChart size={15} color={palette.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Ticket Section: Total Assets & Liabilities */}
        <View
          style={{
            height: h - notchY,
            paddingHorizontal: 20,
            justifyContent: 'center',
          }}
        >
          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Total Assets
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#047857' }]}>
              {isPrivacyMode ? '••••••' : `+${formatAmount(summary.totalAssets)}`}
            </ThemedText>
          </View>

          <View style={[styles.heroRow, { marginBottom: 0 }]}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Liabilities
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#881337' }]}>
              {isPrivacyMode ? '••••••' : `-${formatAmount(summary.totalLiabilities)}`}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const renderAccountItem = (item: Account, index: number, totalCount: number) => {
    const isFirst = index === 0;
    const isLast = index === totalCount - 1;
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.savings;
    const isCreditCard = item.type === 'credit_card';

    // Find outstanding principal blocked on this credit card from linked loans
    const blockedAmount = isCreditCard
      ? loans
          .filter((l) => l.isActive && l.linkedAccountId === item.id)
          .reduce((sum, l) => sum + getEffectiveLoanOutstanding(l, emiPayments), 0)
      : 0;

    // Utilization rate for credit cards (includes spent balance + blocked EMI amount)
    const totalUtilized = Math.abs(item.balance) + blockedAmount;
    const utilization = isCreditCard && item.creditLimit && item.creditLimit > 0
      ? (totalUtilized / item.creditLimit) * 100
      : 0;

    const isInvestment = item.type === 'investment' && item.linkedBroker;
    const brokerAlloc = isInvestment
      ? brokerAllocations.find(b => b.name.toLowerCase().trim() === item.linkedBroker!.toLowerCase().trim())
      : null;
    const currentVal = isInvestment && brokerAlloc
      ? brokerAlloc.value
      : item.balance;

    // Subtitle formatted text (metadata only — amount is displayed on the right side)
    let subtitleText = '';
    if (isCreditCard) {
      const parts: string[] = [];
      if (item.institution) parts.push(item.institution);
      if (item.accountNumber) parts.push(`•••• ${item.accountNumber}`);
      if (item.creditLimit && item.creditLimit > 0) parts.push(`Limit ${formatAmount(item.creditLimit)}`);
      subtitleText = parts.length > 0 ? parts.join(' · ') : 'Credit Card';
    } else if (item.type === 'investment') {
      subtitleText = item.linkedBroker || item.institution || 'Investment Portfolio';
    } else if (item.type === 'receivable') {
      subtitleText = 'Receivable';
    } else if (item.type === 'payable') {
      subtitleText = 'Payable';
    } else if (item.type === 'emergency_fund') {
      subtitleText = item.institution ? `${item.institution} · Emergency Fund` : 'Emergency Reserve';
    } else {
      // Savings, Wallet, Cash, etc.
      const inst = item.institution || (item.type === 'wallet' ? 'Cash & Digital Wallet' : 'Bank Account');
      const acctNum = item.accountNumber ? ` •••• ${item.accountNumber}` : '';
      subtitleText = `${inst}${acctNum}`;
    }

    if (item.includeInAssets === false) {
      subtitleText += ' · Excluded';
    }

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.accountListItem,
          {
            backgroundColor: 'transparent',
            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
            borderBottomColor: currColors.border,
          },
          item.includeInAssets === false && { opacity: 0.55 }
        ]}
        activeOpacity={0.7}
        onPress={() => {
          handleHaptic();
          router.push(`/account-details/${item.id}`);
        }}
      >
        <View style={styles.cardMainRow}>
          {/* Left Side: Icon + Account Name & Subtitle */}
          <View style={styles.cardLeftContent}>
            <View style={styles.iconContainer}>
              {(() => {
                if (item.logo) {
                  return <BankLogo logo={item.logo} size={24} />;
                }

                if (item.type === 'wallet') {
                  const walletIcon = item.icon && item.icon.toLowerCase() !== 'wallet' ? item.icon : 'wallet';
                  return (
                    <Category3DIcon
                      name={walletIcon}
                      icon={walletIcon}
                      size={32}
                    />
                  );
                }

                if (item.type === 'receivable' || item.type === 'payable') {
                  const peerIcon = item.icon || (item.type === 'receivable' ? 'receivable' : 'payable');
                  return (
                    <Category3DIcon
                      name={peerIcon}
                      icon={peerIcon}
                      size={32}
                    />
                  );
                }

                if (item.icon && CATEGORY_3D_ICONS_LIST.find((i) => i.id === item.icon)) {
                  return (
                    <Category3DIcon
                      name={item.icon}
                      icon={item.icon}
                      size={32}
                    />
                  );
                }

                if (isCreditCard) {
                  return (
                    <Category3DIcon
                      name="credit_card"
                      icon="credit_card"
                      size={32}
                    />
                  );
                }

                if (item.type === 'investment') {
                  return (
                    <Category3DIcon
                      name="investments"
                      icon="investments"
                      size={32}
                    />
                  );
                }

                return (
                  <Category3DIcon
                    name="banknote"
                    icon="banknote"
                    size={32}
                  />
                );
              })()}
            </View>

            <View style={styles.accountTextContainer}>
              <ThemedText style={[styles.cardTitle, { color: currColors.text }]} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText style={[styles.cardSubtitle, { color: currColors.textSecondary }]} numberOfLines={1}>
                {subtitleText}
              </ThemedText>
            </View>
          </View>

          {/* Right Side: Amount Only + Secondary Metric */}
          <View style={styles.cardRightContent}>
            <ThemedText
              style={[
                styles.amountText,
                {
                  color: (currentVal < 0 || isCreditCard)
                    ? (currentVal < 0 ? '#B91C1C' : currColors.text)
                    : currColors.text,
                }
              ]}
              numberOfLines={1}
            >
              {formatAmount(currentVal)}
            </ThemedText>

            {isInvestment && brokerAlloc ? (
              <ThemedText
                style={{
                  fontSize: 11,
                  fontFamily: 'Outfit_600SemiBold',
                  color: brokerAlloc.pnl >= 0 ? '#047857' : '#B91C1C',
                  marginTop: 2,
                }}
              >
                {brokerAlloc.pnl >= 0 ? '+' : ''}{brokerAlloc.pnlPercentage.toFixed(1)}%
              </ThemedText>
            ) : isCreditCard && item.creditLimit && item.creditLimit > 0 ? (
              <ThemedText
                style={{
                  fontSize: 11,
                  fontFamily: 'Outfit_500Medium',
                  color: utilization > 70 ? '#DC2626' : utilization > 30 ? '#D97706' : currColors.textSecondary,
                  marginTop: 2,
                }}
              >
                {utilization.toFixed(0)}% used
              </ThemedText>
            ) : null}
          </View>
        </View>

        {isCreditCard && item.creditLimit && item.creditLimit > 0 ? (
          <View style={styles.utilizationContainer}>
            <View style={[styles.progressBarBG, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${Math.min(100, utilization)}%`,
                    backgroundColor: utilization > 70 ? '#DC2626' : utilization > 30 ? '#D97706' : '#059669'
                  }
                ]} 
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
              <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                {utilization.toFixed(0)}% Utilized
              </ThemedText>
              <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_400Regular' }}>
                Limit: {formatAmount(item.creditLimit)}
              </ThemedText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
              <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_400Regular' }}>
                Available: {formatAmount(item.creditLimit - totalUtilized)}
              </ThemedText>
              {blockedAmount > 0 && (
                <ThemedText style={{ fontSize: 10, color: '#D97706', fontFamily: 'Outfit_500Medium' }}>
                  Blocked: {formatAmount(blockedAmount)}
                </ThemedText>
              )}
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
              Accounts
            </ThemedText>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2.5,
                borderRadius: 12,
                backgroundColor: '#D1F5EC',
              }}
            >
              <ThemedText
                style={{
                  fontSize: 11,
                  fontFamily: 'Outfit_600SemiBold',
                  color: '#064E3B',
                }}
              >
                {accounts.filter(a => !a.isArchived).length}
              </ThemedText>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.actionHeaderBtn, { backgroundColor: currColors.cardSecondary }]}
            onPress={() => {
              handleHaptic();
              router.push('/reorder-accounts');
            }}
            activeOpacity={0.7}
          >
            <ArrowUpDown size={18} color={currColors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          {/* Mint Ticket-Style Net Worth Hero Card */}
          {renderTicketHeroCard()}

          {/* Render accounts grouped by customized type order */}
          {effectiveTypesOrder.map((type) => {
            const list = groupedAccounts[type];
            if (!list || list.length === 0) return null;
            const config = TYPE_CONFIG[type] || TYPE_CONFIG.savings;
            const totalBalance = list.reduce((sum, acc) => {
              if (acc.includeInAssets === false) return sum;
              const balance = acc.type === 'investment' && acc.linkedBroker
                ? (brokerAllocations.find(b => b.name.toLowerCase().trim() === acc.linkedBroker!.toLowerCase().trim())?.value ?? 0)
                : acc.balance;
              return sum + balance;
            }, 0);
            
            return (
              <View key={type} style={styles.groupContainer}>
                <View style={styles.groupHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ThemedText type="medium" style={[styles.groupTitle, { color: currColors.textSecondary }]}>
                      {config.label.toUpperCase()}
                    </ThemedText>
                    <View
                      style={{
                        paddingHorizontal: 7,
                        paddingVertical: 1.5,
                        borderRadius: 10,
                        backgroundColor: currColors.cardSecondary,
                      }}
                    >
                      <ThemedText
                        style={{
                          fontSize: 10.5,
                          fontFamily: 'Outfit_600SemiBold',
                          color: currColors.textSecondary,
                        }}
                      >
                        {list.length}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText 
                    style={[
                      styles.groupTotalText, 
                      { 
                        color: totalBalance < 0 ? '#FF3B30' : currColors.text,
                      }
                    ]}
                  >
                    {formatAmount(totalBalance)}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.groupWrapperCard,
                    {
                      backgroundColor: currColors.card,
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isDark ? 0.08 : 0.05,
                      shadowRadius: 6,
                      elevation: 2,
                    },
                  ]}
                >
                  {list.map((item, index) => renderAccountItem(item, index, list.length))}
                </View>
              </View>
            );
          })}

          {accounts.filter(a => !a.isArchived).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Info size={44} color={currColors.textSecondary} style={{ marginBottom: 16 }} />
              <ThemedText style={[styles.emptyText, { color: currColors.textSecondary, fontFamily: 'Outfit_400Regular', lineHeight: 22 }]}>
                No accounts added yet. Tap the '+' button below to add your wallet, bank accounts, or credit cards.
              </ThemedText>
            </View>
          ) : null}
        </ScrollView>

        {/* Floating Add Button above Nav Bar Dock */}
        <TouchableOpacity
          style={[
            styles.floatingAddBtn,
            {
              bottom: Math.max(insets.bottom, 12) + 74,
              backgroundColor: '#D1F5EC',
              shadowColor: '#000000',
            },
          ]}
          onPress={() => {
            handleHaptic();
            router.push('/add-account');
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.82}
        >
          <Plus size={24} color="#064E3B" strokeWidth={2.6} />
        </TouchableOpacity>
      </SafeAreaView>
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
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  actionHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingAddBtn: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroRowLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  heroRowValue: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  scrollContent: {
    paddingBottom: 160,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  groupTotalText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  groupWrapperCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  accountListItem: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  accountTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
  cardRightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  utilizationContainer: {
    width: '100%',
    marginTop: 10,
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
    paddingHorizontal: 36,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
