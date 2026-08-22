import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { InsightCategory } from '@/hooks/useInsights';
import { useAiStore, AiInsight as Insight } from '@/store/useAiStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  CheckCircle,
  CircleArrowDown,
  Compass,
  Eye,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Zap,
  Sparkles,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';

const IconMap: Record<string, any> = {
  TriangleAlert,
  TrendingUp,
  TrendingDown,
  CircleArrowDown,
  Zap,
  Compass,
};

const CATEGORY_CONFIG: Record<
  InsightCategory,
  { color: string; emptyIcon: any; emptyTitle: string; emptyMessage: string }
> = {
  Buy: {
    color: '#34C759',
    emptyIcon: CheckCircle,
    emptyTitle: 'No Buy Signals',
    emptyMessage:
      'No significant buy opportunities detected. Your portfolio looks well-positioned.',
  },
  'Sell/Hold': {
    color: '#FF3B30',
    emptyIcon: CheckCircle,
    emptyTitle: 'No Sell Signals',
    emptyMessage:
      "No positions flagged for selling. You're holding strong on all fronts.",
  },
  Observe: {
    color: '#007AFF',
    emptyIcon: Eye,
    emptyTitle: 'Nothing to Watch',
    emptyMessage:
      'No notable market events detected for your holdings right now.',
  },
};

export default function InsightsScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'dark';
  const currColors = Colors[theme];
  const { geminiApiKey, selectedModel, aiStockInsights, setAiStockInsights } = useAiStore();
  const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<InsightCategory>('Buy');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate counts dynamically from AI stock insights
  const countByCategory = useMemo(() => {
    return {
      Buy: aiStockInsights.filter((i) => i.category === 'Buy').length,
      'Sell/Hold': aiStockInsights.filter((i) => i.category === 'Sell/Hold').length,
      Observe: aiStockInsights.filter((i) => i.category === 'Observe').length,
    };
  }, [aiStockInsights]);

  // Filter based on search query
  const filteredInsights = useMemo(() => {
    let result = aiStockInsights.filter((i) => i.category === activeTab);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(query) ||
          (i.symbol && i.symbol.toLowerCase().includes(query)) ||
          i.badge.toLowerCase().includes(query),
      );
    }
    return result;
  }, [aiStockInsights, activeTab, searchQuery]);

  const handleGenerateInsights = async () => {
    if (!geminiApiKey.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'API Key Required',
        'Please enter your Gemini Developer API Key under the Profile -> AI Chat settings panel first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => router.push('/ai-chat') }
        ]
      );
      return;
    }

    const holdings = getHoldingsData();
    if (holdings.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'No Investment Positions',
        'Please log some buy/sell stock transactions first to let the AI analyze your portfolio.'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);

    try {
      // Serialize holdings for Gemini prompt
      const serializedHoldings = holdings
        .map((h: any) => `- Stock Ticker: ${h.symbol}, Company Name: ${h.companyName}, Shares: ${h.quantity}, Avg Buy Price: ₹${h.avgPrice.toLocaleString('en-IN')}, Total Invested: ₹${(h.quantity * h.avgPrice).toLocaleString('en-IN')}`)
        .join('\n');

      const prompt = `You are Gainbase AI, an institutional-grade portfolio manager. Analyze these stock positions:
${serializedHoldings}

Instructions:
1. Return a JSON array representing investment insights.
2. For each insight:
   - "category" must be exactly one of: "Buy" (for fresh buys or accumulation), "Sell/Hold" (for stop-loss alerts, profit taking, or hold signals), or "Observe" (for key events to watch like earnings, volatility, or benchmark trends).
   - "title" must be the full company name (e.g. "Tata Consultancy Services Ltd", "Reliance Industries") matching the holdings list.
   - "badge" is a short 2-3 word highlight tag.
   - "value" is a quick reference stat.
   - "reason" is 1-2 sentences of professional reasoning.
   - "color" must be: Buy is "#34C759", Sell/Hold is "#FF3B30", Observe is "#007AFF".
   - "icon" must be: Buy/positive is "TrendingUp", Sell/negative is "TrendingDown" or "TriangleAlert", Observe/neutral is "Compass" or "Zap" or "Eye".
   - "symbol" must match the stock ticker symbol (e.g. "INFY", "RELIANCE") so clicking on it redirects details.
3. Be highly realistic, critical, and objective. You MUST generate separate, individual insights for EVERY SINGLE HOLDING listed in the stock positions above. Do not skip any ticker symbol; make sure every single stock has at least one corresponding actionable insight in the returned JSON array so the user receives a comprehensive analysis of their entire portfolio.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    category: { type: 'STRING', enum: ['Buy', 'Sell/Hold', 'Observe'] },
                    title: { type: 'STRING' },
                    badge: { type: 'STRING' },
                    value: { type: 'STRING' },
                    reason: { type: 'STRING' },
                    color: { type: 'STRING' },
                    icon: { type: 'STRING' },
                    symbol: { type: 'STRING' },
                  },
                  required: ['id', 'category', 'title', 'badge', 'value', 'reason', 'color', 'icon'],
                },
              },
            },
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const parsedInsights = JSON.parse(data.candidates[0].content.parts[0].text);
        
        // Enrich logo property from active holdings if symbols match
        const enrichedInsights = parsedInsights.map((insight: any) => {
          const matchedHolding = holdings.find(
            (h: any) => h.symbol?.toUpperCase() === insight.symbol?.toUpperCase()
          );
          return {
            ...insight,
            logo: matchedHolding?.logo || insight.logo || null,
          };
        });

        setAiStockInsights(enrichedInsights);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const errorMsg = data.error?.message || 'Failed to generate insights. Check settings.';
        Alert.alert('AI Error', errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Connection Error', 'Request failed. Check internet settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderInsightItem = (
    insight: Insight,
    index: number,
    lastIndex: number,
  ) => {
    const IconComponent = IconMap[insight.icon] || Zap;
    const showBorder = index !== lastIndex;

    return (
      <TouchableOpacity
        key={insight.id}
        activeOpacity={0.7}
        style={[
          styles.insightItem,
          {
            borderBottomColor: currColors.border,
            borderBottomWidth: showBorder ? 1 : 0,
          },
        ]}
        onPress={() => {
          if (insight.symbol) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/stock-details/${insight.symbol}`);
          }
        }}
      >
        <View style={styles.cardContent}>
          {/* Left: Logo/Icon */}
          <View
            style={[
              styles.iconBox,
              !insight.logo && { backgroundColor: currColors.cardSecondary },
            ]}
          >
            {insight.logo ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 2,
                }}
              >
                <Image
                  source={{ uri: insight.logo }}
                  style={{ width: 40, height: 40, borderRadius: 10 }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <IconComponent size={24} color={insight.color} />
            )}
          </View>

          {/* Center: Company Name, Badge, Reason & Value */}
          <View style={styles.textBox}>
            <View style={styles.titleRow}>
              <ThemedText
                style={[styles.companyName, { color: currColors.text }]}
                numberOfLines={1}
              >
                {insight.title}
              </ThemedText>
            </View>
            {/* Badge pill + value pill side-by-side */}
            <View style={styles.pillRow}>
              <View
                style={[
                  styles.badgePill,
                  { backgroundColor: `${insight.color}22` },
                ]}
              >
                <ThemedText style={[styles.badgeText, { color: insight.color }]}>
                  {insight.badge}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.valuePill,
                  {
                    backgroundColor: `${insight.color}${theme === 'dark' ? '25' : '15'}`,
                  },
                ]}
              >
                <ThemedText style={[styles.valueText, { color: insight.color }]}>
                  {insight.value}
                </ThemedText>
              </View>
            </View>
            {/* Reason text — full width, no line limit */}
            <ThemedText
              style={[styles.reasonText, { color: currColors.textSecondary }]}
            >
              {insight.reason}
            </ThemedText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const config = CATEGORY_CONFIG[activeTab];
    const EmptyIcon = config.emptyIcon;
    return (
      <View style={styles.emptyState}>
        <View
          style={[
            styles.emptyIconCircle,
            { backgroundColor: `${config.color}18` },
          ]}
        >
          <EmptyIcon size={32} color={config.color} />
        </View>
        <ThemedText style={[styles.emptyTitle, { color: currColors.text }]}>
          {config.emptyTitle}
        </ThemedText>
        <ThemedText
          style={[styles.emptyMessage, { color: currColors.textSecondary }]}
        >
          {config.emptyMessage}
        </ThemedText>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: currColors.background }]}
      edges={['top']}
    >
      {aiStockInsights.length === 0 ? (
        <View style={styles.aiHeroContainer}>
          <View style={[styles.aiHeroCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <View style={[styles.sparkleIconOuter, { backgroundColor: 'rgba(10, 132, 255, 0.1)' }]}>
              <Sparkles size={36} color="#0A84FF" />
            </View>
            <ThemedText style={styles.aiHeroTitle}>AI Portfolio Insights</ThemedText>
            <ThemedText style={[styles.aiHeroSubtitle, { color: currColors.textSecondary }]}>
              Let Gainbase AI analyze your current stock allocations, buys/sells, and sector distributions. It highlights major opportunities, stop-losses, and watch signals based on your actual holdings.
            </ThemedText>

            <TouchableOpacity
              style={[styles.aiHeroBtn, { backgroundColor: '#007AFF' }]}
              onPress={handleGenerateInsights}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <ThemedText style={styles.aiHeroBtnText}>Analyzing Portfolio...</ThemedText>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} color="#FFF" />
                  <ThemedText style={styles.aiHeroBtnText}>Generate with AI</ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Search Header */}
          <View style={styles.header}>
            <View style={styles.searchContainerOuter}>
              <View
                style={[
                  styles.searchContainer,
                  { backgroundColor: currColors.card },
                ]}
              >
                <Ionicons
                  name="search"
                  size={20}
                  color={currColors.textSecondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={[styles.searchInput, { color: currColors.text }]}
                  placeholder="Search insights"
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
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={currColors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Category Tabs with Count Badges */}
          <View style={styles.tabContainer}>
            {(['Buy', 'Sell/Hold', 'Observe'] as InsightCategory[]).map((tab) => {
              const isActive = activeTab === tab;
              const tabColor = CATEGORY_CONFIG[tab].color;
              const tabCount = countByCategory[tab];
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: isActive ? tabColor : 'transparent',
                      borderColor: isActive
                        ? tabColor
                        : theme === 'dark'
                          ? '#3A3A3C'
                          : currColors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab(tab);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.tabText,
                      { color: isActive ? '#FFF' : currColors.textSecondary },
                    ]}
                  >
                    {tab}
                  </ThemedText>
                  {tabCount > 0 && (
                    <View
                      style={[
                        styles.tabBadge,
                        {
                          backgroundColor: isActive
                            ? 'rgba(255,255,255,0.3)'
                            : `${tabColor}30`,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.tabBadgeText,
                          { color: isActive ? '#FFF' : tabColor },
                        ]}
                      >
                        {tabCount}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
              <ThemedText style={styles.sectionLabel}>
                {activeTab.toUpperCase()} OPPORTUNITIES
              </ThemedText>
              
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                onPress={handleGenerateInsights}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#0A84FF" />
                ) : (
                  <>
                    <Sparkles size={11} color="#0A84FF" />
                    <ThemedText style={{ fontSize: 10, fontFamily: 'Outfit_600SemiBold', color: '#0A84FF' }}>REFRESH</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {filteredInsights.length > 0 ? (
              <View
                style={[styles.insightCard, { backgroundColor: currColors.card }]}
              >
                {filteredInsights.map((insight, index) =>
                  renderInsightItem(insight, index, filteredInsights.length - 1),
                )}
              </View>
            ) : (
              renderEmptyState()
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchContainerOuter: {
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    fontFamily: 'Outfit_400Regular',
  },
  clearButton: {
    padding: 4,
  },
  // Summary banner
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#3A3A3C',
    marginHorizontal: 4,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  // Insight card container
  insightCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  insightItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  textBox: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 15,
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 17,
  },
  valuePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  valueText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Empty state
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  aiHeroContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  aiHeroCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  aiHeroTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  aiHeroSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
  },
  aiHeroBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeroBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  sparkleIconOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
