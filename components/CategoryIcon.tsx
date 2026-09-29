import React from 'react';
import * as LucideIcons from 'lucide-react-native';
import { useMoneyStore } from '@/store/useMoneyStore';

export const CATEGORY_ICON_MAP: Record<string, { icon: string; color: string }> = {
  // Food & Dining
  'Food & Dining': { icon: 'UtensilsCrossed', color: '#FF9500' },
  'Food': { icon: 'UtensilsCrossed', color: '#FF9500' },
  'Dining': { icon: 'Utensils', color: '#FF9500' },
  'Grocery': { icon: 'ShoppingCart', color: '#34C759' },
  'Groceries': { icon: 'ShoppingCart', color: '#34C759' },
  'Beverage': { icon: 'CupSoda', color: '#FF2D55' },
  'Beverages': { icon: 'CupSoda', color: '#FF2D55' },
  'Drinks': { icon: 'Wine', color: '#FF2D55' },
  'Coffee': { icon: 'Coffee', color: '#A06A42' },
  'Tea': { icon: 'Coffee', color: '#A06A42' },
  'Junk': { icon: 'Cookie', color: '#FF9500' },
  'Snacks': { icon: 'Cookie', color: '#FF9500' },
  'Vegetable': { icon: 'Carrot', color: '#E17055' },
  'Vegetables': { icon: 'Carrot', color: '#E17055' },
  'Fruits': { icon: 'Apple', color: '#FF3B30' },
  'Fruit': { icon: 'Apple', color: '#FF3B30' },

  // Housing, Utilities & Bills
  'Rent & Bills': { icon: 'Receipt', color: '#8E8E93' },
  'Rent': { icon: 'Home', color: '#007AFF' },
  'House': { icon: 'Home', color: '#007AFF' },
  'Home': { icon: 'Home', color: '#007AFF' },
  'Electricity Bill': { icon: 'Zap', color: '#FFCC00' },
  'Electric': { icon: 'Zap', color: '#FFCC00' },
  'Electricity': { icon: 'Zap', color: '#FFCC00' },
  'Internet': { icon: 'Wifi', color: '#5AC8FA' },
  'WiFi': { icon: 'Wifi', color: '#5AC8FA' },
  'Subscriptions - WiFi': { icon: 'Wifi', color: '#5AC8FA' },
  'Water': { icon: 'Droplets', color: '#00C9A7' },
  'Gas': { icon: 'Flame', color: '#FF3B30' },
  'Maintainance': { icon: 'Wrench', color: '#8E8E93' },
  'Maintenance': { icon: 'Wrench', color: '#8E8E93' },

  // Transport & Travel
  'Transport': { icon: 'Car', color: '#5856D6' },
  'Transport - Fuel': { icon: 'Fuel', color: '#FF9500' },
  'Fuel': { icon: 'Fuel', color: '#FF9500' },
  'Transport - Cab': { icon: 'Car', color: '#5856D6' },
  'Cab': { icon: 'Car', color: '#5856D6' },
  'Travel': { icon: 'Plane', color: '#007AFF' },
  'Travel/ Trips': { icon: 'Compass', color: '#007AFF' },
  'Holiday': { icon: 'Palmtree', color: '#007AFF' },
  'Vacation': { icon: 'Palmtree', color: '#007AFF' },
  'Flight': { icon: 'Plane', color: '#007AFF' },

  // Shopping & Entertainment
  'Shopping': { icon: 'ShoppingBag', color: '#FF9500' },
  'Shopping - Electronics': { icon: 'Laptop', color: '#5856D6' },
  'Shopping - Clothes': { icon: 'Shirt', color: '#AF52DE' },
  'Electronics': { icon: 'Laptop', color: '#5856D6' },
  'Clothes': { icon: 'Shirt', color: '#AF52DE' },
  'Entertainment': { icon: 'Clapperboard', color: '#FF2D55' },
  'Movies': { icon: 'Clapperboard', color: '#FF2D55' },
  'Subscriptions - OTT': { icon: 'Tv', color: '#FF9500' },
  'OTT': { icon: 'Tv', color: '#FF9500' },
  'Books': { icon: 'BookOpen', color: '#748FFC' },
  'Education': { icon: 'GraduationCap', color: '#748FFC' },
  'Gym': { icon: 'Dumbbell', color: '#AF52DE' },
  'Fitness': { icon: 'Dumbbell', color: '#AF52DE' },
  'Health': { icon: 'HeartPulse', color: '#FF2D55' },
  'Medical': { icon: 'Pill', color: '#FF2D55' },
  'Gifts': { icon: 'Gift', color: '#FD79A8' },
  'Gift': { icon: 'Gift', color: '#FD79A8' },
  'Family': { icon: 'Users', color: '#007AFF' },

  // Finance & Income
  'EMI Payments': { icon: 'CalendarRange', color: '#FF3B30' },
  'EMI': { icon: 'CalendarRange', color: '#FF3B30' },
  'Loan': { icon: 'HandCoins', color: '#FF3B30' },
  'Salary': { icon: 'Banknote', color: '#34C759' },
  'Investments': { icon: 'TrendingUp', color: '#00C9A7' },
  'Business': { icon: 'Briefcase', color: '#5856D6' },
  'Freelance': { icon: 'Briefcase', color: '#5856D6' },
  'Refund': { icon: 'RotateCcw', color: '#00C9A7' },
  'Others': { icon: 'Tag', color: '#8E8E93' },
  'Other': { icon: 'Tag', color: '#8E8E93' },
};

export function getCategoryVisualMeta(name: string): { icon: string; color: string } {
  if (!name) return { icon: 'Tag', color: '#8E8E93' };

  // 1. Exact match
  if (CATEGORY_ICON_MAP[name]) {
    return CATEGORY_ICON_MAP[name];
  }

  // 2. Case-insensitive exact match
  const lowerName = name.toLowerCase().trim();
  const foundExact = Object.entries(CATEGORY_ICON_MAP).find(
    ([k]) => k.toLowerCase() === lowerName
  );
  if (foundExact) return foundExact[1];

  // 3. Keyword heuristic match
  if (lowerName.includes('holiday') || lowerName.includes('trip') || lowerName.includes('vacation')) {
    return { icon: 'Palmtree', color: '#007AFF' };
  }
  if (lowerName.includes('grocer') || lowerName.includes('supermarket') || lowerName.includes('mart')) {
    return { icon: 'ShoppingCart', color: '#34C759' };
  }
  if (lowerName.includes('food') || lowerName.includes('dine') || lowerName.includes('eat') || lowerName.includes('meal')) {
    return { icon: 'UtensilsCrossed', color: '#FF9500' };
  }
  if (lowerName.includes('drink') || lowerName.includes('beverage') || lowerName.includes('bar') || lowerName.includes('cocktail')) {
    return { icon: 'CupSoda', color: '#FF2D55' };
  }
  if (lowerName.includes('coffee') || lowerName.includes('cafe') || lowerName.includes('tea')) {
    return { icon: 'Coffee', color: '#A06A42' };
  }
  if (lowerName.includes('gym') || lowerName.includes('workout') || lowerName.includes('fitness')) {
    return { icon: 'Dumbbell', color: '#AF52DE' };
  }
  if (lowerName.includes('water') || lowerName.includes('aqua')) {
    return { icon: 'Droplets', color: '#00C9A7' };
  }
  if (lowerName.includes('electric') || lowerName.includes('power') || lowerName.includes('light')) {
    return { icon: 'Zap', color: '#FFCC00' };
  }
  if (lowerName.includes('gas') || lowerName.includes('lpg') || lowerName.includes('fuel') || lowerName.includes('petrol')) {
    return { icon: 'Flame', color: '#FF3B30' };
  }
  if (lowerName.includes('wifi') || lowerName.includes('internet') || lowerName.includes('broadband')) {
    return { icon: 'Wifi', color: '#5AC8FA' };
  }
  if (lowerName.includes('transport') || lowerName.includes('cab') || lowerName.includes('auto') || lowerName.includes('uber') || lowerName.includes('ola')) {
    return { icon: 'Car', color: '#5856D6' };
  }
  if (lowerName.includes('book') || lowerName.includes('read') || lowerName.includes('study')) {
    return { icon: 'BookOpen', color: '#748FFC' };
  }
  if (lowerName.includes('gift') || lowerName.includes('present')) {
    return { icon: 'Gift', color: '#FD79A8' };
  }
  if (lowerName.includes('flight') || lowerName.includes('airline') || lowerName.includes('plane')) {
    return { icon: 'Plane', color: '#007AFF' };
  }
  if (lowerName.includes('shop') || lowerName.includes('buy')) {
    return { icon: 'ShoppingBag', color: '#FF9500' };
  }
  if (lowerName.includes('medic') || lowerName.includes('pharma') || lowerName.includes('health') || lowerName.includes('doctor')) {
    return { icon: 'Pill', color: '#FF2D55' };
  }
  if (lowerName.includes('salary') || lowerName.includes('wages') || lowerName.includes('income')) {
    return { icon: 'Banknote', color: '#34C759' };
  }
  if (lowerName.includes('invest') || lowerName.includes('stock') || lowerName.includes('mutual') || lowerName.includes('sip')) {
    return { icon: 'TrendingUp', color: '#00C9A7' };
  }

  return { icon: 'Tag', color: '#00C9A7' };
}

export function CategoryIcon({
  name,
  color,
  size = 16,
  style,
  strokeWidth = 2,
}: {
  name: string;
  color?: string;
  size?: number;
  style?: any;
  strokeWidth?: number;
}) {
  const customMeta = useMoneyStore((state) => state.categoryMetadata?.[name]);
  const defaultMeta = getCategoryVisualMeta(name);

  const iconName = customMeta?.icon || defaultMeta.icon;
  const finalColor = color || customMeta?.color || defaultMeta.color;

  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Tag;
  return <IconComponent size={size} color={finalColor} strokeWidth={strokeWidth} style={style} />;
}

