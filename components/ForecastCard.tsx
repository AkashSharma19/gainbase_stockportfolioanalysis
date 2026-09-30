import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { calculateProjection, formatIndianNumber } from '@/lib/finance';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { ArrowRight } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

interface ForecastCardProps {
  onPress?: () => void;
  years: number;
  summary: any;
  yearlyAnalysis: any;
}

export const ForecastCard = ({
  onPress,
  years = 20,
  summary,
  yearlyAnalysis,
}: ForecastCardProps) => {
  const theme = useColorScheme() ?? 'dark';
  const currColors = Colors[theme];

  const showCurrencySymbol = usePortfolioStore(
    (state) => state.showCurrencySymbol,
  );
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);

  const sipStepUp = usePortfolioStore((state) => state.sipStepUp);
  const manualMonthlySIP = usePortfolioStore((state) => state.manualMonthlySIP);

  // Derived values from user data with safe financial bounds
  const annualReturn = useMemo(() => {
    const rawXirr = summary?.xirr;
    if (typeof rawXirr !== 'number' || isNaN(rawXirr) || rawXirr <= 0 || !isFinite(rawXirr)) {
      return 0.12; // 12% default benchmark annual return
    }
    const rate = rawXirr / 100;
    return Math.min(Math.max(rate, 0.04), 0.25); // Cap between 4% and 25% for multi-year compounding
  }, [summary?.xirr]);

  const monthlySIP = useMemo(() => {
    if (manualMonthlySIP !== null && typeof manualMonthlySIP === 'number') return manualMonthlySIP;
    if (!yearlyAnalysis || yearlyAnalysis.length === 0) return 0;
    return yearlyAnalysis[0]?.averageMonthlyInvestment || 0;
  }, [yearlyAnalysis, manualMonthlySIP]);

  const projection = useMemo(() => {
    return calculateProjection(
      summary?.totalValue || 0,
      annualReturn,
      monthlySIP,
      years || 15,
      sipStepUp || 0
    );
  }, [summary?.totalValue, annualReturn, monthlySIP, years, sipStepUp]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: currColors.card, borderColor: currColors.border },
      ]}
    >
      <View>
        <ThemedText style={[styles.title, { color: currColors.textSecondary }]}>
          FORECAST ({years}Y)
        </ThemedText>
        <View style={styles.content}>
          <View style={styles.leftContent}>
            <ThemedText 
              style={[styles.mainValue, { color: currColors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {isPrivacyMode
                ? '••••••'
                : `${showCurrencySymbol ? '₹' : ''}${formatIndianNumber(projection.totalFutureValue)}`}
            </ThemedText>
            <ThemedText
              style={[styles.subValue, { color: currColors.textSecondary }]}
              numberOfLines={1}
            >
              Worth {showCurrencySymbol ? '₹' : ''}
              {formatIndianNumber(projection.presentValue)} today
            </ThemedText>
          </View>
          <View style={styles.rightContent}>
            <View
              style={[
                styles.badge,
                { backgroundColor: 'rgba(0, 122, 255, 0.1)' },
              ]}
            >
              <ThemedText 
                style={[styles.badgeText, { color: currColors.tint }]}
                numberOfLines={1}
              >
                {projection.multiplier.toFixed(1)}x
              </ThemedText>
            </View>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: currColors.cardSecondary },
              ]}
            >
              <ArrowRight size={14} color={currColors.tint} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  leftContent: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 75,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mainValue: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 2,
  },
  subValue: {
    fontSize: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
