import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Building2,
  LayoutGrid,
  Layers,
  TrendingUp,
} from 'lucide-react-native';
import {
  ASSET_TYPE_ICONS,
  BROKER_ICONS,
  CHART_COLORS,
  getCategoryIcon,
  SECTOR_ICONS,
} from '@/constants/Icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

const GRADIENTS = {
  card: ['#1C1C1E', '#000000'] as const,
  active: ['#007AFF', '#004080'] as const,
};

type Dimension = 'Sector' | 'Company Name' | 'Asset Type' | 'Broker';

export default function AnalyticsScreen() {
  const router = useRouter();
  const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
  const getAllocationData = usePortfolioStore(
    (state) => state.getAllocationData,
  );
  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore(
    (state) => state.showCurrencySymbol,
  );

  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const gradients = {
    card:
      colorScheme === 'dark'
        ? (['#1C1C1E', '#000000'] as const)
        : (['#FFFFFF', '#F2F2F7'] as const),
    active: ['#007AFF', '#004080'] as const,
  };

  const [chartViewMode, setChartViewMode] = useState<'Pie' | 'Heatmap'>('Pie');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDimension, setSelectedDimension] =
    useState<Dimension>('Sector');
  const [holdingsViewMode, setHoldingsViewMode] = useState<
    'Current' | 'Returns' | 'Contribution'
  >('Current');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const itemPositions = useRef<Map<number, number>>(new Map());

  const getHeatmapColor = (pnlPercentage: number) => {
    if (pnlPercentage > 0) {
      // Scale from neutral to deep green
      const opacity = Math.min(pnlPercentage / 10, 1);
      return `rgba(48, 209, 88, ${0.1 + opacity * 0.9})`; // #30D158
    } else if (pnlPercentage < 0) {
      // Scale from neutral to deep red
      const opacity = Math.min(Math.abs(pnlPercentage) / 10, 1);
      return `rgba(255, 69, 58, ${0.1 + opacity * 0.9})`; // #FF453A
    }
    return currColors.card;
  };

  interface TreemapItem {
    name: string;
    value: number; // For area
    pnl: number; // For color
    index: number; // To sync with list
  }

  interface TreemapRect {
    x: number;
    y: number;
    width: number;
    height: number;
    data: TreemapItem;
  }

  const computeTreemap = (
    data: TreemapItem[],
    width: number,
    height: number,
  ): TreemapRect[] => {
    if (data.length === 0) return [];

    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    const rects: TreemapRect[] = [];

    // recursive division for reliability in React render
    const divide = (
      items: TreemapItem[],
      x: number,
      y: number,
      w: number,
      h: number,
    ) => {
      if (items.length === 0) return;
      if (items.length === 1) {
        rects.push({ x, y, width: w, height: h, data: items[0] });
        return;
      }

      const half = Math.ceil(items.length / 2);
      const firstHalf = items.slice(0, half);
      const secondHalf = items.slice(half);

      const firstSum = firstHalf.reduce((s, i) => s + i.value, 0);
      const totalSum = items.reduce((s, i) => s + i.value, 0);
      const ratio = firstSum / totalSum;

      if (w > h) {
        divide(firstHalf, x, y, w * ratio, h);
        divide(secondHalf, x + w * ratio, y, w * (1 - ratio), h);
      } else {
        divide(firstHalf, x, y, w, h * ratio);
        divide(secondHalf, x, y + h * ratio, w, h * (1 - ratio));
      }
    };

    divide(data, 0, 0, width, height);
    return rects;
  };

  useEffect(() => {
    fetchTickers();
  }, []);

  useEffect(() => {
    setFocusedIndex(null);
  }, [selectedDimension, sortDirection, holdingsViewMode]);

  const onRefresh = React.useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await fetchTickers();
    setRefreshing(false);
  }, [fetchTickers]);

  const allocation = useMemo(
    () => getAllocationData(selectedDimension),
    [getAllocationData, selectedDimension, transactions, tickers],
  );

  const filteredAllocation = useMemo(() => {
    const data = [...allocation];

    data.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (holdingsViewMode === 'Returns') {
        valA = a.pnl || 0;
        valB = b.pnl || 0;
      } else if (holdingsViewMode === 'Contribution') {
        valA = a.percentage || 0;
        valB = b.percentage || 0;
      } else {
        // Default: 'Current'
        valA = a.value || 0;
        valB = b.value || 0;
      }

      if (valA !== valB) {
        return sortDirection === 'DESC' ? valB - valA : valA - valB;
      }

      // Stable secondary sort by name if values are identical
      return a.name.localeCompare(b.name);
    });

    return data;
  }, [allocation, sortDirection, holdingsViewMode]);

  const handlePiePress = (item: any, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (focusedIndex === index) {
      setFocusedIndex(null);
    } else {
      setFocusedIndex(index);
      const position = itemPositions.current.get(index);
      if (position !== undefined && scrollRef.current) {
        scrollRef.current.scrollTo({
          y: position + 300, // Offset for the chart header
          animated: true,
        });
      }
    }
  };

  const chartData = useMemo(() => {
    return filteredAllocation.map((item, index) => {
      const color = CHART_COLORS[index % CHART_COLORS.length];
      return {
        value: item.percentage,
        color: color,
        text: isPrivacyMode ? '****' : `${item.percentage.toFixed(2)}%`,
        label: item.name,
        onPress: () => handlePiePress(item, index),
        focused: focusedIndex === index,
        shiftOutX: focusedIndex === index ? 6 : 0,
        shiftOutY: focusedIndex === index ? 6 : 0,
      };
    });
  }, [filteredAllocation, isPrivacyMode, selectedDimension, focusedIndex]);

  if (transactions.length === 0) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: currColors.background }]}
      >
        <View
          style={[styles.container, { backgroundColor: currColors.background }]}
        >
          <View
            style={[styles.header, { backgroundColor: currColors.background }]}
          >
            <BackButton />
            <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
              Analytics
            </ThemedText>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.emptyState}>
            <ThemedText style={[styles.emptyText, { color: currColors.text }]}>
              No data available yet.
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtext, { color: currColors.textSecondary }]}
            >
              Add some transactions to see your portfolio analytics.
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const dimensions: { id: Dimension; label: string; icon: React.FC<any> }[] = [
    { id: 'Sector', label: 'Sector', icon: LayoutGrid },
    { id: 'Company Name', label: 'Company', icon: Building2 },
    { id: 'Asset Type', label: 'Asset Type', icon: Layers },
    { id: 'Broker', label: 'Broker', icon: Briefcase },
  ];

  const heatmapData = useMemo(() => {
    return filteredAllocation.map((item, index) => ({
      name: item.name,
      value: Math.max(item.percentage, 0.1), // Ensure visible box
      pnl: item.pnlPercentage || 0,
      index: index,
    }));
  }, [filteredAllocation]);

  const heatmapRects = useMemo(() => {
    const containerWidth = SCREEN_WIDTH - 64; // Padding
    const containerHeight = SCREEN_WIDTH * 0.55;
    return computeTreemap(heatmapData, containerWidth, containerHeight);
  }, [heatmapData]);

  const HeatmapView = () => (
    <View style={styles.heatmapContainer}>
      {heatmapRects.map((rect, i) => {
        const isFocused = rect.data.index === focusedIndex;
        return (
          <TouchableOpacity
            key={i}
            style={[
              styles.heatmapBox,
              {
                left: rect.x,
                top: rect.y,
                width: rect.width - 2,
                height: rect.height - 2,
                backgroundColor: getHeatmapColor(rect.data.pnl),
                borderColor: isFocused ? '#FFF' : 'transparent',
                borderWidth: isFocused ? 2 : 0,
              },
            ]}
            onPress={() => handlePiePress(null, rect.data.index)}
          >
            {rect.width > 40 && rect.height > 20 && (
              <View style={styles.heatmapContent}>
                <ThemedText
                  style={styles.heatmapSymbol}
                  numberOfLines={1}
                >
                  {rect.data.name}
                </ThemedText>
                {rect.height > 40 && (
                  <ThemedText style={styles.heatmapPercentage}>
                    {rect.data.value.toFixed(1)}%
                  </ThemedText>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: currColors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View
        style={[styles.container, { backgroundColor: currColors.background }]}
      >
        <View
          style={[styles.header, { backgroundColor: currColors.background }]}
        >
          <BackButton />
          <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
            Analytics
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>

        <View
          style={[
            styles.selectorBar,
            {
              backgroundColor: currColors.background,
              borderBottomColor: currColors.border,
            },
          ]}
        >
          {dimensions.map((dim) => {
            const isActive = selectedDimension === dim.id;
            const Icon = dim.icon;
            return (
              <TouchableOpacity
                key={dim.id}
                style={[
                  styles.selectorButton,
                  {
                    backgroundColor: currColors.card,
                    borderColor: currColors.border,
                  },
                  isActive && styles.selectorButtonActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDimension(dim.id);
                }}
              >
                <Icon
                  size={20}
                  color={isActive ? '#FFF' : currColors.textSecondary}
                  style={styles.selectorIcon}
                />
                <ThemedText
                  style={[
                    styles.selectorText,
                    { color: currColors.textSecondary },
                    isActive && styles.selectorTextActive,
                  ]}
                >
                  {dim.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            { backgroundColor: currColors.background },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={currColors.text}
            />
          }
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <LinearGradient
            colors={gradients.card}
            style={[styles.chartContainer, { borderColor: currColors.border }]}
          >
            <View style={styles.chartHeader}>
              <View style={styles.viewSwitcher}>
                <TouchableOpacity
                  style={[
                    styles.switchButton,
                    chartViewMode === 'Pie' && styles.switchButtonActive,
                  ]}
                  onPress={() => setChartViewMode('Pie')}
                >
                  <ThemedText style={[
                      styles.switchText,
                      chartViewMode === 'Pie' ? { color: '#FFF' } : { color: currColors.textSecondary }
                  ]}>Pie</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.switchButton,
                    chartViewMode === 'Heatmap' && styles.switchButtonActive,
                  ]}
                  onPress={() => setChartViewMode('Heatmap')}
                >
                  <ThemedText style={[
                      styles.switchText,
                      chartViewMode === 'Heatmap' ? { color: '#FFF' } : { color: currColors.textSecondary }
                  ]}>Heatmap</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.pieWrapper}>
              {allocation.length > 0 ? (
                chartViewMode === 'Pie' ? (
                  <PieChart
                    data={chartData}
                    donut
                    sectionAutoFocus
                    onPress={(item: any, index: number) => handlePiePress(item, index)}
                    radius={SCREEN_WIDTH * 0.22}
                    innerRadius={SCREEN_WIDTH * 0.15}
                    innerCircleColor={currColors.card}
                    centerLabelComponent={() => (
                      <View
                        style={{ justifyContent: 'center', alignItems: 'center' }}
                      >
                        <ThemedText style={{ fontSize: 20, color: currColors.text }}>
                          {allocation.length}
                        </ThemedText>
                        <ThemedText
                          style={{
                            fontSize: 8,
                            color: currColors.textSecondary,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                          }}
                        >
                          {selectedDimension.split(' ')[0]}s
                        </ThemedText>
                      </View>
                    )}
                  />
                ) : (
                  <HeatmapView />
                )
              ) : (
                <ThemedText
                  style={[
                    styles.noDataText,
                    { color: currColors.textSecondary },
                  ]}
                >
                  Data unavailable
                </ThemedText>
              )}
            </View>
          </LinearGradient>

          <View style={styles.holdingsHeader}>
            <TouchableOpacity
              style={[
                styles.actionIconButton,
                {
                  backgroundColor: currColors.card,
                  borderColor: currColors.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSortDirection((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'));
              }}
            >
              {sortDirection === 'DESC' ? (
                <ArrowDown size={14} color={currColors.text} />
              ) : (
                <ArrowUp size={14} color={currColors.text} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.viewModeToggle,
                {
                  backgroundColor: currColors.card,
                  borderColor: currColors.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (holdingsViewMode === 'Current')
                  setHoldingsViewMode('Returns');
                else if (holdingsViewMode === 'Returns')
                  setHoldingsViewMode('Contribution');
                else setHoldingsViewMode('Current');
              }}
            >
              <ArrowUpDown size={14} color={currColors.text} />
              <ThemedText type="medium" style={[styles.viewModeText, { color: currColors.text }]}>
                {holdingsViewMode === 'Current'
                  ? 'Current (Invested)'
                  : holdingsViewMode === 'Returns'
                    ? 'Returns (%)'
                    : 'Contribution (Current)'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.holdingsList,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
              },
            ]}
          >
            {filteredAllocation.map((item, index) => {
              const isLast = index === filteredAllocation.length - 1;
              const isFocused = index === focusedIndex;
              const isCompanyLink = selectedDimension === 'Company Name';
              const isCategoryLink = [
                'Sector',
                'Asset Type',
                'Broker',
              ].includes(selectedDimension);
              const isLink = isCompanyLink || isCategoryLink;

              return (
                <TouchableOpacity
                  key={item.name}
                  onLayout={(event) => {
                    const layout = event.nativeEvent.layout;
                    itemPositions.current.set(index, layout.y);
                  }}
                  style={[
                    styles.holdingItem,
                    isFocused && { backgroundColor: currColors.cardSecondary },
                    !isLast && [
                      styles.holdingItemBorder,
                      { borderBottomColor: currColors.border },
                    ],
                  ]}
                  disabled={!isLink}
                  onPress={() => {
                    if (isCompanyLink && item.symbol) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      // @ts-ignore
                      router.push(`/stock-details/${item.symbol}`);
                    } else if (isCategoryLink) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      // @ts-ignore
                      router.push(
                        `/analytics-details/${selectedDimension}/${encodeURIComponent(item.name)}`,
                      );
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.holdingRow}>
                    <View style={styles.holdingMain}>
                      {(() => {
                        const { icon: CategoryIcon } = getCategoryIcon(
                          selectedDimension,
                          item.name,
                        );
                        const categoryColor =
                          CHART_COLORS[index % CHART_COLORS.length];
                        return (
                          <View
                            style={[
                              styles.holdingIcon,
                              { backgroundColor: categoryColor + '22' },
                            ]}
                          >
                            {selectedDimension === 'Company Name' &&
                            item.logo ? (
                              <View
                                style={{
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: 12,
                                  padding: 2,
                                }}
                              >
                                <Image
                                  source={{ uri: item.logo }}
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                  }}
                                  resizeMode="contain"
                                />
                              </View>
                            ) : (
                              <CategoryIcon size={20} color={categoryColor} />
                            )}
                          </View>
                        );
                      })()}
                      <View style={styles.holdingInfo}>
                        <ThemedText
                          style={[
                            styles.holdingSymbol,
                            { color: currColors.text },
                          ]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {item.name}
                        </ThemedText>
                        {selectedDimension === 'Company Name' && (
                          <ThemedText
                            style={[
                              styles.holdingSub,
                              { color: currColors.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            Qty: {item.quantity.toLocaleString()}
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    <View style={styles.holdingValues}>
                      {holdingsViewMode === 'Current' && (
                        <>
                          <ThemedText
                            style={[
                              styles.primaryValue,
                              { color: currColors.text },
                            ]}
                          >
                            {isPrivacyMode
                              ? '****'
                              : `${showCurrencySymbol ? '₹' : ''}${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.secondaryValue,
                              { color: currColors.textSecondary },
                            ]}
                          >
                            {isPrivacyMode
                              ? '****'
                              : `${showCurrencySymbol ? '₹' : ''}${item.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                          </ThemedText>
                        </>
                      )}
                      {holdingsViewMode === 'Returns' && (
                        <>
                          <ThemedText
                            style={[
                              styles.primaryValue,
                              { color: item.pnl >= 0 ? '#30D158' : '#FF453A' },
                            ]}
                          >
                            {isPrivacyMode
                              ? '****'
                              : `${item.pnl >= 0 ? '+' : '-'}${showCurrencySymbol ? '₹' : ''}${Math.abs(item.pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.secondaryValue,
                              { color: item.pnl >= 0 ? '#30D158' : '#FF453A' },
                            ]}
                          >
                            {isPrivacyMode
                              ? '****'
                              : `${item.pnl >= 0 ? '+' : ''}${item.pnlPercentage.toFixed(2)}%`}
                          </ThemedText>
                        </>
                      )}
                      {holdingsViewMode === 'Contribution' && (
                        <>
                          <ThemedText
                            style={[
                              styles.primaryValue,
                              { color: currColors.text },
                            ]}
                          >
                            {isPrivacyMode
                              ? '****'
                              : `${item.percentage.toFixed(2)}%`}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.secondaryValue,
                              { color: currColors.textSecondary },
                            ]}
                          >
                            {isPrivacyMode
                              ? '****'
                              : `${showCurrencySymbol ? '₹' : ''}${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                          </ThemedText>
                        </>
                      )}
                    </View>
                  </View>
                  {holdingsViewMode === 'Contribution' && (
                    <View
                      style={[
                        styles.contributionProgressBarContainer,
                        { backgroundColor: currColors.cardSecondary },
                      ]}
                    >
                      <View
                        style={[
                          styles.contributionProgressBarFill,
                          {
                            width: `${item.percentage}%`,
                            backgroundColor:
                              CHART_COLORS[index % CHART_COLORS.length],
                          },
                        ]}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  selectorBar: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectorButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    gap: 4,
  },
  selectorButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#0A84FF',
  },
  selectorIcon: {
    marginBottom: 2,
  },
  selectorText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectorTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: SCREEN_WIDTH * 0.45,
  },
  noDataText: {
    color: '#8E8E93',
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  holdingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  viewModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    height: 36,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  viewModeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  holdingsList: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  holdingItem: {
    padding: 18,
    alignSelf: 'stretch',
  },
  holdingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  holdingMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  holdingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconLetter: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '500',
  },
  holdingInfo: {
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  holdingSymbol: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '400',
    flexShrink: 1,
  },
  holdingSub: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
    flexShrink: 1,
  },
  holdingValues: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  primaryValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '400',
  },
  secondaryValue: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  contributionProgressBarContainer: {
    height: 3,
    backgroundColor: '#2C2C2E',
    borderRadius: 1.5,
    marginTop: 14,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  contributionProgressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  heatmapContainer: {
    width: SCREEN_WIDTH - 64,
    height: SCREEN_WIDTH * 0.55,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  heatmapBox: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    padding: 4,
  },
  heatmapContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapSymbol: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  heatmapPercentage: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 8,
    marginTop: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 2,
  },
  switchButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  switchButtonActive: {
    backgroundColor: '#3A3A3C',
  },
  switchText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
