import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Repeat,
  CreditCard,
  Wallet,
  Search,
  XCircle,
  Landmark,
  Zap,
  CheckCircle,
  Lightbulb,
  Shield,
  Eye,
  Compass,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackButton } from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAiStore, AiMoneyInsight } from '@/store/useAiStore';
import { useMoneyStore } from '@/store/useMoneyStore';

type FilterCategory = 'all' | 'warning' | 'tip' | 'success';

const CATEGORY_CONFIG: Record<
  FilterCategory,
  {
    label: string;
    color: string;
    emptyIcon: any;
    emptyTitle: string;
    emptyMessage: string;
    subtitle: string;
  }
> = {
  all: {
    label: 'All',
    color: '#00C9A7',
    emptyIcon: Sparkles,
    emptyTitle: 'No Insights Found',
    emptyMessage: 'No financial insights match your search criteria.',
    subtitle: 'ALL DETECTED OPPORTUNITIES & SIGNALS',
  },
  warning: {
    label: 'Alerts',
    color: '#FF3B30',
    emptyIcon: CheckCircle,
    emptyTitle: 'No Active Alerts',
    emptyMessage:
      'Your budget, debt, and credit utilization look healthy with no critical warnings.',
    subtitle: 'RISKS, BREACHES & OVERSPEND ALERTS',
  },
  tip: {
    label: 'Tips',
    color: '#FF9500',
    emptyIcon: Lightbulb,
    emptyTitle: 'No Optimization Tips',
    emptyMessage:
      'No immediate spend optimizations or idle cash reallocations detected.',
    subtitle: 'CASH FLOW & DISCRETIONARY OPTIMIZATIONS',
  },
  success: {
    label: 'Achievements',
    color: '#34C759',
    emptyIcon: CheckCircle,
    emptyTitle: 'No Achievements Yet',
    emptyMessage:
      'Keep logging transactions and maintaining budget discipline to unlock milestones.',
    subtitle: 'FINANCIAL MILESTONES & HEALTHY HABITS',
  },
};

const IconMap: Record<string, any> = {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Repeat,
  CreditCard,
  Wallet,
  Landmark,
  Zap,
  CheckCircle,
  Lightbulb,
  Shield,
  Eye,
  Compass,
};

export default function MoneyInsightsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  // AI Store
  const { geminiApiKey, selectedModel, aiMoneyInsights, setAiMoneyInsights } =
    useAiStore();

  // Money Store
  const {
    accounts,
    moneyTransactions,
    loans,
    budgets,
    subscriptions,
    getNetWorth,
    getMonthlyEMIBurden,
    getMonthlySubscriptionBurden,
    getActiveBudget,
    getCategorySpending,
  } = useMoneyStore();

  const [activeTab, setActiveTab] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Dynamic counts
  const countByCategory = useMemo(() => {
    return {
      all: aiMoneyInsights.length,
      warning: aiMoneyInsights.filter((i) => i.type === 'warning').length,
      tip: aiMoneyInsights.filter((i) => i.type === 'tip').length,
      success: aiMoneyInsights.filter((i) => i.type === 'success').length,
    };
  }, [aiMoneyInsights]);

  // Filter based on active category & search query
  const filteredInsights = useMemo(() => {
    let result = aiMoneyInsights;
    if (activeTab !== 'all') {
      result = result.filter((i) => i.type === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.message.toLowerCase().includes(q) ||
          (i.badge && i.badge.toLowerCase().includes(q)) ||
          (i.subtitle && i.subtitle.toLowerCase().includes(q)) ||
          (i.actionLabel && i.actionLabel.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [aiMoneyInsights, activeTab, searchQuery]);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // AI Generation & Refresh
  const handleGenerateInsights = async () => {
    if (!geminiApiKey.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'API Key Required',
        'Please enter your Gemini Developer API Key under the AI Chat settings panel first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => router.push('/ai-chat') },
        ],
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);

    try {
      // 1. Compile live monetary context
      const netWorth = getNetWorth();
      const monthlyEmiBurden = getMonthlyEMIBurden();
      const monthlySubBurden = getMonthlySubscriptionBurden();

      const accountsText = accounts
        .filter((a) => !a.isArchived)
        .map(
          (a) =>
            `- ${a.name} (${a.type}): Balance ₹${a.balance.toLocaleString('en-IN')}`,
        )
        .join('\n');

      const loansText = loans
        .filter((l) => l.isActive)
        .map(
          (l) =>
            `- ${l.name}: Principal ₹${l.outstandingAmount.toLocaleString('en-IN')}, EMI ₹${l.emiAmount.toLocaleString('en-IN')}/mo`,
        )
        .join('\n');

      const now = new Date();
      const activeBudget = getActiveBudget();
      let budgetText = 'No active budget set';
      if (activeBudget) {
        const spentMap = getCategorySpending(
          activeBudget.id,
          now.getFullYear(),
          now.getMonth(),
        );
        budgetText = activeBudget.categories
          .map((c) => {
            const spent = spentMap[c.name] || 0;
            const pct =
              c.limit > 0 ? ((spent / c.limit) * 100).toFixed(0) : '0';
            return `- ${c.name}: limit ₹${c.limit.toLocaleString('en-IN')}, spent ₹${spent.toLocaleString('en-IN')} (${pct}%)`;
          })
          .join('\n');
      }

      const subscriptionsText = subscriptions
        .filter((s) => s.isActive)
        .map(
          (s) =>
            `- ${s.name}: ₹${s.amount.toLocaleString('en-IN')}/${s.billingCycle}`,
        )
        .join('\n');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentTx = moneyTransactions
        .filter((t) => new Date(t.date) >= thirtyDaysAgo)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 30)
        .map(
          (t) =>
            `- [${new Date(t.date).toLocaleDateString()}] ${t.type.toUpperCase()}: ${t.note || t.category} = ₹${t.amount.toLocaleString('en-IN')} (${t.category})`,
        )
        .join('\n');

      const prompt = `You are Gainbase AI, an institutional-grade personal finance strategist and quantitative wealth advisor. Analyze the user's live money manager ledger:

[FINANCIAL METRICS]
- Net Worth: ₹${netWorth.toLocaleString('en-IN')}
- Monthly EMI Burden: ₹${monthlyEmiBurden.toLocaleString('en-IN')}
- Monthly Subscription Burden: ₹${monthlySubBurden.toLocaleString('en-IN')}

[ACCOUNTS]
${accountsText || 'No accounts logged'}

[LOANS & DEBT]
${loansText || 'No active loans'}

[BUDGET CATEGORIES (THIS MONTH)]
${budgetText}

[SUBSCRIPTIONS]
${subscriptionsText || 'No active SaaS subscriptions'}

[RECENT 30-DAY TRANSACTIONS]
${recentTx}

TASK:
Generate AT LEAST 10 to 14 high-impact, analytical "Smart Insights" covering the user's entire financial spectrum across 3 distinct categories:
1. "warning" -> Alerts (high credit card utilization >30%, budget exhaustion >80%, heavy DTI ratio, rapid daily burn rate, overdue obligations). Color is "#FF3B30", icon is "AlertTriangle" or "TrendingDown".
2. "tip" -> Optimization tips (idle cash in savings yielding low interest, recurring subscription consolidation, discretionary spend caps, prepayment acceleration). Color is "#FF9500", icon is "Lightbulb" or "PiggyBank" or "Repeat".
3. "success" -> Achievements (healthy savings rate >20%, debt-free status, on-track budget milestones, strong liquidity). Color is "#34C759", icon is "CheckCircle" or "TrendingUp" or "Shield".

INSTRUCTIONS FOR EACH INSIGHT:
- "id": unique string (e.g. "insight-1", "insight-2")
- "type": MUST be exactly one of: "warning", "tip", "success"
- "title": Short, punchy title (3-5 words, e.g. "Dining Budget Near Limit", "Idle Cash in Savings", "Healthy Savings Discipline", "High Credit Utilization")
- "subtitle": Short uppercase domain category (e.g. "BUDGET OVERSPEND", "LIQUIDITY OPTIMIZATION", "CREDIT CARD", "DEBT REPAYMENT", "SUBSCRIPTION AUDIT", "CASH RESERVE")
- "badge": 2-3 word highlight pill tag (e.g. "84% Budget Used", "High Priority", "Immediate Action", "Trim SaaS", "Low DTI 12%", "3.2x Buffer")
- "value": Quantitative metric highlight (e.g. "₹14,200/mo", "84% Spent", "-₹4,500/day", "₹2.4L Balance", "14.2% DTI")
- "message": 2 concise, objective sentences detailing the exact quantitative observation and direct recommendation.
- "actionLabel": Action label for the footer link (e.g. "View Money Analytics", "Check Account Balances", "View EMIs & Loans", "Review Subscriptions", "Adjust Budgets")
- "actionPath": Target app route (MUST be one of: "/money-analytics", "/(tabs)/money-accounts", "/(tabs)/money-loans", "/add-budget", "/manage-categories")
- "icon": One of "AlertTriangle", "TrendingDown", "TrendingUp", "PiggyBank", "CreditCard", "Wallet", "Landmark", "Repeat", "Lightbulb", "CheckCircle", "Shield", "Zap"
- "color": "#FF3B30" for warning, "#FF9500" for tip, "#34C759" for success`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    type: {
                      type: 'STRING',
                      enum: ['warning', 'tip', 'success'],
                    },
                    title: { type: 'STRING' },
                    subtitle: { type: 'STRING' },
                    badge: { type: 'STRING' },
                    value: { type: 'STRING' },
                    message: { type: 'STRING' },
                    actionLabel: { type: 'STRING' },
                    actionPath: { type: 'STRING' },
                    icon: { type: 'STRING' },
                    color: { type: 'STRING' },
                  },
                  required: [
                    'id',
                    'type',
                    'title',
                    'subtitle',
                    'badge',
                    'value',
                    'message',
                    'actionLabel',
                    'actionPath',
                    'icon',
                    'color',
                  ],
                },
              },
            },
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const parsed: AiMoneyInsight[] = JSON.parse(
          data.candidates[0].content.parts[0].text,
        );
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAiMoneyInsights(parsed);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert(
            'Analysis Complete',
            'No critical financial issues were detected.',
          );
        }
      } else {
        const errorMsg =
          data.error?.message ||
          'Failed to generate insights. Check API key and model settings.';
        Alert.alert('AI Error', errorMsg);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        'Request Failed',
        'Could not connect to Gemini AI. Check your internet connection.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const renderInsightItem = (item: AiMoneyInsight) => {
    const itemType = item.type || 'tip';
    const itemColor =
      item.color ||
      (itemType === 'warning'
        ? '#FF3B30'
        : itemType === 'tip'
          ? '#FF9500'
          : '#34C759');

    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const cardBorderColor = isDark
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(0,0,0,0.06)';

    const IconComponent =
      item.icon && IconMap[item.icon]
        ? IconMap[item.icon]
        : itemType === 'warning'
          ? AlertTriangle
          : itemType === 'tip'
            ? Lightbulb
            : CheckCircle;

    const subtitle =
      item.subtitle ||
      (itemType === 'warning'
        ? 'ALERT'
        : itemType === 'tip'
          ? 'OPTIMIZATION'
          : 'ACHIEVEMENT');

    const badge =
      item.badge ||
      (itemType === 'warning'
        ? 'High Priority'
        : itemType === 'tip'
          ? 'Opportunity'
          : 'Milestone');

    const value = item.value || item.metric || '';

    return (
      <View
        key={item.id}
        style={[
          styles.insightCard,
          {
            backgroundColor: cardBgColor,
            borderColor: cardBorderColor,
          },
        ]}
      >
        {/* Top Note Title Row */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: `${itemColor}15` },
              ]}
            >
              <IconComponent size={16} color={itemColor} />
            </View>
            <View style={styles.titleColumn}>
              <ThemedText
                style={[styles.companyName, { color: currColors.text }]}
                numberOfLines={1}
              >
                {item.title}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Note Body Text */}
        <ThemedText
          style={[
            styles.reasonText,
            { color: isDark ? '#D1D1D6' : '#3A3A3C' },
          ]}
        >
          {item.message}
        </ThemedText>

        {/* Note Bottom Tags Row (Google Notes style chips) */}
        <View style={styles.tagsRow}>
          <View
            style={[
              styles.tagChip,
              { backgroundColor: currColors.cardSecondary },
            ]}
          >
            <ThemedText
              style={[styles.tagText, { color: currColors.textSecondary }]}
            >
              {subtitle}
            </ThemedText>
          </View>

          <View
            style={[
              styles.tagChip,
              { backgroundColor: `${itemColor}18` },
            ]}
          >
            <View
              style={[styles.tagDot, { backgroundColor: itemColor }]}
            />
            <ThemedText style={[styles.tagText, { color: itemColor }]}>
              {badge}
            </ThemedText>
          </View>

          {value ? (
            <View
              style={[
                styles.tagChip,
                { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
              ]}
            >
              <ThemedText
                style={[styles.tagText, { color: currColors.text }]}
              >
                {value}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
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
      <StatusBar
        barStyle={colorScheme === 'light' ? 'dark-content' : 'light-content'}
      />

      {aiMoneyInsights.length === 0 ? (
        /* Empty / Initial AI Hero State */
        <View style={styles.aiHeroContainer}>
          <View style={styles.topBackRow}>
            <BackButton />
          </View>

          <View
            style={[
              styles.aiHeroCard,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
              },
            ]}
          >
            <View
              style={[
                styles.sparkleIconOuter,
                { backgroundColor: 'rgba(0, 201, 167, 0.12)' },
              ]}
            >
              <Sparkles size={36} color="#00C9A7" />
            </View>
            <ThemedText style={styles.aiHeroTitle}>
              Smart Financial Insights
            </ThemedText>
            <ThemedText
              style={[
                styles.aiHeroSubtitle,
                { color: currColors.textSecondary },
              ]}
            >
              Let Gainbase AI audit your live accounts, credit cards, loans,
              subscriptions, and budgets. Receive prioritized alerts, cash flow
              tips, and savings milestones generated specifically for your
              ledger.
            </ThemedText>

            <TouchableOpacity
              style={[styles.aiHeroBtn, { backgroundColor: '#00C9A7' }]}
              onPress={handleGenerateInsights}
              disabled={isGenerating}
              activeOpacity={0.8}
            >
              {isGenerating ? (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <ActivityIndicator size="small" color="#FFF" />
                  <ThemedText style={styles.aiHeroBtnText}>
                    Analyzing Ledger...
                  </ThemedText>
                </View>
              ) : (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Sparkles size={16} color="#FFF" />
                  <ThemedText style={styles.aiHeroBtnText}>
                    Generate with AI
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Top Header with Back Button & Search Bar */}
          <View style={styles.header}>
            <BackButton />

            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: currColors.card,
                  borderColor: currColors.border,
                },
              ]}
            >
              <Search
                size={18}
                color={currColors.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                style={[styles.searchInput, { color: currColors.text }]}
                placeholder="Search financial insights"
                placeholderTextColor={currColors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSearchQuery('');
                  }}
                  style={styles.clearButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <XCircle
                    size={18}
                    color={currColors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Category Tabs with Dynamic Count Badges */}
          <View style={styles.tabContainer}>
            {(['all', 'warning', 'tip', 'success'] as FilterCategory[]).map(
              (tab) => {
                const isActive = activeTab === tab;
                const config = CATEGORY_CONFIG[tab];
                const tabCount = countByCategory[tab];

                return (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: isActive
                          ? config.color
                          : 'transparent',
                        borderColor: isActive
                          ? config.color
                          : isDark
                            ? '#3A3A3C'
                            : currColors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveTab(tab);
                    }}
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      style={[
                        styles.tabText,
                        {
                          color: isActive ? '#FFF' : currColors.textSecondary,
                        },
                      ]}
                    >
                      {config.label}
                    </ThemedText>
                    {tabCount > 0 && (
                      <View
                        style={[
                          styles.tabBadge,
                          {
                            backgroundColor: isActive
                              ? 'rgba(255,255,255,0.3)'
                              : `${config.color}30`,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.tabBadgeText,
                            {
                              color: isActive ? '#FFF' : config.color,
                            },
                          ]}
                        >
                          {tabCount}
                        </ThemedText>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              },
            )}
          </View>

          {/* Main Content List with Refresh Button */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.sectionHeaderRow}>
              <ThemedText style={styles.sectionLabel}>
                {CATEGORY_CONFIG[activeTab]?.subtitle ||
                  `${activeTab.toUpperCase()} SIGNALS`}
              </ThemedText>

              {/* Refresh Button in header bar */}
              <TouchableOpacity
                style={styles.refreshButtonRow}
                onPress={handleGenerateInsights}
                disabled={isGenerating}
                activeOpacity={0.7}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#00C9A7" />
                ) : (
                  <>
                    <Sparkles size={11} color="#00C9A7" />
                    <ThemedText style={styles.refreshBtnLabel}>
                      REFRESH
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {filteredInsights.length > 0 ? (
              <View style={styles.listContainer}>
                {filteredInsights.map((item) => renderInsightItem(item))}
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
  aiHeroContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  topBackRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  aiHeroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  sparkleIconOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  aiHeroTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  aiHeroSubtitle: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  aiHeroBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeroBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#8E8E93',
  },
  refreshButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  refreshBtnLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    color: '#00C9A7',
    letterSpacing: 0.5,
  },
  listContainer: {
    marginTop: 4,
  },
  // ─── Google Notes Minimal Insight Card ───
  insightCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleColumn: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  reasonText: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  // ─── Empty State ───
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
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});
