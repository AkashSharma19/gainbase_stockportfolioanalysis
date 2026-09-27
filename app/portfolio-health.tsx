import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioHealth } from '@/hooks/usePortfolioHealth';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HealthGauge } from '@/components/HealthGauge';
import { HealthDetailCard } from '@/components/HealthDetailCard';
import { LucideIcon, Info, TrendingUp, Sparkles, Target, Activity } from 'lucide-react-native';

export default function PortfolioHealthScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'dark';
  const c = Colors[theme];
  const health = usePortfolioHealth();

  const { totalScore, grade, gradeColor, dimensions, summary, isEmpty } = health;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: c.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { backgroundColor: c.background }]}>
        <BackButton />
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: c.text }]}>
          Portfolio Health
        </ThemedText>
        <View style={{ width: 38 }} />
      </View>

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.emptyIconBox, { backgroundColor: c.cardSecondary }]}>
              <Activity size={32} color="#0A84FF" />
            </View>
            <ThemedText type="semiBold" style={[styles.emptyTitle, { color: c.text }]}>
              No Holdings Tracked Yet
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: c.textSecondary }]}>
              Add investments and stock transactions to unlock comprehensive portfolio health grading, diversification scoring, and risk analytics.
            </ThemedText>
            <TouchableOpacity
              style={[styles.emptyActionButton, { backgroundColor: '#0A84FF' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/add-transaction');
              }}
              activeOpacity={0.8}
            >
              <ThemedText type="semiBold" style={styles.emptyActionText}>
                + Add Transaction
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
        <HealthGauge score={totalScore} gradeColor={gradeColor} grade={grade} />

        <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.summaryHeader}>
            <Sparkles size={20} color={gradeColor} />
            <ThemedText style={[styles.summaryTitle, { color: c.textSecondary }]}>ANALYSIS SUMMARY</ThemedText>
          </View>
          <ThemedText style={[styles.summaryText, { color: c.textSecondary }]}>
            {summary}
          </ThemedText>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Target size={14} color={c.textSecondary} />
          <ThemedText style={[styles.sectionTitle, { color: c.textSecondary }]}>
            DEEP DIVE DIMENSIONS
          </ThemedText>
        </View>

        <View style={styles.listContainer}>
          {dimensions.map((dim) => (
            <HealthDetailCard key={dim.label} dimension={dim} />
          ))}
        </View>

        <View style={[styles.disclaimerBox, { backgroundColor: c.cardSecondary }]}>
          <Info size={14} color={c.textSecondary} />
          <ThemedText style={[styles.disclaimerText, { color: c.textSecondary }]}>
            Health score is a calculated metric based on diversification, risk, and stability. 
            Past performance does not guarantee future results.
          </ThemedText>
        </View>

        <TouchableOpacity
          style={styles.formulaLink}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/portfolio-health-formula');
          }}
        >
          <ThemedText style={[styles.formulaLinkText, { color: gradeColor }]}>
            View Calculation Methodology
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: { padding: 20, paddingBottom: 60 },
  summaryCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 32,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.6,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  listContainer: {
    gap: 0,
  },
  disclaimerBox: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    fontStyle: 'italic',
  },
  formulaLink: {
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 12,
  },
  formulaLinkText: {
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  emptyActionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});
