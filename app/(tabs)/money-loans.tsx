import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const ICON_3D_PALETTES: Record<string, { bg: string; text: string; sub: string }> = {
  // Music & Audio -> Mint Green
  music: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  headphones: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  musical_notes: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  spotify: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },

  // Video & OTT -> Lilac / Purple
  tv: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' },
  netflix: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' },
  popcorn: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' },
  clapperboard: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' },
  film_projector: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' },

  // Apple & Warm Gadgets -> Butter Yellow
  apple: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  star: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  trophy: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  medal: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  electric: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },

  // Gym, Gaming & Fitness -> Soft Rose / Magenta
  gym: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  fitness: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  video_game: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  game: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  youtube: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  heart: { bg: '#FFE4E6', text: '#9F1239', sub: '#BE123C' },

  // Food & Fast Food -> Sunset Peach / Orange
  food: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  grocery: { bg: '#DCFCE7', text: '#14532D', sub: '#15803D' },
  pizza: { bg: '#FED7AA', text: '#7C2D12', sub: '#9A3412' },
  burger: { bg: '#FED7AA', text: '#7C2D12', sub: '#9A3412' },
  cake: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  cookie: { bg: '#FEF3C7', text: '#78350F', sub: '#92400E' },
  coffee: { bg: '#FEF3C7', text: '#78350F', sub: '#92400E' },
  beverage: { bg: '#FFE4E6', text: '#881337', sub: '#9F1239' },
  carrot: { bg: '#FFEDD5', text: '#7C2D12', sub: '#9A3412' },
  broccoli: { bg: '#DCFCE7', text: '#14532D', sub: '#15803D' },

  // Internet, Cloud, Tech & Car -> Sky Blue / Cyan
  cloud: { bg: '#BAE6FD', text: '#0C4A6E', sub: '#0369A1' },
  internet: { bg: '#BAE6FD', text: '#0C4A6E', sub: '#0369A1' },
  wifi: { bg: '#BAE6FD', text: '#0C4A6E', sub: '#0369A1' },
  laptop: { bg: '#E0E7FF', text: '#312E81', sub: '#4338CA' },
  phone: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  car: { bg: '#BAE6FD', text: '#0C4A6E', sub: '#0369A1' },
  fuel: { bg: '#FFEDD5', text: '#7C2D12', sub: '#9A3412' },
  water: { bg: '#CFFAFE', text: '#164E63', sub: '#0E7490' },
  travel: { bg: '#CCFBF1', text: '#115E59', sub: '#0F766E' },
  compass: { bg: '#CCFBF1', text: '#115E59', sub: '#0F766E' },

  // Home & Bills -> Warm Butter Amber
  house: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  receipt: { bg: '#CFFAFE', text: '#164E63', sub: '#0E7490' },
  credit_card: { bg: '#EDE9FE', text: '#581C87', sub: '#6D28D9' },
  wallet: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  money: { bg: '#DCFCE7', text: '#14532D', sub: '#15803D' },
  banknote: { bg: '#DCFCE7', text: '#14532D', sub: '#15803D' },
  coin: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  investments: { bg: '#DCFCE7', text: '#14532D', sub: '#15803D' },
  shopping: { bg: '#FED7AA', text: '#7C2D12', sub: '#9A3412' },
  clothes: { bg: '#E0E7FF', text: '#312E81', sub: '#4338CA' },
  medical: { bg: '#E0F2FE', text: '#075985', sub: '#0284C7' },
  shield: { bg: '#CCFBF1', text: '#115E59', sub: '#0F766E' },
  education: { bg: '#EDE9FE', text: '#581C87', sub: '#6D28D9' },
  books: { bg: '#EDE9FE', text: '#581C87', sub: '#6D28D9' },
  briefcase: { bg: '#F5F5F4', text: '#1C1917', sub: '#44403C' },
  umbrella: { bg: '#CCFBF1', text: '#115E59', sub: '#0F766E' },
  gift: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
  sparkles: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
  transfer: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
  target: { bg: '#FFE4E6', text: '#9F1239', sub: '#BE123C' },
  rocket: { bg: '#FFEDD5', text: '#7C2D12', sub: '#9A3412' },
};

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0;
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function getPastelPaletteFromHex(hex: string) {
  try {
    const { h, s } = hexToHSL(hex);
    const sat = Math.max(45, Math.min(85, s));
    const bg = hslToHex(h, sat, 90);
    const text = hslToHex(h, Math.min(95, sat + 15), 18);
    const sub = hslToHex(h, Math.min(90, sat + 10), 32);
    return { bg, text, sub };
  } catch {
    return { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' };
  }
}

function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return Math.abs(hash) % 360;
}

function getPastelFromHue(hue: number) {
  const bg = hslToHex(hue, 75, 90);
  const text = hslToHex(hue, 85, 18);
  const sub = hslToHex(hue, 80, 32);
  return { bg, text, sub };
}

function getCardPaletteFromItem(payment: {
  color?: string;
  type: string;
  loanType?: string;
  icon?: string;
  category?: string;
  name?: string;
}) {
  const iconKey = (payment.icon || payment.category || payment.name || '').toLowerCase().trim();

  // 1. Direct match in comprehensive 3D icon catalog
  if (ICON_3D_PALETTES[iconKey]) {
    return ICON_3D_PALETTES[iconKey];
  }

  for (const [key, palette] of Object.entries(ICON_3D_PALETTES)) {
    if (iconKey.includes(key)) {
      return palette;
    }
  }

  // 2. If item has explicit hex color code (e.g. sub.color or loan.color)
  if (payment.color && payment.color.startsWith('#')) {
    return getPastelPaletteFromHex(payment.color);
  }

  // 3. Dynamic: deterministic pastel palette from the icon chosen
  const dynamicHue = stringToHue(iconKey || 'gainbase');
  return getPastelFromHue(dynamicHue);
}

function getInterlockingCardPath(
  w: number,
  hBody: number = 60,
  tabW: number = 96,
  tabH: number = 20,
  curveR: number = 16,
  isFirst: boolean = false,
  isLast: boolean = false,
  rCorner: number = 22
): string {
  if (w <= 0) return '';
  const startX = Math.max(0, w - tabW - curveR);
  const midX = w - tabW;
  const endX = Math.min(w, w - tabW + curveR);
  const totalH = hBody + tabH;

  let path = '';

  if (isFirst) {
    path += `M 0 ${tabH + rCorner} A ${rCorner} ${rCorner} 0 0 1 ${rCorner} ${tabH} `;
  } else {
    path += `M 0 ${tabH} `;
  }

  // Top edge flat section
  path += `L ${startX} ${tabH} `;
  // Top S-curve going UP to y=0
  path += `C ${midX} ${tabH}, ${midX} 0, ${endX} 0 `;

  if (isFirst) {
    path += `L ${w - rCorner} 0 A ${rCorner} ${rCorner} 0 0 1 ${w} ${rCorner} `;
  } else {
    path += `L ${w} 0 `;
  }

  // Right edge down to hBody
  path += `L ${w} ${hBody} `;

  if (isLast) {
    path += `A ${rCorner} ${rCorner} 0 0 1 ${w - rCorner} ${totalH} `;
    path += `L ${rCorner} ${totalH} `;
    path += `A ${rCorner} ${rCorner} 0 0 1 0 ${totalH - rCorner} `;
  } else {
    // Bottom S-curve stepping DOWN to totalH
    path += `L ${endX} ${hBody} `;
    path += `C ${midX} ${hBody}, ${midX} ${totalH}, ${startX} ${totalH} `;
    path += `L 0 ${totalH} `;
  }

  // Left edge going up to start
  if (isFirst) {
    path += `L 0 ${tabH + rCorner} `;
  } else {
    path += `L 0 ${tabH} `;
  }

  path += `Z`;
  return path.replace(/\s+/g, ' ').trim();
}

function getRemainingEMIsCount(loan: Loan): number {
  if (!loan.outstandingAmount || loan.outstandingAmount <= 0) return 0;
  if (!loan.emiAmount || loan.emiAmount <= 0) return 0;
  return Math.ceil(loan.outstandingAmount / loan.emiAmount);
}

function getTicketCardPath(
  w: number,
  h: number = 136,
  notchY: number = 86,
  notchR: number = 9,
  rCorner: number = 20
): string {
  if (w <= 0 || h <= 0) return '';
  let path = `M 0 ${rCorner} `;
  path += `A ${rCorner} ${rCorner} 0 0 1 ${rCorner} 0 `;
  path += `L ${w - rCorner} 0 `;
  path += `A ${rCorner} ${rCorner} 0 0 1 ${w} ${rCorner} `;
  path += `L ${w} ${notchY - notchR} `;
  path += `A ${notchR} ${notchR} 0 0 0 ${w} ${notchY + notchR} `;
  path += `L ${w} ${h - rCorner} `;
  path += `A ${rCorner} ${rCorner} 0 0 1 ${w - rCorner} ${h} `;
  path += `L ${rCorner} ${h} `;
  path += `A ${rCorner} ${rCorner} 0 0 1 0 ${h - rCorner} `;
  path += `L 0 ${notchY + notchR} `;
  path += `A ${notchR} ${notchR} 0 0 0 0 ${notchY - notchR} `;
  path += `L 0 ${rCorner} `;
  path += `Z`;
  return path.replace(/\s+/g, ' ').trim();
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

export default function LoansScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];
  const [activeTab, setActiveTab] = useState<ObligationTab>('loans');
  const [cardWidth, setCardWidth] = useState<number>(Dimensions.get('window').width - 32);

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

  const isLoansView = activeTab === 'loans';

  const renderTicketBurdenCard = () => {
    const h = 124;
    const notchY = 76;
    const notchR = 9;
    const path = getTicketCardPath(cardWidth, h, notchY, notchR, 20);

    const isLoans = isLoansView;
    const title = isLoans ? 'MONTHLY EMI' : 'MONTHLY SUBSCRIPTIONS';
    const mainAmount = isLoans ? monthlyEMI : monthlySubBurden;
    const stubLabel = isLoans ? 'Total Outstanding' : 'Active Subscriptions';
    const stubValue = isLoans ? formatAmount(totalOutstanding) : `${activeSubscriptions.length}`;
    const stubValueColor = isLoans ? '#FF3B30' : currColors.text;

    return (
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          marginTop: 4,
          height: h,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        {/* SVG Ticket Shape Background */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={cardWidth} height={h}>
            <Path
              d={path}
              fill={currColors.card}
              stroke={currColors.border}
              strokeWidth={1}
            />
            {/* Perforated dashed divider line */}
            <Line
              x1={notchR + 6}
              y1={notchY}
              x2={cardWidth - notchR - 6}
              y2={notchY}
              stroke={currColors.border}
              strokeWidth={1}
              strokeDasharray="5, 4"
            />
          </Svg>
        </View>

        {/* Top Ticket Section */}
        <View
          style={{
            height: notchY,
            paddingHorizontal: 20,
            paddingTop: 14,
            justifyContent: 'center',
          }}
        >
          <ThemedText
            style={{
              fontSize: 10,
              fontWeight: '700',
              fontFamily: 'Outfit_700Bold',
              letterSpacing: 1,
              color: currColors.textSecondary,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            {title}
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 24,
              fontWeight: '400',
              fontFamily: 'Outfit_400Regular',
              color: currColors.text,
            }}
            numberOfLines={1}
          >
            {formatAmount(mainAmount)}
          </ThemedText>
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
              color: currColors.textSecondary,
            }}
          >
            {stubLabel}
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 14,
              fontWeight: '400',
              fontFamily: 'Outfit_400Regular',
              color: stubValueColor,
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

    const hBody = 76;
    const tabH = 24;
    const tabW = 88;
    const totalH = hBody + tabH;
    const path = getInterlockingCardPath(cardWidth, hBody, tabW, tabH, 18, isFirst, isLast, 24);

    return (
      <TouchableOpacity
        key={item.id}
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
        activeOpacity={0.88}
        onPress={() => {
          handleHaptic();
          router.push(`/loan-details/${item.id}`);
        }}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={cardWidth} height={totalH}>
            <Path d={path} fill={palette.bg} />
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
            size={46}
            iconSize={28}
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

    const hBody = 76;
    const tabH = 24;
    const tabW = 88;
    const totalH = hBody + tabH;
    const path = getInterlockingCardPath(cardWidth, hBody, tabW, tabH, 18, isFirst, isLast, 24);

    return (
      <TouchableOpacity
        key={item.id}
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
        activeOpacity={0.88}
        onPress={() => {
          handleHaptic();
          router.push(`/subscription-details/${item.id}`);
        }}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={cardWidth} height={totalH}>
            <Path d={path} fill={palette.bg} />
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
            size={28}
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
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          {isLoansView ? 'Loans & EMIs' : 'Subscriptions'}
        </ThemedText>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={handleAdd}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Plus size={20} color="#00C9A7" />
        </TouchableOpacity>
      </View>

      {/* Tab Toggle */}
      <View
        style={[
          styles.toggleBar,
          {
            backgroundColor: isDark ? currColors.cardSecondary : '#E8E8ED',
            borderColor: currColors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.toggleOption,
            isLoansView && [
              styles.toggleOptionActive,
              {
                backgroundColor: currColors.card,
                borderColor: isDark ? 'transparent' : currColors.border,
              },
            ],
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
                color: isLoansView ? (isDark ? '#00C9A7' : '#00876E') : currColors.textSecondary,
                fontFamily: isLoansView ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
              },
            ]}
          >
            Loans
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleOption,
            !isLoansView && [
              styles.toggleOptionActive,
              {
                backgroundColor: currColors.card,
                borderColor: isDark ? 'transparent' : currColors.border,
              },
            ],
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
                color: !isLoansView ? (isDark ? '#00C9A7' : '#00876E') : currColors.textSecondary,
                fontFamily: !isLoansView ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
              },
            ]}
          >
            Subscriptions
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {renderTicketBurdenCard()}

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
                <View style={styles.sectionHeader}>
                  <ThemedText type="semiBold" style={[styles.sectionMainTitle, { color: currColors.text }]}>
                    Completed Loans ({completedLoans.length})
                  </ThemedText>
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
                <View style={styles.sectionHeader}>
                  <ThemedText type="semiBold" style={[styles.sectionMainTitle, { color: currColors.text }]}>
                    Cancelled / Past Subscriptions ({completedSubscriptions.length})
                  </ThemedText>
                </View>
                <View style={styles.cardListContainer}>
                  {completedSubscriptions.map((item, index) => renderSubscriptionCard(item, index, completedSubscriptions.length))}
                </View>
              </View>
            ) : null}
          </>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 11,
  },
  toggleOptionActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 0.5,
  },
  toggleText: {
    fontSize: 13,
  },
  scrollContent: {
    paddingBottom: 110,
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
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
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
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  curvedCardSubtitle: {
    fontSize: 13,
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
