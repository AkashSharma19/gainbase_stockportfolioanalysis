import { ActivityCalendar } from '@/components/ActivityCalendar';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { ChevronDown, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CHART_COLORS = [
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500',
  '#FFCC00', '#34C759', '#5AC8FA', '#8E8E93', '#2C2C2E'
];

export default function PortfolioScreen() {
  const transactions = usePortfolioStore((state) => state.transactions);
  const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
  const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
  const tickers = usePortfolioStore((state) => state.tickers);
  const getYearlyAnalysis = usePortfolioStore((state) => state.getYearlyAnalysis);

  const summary = useMemo(() => calculateSummary(), [transactions, calculateSummary, tickers]);
  const yearlyAnalysis = useMemo(() => getYearlyAnalysis(), [transactions, getYearlyAnalysis, tickers]);

  useEffect(() => {
    fetchTickers();
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchTickers, 300000);
    return () => clearInterval(interval);
  }, []);

  const [refreshing, setRefreshing] = React.useState(false);
  const [expandedYear, setExpandedYear] = React.useState<number | null>(null);

  const toggleYear = (year: number) => {
    setExpandedYear(expandedYear === year ? null : year);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchTickers();
    setRefreshing(false);
  }, [fetchTickers]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.heroCard}>
              <View style={styles.heroHeaderRow}>
                <Text style={styles.heroLabel}>HOLDINGS ({tickers.length})</Text>
              </View>

              <Text style={styles.heroValue}>₹{summary.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>

              <View style={styles.dashedDivider} />

              <View style={styles.heroRow}>
                <Text style={styles.heroRowLabel}>Total returns</Text>
                <Text style={[styles.heroRowValue, { color: summary.profitAmount >= 0 ? '#4CAF50' : '#F44336' }]}>
                  {summary.profitAmount >= 0 ? '+' : '-'}₹{Math.abs(summary.profitAmount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ({Math.abs(summary.profitPercentage).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)
                </Text>
              </View>

              <View style={styles.heroRow}>
                <Text style={styles.heroRowLabel}>Invested</Text>
                <Text style={styles.heroRowValueWhite}>₹{summary.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</Text>
              </View>

              <View style={[styles.heroRow, { marginBottom: 0 }]}>
                <Text style={styles.heroRowLabel}>XIRR</Text>
                <Text style={styles.heroRowValueWhite}>{summary.xirr.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%</Text>
              </View>
            </View>
          </View>



          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Calendar view</Text>
            <ActivityCalendar transactions={transactions} />
          </View>



          <View style={[styles.section, { marginBottom: 20 }]}>
            <Text style={styles.sectionTitle}>Yearly Analysis</Text>
            {yearlyAnalysis.length > 0 ? (
              <View style={styles.accordionContainer}>
                {yearlyAnalysis.map((item, index) => {
                  const isExpanded = expandedYear === item.year;
                  return (
                    <View key={item.year} style={styles.accordionItem}>
                      <TouchableOpacity
                        style={[styles.accordionHeader, isExpanded && styles.accordionHeaderActive]}
                        onPress={() => toggleYear(item.year)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.headerLeft}>
                          <Text style={styles.yearText}>{item.year}</Text>
                          <Text style={styles.subText}>Avg. Inv: ₹{item.averageMonthlyInvestment.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}</Text>
                        </View>

                        <View style={styles.headerRight}>
                          {item.percentageIncrease !== 0 && (
                            <View style={[styles.growthBadge, { backgroundColor: item.percentageIncrease >= 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                              <TrendingUp size={12} color={item.percentageIncrease >= 0 ? '#4CAF50' : '#F44336'} style={{ transform: [{ rotate: item.percentageIncrease >= 0 ? '0deg' : '180deg' }] }} />
                              <Text style={[styles.growthText, { color: item.percentageIncrease >= 0 ? '#4CAF50' : '#F44336' }]}>
                                {Math.abs(item.percentageIncrease).toFixed(1)}%
                              </Text>
                            </View>
                          )}
                          <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }], marginLeft: 8 }}>
                            <ChevronDown size={20} color="#666" />
                          </View>
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.accordionBody}>
                          <View style={styles.separator} />
                          <View style={styles.assetsGrid}>
                            {item.assetDistribution.map((asset, i) => (
                              <View key={i} style={styles.assetItem}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <View style={[styles.dot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                                  <Text style={styles.assetName} numberOfLines={1}>{asset.name}</Text>
                                </View>
                                <Text style={styles.assetValue}>₹{asset.value.toLocaleString(undefined, { maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" })}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.placeholderText}>Not enough data for yearly analysis</Text>
              </View>
            )}
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#000',
  },
  header: {
    marginTop: 10,
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  heroCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 1,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroRowLabel: {
    color: '#8E8E93',
    fontSize: 14,
  },
  heroRowValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  heroRowValueWhite: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  section: {
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FFF',
  },
  chartPlaceholder: {
    height: 180,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#444',
    fontSize: 14,
  },

  // Accordion Styles
  accordionContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  accordionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1C1C1E',
  },
  accordionHeaderActive: {
    backgroundColor: '#222',
  },
  headerLeft: {
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
  },
  growthText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  chevron: {
    // Chevron icon could be replaced with Lucide's ChevronDown
    // For now we do a simple rotation animation wrapper in JSX
  },
  accordionBody: {
    backgroundColor: '#151515',
    padding: 16,
    paddingTop: 0,
  },
  separator: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginBottom: 12,
  },
  assetsGrid: {
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
    color: '#CCC',
    fontSize: 13,
  },
  assetValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    height: 150,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
});
