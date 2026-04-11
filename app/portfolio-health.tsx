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
  useWindowDimensions,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
  Svg,
} from 'react-native-svg';

// ─── Gauge geometry (viewBox units) ─────────────────────────────────────────
const VW = 260;
const VH = 165;
const CX = VW / 2;
const CY = VH - 22;
const RO = 108;
const RI = 72;

function pt(r: number, score: number) {
  const a = (1 - score / 100) * Math.PI;
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
}

function segPath(from: number, to: number, N = 48): string {
  const outer: string[] = [];
  const inner: string[] = [];
  for (let i = 0; i <= N; i++) {
    const s = from + (to - from) * (i / N);
    const o = pt(RO, s);
    outer.push(`${o.x.toFixed(2)},${o.y.toFixed(2)}`);
  }
  for (let i = N; i >= 0; i--) {
    const s = from + (to - from) * (i / N);
    const p = pt(RI, s);
    inner.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
  }
  return `M ${outer[0]} L ${outer.slice(1).join(' ')} L ${inner[0]} L ${inner.slice(1).join(' ')} Z`;
}

function needlePath(score: number): string {
  const a = (1 - score / 100) * Math.PI;
  const tip = {
    x: CX + (RO - 12) * Math.cos(a),
    y: CY - (RO - 12) * Math.sin(a),
  };
  const hw = 5;
  const bl = { x: CX + hw * Math.sin(a), y: CY + hw * Math.cos(a) };
  const br = { x: CX - hw * Math.sin(a), y: CY - hw * Math.cos(a) };
  return `M ${bl.x.toFixed(2)},${bl.y.toFixed(2)} L ${tip.x.toFixed(2)},${tip.y.toFixed(2)} L ${br.x.toFixed(2)},${br.y.toFixed(2)} Z`;
}

const SEGS = [
  { from: 0, to: 25, color: '#FF3B30' },
  { from: 25, to: 50, color: '#FF9500' },
  { from: 50, to: 75, color: '#FFCC00' },
  { from: 75, to: 100, color: '#34C759' },
];

export default function PortfolioHealthScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'dark';
  const c = Colors[theme];
  const health = usePortfolioHealth();
  const { width: sw } = useWindowDimensions();

  if (health.isEmpty) return null;

  const { totalScore, grade, gradeColor, dimensions } = health;
  const trackColor = theme === 'dark' ? '#2C2C2E' : '#F2F2F7';
  const needleColor = theme === 'dark' ? '#FFFFFF' : '#1C1C1E';

  const svgW = Math.min(sw - 60, 340);
  const svgH = Math.round(svgW * (VH / VW));
  const hubY = svgH * (CY / VH);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: c.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { backgroundColor: c.background }]}>
        <BackButton />
        <ThemedText style={[styles.headerTitle, { color: c.text }]}>
          Portfolio Health
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Compact Horizontal Hero Card */}
        <View
          style={[
            styles.heroCardCompact,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          <View style={styles.heroLeft}>
            <ThemedText style={[styles.heroLabel, { color: c.textSecondary, marginBottom: 8 }]}>
              HEALTH SCORE
            </ThemedText>
            <View style={styles.scoreRow}>
              <ThemedText style={[styles.scoreNumLarge, { color: c.text }]}>
                {totalScore}
              </ThemedText>
              <ThemedText style={[styles.scoreOutCompact, { color: c.textSecondary }]}>
                /100
              </ThemedText>
            </View>
            <View
              style={[
                styles.gradeBadgeCompact,
                { backgroundColor: `${gradeColor}22`, alignSelf: 'flex-start' },
              ]}
            >
              <ThemedText style={[styles.gradeText, { color: gradeColor }]}>
                {grade.toUpperCase()}
              </ThemedText>
            </View>
          </View>

          <View style={styles.heroRight}>
            <Svg width={100} height={100} viewBox="0 0 100 100">
              <Circle
                cx="50"
                cy="50"
                r="40"
                stroke={trackColor}
                strokeWidth="8"
                fill="none"
                opacity={0.3}
              />
              <Circle
                cx="50"
                cy="50"
                r="40"
                stroke={gradeColor}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - totalScore / 100)}`}
                strokeLinecap="round"
                fill="none"
                transform="rotate(-90 50 50)"
              />
            </Svg>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <ThemedText style={[styles.sectionTitle, { color: c.textSecondary }]}>
            HEALTH DIMENSIONS
          </ThemedText>
        </View>

        <View style={styles.listContainer}>
          {dimensions.map((dim) => {
            const pct = (dim.score / dim.maxScore) * 100;
            const dc =
              pct >= 80
                ? '#34C759'
                : pct >= 56
                  ? '#5AC8FA'
                  : pct >= 32
                    ? '#FF9500'
                    : '#FF3B30';
            return (
              <View
                key={dim.label}
                style={[
                  styles.dimCard,
                  { backgroundColor: c.card, borderColor: c.border },
                ]}
              >
                <View style={styles.dimContent}>
                  <View style={styles.dimHeader}>
                    <ThemedText style={[styles.dimLabel, { color: c.text }]}>
                      {dim.label}
                    </ThemedText>
                    <View style={styles.dimScoreBox}>
                      <ThemedText style={[styles.dimScore, { color: dc }]}>
                        {dim.score}
                      </ThemedText>
                      <ThemedText style={[styles.dimMax, { color: c.textSecondary }]}>
                        /{dim.maxScore}
                      </ThemedText>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.dimTrack,
                      { backgroundColor: c.cardSecondary },
                    ]}
                  >
                    <View
                      style={[
                        styles.dimFill,
                        { width: `${pct}%`, backgroundColor: dc },
                      ]}
                    />
                  </View>
                  <ThemedText style={[styles.dimDesc, { color: c.textSecondary }]}>
                    {dim.description}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.formulaLink}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/portfolio-health-formula');
          }}
        >
          <ThemedText style={[styles.formulaLinkText, { color: c.textSecondary }]}>
            How is this calculated?
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
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
    fontWeight: '600',
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  heroCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    marginBottom: 32,
    overflow: 'hidden',
  },
  heroLeft: {
    flex: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  scoreNumLarge: {
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
  scoreOutCompact: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
    opacity: 0.5,
  },
  gradeBadgeCompact: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroRight: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  listContainer: {
    gap: 16,
  },
  dimCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  dimContent: {
    gap: 8,
  },
  dimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dimLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  dimScoreBox: { flexDirection: 'row', alignItems: 'flex-end' },
  dimScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  dimMax: {
    fontSize: 11,
    fontWeight: '400',
    marginBottom: 1,
  },
  dimTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  dimFill: { height: '100%', borderRadius: 3 },
  dimDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  formulaLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  formulaLinkText: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
