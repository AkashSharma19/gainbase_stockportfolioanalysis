import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  ChevronRight,
  Lightbulb,
  Sparkles,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyInsights, MoneyInsight } from '@/hooks/useMoneyInsights';

type FilterType = 'all' | 'warning' | 'tip' | 'success';

export default function MoneyInsightsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const { insights, countByType } = useMoneyInsights();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const filteredInsights = useMemo(() => {
    if (activeFilter === 'all') return insights;
    return insights.filter((item) => item.type === activeFilter);
  }, [insights, activeFilter]);

  const getThemeStyles = (type: 'success' | 'warning' | 'tip') => {
    if (colorScheme === 'dark') {
      switch (type) {
        case 'success':
          return { bg: '#061D1A', border: '#00C9A740', icon: '#00C9A7' };
        case 'warning':
          return { bg: '#250B0B', border: '#FF3B3040', icon: '#FF3B30' };
        case 'tip':
          return { bg: '#1F1306', border: '#FF950040', icon: '#FF9500' };
      }
    } else {
      switch (type) {
        case 'success':
          return { bg: '#EAF8F6', border: '#00C9A730', icon: '#007A65' };
        case 'warning':
          return { bg: '#FDF2F2', border: '#FF3B3030', icon: '#C62828' };
        case 'tip':
          return { bg: '#FEF8F0', border: '#FF950030', icon: '#B26A00' };
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]}>
      <StatusBar barStyle={colorScheme === 'light' ? 'dark-content' : 'light-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: currColors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => {
            handleHaptic();
            router.back();
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={currColors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
            Smart Insights
          </ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: currColors.textSecondary }]}>
            Personalized budget & savings guidance
          </ThemedText>
        </View>
      </View>

      {/* Tabs Filter Bar */}
      <View style={styles.tabContainer}>
        {(['all', 'warning', 'tip', 'success'] as FilterType[]).map((filter) => {
          const isActive = activeFilter === filter;
          const count = countByType[filter];
          
          let tabLabel = 'All';
          let tabColor = '#00C9A7';
          if (filter === 'warning') {
            tabLabel = 'Alerts';
            tabColor = '#FF3B30';
          } else if (filter === 'tip') {
            tabLabel = 'Tips';
            tabColor = '#FF9500';
          } else if (filter === 'success') {
            tabLabel = 'Success';
            tabColor = '#00C9A7';
          }

          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? tabColor : currColors.cardSecondary,
                  borderColor: isActive ? tabColor : currColors.border,
                },
              ]}
              onPress={() => {
                handleHaptic();
                setActiveFilter(filter);
              }}
              activeOpacity={0.7}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  { color: isActive ? '#FFF' : currColors.textSecondary },
                ]}
              >
                {tabLabel}
              </ThemedText>
              {count > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: isActive
                        ? 'rgba(255,255,255,0.3)'
                        : `${tabColor}20`,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.tabBadgeText,
                      { color: isActive ? '#FFF' : tabColor },
                    ]}
                  >
                    {count}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Scrollable list */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.sectionLabel, { color: currColors.textSecondary }]}>
          {activeFilter.toUpperCase()} OPPORTUNITIES
        </ThemedText>

        {filteredInsights.length === 0 ? (
          <View style={[styles.emptyStateContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Lightbulb size={32} color="#FF9500" style={{ marginBottom: 12 }} />
            <ThemedText style={[styles.emptyTitle, { color: currColors.text }]}>
              Clear of Alerts
            </ThemedText>
            <ThemedText style={[styles.emptyDesc, { color: currColors.textSecondary }]}>
              There are no insights in this category at this time. Log more transactions or tweak your budgets to unlock advice.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredInsights.map((item) => {
              const themeStyles = getThemeStyles(item.type);
              const IconComponent = item.icon;

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
                      handleHaptic();
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
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  tabBadge: {
    minWidth: 18,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  listContainer: {
    gap: 16,
  },
  insightCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    flex: 1,
  },
  cardMessage: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    marginRight: 4,
  },
  emptyStateContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
