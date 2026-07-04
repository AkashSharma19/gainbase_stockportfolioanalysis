import React from 'react';
import * as LucideIcons from 'lucide-react-native';

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
  'Others': 'Tag',
  'Other': 'Tag',
};

export function CategoryIcon({ name, color, size = 16, style }: { name: string; color: string; size?: number; style?: any }) {
  // If the passed name matches an emoji (e.g. from existing budgets), we can fall back based on key-lookup,
  // but if it is already the Lucide icon name, we map it directly.
  const iconName = CATEGORY_ICON_MAP[name] || name;
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Tag;
  return <IconComponent size={size} color={color} style={style} />;
}
