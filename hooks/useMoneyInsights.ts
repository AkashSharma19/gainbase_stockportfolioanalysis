import { useMemo } from 'react';
import { useAiStore } from '../store/useAiStore';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Repeat,
  CreditCard,
  Wallet,
  Landmark,
  Zap,
  LucideIcon,
} from 'lucide-react-native';

export interface MoneyInsight {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'tip';
  icon: LucideIcon;
  actionLabel: string;
  actionPath: string;
}

const IconMap: Record<string, LucideIcon> = {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Repeat,
  CreditCard,
  Wallet,
  Landmark,
  Zap,
};

export function useMoneyInsights() {
  const aiMoneyInsights = useAiStore((state) => state.aiMoneyInsights);

  const insights: MoneyInsight[] = useMemo(() => {
    if (!aiMoneyInsights || aiMoneyInsights.length === 0) {
      return [];
    }

    return aiMoneyInsights.map((item) => {
      let IconComponent: LucideIcon = Sparkles;
      if (item.icon && IconMap[item.icon]) {
        IconComponent = IconMap[item.icon];
      } else if (item.type === 'warning') {
        IconComponent = AlertTriangle;
      } else if (item.type === 'tip') {
        IconComponent = TrendingUp;
      } else {
        IconComponent = Sparkles;
      }

      return {
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type,
        icon: IconComponent,
        actionLabel: item.actionLabel || 'View Details',
        actionPath: item.actionPath || '/money-analytics',
      };
    });
  }, [aiMoneyInsights]);

  const count = insights.length;

  const countByType = useMemo(() => {
    return {
      all: insights.length,
      warning: insights.filter((i) => i.type === 'warning').length,
      tip: insights.filter((i) => i.type === 'tip').length,
      success: insights.filter((i) => i.type === 'success').length,
    };
  }, [insights]);

  return {
    insights,
    count,
    countByType,
  };
}
