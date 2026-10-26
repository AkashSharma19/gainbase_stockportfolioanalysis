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
import { Svg, Circle, Path, Line } from 'react-native-svg';
import {
  CreditCard,
  Landmark,
  PiggyBank,
  ArrowRightLeft,
  ArrowRight,
  Wallet,
  Activity,
  Calendar,
  Info,
  Layers,
  Eye,
  EyeOff,
  PieChart,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Repeat,
  Tv,
  Music,
  Youtube,
  ShoppingBag,
  Cloud,
  Gamepad2,
  Sparkles,
  TrendingUp,
  Target,
} from 'lucide-react-native';

import { ThemedText } from './ThemedText';
import { CategoryIcon } from './CategoryIcon';
import { Category3DIcon } from './Category3DIcon';
import { LOAN_3D_ICON_MAP } from '../constants/Category3DIcons';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useGoalStore } from '../store/useGoalStore';
import { MoneyTransaction } from '../types/money';
import { MoneyActivityCalendar } from './MoneyActivityCalendar';
import { getNextLoanDuePayment, getEffectiveLoanOutstanding } from '../lib/finance';
import { getTicketCardPath } from '../constants/folderTheme';
import { FinancialGoalsCard } from './FinancialGoalsCard';

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

const getCategoryBadgeTint = (category: string, type: 'income' | 'expense' | 'transfer', isDark: boolean) => {
  if (type === 'income') {
    return { bg: isDark ? '#00C9A722' : '#E6F9F5' };
  }
  if (type === 'transfer') {
    return { bg: isDark ? '#007AFF22' : '#EDF4FF' };
  }
  const cat = (category || '').toLowerCase();
  if (cat.includes('grocer') || cat.includes('food') || cat.includes('dine') || cat.includes('restaurant') || cat.includes('snack') || cat.includes('eat')) {
    return { bg: isDark ? '#34C75924' : '#EAF8EE' };
  }
  if (cat.includes('shop') || cat.includes('cloth') || (cat.includes('electr') && !cat.includes('electric bill')) || cat.includes('gadget') || cat.includes('amazon') || cat.includes('purchase')) {
    return { bg: isDark ? '#AF52DE24' : '#F5EDFD' };
  }
  if (cat.includes('bill') || cat.includes('electric') || cat.includes('utility') || cat.includes('rent') || cat.includes('recharge') || cat.includes('wifi') || cat.includes('internet') || cat.includes('emi') || cat.includes('loan')) {
    return { bg: isDark ? '#FF950024' : '#FFF4EB' };
  }
  if (cat.includes('transport') || cat.includes('travel') || cat.includes('taxi') || cat.includes('cab') || cat.includes('fuel') || cat.includes('petrol') || cat.includes('uber') || cat.includes('ola')) {
    return { bg: isDark ? '#FFCC0026' : '#FFF9E6' };
  }
  if (cat.includes('entertain') || cat.includes('movie') || cat.includes('ott') || cat.includes('netflix') || cat.includes('game') || cat.includes('play')) {
    return { bg: isDark ? '#FF2D5524' : '#FEECEF' };
  }
  if (cat.includes('health') || cat.includes('medic') || cat.includes('doctor') || cat.includes('gym') || cat.includes('fit') || cat.includes('pharma')) {
    return { bg: isDark ? '#32ADE624' : '#E8F6FC' };
  }
  if (cat.includes('invest') || cat.includes('stock') || cat.includes('mutual') || cat.includes('gold')) {
    return { bg: isDark ? '#5856D624' : '#EFF0FD' };
  }
  return { bg: isDark ? '#8E8E9324' : '#F2F2F7' };
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

function CircularProgress3DIcon({
  name,
  icon,
  progress = 0,
  color,
  size = 36,
  iconSize = 22,
}: {
  name: string;
  icon?: string;
  progress: number;
  color: string;
  size?: number;
  iconSize?: number;
}) {
  const strokeWidth = 2.2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0.04, Math.min(1, progress));
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


export function MoneyDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  const [cardWidth, setCardWidth] = useState<number>(Dimensions.get('window').width - 32);

  const {
    accounts,
    moneyTransactions,
    loans,
    subscriptions,
    emiPayments,
    budgets,
    getNetWorth,
    getMonthlyEMIBurden,
    getMonthlySubscriptionBurden,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const togglePrivacyMode = usePortfolioStore((state) => state.togglePrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
  const goals = useGoalStore((state) => state.goals);

  // Subscribe to portfolio transactions and tickers so net worth updates live
  const portfolioTransactions = usePortfolioStore((state) => state.transactions);
  const portfolioTickers = usePortfolioStore((state) => state.tickers);

  // Filter state for transactions list
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

  // Computations
  const netWorth = getNetWorth();
  const monthlyEMIs = getMonthlyEMIBurden();
  const monthlySubscriptions = getMonthlySubscriptionBurden();

  // Upcoming Payments calculation (within next 14 days, and past 30 days overdue)
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    const fourteenDaysLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    fourteenDaysLater.setHours(23, 59, 59, 999);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const list: Array<{
      id: string;
      targetId: string;
      name: string;
      amount: number;
      date: Date;
      type: 'emi' | 'subscription';
      color: string;
      logo?: string;
      loanType?: string;
      category?: string;
      icon?: string;
      progress?: number;
    }> = [];

    // 1. Process active loans for EMIs
    loans.forEach((loan) => {
      if (loan.isActive && loan.emiAmount > 0) {
        const nextDue = getNextLoanDuePayment(loan, emiPayments, today);
        if (nextDue && nextDue >= thirtyDaysAgo && nextDue <= fourteenDaysLater) {
          const paidAmount = Math.max(0, loan.principalAmount - getEffectiveLoanOutstanding(loan, emiPayments));
          const progress = loan.principalAmount > 0 ? Math.min(1, paidAmount / loan.principalAmount) : 0;
          list.push({
            id: `emi-${loan.id}`,
            targetId: loan.id,
            name: `${loan.name} EMI`,
            amount: loan.emiAmount,
            date: nextDue,
            type: 'emi',
            loanType: loan.type,
            icon: loan.icon,
            color: loan.type === 'home' ? '#FF9500' : loan.type === 'car' ? '#007AFF' : '#AF52DE',
            progress,
          });
        }
      }
    });

    // 2. Process active subscriptions
    subscriptions.forEach((sub) => {
      if (sub.isActive && sub.amount > 0 && sub.nextPaymentDate) {
        const nextDue = new Date(sub.nextPaymentDate);
        if (nextDue >= thirtyDaysAgo && nextDue <= fourteenDaysLater) {
          list.push({
            id: `sub-${sub.id}`,
            targetId: sub.id,
            name: sub.name,
            category: sub.category,
            amount: sub.amount,
            date: nextDue,
            type: 'subscription',
            color: sub.color || '#00C9A7',
            logo: sub.logo,
          });
        }
      }
    });

    // Sort chronologically
    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [loans, subscriptions, emiPayments]);


  // Monthly income/expense computations
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    let income = 0;
    let expense = 0;

    moneyTransactions.forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      if (txTime >= startOfMonth && txTime <= endOfMonth) {
        if (tx.type === 'income') income += tx.amount;
        else if (tx.type === 'expense') expense += tx.amount;
      }
    });

    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    const currentDay = Math.max(1, now.getDate());
    const dailyBurnRate = currentDay > 0 ? expense / currentDay : 0;
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const avgDailyEarning = totalDaysInMonth > 0 ? income / totalDaysInMonth : 0;

    return { income, expense, savingsRate, dailyBurnRate, avgDailyEarning };
  }, [moneyTransactions]);

  // Filter and limit recent transactions to show only the last transaction date's data, capped at 3
  const filteredRecentTxs = useMemo(() => {
    let list = moneyTransactions;
    if (activeFilter !== 'all') {
      list = list.filter((tx) => tx.type === activeFilter);
    }

    if (list.length === 0) return [];

    const lastTxDateStr = new Date(list[0].date).toDateString();
    const sameDayTxs = list.filter((tx) => new Date(tx.date).toDateString() === lastTxDateStr);

    return sameDayTxs.slice(0, 3);
  }, [moneyTransactions, activeFilter]);

  // Chronologically group the filtered recent transactions
  const groupedTxs = useMemo(() => {
    const groups: { title: string; data: MoneyTransaction[] }[] = [];
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    filteredRecentTxs.forEach((tx) => {
      const dateObj = new Date(tx.date);
      const txDateStr = dateObj.toDateString();
      let title = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      if (txDateStr === today) {
        title = 'Today';
      } else if (txDateStr === yesterdayStr) {
        title = 'Yesterday';
      }

      const existing = groups.find((g) => g.title === title);
      if (existing) {
        existing.data.push(tx);
      } else {
        groups.push({ title, data: [tx] });
      }
    });
    return groups;
  }, [filteredRecentTxs]);

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

  const [heroCardHeight, setHeroCardHeight] = useState<number>(348);

  const renderTicketHeroCard = () => {
    const notchY = 82;
    const notchR = 9;
    const h = heroCardHeight;
    const path = getTicketCardPath(cardWidth, h, notchY, notchR, 22);

    const palette = {
      bg: '#D1F5EC',
      text: '#064E3B',
      sub: '#047857',
      border: '#34D399',
    };

    return (
      <View
        onLayout={(e) => {
          const { width: w, height: layoutH } = e.nativeEvent.layout;
          if (w > 0 && Math.abs(w - cardWidth) > 1) {
            setCardWidth(w);
          }
          if (layoutH > 0 && Math.abs(layoutH - heroCardHeight) > 1) {
            setHeroCardHeight(layoutH);
          }
        }}
        style={{
          marginBottom: 16,
          marginTop: 2,
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

        {/* Top Ticket Section (Net Worth + Quick Actions) */}
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
              TOTAL NET WORTH
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 24,
                fontFamily: 'Outfit_400Regular',
                color: palette.text,
              }}
              numberOfLines={1}
            >
              {formatAmount(netWorth)}
            </ThemedText>
          </View>

          {/* Quick Actions (Privacy Toggle & Analytics) */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                handleHaptic();
                togglePrivacyMode();
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: palette.text + '14',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {isPrivacyMode ? (
                <EyeOff size={16} color={palette.text} />
              ) : (
                <Eye size={16} color={palette.text} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                handleHaptic();
                router.push('/money-analytics');
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: palette.text + '14',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <PieChart size={16} color={palette.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Ticket Body (All 7 Original Stat Rows) */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 16,
          }}
        >
          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              This month income
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#047857' }]}>
              {isPrivacyMode ? '••••••' : `+${formatAmount(monthlyStats.income)}`}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              This month expenses
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#B91C1C' }]}>
              {isPrivacyMode ? '••••••' : `-${formatAmount(monthlyStats.expense)} (${(monthlyStats.income > 0 ? (monthlyStats.expense / monthlyStats.income) * 100 : 0).toFixed(0)}%)`}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Monthly EMIs
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: palette.text }]}>
              {isPrivacyMode ? '••••••' : `${formatAmount(monthlyEMIs)} (${(monthlyStats.income > 0 ? (monthlyEMIs / monthlyStats.income) * 100 : 0).toFixed(0)}%)`}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Monthly Subscriptions
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: palette.text }]}>
              {isPrivacyMode ? '••••••' : `${formatAmount(monthlySubscriptions)} (${(monthlyStats.income > 0 ? (monthlySubscriptions / monthlyStats.income) * 100 : 0).toFixed(0)}%)`}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Savings rate
            </ThemedText>
            <ThemedText
              style={[
                styles.heroRowValue,
                {
                  color: isPrivacyMode
                    ? palette.text
                    : monthlyStats.savingsRate >= 20
                    ? '#047857'
                    : monthlyStats.savingsRate > 0
                    ? '#B45309'
                    : '#B91C1C',
                },
              ]}
            >
              {isPrivacyMode ? '••••••' : `${formatAmount(monthlyStats.income - monthlyStats.expense)} (${monthlyStats.savingsRate.toFixed(0)}%)`}
            </ThemedText>
          </View>

          <View style={styles.heroRow}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Daily Burn Rate
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: palette.text }]}>
              {isPrivacyMode ? '••••••' : `${formatAmount(monthlyStats.dailyBurnRate)}/day`}
            </ThemedText>
          </View>

          <View style={[styles.heroRow, { marginBottom: 0 }]}>
            <ThemedText style={[styles.heroRowLabel, { color: palette.sub }]}>
              Avg Daily Earning
            </ThemedText>
            <ThemedText style={[styles.heroRowValue, { color: '#047857' }]}>
              {isPrivacyMode ? '••••••' : `+${formatAmount(monthlyStats.avgDailyEarning)}/day`}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const activeFilterBg = currColors.tintMoney;

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ─── Ticket-Style Net Worth Hero Card with All Stat Rows ─── */}
        {renderTicketHeroCard()}

        {/* ─── Financial Goals & Milestones Analytics Card ─── */}
        <FinancialGoalsCard />

        {/* ─── Upcoming Payments / Bills (Pastel Horizontal Carousel) ─── */}
        {upcomingPayments.length > 0 ? (
          <View style={styles.upcomingSectionWrapper}>
            <View style={styles.upcomingHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ThemedText
                  style={[
                    styles.innerSectionTitle,
                    { color: currColors.textSecondary },
                  ]}
                >
                  UPCOMING BILLS
                </ThemedText>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: isDark ? currColors.cardSecondary : '#FEF08A',
                    borderWidth: isDark ? 0 : 1,
                    borderColor: '#CA8A04',
                  }}
                >
                  <ThemedText
                    style={{
                      fontSize: 11,
                      fontFamily: 'Outfit_600SemiBold',
                      color: isDark ? currColors.text : '#713F12',
                    }}
                  >
                    {upcomingPayments.length} due
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  handleHaptic();
                  router.push('/(tabs)/money-loans');
                }}
                style={styles.viewMoreButton}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: currColors.cardSecondary },
                  ]}
                >
                  <ArrowRight size={14} color={currColors.tint} />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.upcomingScrollContent}
              >
                {upcomingPayments.map((payment) => {
                  const iconName =
                    payment.type === 'emi'
                      ? payment.icon ||
                        LOAN_3D_ICON_MAP[payment.loanType || ''] ||
                        'loan'
                      : payment.category || payment.name;
                  const palette = getCardPaletteFromItem({
                    ...payment,
                    icon: iconName,
                  });
                  const d1 = new Date(payment.date);
                  d1.setHours(0, 0, 0, 0);
                  const d2 = new Date();
                  d2.setHours(0, 0, 0, 0);
                  const diffDays = Math.round(
                    (d1.getTime() - d2.getTime()) / (24 * 60 * 60 * 1000)
                  );

                  let dueLabel = `${diffDays} days left`;
                  if (diffDays === 0) {
                    dueLabel = 'Due today';
                  } else if (diffDays === 1) {
                    dueLabel = 'Due tomorrow';
                  } else if (diffDays < 0) {
                    dueLabel = `${Math.abs(diffDays)}d overdue`;
                  }

                  return (
                    <TouchableOpacity
                      key={payment.id}
                      style={[
                        styles.pastelBillCard,
                        { backgroundColor: palette.bg },
                      ]}
                      activeOpacity={0.82}
                      onPress={() => {
                        handleHaptic();
                        if (payment.type === 'emi') {
                          router.push(`/loan-details/${payment.targetId}`);
                        } else {
                          router.push(
                            `/subscription-details/${payment.targetId}`
                          );
                        }
                      }}
                    >
                      {/* Top Row: Icon (with Circular Progress for EMIs) + Amount & Due */}
                      <View style={styles.pastelCardTop}>
                        {payment.type === 'emi' ? (
                          <CircularProgress3DIcon
                            name={iconName}
                            icon={payment.icon}
                            progress={payment.progress ?? 0}
                            color={palette.text}
                            size={36}
                            iconSize={22}
                          />
                        ) : (
                          <Category3DIcon
                            name={iconName}
                            icon={payment.logo}
                            size={30}
                          />
                        )}
                        <View style={styles.pastelCardAmountCol}>
                          <ThemedText
                            style={[
                              styles.pastelCardAmount,
                              { color: palette.text },
                            ]}
                          >
                            {isPrivacyMode
                              ? '••••••'
                              : formatAmount(payment.amount)}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.pastelCardDueLabel,
                              { color: palette.sub },
                            ]}
                            numberOfLines={1}
                          >
                            {dueLabel}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Bottom: Service / Bill Name */}
                      <ThemedText
                        style={[
                          styles.pastelCardName,
                          { color: palette.text },
                        ]}
                        numberOfLines={1}
                      >
                        {payment.name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
          </View>
        ) : null}

        {/* ─── Recent Transactions (Single Card in New Pastel Theme) ─── */}
        {(() => {
          const txCardPalette = {
            bg: '#FFE4E6',
            text: '#881337',
            sub: '#9F1239',
            border: '#FDA4AF',
          };

          return (
            <View
              style={[
                styles.accordionContainer,
                {
                  backgroundColor: txCardPalette.bg,
                  borderColor: isDark ? 'transparent' : txCardPalette.border,
                  borderWidth: 1.2,
                },
              ]}
            >
              {/* Header Row inside the Single Card */}
              <View style={styles.headerWithAction}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ThemedText
                    style={[
                      styles.innerSectionTitle,
                      { color: txCardPalette.sub },
                    ]}
                  >
                    RECENT TRANSACTIONS
                  </ThemedText>
                  {filteredRecentTxs.length > 0 && (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                        backgroundColor: 'rgba(136, 19, 55, 0.12)',
                        borderWidth: 1,
                        borderColor: 'rgba(136, 19, 55, 0.22)',
                      }}
                    >
                      <ThemedText
                        style={{
                          fontSize: 11,
                          fontFamily: 'Outfit_600SemiBold',
                          color: txCardPalette.text,
                        }}
                      >
                        {filteredRecentTxs.length}
                      </ThemedText>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    handleHaptic();
                    router.push('/all-money-transactions');
                  }}
                  style={styles.viewMoreButton}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: 'rgba(136, 19, 55, 0.12)' },
                    ]}
                  >
                    <ChevronRight size={14} color={txCardPalette.text} />
                  </View>
                </TouchableOpacity>
              </View>

              {filteredRecentTxs.length === 0 ? (
                <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                  <ThemedText
                    style={{
                      color: txCardPalette.sub,
                      textAlign: 'center',
                      fontFamily: 'Outfit_400Regular',
                      fontSize: 13,
                      lineHeight: 18,
                      paddingHorizontal: 12,
                      marginBottom: 10,
                    }}
                  >
                    No transactions logged yet.
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => {
                      handleHaptic();
                      router.push('/add-money-transaction');
                    }}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 14,
                      borderRadius: 16,
                      backgroundColor: 'rgba(136, 19, 55, 0.12)',
                    }}
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      style={{
                        fontSize: 12,
                        color: txCardPalette.text,
                        fontFamily: 'Outfit_600SemiBold',
                      }}
                    >
                      + Log First Transaction
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredRecentTxs.map((tx, index) => {
                  const account = accounts.find((a) => a.id === tx.accountId);
                  const toAccount = tx.toAccountId
                    ? accounts.find((a) => a.id === tx.toAccountId)
                    : null;
                  const isLast = index === filteredRecentTxs.length - 1;
                  const isIncome = tx.type === 'income';
                  const isExpense = tx.type === 'expense';
                  const isTransfer = tx.type === 'transfer';

                  const iconName = isTransfer ? 'Transfer' : tx.category;

                  const getRelativeDateLabel = (dateStr: string) => {
                    const d = new Date(dateStr);
                    d.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setHours(0, 0, 0, 0);

                    if (d.getTime() === today.getTime()) {
                      return 'Today';
                    } else if (d.getTime() === yesterday.getTime()) {
                      return 'Yesterday';
                    } else {
                      return d.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      });
                    }
                  };

                  const primaryTitle =
                    tx.note && tx.note.trim()
                      ? tx.note.trim()
                      : isTransfer
                      ? 'Transfer'
                      : tx.category;

                  const secondarySubtitle =
                    tx.note && tx.note.trim()
                      ? `${getRelativeDateLabel(tx.date)} • ${
                          isTransfer
                            ? `${account?.name || 'Account'} → ${toAccount?.name || 'Account'}`
                            : tx.category
                        }`
                      : `${getRelativeDateLabel(tx.date)} • ${
                          isTransfer
                            ? `${account?.name || 'Account'} → ${toAccount?.name || 'Account'}`
                            : account?.name || ''
                        }`;

                  const amountFormatted = isIncome
                    ? `+${formatAmount(tx.amount)}`
                    : isExpense
                    ? `-${formatAmount(tx.amount)}`
                    : formatAmount(tx.amount);

                  return (
                    <TouchableOpacity
                      key={tx.id}
                      style={[
                        styles.txItem,
                        {
                          borderBottomColor: 'rgba(159, 18, 57, 0.14)',
                          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        handleHaptic();
                        router.push({
                          pathname: '/add-money-transaction',
                          params: { id: tx.id },
                        });
                      }}
                    >
                      <View style={styles.txLeft}>
                        <Category3DIcon
                          name={iconName}
                          icon={isTransfer ? 'transfer' : undefined}
                          size={36}
                          style={{ marginRight: 12 }}
                        />
                        <View style={styles.txInfo}>
                          <ThemedText
                            style={[styles.txCategory, { color: txCardPalette.text }]}
                            numberOfLines={1}
                          >
                            {primaryTitle}
                          </ThemedText>
                          <ThemedText
                            style={[styles.txDate, { color: txCardPalette.sub }]}
                            numberOfLines={1}
                          >
                            {secondarySubtitle}
                          </ThemedText>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <ThemedText
                          style={[
                            styles.txAmount,
                            {
                              color: isIncome
                                ? '#15803D'
                                : isExpense
                                ? '#881337'
                                : '#1D4ED8',
                            },
                          ]}
                        >
                          {amountFormatted}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          );
        })()}

        {/* ─── Activity Calendar ─── */}
        <MoneyActivityCalendar transactions={moneyTransactions} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },

  // ─── Hero Card ───
  heroCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 24,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
    marginBottom: 16,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 1,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroRowLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  heroRowValue: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  daysLeftPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  // ─── Cash Flow 2x2 Grid Row ───
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 12,
  },

  // ─── Compact Side-by-Side Row ───
  compactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'stretch',
  },
  compactDashboardCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  compactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  compactCardSectionLabel: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  iconCircleSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactMain: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  chartCenterBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterNum: {
    fontSize: 22,
    fontFamily: 'Outfit_500Medium',
  },
  chartCenterSub: {
    fontSize: 7,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
    marginTop: -2,
  },
  compactFooterBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactFooterBadgeText: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ─── Health / Goals Banner ───
  healthBannerCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  toolIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },

  // ─── Accordion-Style Containers (Upcoming & Recent) ───
  accordionContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
  },
  headerWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  innerSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  viewMoreButton: {
    padding: 2,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  accountRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountRowLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    marginLeft: 12,
  },
  accountRowValue: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },

  // ─── Transaction Items ───
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  txInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  txCategory: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 1,
  },
  txDate: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  txAmount: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.2,
  },

  // ─── Upcoming Pastel Cards ───
  upcomingSectionWrapper: {
    marginBottom: 16,
    marginHorizontal: -16,
  },
  upcomingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  emptyUpcomingCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 18,
    alignItems: 'center',
  },
  upcomingScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  pastelBillCard: {
    width: 154,
    height: 106,
    borderRadius: 22,
    padding: 13,
    justifyContent: 'space-between',
  },
  pastelCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pastelIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pastelCardAmountCol: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 8,
  },
  pastelCardAmount: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
    lineHeight: 18,
  },
  pastelCardDueLabel: {
    fontSize: 10.5,
    fontFamily: 'Outfit_500Medium',
    marginTop: 1,
  },
  pastelCardName: {
    fontSize: 13.5,
    fontFamily: 'Outfit_700Bold',
    marginTop: 6,
  },
});
