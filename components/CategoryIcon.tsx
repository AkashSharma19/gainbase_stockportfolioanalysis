import React from 'react';
import * as LucideIcons from 'lucide-react-native';
import { useMoneyStore } from '@/store/useMoneyStore';

export const CATEGORY_ICON_MAP: { [key: string]: string } = {
  'Food & Dining': 'Utensils',
  'Food': 'UtensilsCrossed',
  'Junk': 'Cookie',
  'Rent & Bills': 'Receipt',
  'Shopping': 'ShoppingBag',
  'Shopping - Electronics': 'Laptop',
  'Shopping - Clothes': 'Shirt',
  'Entertainment': 'Clapperboard',
  'Subscriptions - OTT': 'Tv',
  'Subscriptions - WiFi': 'Wifi',
  'House': 'Home',
  'Electricity Bill': 'Zap',
  'Transport - Fuel': 'Fuel',
  'Transport - Cab': 'Car',
  'Travel': 'Plane',
  'Travel/ Trips': 'Compass',
  'Medical': 'Pill',
  'Education': 'GraduationCap',
  'Maintainance': 'Wrench',
  'Maintenance': 'Wrench',
  'Family': 'Users',
  'Gifts': 'Gift',
  'EMI Payments': 'CalendarRange',
  'Salary': 'Banknote',
  'Investments': 'TrendingUp',
  'Business': 'Briefcase',
  'Refund': 'RotateCcw',
  'Others': 'Tag',
  'Other': 'Tag',
};

export function CategoryIcon({ name, color, size = 16, style }: { name: string; color?: string; size?: number; style?: any }) {
  const customMeta = useMoneyStore((state) => state.categoryMetadata?.[name]);
  const iconName = customMeta?.icon || CATEGORY_ICON_MAP[name] || name;
  const finalColor = customMeta?.color || color || '#00C9A7';
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Tag;
  return <IconComponent size={size} color={finalColor} style={style} />;
}
