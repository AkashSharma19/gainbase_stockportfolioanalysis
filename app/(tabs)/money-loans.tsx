import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  Landmark,
  Calendar,
  Home,
  Car,
  User,
  GraduationCap,
  ChevronRight,
  Info,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Loan } from '@/types/money';

const TYPE_CONFIG = {
  home: { label: 'Home Loan', emoji: '🏠', icon: Home, color: '#007AFF' },
  car: { label: 'Car Loan', emoji: '🚗', icon: Car, color: '#34C759' },
  personal: { label: 'Personal Loan', emoji: '💰', icon: User, color: '#FF9500' },
  education: { label: 'Education Loan', emoji: '🎓', icon: GraduationCap, color: '#AF52DE' },
  other: { label: 'Other Loan', emoji: '🏦', icon: Landmark, color: '#8E8E93' },
};

export default function LoansScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { loans, getMonthlyEMIBurden } = useMoneyStore();
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const monthlyEMI = getMonthlyEMIBurden();

  // Split active and completed loans
  const activeLoans = useMemo(() => loans.filter((l) => l.isActive), [loans]);
  const completedLoans = useMemo(() => loans.filter((l) => !l.isActive), [loans]);

  const totalOutstanding = useMemo(() => {
    return activeLoans.reduce((acc, l) => acc + l.outstandingAmount, 0);
  }, [activeLoans]);

  const formatAmount = (val: number) => {
    if (isPrivacyMode) return '••••••';
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const prefix = val < 0 ? '-' : '';
    const symbol = showCurrencySymbol ? '₹' : '';
    return `${prefix}${symbol}${formatted}`;
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderLoanCard = (item: Loan) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
    const IconComponent = config.icon;
    
    // Calculate progress
    const paidAmount = Math.max(0, item.principalAmount - item.outstandingAmount);
    const paidPercentage = item.principalAmount > 0 
      ? (paidAmount / item.principalAmount) * 100 
      : 0;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.loanCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
        activeOpacity={0.75}
        onPress={() => {
          handleHaptic();
          router.push(`/loan-details/${item.id}`);
        }}
      >
        <View style={styles.loanHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconBox, { backgroundColor: `${config.color}15` }]}>
              <IconComponent size={18} color={config.color} />
            </View>
            <View style={styles.loanTitleInfo}>
              <ThemedText type="semiBold" style={[styles.loanName, { color: currColors.text }]} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText style={[styles.loanLender, { color: currColors.textSecondary }]} numberOfLines={1}>
                {item.lenderName} • {item.interestRate}% Interest
              </ThemedText>
            </View>
          </View>
          <ChevronRight size={16} color={currColors.textSecondary} />
        </View>

        <View style={styles.loanAmountsRow}>
          <View style={styles.amountCol}>
            <ThemedText style={[styles.amountLabel, { color: currColors.textSecondary }]}>Outstanding</ThemedText>
            <ThemedText style={[styles.amountValue, { color: currColors.text, fontFamily: 'Outfit_600SemiBold' }]}>
              {formatAmount(item.outstandingAmount)}
            </ThemedText>
          </View>
          <View style={styles.amountCol}>
            <ThemedText style={[styles.amountLabel, { color: currColors.textSecondary }]}>Principal</ThemedText>
            <ThemedText style={[styles.amountValueSecondary, { color: currColors.textSecondary, fontFamily: 'Outfit_400Regular' }]}>
              {formatAmount(item.principalAmount)}
            </ThemedText>
          </View>
          <View style={styles.amountColEnd}>
            <ThemedText style={[styles.amountLabel, { color: currColors.textSecondary }]}>Monthly EMI</ThemedText>
            <ThemedText style={[styles.emiValText, { color: config.color, fontFamily: 'Outfit_600SemiBold' }]}>
              {formatAmount(item.emiAmount)}
            </ThemedText>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBarBG, { backgroundColor: currColors.cardSecondary }]}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${Math.min(100, paidPercentage)}%`, backgroundColor: config.color }
              ]} 
            />
          </View>
          <View style={styles.progressLabels}>
            <ThemedText style={[styles.progressText, { color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }]}>
              {paidPercentage.toFixed(0)}% Paid
            </ThemedText>
            <ThemedText style={[styles.progressText, { color: currColors.textSecondary, fontFamily: 'Outfit_400Regular' }]}>
              {formatAmount(item.outstandingAmount)} remaining
            </ThemedText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const overviewGradient = colorScheme === 'dark'
    ? ['#1C1C1E', '#2C2C2E'] as const
    : ['#FFFFFF', '#F2F2F7'] as const;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          Loans & EMIs
        </ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => {
            handleHaptic();
            router.push('/add-loan');
          }}
        >
          <Plus size={20} color="#00C9A7" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Total EMI Burden Card (flat, matching net worth hero) */}
        <View
          style={[
            styles.burdenCard,
            {
              backgroundColor: currColors.card,
              borderColor: currColors.border,
            },
          ]}
        >
          <View style={styles.burdenRow}>
            <View style={[styles.iconRoundBox, { backgroundColor: '#FF950015', width: 40, height: 40 }]}>
              <Calendar size={20} color="#FF9500" />
            </View>
            <View style={styles.burdenInfo}>
              <ThemedText style={[styles.burdenTitle, { color: currColors.textSecondary }]}>
                TOTAL MONTHLY EMI BURDEN
              </ThemedText>
              <ThemedText style={[styles.burdenValue, { color: currColors.text }]}>
                {formatAmount(monthlyEMI)}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.dashedDivider, { borderColor: currColors.border }]} />

          <View style={styles.burdenFooter}>
            <ThemedText style={[styles.footerLabel, { color: currColors.textSecondary }]}>
              Total Outstanding Debt
            </ThemedText>
            <ThemedText style={[styles.footerValue, { color: '#FF3B30', fontFamily: 'Outfit_600SemiBold' }]}>
              {formatAmount(totalOutstanding)}
            </ThemedText>
          </View>
        </View>

        {/* Active Loans */}
        <View style={styles.sectionHeader}>
          <ThemedText type="medium" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            ACTIVE LOANS ({activeLoans.length})
          </ThemedText>
        </View>

        {activeLoans.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Info size={44} color={currColors.textSecondary} style={{ marginBottom: 12 }} />
            <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', lineHeight: 22, paddingHorizontal: 16 }}>
              No active loans tracked. Tap the '+' button above to log a Home loan, Car loan, or other EMIs.
            </ThemedText>
          </View>
        ) : (
          activeLoans.map(renderLoanCard)
        )}

        {/* Completed Loans */}
        {completedLoans.length > 0 ? (
          <View style={{ marginTop: 24 }}>
            <View style={styles.sectionHeader}>
              <ThemedText type="medium" style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                PAID OFF / COMPLETED LOANS ({completedLoans.length})
              </ThemedText>
            </View>
            {completedLoans.map(renderLoanCard)}
          </View>
        ) : null}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  burdenCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  burdenRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  burdenInfo: {
    marginLeft: 16,
  },
  burdenTitle: {
    fontSize: 9,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  burdenValue: {
    fontSize: 26,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: -0.5,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 1,
    marginVertical: 16,
  },
  burdenFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  footerValue: {
    fontSize: 16,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  loanCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  loanTitleInfo: {
    flex: 1,
  },
  loanName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  loanLender: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  loanAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  amountCol: {
    flex: 1,
  },
  amountColEnd: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 15,
  },
  amountValueSecondary: {
    fontSize: 14,
  },
  emiValText: {
    fontSize: 15,
  },
  progressContainer: {
    width: '100%',
  },
  progressBarBG: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 10,
  },
  iconRoundBox: {
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
