import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Sparkles } from 'lucide-react-native';

import { ThemedText } from './ThemedText';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';
import { useMoneyInsights } from '../hooks/useMoneyInsights';

export function FinancialInsights() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const { count, countByType } = useMoneyInsights();

  if (count === 0) return null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/money-insights');
  };

  const themeStyles = {
    bg: colorScheme === 'dark' ? 'rgba(0, 201, 167, 0.08)' : 'rgba(0, 201, 167, 0.05)',
    border: colorScheme === 'dark' ? 'rgba(0, 201, 167, 0.2)' : 'rgba(0, 201, 167, 0.1)',
  };

  // When no insights have been generated yet, render an inviting AI generation CTA
  if (count === 0) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          styles.container,
          {
            backgroundColor: themeStyles.bg,
            borderColor: themeStyles.border,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.titleRow}>
            <View style={[styles.iconContainer, { backgroundColor: '#00C9A7' }]}>
              <Sparkles size={14} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.title, { color: currColors.text }]}>
                Smart Financial Insights
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: currColors.textSecondary }]}>
                Tap to analyze budgets, debts & cash flow with AI
              </ThemedText>
            </View>
          </View>
          <View style={styles.generateBadge}>
            <Sparkles size={10} color="#00C9A7" />
            <ThemedText style={styles.generateBadgeText}>Analyze</ThemedText>
            <ChevronRight size={12} color="#00C9A7" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[
        styles.container,
        {
          backgroundColor: themeStyles.bg,
          borderColor: themeStyles.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          <View style={[styles.iconContainer, { backgroundColor: '#00C9A7' }]}>
            <Sparkles size={14} color="#FFF" />
          </View>
          <ThemedText style={[styles.title, { color: currColors.text }]}>
            {count} Smart {count === 1 ? 'Insight' : 'Insights'}
          </ThemedText>
        </View>
        <ChevronRight size={18} color={currColors.textSecondary} />
      </View>

      <View style={styles.categoryRow}>
        {countByType.warning > 0 && (
          <View style={styles.categoryChip}>
            <View style={[styles.categoryDot, { backgroundColor: '#FF3B30' }]} />
            <ThemedText style={[styles.categoryText, { color: currColors.textSecondary }]}>
              <ThemedText style={{ color: '#FF3B30', fontWeight: '700' }}>
                {countByType.warning}
              </ThemedText>{' '}
              Alerts
            </ThemedText>
          </View>
        )}
        {countByType.tip > 0 && (
          <View style={styles.categoryChip}>
            <View style={[styles.categoryDot, { backgroundColor: '#FF9500' }]} />
            <ThemedText style={[styles.categoryText, { color: currColors.textSecondary }]}>
              <ThemedText style={{ color: '#FF9500', fontWeight: '700' }}>
                {countByType.tip}
              </ThemedText>{' '}
              Tips
            </ThemedText>
          </View>
        )}
        {countByType.success > 0 && (
          <View style={styles.categoryChip}>
            <View style={[styles.categoryDot, { backgroundColor: '#00C9A7' }]} />
            <ThemedText style={[styles.categoryText, { color: currColors.textSecondary }]}>
              <ThemedText style={{ color: '#00C9A7', fontWeight: '700' }}>
                {countByType.success}
              </ThemedText>{' '}
              Achievements
            </ThemedText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  generateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 201, 167, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 201, 167, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  generateBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: '#00C9A7',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 38,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
});
