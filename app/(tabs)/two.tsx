import React, { memo, useMemo, useState, useRef } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
  Plus,
  Search,
  XCircle,
  Info,
  Layers,
} from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/ThemedText';
import { BackButton } from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ticker, Transaction } from '@/types';
import { getCompanyLogoUrl } from '@/services/logoService';

// Human-friendly date group label helper
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

// Company Logo / Stock Ticker Icon Component matching Investment > Analytics > Company
const StockTransactionIcon = memo(
  ({
    ticker,
    isBuy,
    symbol,
    displayName,
    currColors,
  }: {
    ticker?: Ticker;
    isBuy: boolean;
    symbol: string;
    displayName: string;
    currColors: any;
  }) => {
    const symbolLetter =
      ticker?.['Company Name']?.[0]?.toUpperCase() ||
      symbol[0]?.toUpperCase() ||
      '?';

    const logoUri = ticker?.Logo || getCompanyLogoUrl(symbol, displayName);
    const [imgError, setImgError] = useState(false);

    return (
      <View style={styles.assetIconContainer}>
        {logoUri && !imgError ? (
          <View style={styles.logoWrapper}>
            <Image
              source={{ uri: logoUri }}
              style={styles.logoImage}
              resizeMode="contain"
              onError={() => setImgError(true)}
            />
          </View>
        ) : (
          <View style={[styles.fallbackIconWrapper, { backgroundColor: currColors.cardSecondary }]}>
            <ThemedText style={[styles.iconLetter, { color: currColors.text }]}>
              {symbolLetter}
            </ThemedText>
          </View>
        )}
        <View
          style={[
            styles.badgeContainer,
            { backgroundColor: isBuy ? '#34C759' : '#FF3B30' },
          ]}
        >
          {isBuy ? (
            <ArrowDownLeft size={8} color="#FFF" strokeWidth={3} />
          ) : (
            <ArrowUpRight size={8} color="#FFF" strokeWidth={3} />
          )}
        </View>
      </View>
    );
  },
);

export default function InvestmentsTransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    transactions,
    tickers,
    removeTransaction,
    isPrivacyMode,
    showCurrencySymbol,
    getAllocationData,
  } = usePortfolioStore();

  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const activeFilterBg = colorScheme === 'dark' ? '#00C9A7' : '#00876E';

  const [activeTypeFilter, setActiveTypeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [activeAssetType, setActiveAssetType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const tickerMap = useMemo(() => {
    return new Map(tickers.map((t) => [t.Tickers.toUpperCase(), t]));
  }, [tickers]);

  const assetTypeCategories = useMemo(() => {
    const allocation = getAllocationData('Asset Type');
    return ['All', ...allocation.map((a) => a.name)];
  }, [getAllocationData, transactions, tickers]);

  // Filtered transactions sorted by date descending
  const filteredTransactions = useMemo(() => {
    let result = [...transactions].sort((a, b) => {
      const dateA = typeof a.date === 'string' ? a.date : '';
      const dateB = typeof b.date === 'string' ? b.date : '';
      return dateB.localeCompare(dateA);
    });

    // Type Filter (BUY/SELL)
    if (activeTypeFilter !== 'ALL') {
      result = result.filter((t) => t.type === activeTypeFilter);
    }

    // Asset Type Filter
    if (activeAssetType !== 'All') {
      result = result.filter((t) => {
        const ticker = tickerMap.get(t.symbol.toUpperCase());
        return ticker?.['Asset Type'] === activeAssetType;
      });
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((t) => {
        const ticker = tickerMap.get(t.symbol.toUpperCase());
        const companyName = ticker?.['Company Name'] || t.symbol;
        const broker = t.broker || '';
        return (
          companyName.toLowerCase().includes(query) ||
          t.symbol.toLowerCase().includes(query) ||
          broker.toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [transactions, activeTypeFilter, activeAssetType, searchQuery, tickerMap]);

  // Date-grouped transactions matching Money Manager architecture
  const groupedTransactions = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    const order: string[] = [];

    filteredTransactions.forEach((tx) => {
      const d = new Date(tx.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  }, [filteredTransactions]);

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '••••••';
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const symbol = showCurrencySymbol ? '₹' : '';
    return `${symbol}${formatted}`;
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEdit = (id: string) => {
    router.push({ pathname: '/add-transaction', params: { id } });
  };

  const handleDelete = (id: string, name: string) => {
    handleHaptic();
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this transaction for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeTransaction(id);
          },
        },
      ],
    );
  };

  const handlePressSymbol = (symbol: string) => {
    handleHaptic();
    router.push(`/stock-details/${symbol}`);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: currColors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Search & Header Row */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <BackButton />
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: currColors.card, borderColor: currColors.border, borderWidth: 1, flex: 1 },
            ]}
          >
            <Search
              size={16}
              color={currColors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: currColors.text }]}
              placeholder="Search investments or brokers..."
              placeholderTextColor={currColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <XCircle
                  size={16}
                  color={currColors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border, borderWidth: 1 }]}
            onPress={() => {
              handleHaptic();
              router.push('/add-transaction');
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Plus size={20} color={activeFilterBg} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips matching Money Manager Tabs */}
      <View style={styles.filterStripWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterStripScroll}
          bounces={false}
        >
          {/* BUY/SELL Segment Chips */}
          {(['ALL', 'BUY', 'SELL'] as const).map((typeKey) => {
            const isSelected = activeTypeFilter === typeKey;
            const label = typeKey === 'ALL' ? 'All Types' : typeKey === 'BUY' ? 'Bought (Buy)' : 'Sold (Sell)';
            return (
              <TouchableOpacity
                key={typeKey}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? activeFilterBg : currColors.card,
                    borderColor: isSelected ? activeFilterBg : currColors.border,
                  },
                ]}
                onPress={() => {
                  handleHaptic();
                  setActiveTypeFilter(typeKey);
                }}
                activeOpacity={0.7}
              >
                <ThemedText
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : currColors.textSecondary },
                    isSelected && { fontFamily: 'Outfit_600SemiBold' },
                  ]}
                >
                  {label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}

          {/* Asset Type Categories */}
          {assetTypeCategories.length > 2 &&
            assetTypeCategories
              .filter((c) => c !== 'All')
              .map((cat) => {
                const isSelected = activeAssetType === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? activeFilterBg : currColors.card,
                        borderColor: isSelected ? activeFilterBg : currColors.border,
                      },
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setActiveAssetType(isSelected ? 'All' : cat);
                    }}
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      style={[
                        styles.filterChipText,
                        { color: isSelected ? '#FFFFFF' : currColors.textSecondary },
                        isSelected && { fontFamily: 'Outfit_600SemiBold' },
                      ]}
                    >
                      {cat}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Info size={36} color={currColors.textSecondary} style={{ marginBottom: 12 }} />
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', lineHeight: 22 }}>
              No investment transactions match the selected filter.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.groupsContainer}>
            {groupedTransactions.map((group) => (
              <View key={group.dateKey} style={styles.dateGroupWrapper}>
                <ThemedText style={[styles.dateGroupHeader, { color: currColors.text }]}>
                  {group.label}
                </ThemedText>

                <View
                  style={[
                    styles.dateGroupCard,
                    {
                      backgroundColor: currColors.card,
                      borderColor: currColors.border,
                    },
                  ]}
                >
                  {group.data.map((tx, index) => {
                    const symUpper = (tx.symbol || '').toString().trim().toUpperCase();
                    const ticker = tickerMap.get(symUpper);
                    const isBuy = tx.type === 'BUY';
                    const isLast = index === group.data.length - 1;
                    const totalValue = (tx.quantity || 0) * (tx.price || 0);
                    const displayName = ticker?.['Company Name'] || tx.symbol || 'Unknown';
                    const brokerInfo = tx.broker?.trim() ? ` • ${tx.broker.trim()}` : '';

                    const renderRightActions = () => (
                      <View style={styles.rightActions}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[styles.actionButton, styles.editButton]}
                          onPress={() => handleEdit(String(tx.id))}
                        >
                          <Edit2 size={16} color="#FFF" />
                          <ThemedText style={styles.actionText}>Edit</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => handleDelete(String(tx.id), displayName)}
                        >
                          <Trash2 size={16} color="#FFF" />
                          <ThemedText style={styles.actionText}>Delete</ThemedText>
                        </TouchableOpacity>
                      </View>
                    );

                    return (
                      <Swipeable
                        key={tx.id}
                        renderRightActions={renderRightActions}
                        friction={2}
                        rightThreshold={30}
                        overshootRight={false}
                        containerStyle={{ backgroundColor: currColors.card }}
                      >
                        <TouchableOpacity
                          style={[
                            styles.txRowItem,
                            {
                              borderBottomColor: currColors.border,
                              borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                            },
                          ]}
                          activeOpacity={0.7}
                          onPress={() => handlePressSymbol(tx.symbol)}
                          onLongPress={() => {
                            handleHaptic();
                            Alert.alert(
                              `${displayName} (${tx.type})`,
                              `Qty: ${tx.quantity} @ ${showCurrencySymbol ? '₹' : ''}${tx.price.toLocaleString('en-IN')}\nTotal: ${showCurrencySymbol ? '₹' : ''}${totalValue.toLocaleString('en-IN')}${brokerInfo ? `\nBroker: ${tx.broker.trim()}` : ''}`,
                              [
                                {
                                  text: 'View Stock Details',
                                  onPress: () => handlePressSymbol(tx.symbol),
                                },
                                {
                                  text: 'Edit Transaction',
                                  onPress: () => handleEdit(String(tx.id)),
                                },
                                {
                                  text: 'Delete Transaction',
                                  style: 'destructive',
                                  onPress: () => handleDelete(String(tx.id), displayName),
                                },
                                {
                                  text: 'Cancel',
                                  style: 'cancel',
                                },
                              ],
                            );
                          }}
                        >
                          <View style={styles.txRowLeft}>
                            <StockTransactionIcon
                              ticker={ticker}
                              isBuy={isBuy}
                              symbol={tx.symbol}
                              displayName={displayName}
                              currColors={currColors}
                            />
                            <View style={styles.txInfoCol}>
                              <ThemedText style={[styles.txPrimaryText, { color: currColors.text }]} numberOfLines={1}>
                                {displayName}
                              </ThemedText>
                              <ThemedText style={[styles.txSecondaryText, { color: currColors.textSecondary }]} numberOfLines={1}>
                                Qty: {tx.quantity} @ {showCurrencySymbol ? '₹' : ''}{tx.price.toLocaleString('en-IN')}{brokerInfo}
                              </ThemedText>
                            </View>
                          </View>

                          <View style={styles.txRowRight}>
                            <ThemedText
                              style={[
                                styles.txAmountDisplay,
                                {
                                  color: isBuy ? '#34C759' : '#FF3B30',
                                },
                              ]}
                            >
                              {isBuy ? '+' : '-'}{formatAmount(totalValue)}
                            </ThemedText>
                            <View
                              style={[
                                styles.typeBadgePill,
                                {
                                  backgroundColor: isBuy ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)',
                                },
                              ]}
                            >
                              <ThemedText
                                style={[
                                  styles.typeBadgeText,
                                  { color: isBuy ? '#34C759' : '#FF3B30' },
                                ]}
                              >
                                {isBuy ? 'BUY' : 'SELL'}
                              </ThemedText>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </Swipeable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    fontFamily: 'Outfit_400Regular',
  },
  clearButton: {
    padding: 4,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterStripWrapper: {
    marginBottom: 8,
    marginTop: 4,
  },
  filterStripScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroRowLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  heroRowValue: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  groupsContainer: {
    gap: 4,
  },
  dateGroupWrapper: {
    marginBottom: 12,
  },
  dateGroupHeader: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dateGroupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  txRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  txRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  assetIconContainer: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  logoWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  fallbackIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLetter: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  txInfoCol: {
    flex: 1,
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
  },
  txAmountDisplay: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 3,
  },
  typeBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9.5,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  rightActions: {
    flexDirection: 'row',
    width: 130,
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionText: {
    color: '#FFF',
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'Outfit_500Medium',
  },
});
