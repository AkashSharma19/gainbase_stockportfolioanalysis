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
import { Ionicons } from '@expo/vector-icons';
import {
  ArrowLeft,
  ChevronRight,
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
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAiStore, AiMoneyInsight } from '@/store/useAiStore';
import { useMoneyStore } from '@/store/useMoneyStore';

type FilterCategory = 'all' | 'warning' | 'tip' | 'success';

const CATEGORY_CONFIG: Record<
  FilterCategory,
  { label: string; color: string; emptyTitle: string; emptyMessage: string }
> = {
  all: {
    label: 'All',
    color: '#00C9A7',
    emptyTitle: 'No Insights Found',
    emptyMessage: 'No financial insights match your search criteria.',
  },
  warning: {
    label: 'Alerts',
    color: '#FF3B30',
    emptyTitle: 'No Active Alerts',
    emptyMessage: 'Your budget, debt, and credit utilization look healthy with no critical warnings.',
  },
  tip: {
    label: 'Tips',
    color: '#FF9500',
    emptyTitle: 'No Optimization Tips',
    emptyMessage: 'No immediate spend optimizations or idle cash reallocations detected.',
  },
  success: {
    label: 'Achievements',
    color: '#00C9A7',
    emptyTitle: 'No Achievements Yet',
    emptyMessage: 'Keep logging transactions and maintaining budget discipline to unlock milestones.',
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
};

export default function MoneyInsightsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  // AI Store
  const { geminiApiKey, selectedModel, aiMoneyInsights, setAiMoneyInsights } = useAiStore();

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
          (i.actionLabel && i.actionLabel.toLowerCase().includes(q))
      );
    }
    return result;
  }, [aiMoneyInsights, activeTab, searchQuery]);

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
        ]
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
        .map((a) => `- ${a.name} (${a.type}): Balance ₹${a.balance.toLocaleString('en-IN')}`)
        .join('\n');

      const loansText = loans
        .filter((l) => l.isActive)
        .map((l) => `- ${l.name}: Principal ₹${l.outstandingAmount.toLocaleString('en-IN')}, EMI ₹${l.emiAmount.toLocaleString('en-IN')}/mo`)
        .join('\n');

      const now = new Date();
      const activeBudget = getActiveBudget();
      let budgetText = 'No active budget set';
      if (activeBudget) {
        const spentMap = getCategorySpending(activeBudget.id, now.getFullYear(), now.getMonth());
        budgetText = activeBudget.categories
          .map((c) => {
            const spent = spentMap[c.name] || 0;
            const pct = c.limit > 0 ? ((spent / c.limit) * 100).toFixed(0) : '0';
            return `- ${c.name}: limit ₹${c.limit.toLocaleString('en-IN')}, spent ₹${spent.toLocaleString('en-IN')} (${pct}%)`;
          })
          .join('\n');
      }

      const subscriptionsText = subscriptions
        .filter((s) => s.isActive)
        .map((s) => `- ${s.name}: ₹${s.amount.toLocaleString('en-IN')}/${s.billingCycle}`)
        .join('\n');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentTx = moneyTransactions
        .filter((t) => new Date(t.date) >= thirtyDaysAgo)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 30)
        .map((t) => `- [${new Date(t.date).toLocaleDateString()}] ${t.type.toUpperCase()}: ${t.note || t.category} = ₹${t.amount.toLocaleString('en-IN')} (${t.category})`)
        .join('\n');

      const prompt = `You are Gainbase AI, an institutional-grade personal finance strategist. Analyze the user's live money manager ledger:

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
Generate AT LEAST 10 (10 to 15) high-impact, analytical "Smart Insights" covering the user's entire financial spectrum. You must provide a diverse, rich breakdown across all 3 categories:
1. "warning" (Alerts: overspending breaches, high debt, low emergency fund cover, rapid daily outflows, high credit card utilization, budget near-exhaustion).
2. "tip" (Optimization tips: idle cash redeployment to liquid funds, SaaS subscription trimming, unbudgeted spend caps, category re-allocations, discretionary spend trimming).
3. "success" (Achievements: healthy savings rate, low debt-to-income ratio, on-track budget milestones, timely payments, disciplined cash reserves).

IMPORTANT RULES:
- You MUST return AT LEAST 10 distinct insight objects (do not return fewer than 10).
- Cover every aspect of their finances (Accounts, Budgets, Loans, Subscriptions, Cash Flow, Savings, Emergency Buffer).
- Use exact figures in Indian Rupees (₹) and percentages.
- Make recommendations concise, direct, professional, and actionable.
- Return ONLY a valid JSON array of objects matching this exact structure:

[
  {
    "id": "insight-1",
    "type": "warning",
    "title": "Short Punchy Title (max 6 words)",
    "message": "Specific analytical insight explaining what was detected and the exact recommendation (1-2 sentences).",
    "actionLabel": "Action Button Label (e.g. 'View Budgets', 'Check Accounts', 'View EMIs', 'View Analytics')",
    "actionPath": "/(tabs)/money-budgets",
    "icon": "AlertTriangle"
  }
]`;

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
                    type: { type: 'STRING', enum: ['warning', 'tip', 'success'] },
                    title: { type: 'STRING' },
                    message: { type: 'STRING' },
                    actionLabel: { type: 'STRING' },
                    actionPath: { type: 'STRING' },
                    icon: { type: 'STRING' },
                  },
                  required: ['id', 'type', 'title', 'message', 'actionLabel', 'actionPath', 'icon'],
                },
              },
            },
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const parsed: AiMoneyInsight[] = JSON.parse(data.candidates[0].content.parts[0].text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAiMoneyInsights(parsed);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert('Analysis Complete', 'No critical financial issues were detected.');
        }
      } else {
        const errorMsg = data.error?.message || 'Failed to generate insights. Check API key and model settings.';
        Alert.alert('AI Error', errorMsg);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Request Failed', 'Could not connect to Gemini AI. Check your internet connection.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getThemeStyles = (type: 'success' | 'warning' | 'tip') => {
    const isDark = colorScheme === 'dark';
    if (isDark) {
      switch (type) {
        case 'success':
          return { bg: 'rgba(0, 201, 167, 0.07)', border: 'rgba(0, 201, 167, 0.22)', icon: '#00C9A7' };
        case 'warning':
          return { bg: 'rgba(255, 59, 48, 0.07)', border: 'rgba(255, 59, 48, 0.22)', icon: '#FF3B30' };
        case 'tip':
          return { bg: 'rgba(255, 149, 0, 0.07)', border: 'rgba(255, 149, 0, 0.22)', icon: '#FF9500' };
      }
    } else {
      switch (type) {
        case 'success':
          return { bg: 'rgba(0, 201, 167, 0.05)', border: 'rgba(0, 201, 167, 0.18)', icon: '#008F77' };
        case 'warning':
          return { bg: 'rgba(255, 59, 48, 0.05)', border: 'rgba(255, 59, 48, 0.18)', icon: '#D32F2F' };
        case 'tip':
          return { bg: 'rgba(255, 149, 0, 0.05)', border: 'rgba(255, 149, 0, 0.18)', icon: '#C97700' };
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      <StatusBar barStyle={colorScheme === 'light' ? 'dark-content' : 'light-content'} />

      {aiMoneyInsights.length === 0 ? (
        /* Empty / Initial AI Hero State */
        <View style={styles.aiHeroContainer}>
          <View style={styles.topBackRow}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: currColors.cardSecondary }]}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={currColors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.aiHeroCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <View style={[styles.sparkleIconOuter, { backgroundColor: 'rgba(0, 201, 167, 0.12)' }]}>
              <Sparkles size={36} color="#00C9A7" />
            </View>
            <ThemedText style={styles.aiHeroTitle}>Smart Financial Insights</ThemedText>
            <ThemedText style={[styles.aiHeroSubtitle, { color: currColors.textSecondary }]}>
              Let Gainbase AI audit your live accounts, credit cards, loans, subscriptions, and budgets. Receive prioritized alerts, cash flow tips, and savings milestones generated specifically for your ledger.
            </ThemedText>

            <TouchableOpacity
              style={[styles.aiHeroBtn, { backgroundColor: '#00C9A7' }]}
              onPress={handleGenerateInsights}
              disabled={isGenerating}
              activeOpacity={0.8}
            >
              {isGenerating ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <ThemedText style={styles.aiHeroBtnText}>Analyzing Ledger...</ThemedText>
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
          {/* Top Header with Back Button & Search Bar */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: currColors.cardSecondary }]}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={currColors.text} />
            </TouchableOpacity>

            <View style={[styles.searchContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <Ionicons
                name="search"
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
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color={currColors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Category Tabs with Dynamic Count Badges */}
          <View style={styles.tabContainer}>
            {(['all', 'warning', 'tip', 'success'] as FilterCategory[]).map((tab) => {
              const isActive = activeTab === tab;
              const config = CATEGORY_CONFIG[tab];
              const tabCount = countByCategory[tab];

              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: isActive ? config.color : 'transparent',
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
                      { color: isActive ? '#FFF' : currColors.textSecondary },
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
                            : isDark
                            ? '#2C2C2E'
                            : '#E5E5EA',
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.tabBadgeText,
                          {
                            color: isActive
                              ? '#FFF'
                              : config.color,
                          },
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

          {/* Main Content List with Refresh Button */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.sectionHeaderRow}>
              <ThemedText style={styles.sectionLabel}>
                {activeTab.toUpperCase()} OPPORTUNITIES
              </ThemedText>

              {/* Only Refresh Button in header bar */}
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
                    <Sparkles size={12} color="#00C9A7" />
                    <ThemedText style={styles.refreshBtnLabel}>REFRESH</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {filteredInsights.length > 0 ? (
              <View style={styles.listContainer}>
                {filteredInsights.map((item) => {
                  const themeStyles = getThemeStyles(item.type);
                  const IconComponent = (item.icon && IconMap[item.icon]) ? IconMap[item.icon] : (item.type === 'warning' ? AlertTriangle : item.type === 'tip' ? TrendingUp : Sparkles);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.insightCard,
                        {
                          backgroundColor: themeStyles.bg,
                          borderColor: themeStyles.border,
                        },
                      ]}
                    >
                      <View style={styles.cardHeader}>
                        <IconComponent size={20} color={themeStyles.icon} style={{ marginRight: 10 }} />
                        <ThemedText style={[styles.cardTitle, { color: themeStyles.icon }]} numberOfLines={1}>
                          {item.title}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.cardMessage, { color: currColors.text }]}>
                        {item.message}
                      </ThemedText>
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: themeStyles.icon }]}
                        activeOpacity={0.7}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push(item.actionPath as any);
                        }}
                      >
                        <ThemedText style={[styles.actionText, { color: themeStyles.icon }]}>
                          {item.actionLabel}
                        </ThemedText>
                        <ChevronRight size={14} color={themeStyles.icon} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : (
              /* Empty state for search or filter */
              <View style={[styles.emptyStateContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <Lightbulb size={32} color="#FF9500" style={{ marginBottom: 12 }} />
                <ThemedText style={[styles.emptyTitle, { color: currColors.text }]}>
                  {CATEGORY_CONFIG[activeTab].emptyTitle}
                </ThemedText>
                <ThemedText style={[styles.emptyDesc, { color: currColors.textSecondary }]}>
                  {CATEGORY_CONFIG[activeTab].emptyMessage}
                </ThemedText>
              </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  sparkleIconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  aiHeroTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  aiHeroSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  aiHeroBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeroBtnText: {
    color: '#FFF',
    fontSize: 15,
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 21,
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
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
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
    paddingBottom: 80,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
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
    paddingHorizontal: 8,
  },
  refreshBtnLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    color: '#00C9A7',
    letterSpacing: 0.5,
  },
  listContainer: {
    gap: 12,
  },
  insightCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    flex: 1,
  },
  cardMessage: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    marginRight: 4,
  },
  emptyStateContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
  },
});
