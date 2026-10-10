import { useMemo } from 'react';
import { useAiStore } from '../store/useAiStore';
import { useMoneyStore } from '../store/useMoneyStore';
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
  Shield,
  LucideIcon,
} from 'lucide-react-native';

export type CriticalityLevel = 'critical' | 'warning' | 'moderate' | 'positive';

export interface MoneyInsight {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'tip';
  criticality: CriticalityLevel;
  icon: LucideIcon;
  actionLabel: string;
  actionPath: string;
  potentialSavings?: string;
}

export interface CriticalityCounts {
  critical: number;
  warning: number;
  moderate: number;
  positive: number;
  total: number;
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
  Shield,
};

export function useMoneyInsights() {
  const aiMoneyInsights = useAiStore((state) => state.aiMoneyInsights);
  const accounts = useMoneyStore((state) => state.accounts);
  const moneyTransactions = useMoneyStore((state) => state.moneyTransactions);
  const loans = useMoneyStore((state) => state.loans);
  const subscriptions = useMoneyStore((state) => state.subscriptions);
  const getActiveBudget = useMoneyStore((state) => state.getActiveBudget);
  const getCategorySpending = useMoneyStore((state) => state.getCategorySpending);

  const { insights, dynamicMonthlySavings } = useMemo(() => {
    // 1. If Gemini AI returned insights, map them with 4-tier criticality
    if (aiMoneyInsights && aiMoneyInsights.length > 0) {
      const geminiList: MoneyInsight[] = aiMoneyInsights.map((g, idx) => {
        let criticality: CriticalityLevel = 'moderate';
        if (g.type === 'warning') {
          const lower = (g.title + ' ' + g.message).toLowerCase();
          criticality =
            lower.includes('negative') ||
            lower.includes('deficit') ||
            lower.includes('overdraft') ||
            lower.includes('plummeted') ||
            lower.includes('severe')
              ? 'critical'
              : 'warning';
        } else if (g.type === 'success') {
          criticality = 'positive';
        }

        let IconComponent: LucideIcon = Sparkles;
        if (g.icon && IconMap[g.icon]) {
          IconComponent = IconMap[g.icon];
        } else if (criticality === 'critical') {
          IconComponent = AlertTriangle;
        } else if (criticality === 'warning') {
          IconComponent = TrendingDown;
        } else if (criticality === 'positive') {
          IconComponent = TrendingUp;
        }

        return {
          id: g.id || `gemini-${idx}`,
          title: g.title,
          message: g.message,
          type: g.type,
          criticality,
          icon: IconComponent,
          actionLabel: g.actionLabel || 'View Details',
          actionPath: g.actionPath || '/money-analytics',
          potentialSavings: g.potentialSavings,
        };
      });

      const orderMap: Record<CriticalityLevel, number> = {
        critical: 0,
        warning: 1,
        moderate: 2,
        positive: 3,
      };
      geminiList.sort((a, b) => orderMap[a.criticality] - orderMap[b.criticality]);
      return { insights: geminiList, dynamicMonthlySavings: 0 };
    }

    // 2. Comprehensive 360° Ledger Intelligence Engine
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const categorySpendCurrent: Record<string, number> = {};
    const categorySpendPrev: Record<string, number> = {};
    let totalExpenseThisMonth = 0;
    let totalIncomeThisMonth = 0;

    moneyTransactions.forEach((t) => {
      const d = new Date(t.date);
      const m = d.getMonth();
      const y = d.getFullYear();

      if (t.type === 'expense') {
        if (m === currentMonth && y === currentYear) {
          totalExpenseThisMonth += t.amount;
          categorySpendCurrent[t.category] =
            (categorySpendCurrent[t.category] || 0) + t.amount;
        } else if (m === prevMonth && y === prevYear) {
          categorySpendPrev[t.category] =
            (categorySpendPrev[t.category] || 0) + t.amount;
        }
      } else if (t.type === 'income') {
        if (m === currentMonth && y === currentYear) {
          totalIncomeThisMonth += t.amount;
        }
      }
    });

    const sortedCategories = Object.entries(categorySpendCurrent)
      .map(([name, amount]) => {
        const prevAmount = categorySpendPrev[name] || 0;
        const growthPct =
          prevAmount > 0
            ? Math.round(((amount - prevAmount) / prevAmount) * 100)
            : 0;
        return { name, amount, prevAmount, growthPct };
      })
      .sort((a, b) => b.amount - a.amount);

    const activeSubs = subscriptions.filter((s) => s.isActive);
    const activeLoans = loans.filter((l) => l.isActive);
    const creditCardAccounts = accounts.filter(
      (a) => a.type === 'credit_card' && !a.isArchived,
    );
    const nonArchivedAccounts = accounts.filter((a) => !a.isArchived);

    const liquidCash = nonArchivedAccounts
      .filter((a) => a.type === 'savings' || a.type === 'wallet' || a.type === 'emergency_fund')
      .reduce((sum, a) => sum + Math.max(0, a.balance), 0);

    const baselineBurnRate = Math.max(1, totalExpenseThisMonth || 25000);
    const emergencyRunwayMonths = liquidCash / baselineBurnRate;
    const monthlySubCost = activeSubs.reduce((sum, s) => sum + s.amount, 0);

    const topCategory = sortedCategories[0];
    const fastestGrowing = [...sortedCategories].sort(
      (a, b) => b.growthPct - a.growthPct,
    )[0];

    const discretionaryTrim = topCategory ? Math.round(topCategory.amount * 0.18) : 1500;
    const subTrim = Math.round(monthlySubCost * 0.4);
    const calculatedSavings = Math.max(1200, discretionaryTrim + subTrim);

    const items: MoneyInsight[] = [];

    // Angle 1: Bank Overdraft (Critical)
    nonArchivedAccounts.forEach((acc) => {
      if (acc.balance < 0 && acc.type !== 'credit_card') {
        const absBal = Math.abs(acc.balance);
        items.push({
          id: `crit-neg-bal-${acc.id}`,
          title: `Clear Negative ${acc.name} Balance`,
          message: `Your ${acc.name} balance has dropped to a deficit of ₹${absBal.toLocaleString('en-IN')}. Incurring daily overdraft penalties.`,
          type: 'warning',
          criticality: 'critical',
          icon: Wallet,
          actionLabel: `View ${acc.name}`,
          actionPath: `/account-details/${acc.id}`,
        });
      }
    });

    // Angle 2: Credit Card Utilization (Critical / Warning)
    creditCardAccounts.forEach((cc) => {
      const absBal = Math.abs(cc.balance);
      if (absBal > 0) {
        const limit = cc.creditLimit || 100000;
        const utilPct = Math.round((absBal / limit) * 100);
        const isCrit = utilPct >= 60;
        items.push({
          id: `alert-cc-${cc.id}`,
          title: `${cc.name} Utilization Check`,
          message: `Active balance ₹${absBal.toLocaleString('en-IN')} (${utilPct}% of limit). Keeping utilization under 30% avoids high APR.`,
          type: 'warning',
          criticality: isCrit ? 'critical' : 'warning',
          icon: CreditCard,
          actionLabel: `View ${cc.name}`,
          actionPath: `/account-details/${cc.id}`,
        });
      }
    });

    // Angle 3: Active Budget Breaches (Warning)
    const activeBudget = getActiveBudget();
    if (activeBudget) {
      const spentMap = getCategorySpending(activeBudget.id, currentYear, currentMonth);
      activeBudget.categories.forEach((cat) => {
        const spent = spentMap[cat.name] || 0;
        const limit = cat.limit;
        const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
        if (pct >= 75) {
          items.push({
            id: `budget-breach-${cat.id}`,
            title: `${cat.name} Budget Alert`,
            message: `Spent ₹${spent.toLocaleString('en-IN')} of ₹${limit.toLocaleString('en-IN')} budget (${pct}% used).`,
            type: 'warning',
            criticality: 'warning',
            icon: AlertTriangle,
            actionLabel: 'Manage Budgets',
            actionPath: '/manage-categories',
          });
        }
      });
    }

    // Angle 4: Spending Surges (Warning)
    if (fastestGrowing && fastestGrowing.growthPct >= 20 && fastestGrowing.prevAmount > 0) {
      items.push({
        id: `spend-surge-${fastestGrowing.name}`,
        title: `${fastestGrowing.name} Outflow Spike`,
        message: `${fastestGrowing.name} spending surged ${fastestGrowing.growthPct}% vs last month.`,
        type: 'warning',
        criticality: 'warning',
        icon: TrendingDown,
        actionLabel: 'View Spend',
        actionPath: '/money-analytics',
      });
    }

    // Angle 5: Discretionary Spend Optimization (Moderate / Opportunity)
    if (topCategory && topCategory.amount >= 3000) {
      const trimAmount = Math.round(topCategory.amount * 0.18);
      items.push({
        id: `trim-top-${topCategory.name}`,
        title: `Optimize ${topCategory.name} Outflows`,
        message: `${topCategory.name} is your highest spend category this month. Trimming 18% saves ~₹${trimAmount.toLocaleString('en-IN')}/mo.`,
        type: 'tip',
        criticality: 'moderate',
        icon: Sparkles,
        actionLabel: 'Analyze Spend',
        actionPath: '/money-analytics',
        potentialSavings: `Save ₹${trimAmount.toLocaleString('en-IN')}/mo`,
      });
    }

    // Angle 6: High Loan / EMI Burden (Moderate / Opportunity)
    if (activeLoans.length > 0) {
      const totalEMI = activeLoans.reduce((sum, l) => sum + (l.emiAmount || 0), 0);
      items.push({
        id: 'optimize-loans-emi',
        title: 'Review Active EMI Commitments',
        message: `Currently servicing ₹${totalEMI.toLocaleString('en-IN')}/mo across ${activeLoans.length} loan${activeLoans.length > 1 ? 's' : ''}. Consider partial prepayment to save compounding interest.`,
        type: 'tip',
        criticality: 'moderate',
        icon: Landmark,
        actionLabel: 'View Loans',
        actionPath: '/money-loans',
      });
    }

    // Angle 7: Subscriptions Audit (Moderate / Opportunity)
    if (activeSubs.length >= 2 || monthlySubCost >= 1000) {
      items.push({
        id: 'audit-subscriptions',
        title: 'Audit Recurring Subscriptions',
        message: `Currently paying ₹${monthlySubCost.toLocaleString('en-IN')}/mo across ${activeSubs.length} active service${activeSubs.length > 1 ? 's' : ''}.`,
        type: 'tip',
        criticality: 'moderate',
        icon: Repeat,
        actionLabel: 'Manage Subs',
        actionPath: '/money-loans',
      });
    }

    // Angle 8: Emergency Runway (Positive or Critical)
    if (liquidCash > 0 && emergencyRunwayMonths >= 3) {
      items.push({
        id: 'emergency-runway-ok',
        title: 'Healthy Emergency Cushion',
        message: `Liquid reserves of ₹${Math.round(liquidCash).toLocaleString('en-IN')} provide ~${emergencyRunwayMonths.toFixed(1)} months of coverage.`,
        type: 'success',
        criticality: 'positive',
        icon: Shield,
        actionLabel: 'View Net Worth',
        actionPath: '/money-accounts',
      });
    } else if (emergencyRunwayMonths < 1 && totalExpenseThisMonth > 0) {
      items.push({
        id: 'emergency-runway-low',
        title: 'Low Emergency Reserve Buffer',
        message: `Liquid savings provide less than 1 month of living expenses. Build a 3-month buffer to protect against shocks.`,
        type: 'warning',
        criticality: 'critical',
        icon: Shield,
        actionLabel: 'Transfer to Savings',
        actionPath: '/money-accounts',
      });
    }

    // Angle 9: Savings Rate (Positive or Warning)
    if (totalIncomeThisMonth > 0) {
      const savingsRate = Math.round(
        ((totalIncomeThisMonth - totalExpenseThisMonth) / totalIncomeThisMonth) * 100,
      );
      if (savingsRate >= 20) {
        items.push({
          id: 'savings-rate-healthy',
          title: 'Strong Monthly Savings Rate',
          message: `Saving ${savingsRate}% of income this month, beating the standard 20% benchmark.`,
          type: 'success',
          criticality: 'positive',
          icon: PiggyBank,
          actionLabel: 'View Cash Flow',
          actionPath: '/money-analytics',
        });
      }
    }

    // Sort: Critical -> Warning -> Moderate -> Positive
    const orderMap: Record<CriticalityLevel, number> = {
      critical: 0,
      warning: 1,
      moderate: 2,
      positive: 3,
    };
    items.sort((a, b) => orderMap[a.criticality] - orderMap[b.criticality]);

    return { insights: items, dynamicMonthlySavings: calculatedSavings };
  }, [
    aiMoneyInsights,
    accounts,
    moneyTransactions,
    loans,
    subscriptions,
    getActiveBudget,
    getCategorySpending,
  ]);

  const count = insights.length;

  const criticalityCounts: CriticalityCounts = useMemo(() => {
    return {
      critical: insights.filter((i) => i.criticality === 'critical').length,
      warning: insights.filter((i) => i.criticality === 'warning').length,
      moderate: insights.filter((i) => i.criticality === 'moderate').length,
      positive: insights.filter((i) => i.criticality === 'positive').length,
      total: insights.length,
    };
  }, [insights]);

  const countByType = useMemo(() => {
    return {
      all: insights.length,
      critical: criticalityCounts.critical,
      warning: criticalityCounts.warning,
      moderate: criticalityCounts.moderate,
      positive: criticalityCounts.positive,
      tip: criticalityCounts.moderate,
      success: criticalityCounts.positive,
    };
  }, [insights, criticalityCounts]);

  const topCriticality: CriticalityLevel = useMemo(() => {
    if (criticalityCounts.critical > 0) return 'critical';
    if (criticalityCounts.warning > 0) return 'warning';
    if (criticalityCounts.moderate > 0) return 'moderate';
    return 'positive';
  }, [criticalityCounts]);

  return {
    insights,
    count,
    criticalityCounts,
    countByType,
    topCriticality,
    hasRisks: criticalityCounts.critical > 0,
    dynamicMonthlySavings,
  };
}
