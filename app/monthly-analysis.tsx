import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import { ChevronDown, TrendingDown, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function MonthlyAnalysisScreen() {
  const router = useRouter();
  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
  const getMonthlyAnalysis = usePortfolioStore(
    (state) => state.getMonthlyAnalysis,
  );
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore(
    (state) => state.showCurrencySymbol,
  );

  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const monthlyAnalysis = useMemo(
    () => getMonthlyAnalysis(),
    [transactions, getMonthlyAnalysis, tickers],
  );
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const chartScrollRef = useRef<any>(null);

  const toggleMonth = (key: string) => {
    Haptics.selectionAsync();
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const CHART_COLORS = [
    '#007AFF',
    '#5856D6',
    '#AF52DE',
    '#FF2D55',
    '#FF9500',
    '#FFCC00',
    '#34C759',
    '#5AC8FA',
    '#8E8E93',
    '#2C2C2E',
  ];

  const lineData = useMemo(() => {
    const sorted = [...monthlyAnalysis].reverse(); // Chronological order
    const limited = sorted.slice(-6); // Only show last 6 months
    return limited.map((item, index) => {
      const prevItem = index > 0 ? limited[index - 1] : null;
      let pointColor = currColors.textSecondary;
      if (!prevItem) {
        pointColor = item.investment > 0 ? '#34C759' : currColors.textSecondary;
      } else if (item.investment > prevItem.investment && item.investment > 0) {
        pointColor = '#34C759';
      } else if (item.investment < prevItem.investment) {
        pointColor = '#FF3B30';
      } else {
        pointColor = currColors.textSecondary;
      }

      return {
        value: item.investment,
        label: item.month.slice(0, 3).toUpperCase(),
        dataPointText: isPrivacyMode
          ? '••'
          : item.investment === 0
            ? '0'
            : `${(item.investment / 1000).toFixed(0)}k`,
        textColor: pointColor,
        dataPointColor: pointColor,
        textFontSize: 9,
      };
    });
  }, [monthlyAnalysis, isPrivacyMode, currColors.textSecondary]);

  const lineSegments = useMemo(() => {
    const segments = [];
    for (let i = 1; i < lineData.length; i++) {
      const current = lineData[i].value;
      const prev = lineData[i - 1].value;
      let segmentColor: string;
      if (current > prev && current > 0) {
        segmentColor = '#34C759';
      } else if (current < prev) {
        segmentColor = '#FF3B30';
      } else {
        segmentColor = colorScheme === 'dark' ? '#3A3A3C' : '#D1D1D6';
      }

      segments.push({
        startIndex: i - 1,
        endIndex: i,
        color: segmentColor,
      });
    }
    return segments;
  }, [lineData, colorScheme]);

  const trendDirection = useMemo(() => {
    if (lineData.length < 2) return 'up';
    const current = lineData[lineData.length - 1].value;
    const prev = lineData[lineData.length - 2].value;
    if (current > prev && current > 0) return 'up';
    if (current < prev) return 'down';
    return 'neutral';
  }, [lineData]);

  const trendColor = useMemo(() => {
    if (trendDirection === 'up') return '#34C759';
    if (trendDirection === 'down') return '#FF3B30';
    return colorScheme === 'dark' ? '#8E8E93' : '#636366';
  }, [trendDirection, colorScheme]);

  const maximumValue = useMemo(() => {
    if (monthlyAnalysis.length === 0) return 0;
    const max = Math.max(...monthlyAnalysis.map((item) => item.investment));
    return max > 0 ? max * 1.3 : 10000; // 30% headroom for tooltips
  }, [monthlyAnalysis]);

  const formatYAxisLabel = (label: string) => {
    const value = parseFloat(label);
    if (isNaN(value)) return label;
    if (value >= 10000000)
      return (value / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (value >= 100000)
      return (value / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
    return value.toString();
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short',
    });
  };

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
            Monthly Trend
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.chartSection}>
            <View style={styles.chartTitleRow}>
              <ThemedText
                style={[
                  styles.chartTitle,
                  { color: currColors.textSecondary },
                ]}
              >
                MO. INVESTMENT TREND
              </ThemedText>
              {trendDirection === 'up' ? (
                <TrendingUp size={14} color="#34C759" />
              ) : trendDirection === 'down' ? (
                <TrendingDown size={14} color="#FF3B30" />
              ) : (
                <ThemedText
                  style={{
                    fontSize: 12,
                    color: currColors.textSecondary,
                    fontFamily: 'Outfit_600SemiBold',
                  }}
                >
                  —
                </ThemedText>
              )}
            </View>
            <View style={styles.chartWrapper}>
              {lineData.length > 0 ? (
                <LineChart
                  data={lineData}
                  lineSegments={lineSegments}
                  height={160}
                  width={SCREEN_WIDTH - 32}
                  spacing={Math.max(40, (SCREEN_WIDTH - 64) / Math.max(1, lineData.length - 1))}
                  initialSpacing={16}
                  endSpacing={16}
                  color={trendColor}
                  thickness={3}
                  noOfSections={3}
                  hideRules
                  hideYAxisText
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisLabelWidth={0}
                  maxValue={maximumValue}
                  isAnimated
                  animationDuration={600}
                  dataPointsColor={trendColor}
                  dataPointsRadius={4}
                  textColor={currColors.textSecondary}
                  textFontSize={9}
                  textShiftY={-12}
                  textShiftX={-4}
                  xAxisLabelTextStyle={{
                    color: currColors.textSecondary,
                    fontSize: 9,
                    fontFamily: 'Outfit_500Medium',
                  }}
                />
              ) : (
                <ThemedText style={{ color: currColors.textSecondary }}>
                  No data available
                </ThemedText>
              )}
            </View>
          </View>

          <View
            style={[
              styles.accordionContainer,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.innerSectionTitle,
                { color: currColors.textSecondary },
              ]}
            >
              MONTHLY BREAKDOWN
            </ThemedText>

            {monthlyAnalysis.map((item, index) => {
              const isExpanded = expandedMonths.has(item.monthKey);
              return (
                <View
                  key={item.monthKey}
                  style={[
                    styles.monthlyItemContainer,
                    { borderBottomColor: currColors.border },
                    index === monthlyAnalysis.length - 1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.monthlyHeader,
                      { backgroundColor: currColors.card },
                      isExpanded && {
                        backgroundColor: currColors.cardSecondary,
                      },
                    ]}
                    onPress={() => toggleMonth(item.monthKey)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.headerLeft}>
                      <ThemedText
                        style={[styles.monthText, { color: currColors.text }]}
                      >
                        {item.month}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.subText,
                          { color: currColors.textSecondary },
                        ]}
                      >
                        Invested:{' '}
                        {isPrivacyMode
                          ? '••••••'
                          : `${showCurrencySymbol ? '₹' : ''}${item.investment.toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact', compactDisplay: 'short' })}`}
                      </ThemedText>
                    </View>
                    <View style={styles.headerRight}>
                      {item.percentageIncrease !== 0 && (
                        <View
                          style={[
                            styles.growthBadge,
                            {
                              backgroundColor:
                                item.percentageIncrease >= 0
                                  ? 'rgba(52, 199, 89, 0.12)'
                                  : 'rgba(255, 59, 48, 0.12)',
                            },
                          ]}
                        >
                          <TrendingUp
                            size={12}
                            color={
                              item.percentageIncrease >= 0
                                ? '#34C759'
                                : '#FF3B30'
                            }
                            style={{
                              transform: [
                                {
                                  rotate:
                                    item.percentageIncrease >= 0
                                      ? '0deg'
                                      : '180deg',
                                },
                              ],
                            }}
                          />
                          <ThemedText
                            style={[
                              styles.growthText,
                              {
                                color:
                                  item.percentageIncrease >= 0
                                    ? '#34C759'
                                    : '#FF3B30',
                              },
                            ]}
                          >
                            {Math.abs(item.percentageIncrease).toFixed(2)}%
                          </ThemedText>
                        </View>
                      )}
                      <View
                        style={{
                          transform: [
                            { rotate: isExpanded ? '180deg' : '0deg' },
                          ],
                          marginLeft: 8,
                        }}
                      >
                        <ChevronDown
                          size={20}
                          color={currColors.textSecondary}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View
                      style={[
                        styles.accordionBody,
                        { backgroundColor: currColors.card },
                      ]}
                    >
                      <View
                        style={[
                          styles.separator,
                          { backgroundColor: currColors.border },
                        ]}
                      />
                      <View style={styles.assetsGrid}>
                        {item.assetDistribution.map((asset, i) => (
                          <View key={i} style={styles.assetItem}>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}
                            >
                              <View
                                style={[
                                  styles.dot,
                                  {
                                    backgroundColor:
                                      CHART_COLORS[i % CHART_COLORS.length],
                                  },
                                ]}
                              />
                              <ThemedText
                                style={[
                                  styles.assetName,
                                  { color: currColors.textSecondary },
                                ]}
                                numberOfLines={1}
                              >
                                {asset.name}
                              </ThemedText>
                            </View>
                            <ThemedText
                              style={[
                                styles.assetValue,
                                { color: currColors.text },
                              ]}
                            >
                              {isPrivacyMode
                                ? '••••••'
                                : `${showCurrencySymbol ? '₹' : ''}${asset.value.toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact', compactDisplay: 'short' })}`}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
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
  },
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  chartSection: {
    marginBottom: 20,
  },
  chartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  chartTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chartWrapper: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalChartScroll: {
    flexGrow: 0,
  },
  horizontalChartContent: {
    paddingRight: 20,
  },
  tooltip: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  accordionContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    paddingTop: 16,
  },
  innerSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 16,
  },
  monthlyItemContainer: {
    borderBottomWidth: 1,
  },
  monthlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subText: {
    fontSize: 11,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  growthText: {
    fontSize: 10,
    fontWeight: '400',
    marginLeft: 4,
  },
  accordionBody: {
    paddingBottom: 16,
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  assetsGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  assetName: {
    fontSize: 12,
  },
  assetValue: {
    fontSize: 12,
    fontWeight: '400',
  },
});
