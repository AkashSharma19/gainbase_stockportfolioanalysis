import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Line } from 'react-native-svg';
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
  Repeat,
  Tv,
  Music,
  Youtube,
  ShoppingBag,
  Cloud,
  Gamepad2,
  Sparkles,
  Layers,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Loan, Subscription } from '@/types/money';
import { Category3DIcon } from '@/components/Category3DIcon';
import { LOAN_3D_ICON_MAP } from '@/constants/Category3DIcons';
import {
  FolderPalette,
  getCardPaletteFromItem,
  getInterlockingCardPath,
  getTicketCardPath,
} from '@/constants/folderTheme';
import { ExpandedFolderContainer } from '@/components/ExpandedFolderContainer';
import { LoanDetailsContent } from '@/app/loan-details/[id]';
import { SubscriptionDetailsContent } from '@/app/subscription-details/[id]';

const getSubscriptionIcon = (logoName: string | undefined) => {
  switch (logoName) {
    case 'tv':
      return Tv;
    case 'music':
      return Music;
    case 'youtube':
      return Youtube;
    case 'shopping-bag':
      return ShoppingBag;
    case 'sparkles':
      return Sparkles;
    case 'cloud':
      return Cloud;
    case 'gamepad-2':
      return Gamepad2;
    case 'layers':
      return Layers;
    default:
      return Repeat;
  }
};

const TYPE_CONFIG = {
  home: { label: 'Home Loan', emoji: '🏠', icon: Home, color: '#007AFF' },
  car: { label: 'Car Loan', emoji: '🚗', icon: Car, color: '#34C759' },
  personal: { label: 'Personal Loan', emoji: '💰', icon: User, color: '#FF9500' },
  education: { label: 'Education Loan', emoji: '🎓', icon: GraduationCap, color: '#AF52DE' },
  other: { label: 'Other Loan', emoji: '🏦', icon: Landmark, color: '#8E8E93' },
};

function getRemainingEMIsCount(loan: Loan): number {
  if (!loan.outstandingAmount || loan.outstandingAmount <= 0) return 0;
  if (!loan.emiAmount || loan.emiAmount <= 0) return 0;
  return Math.ceil(loan.outstandingAmount / loan.emiAmount);
}

function CircularProgress3DIcon({
  name,
  icon,
  progress = 0,
  color,
  size = 46,
  iconSize = 28,
}: {
  name: string;
  icon?: string;
  progress: number;
  color: string;
  size?: number;
  iconSize?: number;
}) {
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0.03, Math.min(1, progress));
  const strokeDashoffset = circumference - clampedProgress * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color + '22'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <Category3DIcon name={name} icon={icon} size={iconSize} />
    </View>
  );
}

type ObligationTab = 'loans' | 'subscriptions';

interface ExpandedItemState {
  type: 'loan' | 'subscription';
  id: string;
  origin: { x: number; y: number; width: number; height: number };
  palette: FolderPalette;
  item: Loan | Subscription;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function LoansScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];
  const [activeTab, setActiveTab] = useState<ObligationTab>('loans');
  const [cardWidth, setCardWidth] = useState<number>(Dimensions.get('window').width - 32);
  const [expandedItem, setExpandedItem] = useState<ExpandedItemState | null>(null);
  const cardRefs = useRef<{ [key: string]: View | null }>({});

  // Hide bottom tab bar dock while folder details is expanded
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: expandedItem ? 'none' : undefined },
    });
  }, [expandedItem, navigation]);

  const { loans, getMonthlyEMIBurden, subscriptions, getMonthlySubscriptionBurden } = useMoneyStore();
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const monthlyEMI = getMonthlyEMIBurden();
  const monthlySubBurden = getMonthlySubscriptionBurden();

  const activeLoans = useMemo(() => loans.filter((l) => l.isActive), [loans]);
  const completedLoans = useMemo(() => loans.filter((l) => !l.isActive), [loans]);
  const activeSubscriptions = useMemo(() => subscriptions.filter((s) => s.isActive), [subscriptions]);
  const completedSubscriptions = useMemo(() => subscriptions.filter((s) => !s.isActive), [subscriptions]);

  const totalOutstanding = useMemo(() => {
    return activeLoans.reduce((acc, l) => acc + l.outstandingAmount, 0);
  }, [activeLoans]);

  const totalPrincipal = useMemo(() => {
    return activeLoans.reduce((acc, l) => acc + (l.principalAmount || 0), 0);
  }, [activeLoans]);

  const totalSubscriptionAmount = useMemo(() => {
    return activeSubscriptions.reduce((acc, s) => acc + (s.amount || 0), 0);
  }, [activeSubscriptions]);

  const overallDebtProgress = useMemo(() => {
    if (totalPrincipal <= 0) return 0;
    const paid = Math.max(0, totalPrincipal - totalOutstanding);
    return Math.min(1, paid / totalPrincipal);
  }, [totalPrincipal, totalOutstanding]);

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

  const handleAdd = () => {
    handleHaptic();
    if (activeTab === 'loans') {
      router.push('/add-loan');
    } else {
      router.push('/add-subscription');
    }
  };

  const handleCardPress = (
    item: Loan | Subscription,
    type: 'loan' | 'subscription',
    palette: FolderPalette,
    isFirst: boolean = false,
    isLast: boolean = false
  ) => {
    handleHaptic();
    const ref = cardRefs.current[item.id];
    if (ref && (ref as any).measureInWindow) {
      (ref as any).measureInWindow((x: number, y: number, width: number, height: number) => {
        if (width > 0 && height > 0) {
          setExpandedItem({
            type,
            id: item.id,
            origin: { x, y, width, height },
            palette,
            item,
            isFirst,
            isLast,
          });
        } else {
          setExpandedItem({
            type,
            id: item.id,
            origin: { x: 16, y: 220, width: cardWidth, height: 118 },
            palette,
            item,
            isFirst,
            isLast,
          });
        }
      });
    } else {
      setExpandedItem({
        type,
        id: item.id,
        origin: { x: 16, y: 220, width: cardWidth, height: 118 },
        palette,
        item,
        isFirst,
        isLast,
      });
    }
  };

  const renderExpandedCardPreview = (expanded: ExpandedItemState) => {
    const palette = expanded.palette;
    const w = expanded.origin.width || cardWidth;
    const hBody = 92;
    const tabH = 26;
    const tabW = 90;
    const totalH = hBody + tabH;
    const isFirst = expanded.isFirst ?? false;
    const isLast = expanded.isLast ?? false;
    const path = getInterlockingCardPath(w, hBody, tabW, tabH, 18, isFirst, isLast, 24);

    if (expanded.type === 'loan') {
      const loan = expanded.item as Loan;
      const paidAmount = Math.max(0, loan.principalAmount - loan.outstandingAmount);
      const loanProgress = loan.principalAmount > 0 ? Math.min(1, paidAmount / loan.principalAmount) : 0;
      return (
        <View style={{ width: w, height: totalH, alignSelf: 'center' }}>
          <Svg width={w} height={totalH}>
            <Path
              d={path}
              fill={palette.bg}
              stroke={isDark ? 'transparent' : palette.sub + '55'}
              strokeWidth={1.2}
            />
          </Svg>
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 14,
              width: tabW - 14,
              height: hBody,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress3DIcon
              name={loan.icon || LOAN_3D_ICON_MAP[loan.type] || 'loan'}
              progress={loanProgress}
              color={palette.text}
              size={50}
              iconSize={30}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              top: tabH,
              left: 20,
              height: hBody,
              justifyContent: 'center',
              paddingRight: tabW + 12,
            }}
          >
            <ThemedText style={[styles.curvedCardTitle, { color: palette.text }]} numberOfLines={1}>
              {loan.name}
            </ThemedText>
            <ThemedText style={[styles.curvedCardSubtitle, { color: palette.sub }]} numberOfLines={1}>
              {formatAmount(loan.emiAmount)}/monthly
            </ThemedText>
          </View>
        </View>
      );
    } else {
      const sub = expanded.item as Subscription;
      const cycleLabel = sub.billingCycle
        ? sub.billingCycle.charAt(0).toUpperCase() + sub.billingCycle.slice(1)
        : 'Monthly';
      return (
        <View style={{ width: w, height: totalH, alignSelf: 'center' }}>
          <Svg width={w} height={totalH}>
            <Path
              d={path}
              fill={palette.bg}
              stroke={isDark ? 'transparent' : palette.sub + '55'}
              strokeWidth={1.2}
            />
          </Svg>
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 14,
              width: tabW - 14,
              height: hBody,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Category3DIcon
              name={sub.category || sub.name}
              icon={sub.logo}
              size={32}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              top: tabH,
              left: 20,
              height: hBody,
              justifyContent: 'center',
              paddingRight: tabW + 12,
            }}
          >
            <ThemedText style={[styles.curvedCardTitle, { color: palette.text }]} numberOfLines={1}>
              {sub.name}
            </ThemedText>
            <ThemedText style={[styles.curvedCardSubtitle, { color: palette.sub }]} numberOfLines={1}>
              {formatAmount(sub.amount)}/{cycleLabel.toLowerCase()}
            </ThemedText>
          </View>
        </View>
      );
    }
  };

  const isLoansView = activeTab === 'loans';

  const renderTicketHeroCard = () => {
    const h = 132;
    const notchY = 82;
    const notchR = 9;
    const path = getTicketCardPath(cardWidth, h, notchY, notchR, 22);

    const isLoans = isLoansView;
    const palette = isLoans
      ? { bg: '#FEF08A', text: '#713F12', sub: '#854D0E', border: '#CA8A04' }
      : { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE', border: '#9333EA' };

    const title = isLoans ? 'MONTHLY EMI' : 'MONTHLY SUBSCRIPTIONS';
    const mainAmount = isLoans ? monthlyEMI : monthlySubBurden;
    const stubLabel = isLoans ? 'Total Outstanding' : 'Total Amount';
    const stubValue = isLoans
      ? formatAmount(totalOutstanding)
      : formatAmount(totalSubscriptionAmount);

    return (
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - cardWidth) > 1) {
            setCardWidth(w);
          }
        }}
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          marginTop: 4,
          height: h,
          shadowColor: isDark ? '#000000' : palette.sub,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.06 : 0.12,
          shadowRadius: isDark ? 4 : 8,
          elevation: 2,
        }}
      >
        {/* SVG Ticket Shape Background */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={cardWidth} height={h}>
            <Path
              d={path}
              fill={palette.bg}
              stroke={isDark ? 'transparent' : palette.border}
              strokeWidth={1.5}
            />
            {/* Perforated dashed divider line */}
            <Line
              x1={notchR + 6}
              y1={notchY}
              x2={cardWidth - notchR - 6}
              y2={notchY}
              stroke={isDark ? palette.text + '35' : palette.sub + 'B0'}
              strokeWidth={1.5}
              strokeDasharray="5, 4"
            />
          </Svg>
        </View>

        {/* Top Ticket Section */}
        <View
          style={{
            height: notchY,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <ThemedText
              style={{
                fontSize: 10,
                fontFamily: 'Outfit_700Bold',
                letterSpacing: 0.8,
                color: palette.sub,
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {title}
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 24,
                fontFamily: 'Outfit_400Regular',
                color: palette.text,
              }}
              numberOfLines={1}
            >
              {formatAmount(mainAmount)}
            </ThemedText>
          </View>
        </View>

        {/* Bottom Ticket Stub */}
        <View
          style={{
            height: h - notchY,
            paddingHorizontal: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <ThemedText
            style={{
              fontSize: 14,
              fontFamily: 'Outfit_400Regular',
              color: palette.sub,
            }}
          >
            {stubLabel}
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 14,
              fontWeight: '400',
              fontFamily: 'Outfit_400Regular',
              color: palette.text,
            }}
          >
            {stubValue}
          </ThemedText>
        </View>
      </View>
    );
  };

  const renderLoanCard = (item: Loan, index: number, totalCount: number) => {
    const isFirst = index === 0;
    const isLast = index === totalCount - 1;
    const palette = getCardPaletteFromItem({
      type: 'loan',
      loanType: item.type,
      name: item.name,
      icon: item.icon || LOAN_3D_ICON_MAP[item.type],
    });

    const paidAmount = Math.max(0, item.principalAmount - item.outstandingAmount);
    const loanProgress = item.principalAmount > 0 ? Math.min(1, paidAmount / item.principalAmount) : 0;

    const hBody = 92;
    const tabH = 26;
    const tabW = 90;
    const totalH = hBody + tabH;
    const path = getInterlockingCardPath(cardWidth, hBody, tabW, tabH, 18, isFirst, isLast, 24);

    return (
      <TouchableOpacity
        key={item.id}
        ref={(r) => {
          cardRefs.current[item.id] = r;
        }}
        style={{
          height: totalH,
          marginTop: isFirst ? 0 : -tabH,
          zIndex: totalCount - index,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1.5 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 1,
        }}
        activeOpacity={0.82}
        onPress={() => {
          handleCardPress(item, 'loan', palette, isFirst, isLast);
        }}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={cardWidth} height={totalH}>
            <Path
              d={path}
              fill={palette.bg}
              stroke={isDark ? 'transparent' : palette.sub + '55'}
              strokeWidth={1.2}
            />
          </Svg>
        </View>

        {/* Right Tab Lobe with Circular Progress 3D Icon */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 14,
            width: tabW - 14,
            height: hBody,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <CircularProgress3DIcon
            name={item.icon || LOAN_3D_ICON_MAP[item.type] || 'loan'}
            progress={loanProgress}
            color={palette.text}
            size={50}
            iconSize={30}
          />
        </View>

        {/* Left Body Content */}
        <View
          style={{
            position: 'absolute',
            top: tabH,
            left: 20,
            height: hBody,
            justifyContent: 'center',
            paddingRight: tabW + 12,
          }}
        >
          <ThemedText style={[styles.curvedCardTitle, { color: palette.text }]} numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText style={[styles.curvedCardSubtitle, { color: palette.sub }]} numberOfLines={1}>
            {formatAmount(item.emiAmount)}/monthly
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSubscriptionCard = (item: Subscription, index: number, totalCount: number) => {
    const isFirst = index === 0;
    const isLast = index === totalCount - 1;
    const palette = getCardPaletteFromItem({
      type: 'subscription',
      name: item.name,
      category: item.category,
      icon: item.logo,
    });

    const cycleLabel = item.billingCycle ? item.billingCycle.charAt(0).toUpperCase() + item.billingCycle.slice(1) : 'Monthly';

    const hBody = 92;
    const tabH = 26;
    const tabW = 90;
    const totalH = hBody + tabH;
    const path = getInterlockingCardPath(cardWidth, hBody, tabW, tabH, 18, isFirst, isLast, 24);

    return (
      <TouchableOpacity
        key={item.id}
        ref={(r) => {
          cardRefs.current[item.id] = r;
        }}
        style={{
          height: totalH,
          marginTop: isFirst ? 0 : -tabH,
          zIndex: totalCount - index,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1.5 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 1,
        }}
        activeOpacity={0.82}
        onPress={() => {
          handleCardPress(item, 'subscription', palette, isFirst, isLast);
        }}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={cardWidth} height={totalH}>
            <Path
              d={path}
              fill={palette.bg}
              stroke={isDark ? 'transparent' : palette.sub + '55'}
              strokeWidth={1.2}
            />
          </Svg>
        </View>

        {/* Right Tab Lobe with 3D Icon */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 14,
            width: tabW - 14,
            height: hBody,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Category3DIcon
            name={item.category || item.name}
            icon={item.logo}
            size={32}
          />
        </View>

        {/* Left Body Content */}
        <View
          style={{
            position: 'absolute',
            top: tabH,
            left: 20,
            height: hBody,
            justifyContent: 'center',
            paddingRight: tabW + 12,
          }}
        >
          <ThemedText style={[styles.curvedCardTitle, { color: palette.text }]} numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText style={[styles.curvedCardSubtitle, { color: palette.sub }]} numberOfLines={1}>
            {formatAmount(item.amount)}/{cycleLabel.toLowerCase()}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
              {isLoansView ? 'Loans' : 'Subscriptions'}
            </ThemedText>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2.5,
              borderRadius: 12,
              backgroundColor: isLoansView ? '#FEF08A' : '#E9D5FF',
              borderWidth: isDark ? 0 : 1,
              borderColor: isLoansView ? '#CA8A04' : '#9333EA',
            }}
          >
            <ThemedText
              style={{
                fontSize: 11,
                fontFamily: 'Outfit_600SemiBold',
                color: isLoansView ? '#713F12' : '#581C87',
              }}
            >
              {isLoansView ? activeLoans.length : activeSubscriptions.length}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Tab Switcher */}
      <View
        style={[
          styles.toggleBar,
          {
            backgroundColor: isDark ? currColors.card : '#FFFFFF',
            borderColor: isDark ? currColors.border : '#E2E8F0',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0 : 0.05,
            shadowRadius: 3,
            elevation: isDark ? 0 : 1,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.toggleOption,
            isLoansView && {
              backgroundColor: '#FEF08A',
              borderWidth: isDark ? 0 : 1.5,
              borderColor: '#CA8A04',
              shadowColor: isDark ? '#000000' : '#CA8A04',
              shadowOffset: { width: 0, height: 1.5 },
              shadowOpacity: isDark ? 0.08 : 0.22,
              shadowRadius: 3,
              elevation: 2,
            },
          ]}
          onPress={() => {
            handleHaptic();
            setActiveTab('loans');
          }}
          activeOpacity={0.8}
        >
          <ThemedText
            style={[
              styles.toggleText,
              {
                color: isLoansView ? '#713F12' : isDark ? currColors.textSecondary : '#64748B',
                fontFamily: isLoansView ? 'Outfit_700Bold' : 'Outfit_600SemiBold',
              },
            ]}
          >
            Loans
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleOption,
            !isLoansView && {
              backgroundColor: '#E9D5FF',
              borderWidth: isDark ? 0 : 1.5,
              borderColor: '#9333EA',
              shadowColor: isDark ? '#000000' : '#9333EA',
              shadowOffset: { width: 0, height: 1.5 },
              shadowOpacity: isDark ? 0.08 : 0.22,
              shadowRadius: 3,
              elevation: 2,
            },
          ]}
          onPress={() => {
            handleHaptic();
            setActiveTab('subscriptions');
          }}
          activeOpacity={0.8}
        >
          <ThemedText
            style={[
              styles.toggleText,
              {
                color: !isLoansView ? '#581C87' : isDark ? currColors.textSecondary : '#64748B',
                fontFamily: !isLoansView ? 'Outfit_700Bold' : 'Outfit_600SemiBold',
              },
            ]}
          >
            Subscriptions
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {renderTicketHeroCard()}

        {isLoansView ? (
          <>
            {activeLoans.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <Info size={44} color={currColors.textSecondary} style={{ marginBottom: 12 }} />
                <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', lineHeight: 22, paddingHorizontal: 16 }}>
                  No active loans tracked. Tap the '+' button above to log a Home loan, Car loan, or other EMIs.
                </ThemedText>
              </View>
            ) : (
              <View
                style={styles.cardListContainer}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0) setCardWidth(w);
                }}
              >
                {activeLoans.map((item, index) => renderLoanCard(item, index, activeLoans.length))}
              </View>
            )}

            {/* Completed Loans */}
            {completedLoans.length > 0 ? (
              <View style={{ marginTop: 24 }}>
                <View style={[styles.sectionHeader, { marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                  <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                    COMPLETED LOANS
                  </ThemedText>
                  <View
                    style={{
                      paddingHorizontal: 7,
                      paddingVertical: 1.5,
                      borderRadius: 10,
                      backgroundColor: isDark ? currColors.cardSecondary : '#E2E8F0',
                    }}
                  >
                    <ThemedText
                      style={{
                        fontSize: 10,
                        fontFamily: 'Outfit_700Bold',
                        color: currColors.textSecondary,
                      }}
                    >
                      {completedLoans.length}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.cardListContainer}>
                  {completedLoans.map((item, index) => renderLoanCard(item, index, completedLoans.length))}
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <>
            {activeSubscriptions.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <Info size={44} color={currColors.textSecondary} style={{ marginBottom: 12 }} />
                <ThemedText style={{ color: currColors.textSecondary, textAlign: 'center', fontFamily: 'Outfit_400Regular', lineHeight: 22, paddingHorizontal: 16 }}>
                  No subscriptions tracked yet. Tap the '+' button above to add Netflix, Spotify, or other recurring subscriptions.
                </ThemedText>
              </View>
            ) : (
              <View
                style={styles.cardListContainer}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0) setCardWidth(w);
                }}
              >
                {activeSubscriptions.map((item, index) => renderSubscriptionCard(item, index, activeSubscriptions.length))}
              </View>
            )}

            {/* Completed / Cancelled Subscriptions */}
            {completedSubscriptions.length > 0 ? (
              <View style={{ marginTop: 24 }}>
                <View style={[styles.sectionHeader, { marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                  <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
                    CANCELLED / PAST
                  </ThemedText>
                  <View
                    style={{
                      paddingHorizontal: 7,
                      paddingVertical: 1.5,
                      borderRadius: 10,
                      backgroundColor: isDark ? currColors.cardSecondary : '#E2E8F0',
                    }}
                  >
                    <ThemedText
                      style={{
                        fontSize: 10,
                        fontFamily: 'Outfit_700Bold',
                        color: currColors.textSecondary,
                      }}
                    >
                      {completedSubscriptions.length}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.cardListContainer}>
                  {completedSubscriptions.map((item, index) => renderSubscriptionCard(item, index, completedSubscriptions.length))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

        {/* Floating Add Button above Nav Bar Dock */}
        {!expandedItem && (
          <TouchableOpacity
            style={[
              styles.floatingAddBtn,
              {
                bottom: Math.max(insets.bottom, 12) + 74,
                backgroundColor: isLoansView ? '#FEF08A' : '#E9D5FF',
                borderWidth: isDark ? 0 : 1.5,
                borderColor: isLoansView ? '#CA8A04' : '#9333EA',
                shadowColor: isDark ? '#000000' : (isLoansView ? '#CA8A04' : '#9333EA'),
              },
            ]}
            onPress={handleAdd}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.82}
          >
            <Plus size={24} color={isLoansView ? '#713F12' : '#581C87'} strokeWidth={2.6} />
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* ─── Seamless Folder Expanding & Collapsing Container ─── */}
      {expandedItem && (
        <ExpandedFolderContainer
          isOpen={!!expandedItem}
          origin={expandedItem.origin}
          palette={expandedItem.palette}
          cardPreview={renderExpandedCardPreview(expandedItem)}
          onClose={() => setExpandedItem(null)}
        >
          {(triggerClose) =>
            expandedItem.type === 'loan' ? (
              <LoanDetailsContent
                loanId={expandedItem.id}
                onBack={triggerClose}
              />
            ) : (
              <SubscriptionDetailsContent
                subscriptionId={expandedItem.id}
                onBack={triggerClose}
              />
            )
          }
        </ExpandedFolderContainer>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  floatingAddBtn: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  toggleBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  toggleText: {
    fontSize: 13,
  },
  scrollContent: {
    paddingBottom: 160,
  },
  burdenCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginTop: 4,
    marginBottom: 20,
  },
  burdenRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  burdenInfo: {
    marginLeft: 14,
  },
  burdenTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  burdenValue: {
    fontSize: 24,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
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
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginBottom: 2,
  },
  sectionMainTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  cardListContainer: {
    marginHorizontal: 16,
  },
  curvedCardContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  curvedTabRightLobe: {
    position: 'absolute',
    top: 0,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  curvedSubBody: {
    position: 'absolute',
    left: 18,
    paddingRight: 106,
    justifyContent: 'center',
  },
  curvedCardTitle: {
    fontSize: 16.5,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  curvedCardSubtitle: {
    fontSize: 13.5,
    fontFamily: 'Outfit_500Medium',
  },
  actionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: 10,
    paddingTop: 6,
  },
  progressBarBG: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressMetaText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  iconRoundBox: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
