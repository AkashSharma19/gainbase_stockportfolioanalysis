import { useMemo, useCallback } from 'react';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  PiggyBank,
  TrendingDown,
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

export function useMoneyInsights() {
  const {
    accounts,
    moneyTransactions,
    loans,
    budgets,
    subscriptions,
    getActiveBudget,
    getCategorySpending,
  } = useMoneyStore();

  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);

  const formatAmount = useCallback((val: number) => {
    if (isPrivacyMode) return '••••••';
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const prefix = val < 0 ? '-' : '';
    const symbol = showCurrencySymbol ? '₹' : '';
    return `${prefix}${symbol}${formatted}`;
  }, [isPrivacyMode, showCurrencySymbol]);

  const insights = useMemo(() => {
    const list: MoneyInsight[] = [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfMonth = new Date(currentYear, currentMonth, 1).getTime();
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).getTime();

    // 1. Savings Rate Health & Income/Expense Stats
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    moneyTransactions.forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      if (txTime >= startOfMonth && txTime <= endOfMonth) {
        if (tx.type === 'income') {
          monthlyIncome += tx.amount;
        } else if (tx.type === 'expense') {
          monthlyExpense += tx.amount;
        }
      }
    });

    if (monthlyIncome > 0) {
      const savingsRate = ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100;
      if (savingsRate >= 20) {
        list.push({
          id: 'savings_high',
          title: 'High Savings Rate',
          message: `Awesome! You've saved ${savingsRate.toFixed(0)}% of your income this month. Keep it up!`,
          type: 'success',
          icon: Sparkles,
          actionLabel: 'View Analytics',
          actionPath: '/money-analytics',
        });
      } else if (savingsRate < 10 && savingsRate > 0) {
        list.push({
          id: 'savings_low',
          title: 'Low Savings Rate',
          message: `Your savings rate is at ${savingsRate.toFixed(0)}% this month. Try trimming discretionary spends.`,
          type: 'tip',
          icon: TrendingDown,
          actionLabel: 'View Analytics',
          actionPath: '/money-analytics',
        });
      } else if (savingsRate <= 0) {
        list.push({
          id: 'savings_deficit',
          title: 'Spending Deficit',
          message: `You spent more than you earned this month. Review your category limits.`,
          type: 'warning',
          icon: AlertTriangle,
          actionLabel: 'Check Budgets',
          actionPath: '/(tabs)/money-budgets',
        });
      }
    }

    // 2. Budget Threshold Warnings
    const activeBudget = getActiveBudget();
    if (activeBudget) {
      const categorySpentMap = getCategorySpending(activeBudget.id, currentYear, currentMonth);
      activeBudget.categories.forEach((cat) => {
        if (cat.limit <= 0) return;
        const spent = categorySpentMap[cat.name] || 0;
        const pct = (spent / cat.limit) * 100;
        if (pct >= 100) {
          list.push({
            id: `budget_over_${cat.id}`,
            title: `${cat.name} Overspent`,
            message: `You've exceeded your ${cat.name} budget limit of ${formatAmount(cat.limit)} by ${formatAmount(spent - cat.limit)}.`,
            type: 'warning',
            icon: AlertTriangle,
            actionLabel: 'Adjust Limit',
            actionPath: '/add-budget',
          });
        } else if (pct >= 85) {
          list.push({
            id: `budget_near_${cat.id}`,
            title: `${cat.name} Nearing Limit`,
            message: `You've utilized ${pct.toFixed(0)}% of your ${cat.name} budget. ${formatAmount(cat.limit - spent)} remaining.`,
            type: 'tip',
            icon: TrendingUp,
            actionLabel: 'View Details',
            actionPath: '/(tabs)/money-budgets',
          });
        }
      });
    }

    // 3. Unbudgeted Spend Suggestions
    if (activeBudget) {
      const categorySpentMap = getCategorySpending(activeBudget.id, currentYear, currentMonth);
      const budgetLimits: { [name: string]: number } = {};
      activeBudget.categories.forEach((c) => {
        budgetLimits[c.name] = c.limit;
      });

      Object.keys(categorySpentMap).forEach((catName) => {
        const spent = categorySpentMap[catName] || 0;
        const limit = budgetLimits[catName] || 0;
        if (limit === 0 && spent >= 2000) {
          list.push({
            id: `unbudgeted_${catName}`,
            title: `Unbudgeted ${catName}`,
            message: `You spent ${formatAmount(spent)} on ${catName} this month without a budget limit configured.`,
            type: 'tip',
            icon: PiggyBank,
            actionLabel: 'Configure Limit',
            actionPath: '/add-budget',
          });
        }
      });
    }

    // 4. Credit Card High Utilization
    accounts.forEach((acc) => {
      if (acc.type === 'credit_card' && !acc.isArchived && acc.creditLimit && acc.creditLimit > 0 && acc.balance < 0) {
        const util = (Math.abs(acc.balance) / acc.creditLimit) * 100;
        if (util > 50) {
          list.push({
            id: `cc_util_${acc.id}`,
            title: `High Card Utilization`,
            message: `Your ${acc.name} is at ${util.toFixed(0)}% utilization. Keep it below 30% to protect credit scores.`,
            type: 'warning',
            icon: AlertTriangle,
            actionLabel: 'View Cards',
            actionPath: '/(tabs)/money-accounts',
          });
        }
      }
    });

    // 5. Low EMI Emergency Buffer
    const activeLoans = loans.filter((l) => l.isActive);
    const monthlyEMIs = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);
    const totalLiquidCash = accounts
      .filter((a) => !a.isArchived && a.includeInAssets !== false && (a.type === 'wallet' || a.type === 'savings'))
      .reduce((sum, a) => sum + a.balance, 0);

    if (activeLoans.length > 0 && monthlyEMIs > 0 && totalLiquidCash < monthlyEMIs * 1.5) {
      list.push({
        id: `low_emi_buffer`,
        title: `Low EMI Cash Cover`,
        message: `Your liquid cash balance is below 1.5x of your monthly EMIs (${formatAmount(monthlyEMIs)}). Consider building a cash buffer.`,
        type: 'warning',
        icon: AlertTriangle,
        actionLabel: 'View Loans',
        actionPath: '/(tabs)/money-loans',
      });
    }

    // 6. Emergency Fund Health (Months of expense covered)
    let totalPastExpenses = 0;
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
    moneyTransactions.forEach((tx) => {
      if (tx.type === 'expense' && new Date(tx.date).getTime() >= sixtyDaysAgo) {
        totalPastExpenses += tx.amount;
      }
    });
    const avgMonthlyExpense = Math.max(totalPastExpenses / 2, monthlyExpense);

    if (avgMonthlyExpense > 0 && totalLiquidCash > 0) {
      const monthsCovered = totalLiquidCash / avgMonthlyExpense;
      if (monthsCovered < 3) {
        list.push({
          id: 'low_emergency_fund',
          title: 'Low Emergency Fund',
          message: `Your liquid cash covers only ${monthsCovered.toFixed(1)} months of expenses. Financial experts suggest 3-6 months cover.`,
          type: 'warning',
          icon: AlertTriangle,
          actionLabel: 'View Accounts',
          actionPath: '/(tabs)/money-accounts',
        });
      } else if (monthsCovered >= 6) {
        list.push({
          id: 'high_idle_cash',
          title: 'High Idle Cash',
          message: `Your liquid cash covers ${monthsCovered.toFixed(0)} months of expenses. Consider investing excess cash in mutual funds or ETFs.`,
          type: 'tip',
          icon: TrendingUp,
          actionLabel: 'View Accounts',
          actionPath: '/(tabs)/money-accounts',
        });
      }
    }

    // 7. Debt-to-Income (DTI) Ratio
    if (monthlyIncome > 0 && monthlyEMIs > 0) {
      const dti = (monthlyEMIs / monthlyIncome) * 100;
      if (dti > 35) {
        list.push({
          id: 'high_dti',
          title: 'High Debt Burden',
          message: `EMIs consume ${dti.toFixed(0)}% of your income. A DTI ratio above 35% restricts financial flexibility. Avoid taking new debt.`,
          type: 'warning',
          icon: AlertTriangle,
          actionLabel: 'View Loans',
          actionPath: '/(tabs)/money-loans',
        });
      } else if (dti <= 15) {
        list.push({
          id: 'healthy_dti',
          title: 'Healthy Debt Ratio',
          message: `Fantastic! Your EMIs consume only ${dti.toFixed(0)}% of your income, keeping your DTI ratio at a healthy level.`,
          type: 'success',
          icon: Sparkles,
          actionLabel: 'View Loans',
          actionPath: '/(tabs)/money-loans',
        });
      }
    }

    // 8. Subscription Burden Alert
    const activeSubs = subscriptions.filter((s) => s.isActive);
    const monthlySubscriptionBurden = activeSubs.reduce((sum, s) => {
      let amt = s.amount;
      if (s.billingCycle === 'yearly') amt = s.amount / 12;
      else if (s.billingCycle === 'quarterly') amt = s.amount / 3;
      else if (s.billingCycle === 'weekly') amt = s.amount * 4;
      return sum + amt;
    }, 0);

    if (monthlySubscriptionBurden > 0) {
      if (monthlyIncome > 0 && (monthlySubscriptionBurden / monthlyIncome) * 100 > 8) {
        list.push({
          id: 'high_subscription_burden',
          title: 'High Subscription Burden',
          message: `Active subscriptions cost you ${formatAmount(monthlySubscriptionBurden)}/mo (${((monthlySubscriptionBurden / monthlyIncome) * 100).toFixed(0)}% of income). Review to optimize spends.`,
          type: 'tip',
          icon: PiggyBank,
          actionLabel: 'Check Budgets',
          actionPath: '/(tabs)/money-budgets',
        });
      } else if (activeSubs.length >= 5) {
        list.push({
          id: 'high_subscription_count',
          title: 'Subscription Clean-up',
          message: `You have ${activeSubs.length} active recurring subscriptions. Review them to make sure you aren't paying for idle services.`,
          type: 'tip',
          icon: PiggyBank,
          actionLabel: 'Check Budgets',
          actionPath: '/(tabs)/money-budgets',
        });
      }
    }

    // 9. Subscription Renewal Alert (next 3 days)
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const nowTime = Date.now();
    subscriptions.forEach((sub) => {
      if (sub.isActive && sub.nextPaymentDate) {
        const payTime = new Date(sub.nextPaymentDate).getTime();
        const diff = payTime - nowTime;
        if (diff > 0 && diff <= threeDays) {
          const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
          list.push({
            id: `renewal_soon_${sub.id}`,
            title: `${sub.name} Renews Soon`,
            message: `Your subscription to ${sub.name} (for ${formatAmount(sub.amount)}) auto-renews in ${days} ${days === 1 ? 'day' : 'days'} (${new Date(sub.nextPaymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}).`,
            type: 'tip',
            icon: PiggyBank,
            actionLabel: 'Check Budgets',
            actionPath: '/(tabs)/money-budgets',
          });
        }
      }
    });

    // 10. CC Debt vs Cash Saved Alert
    const ccDebt = accounts
      .filter((a) => !a.isArchived && a.type === 'credit_card')
      .reduce((sum, a) => sum + Math.abs(a.balance < 0 ? a.balance : 0), 0);

    if (ccDebt > 0 && totalLiquidCash > 0) {
      const ccToCashPct = (ccDebt / totalLiquidCash) * 100;
      if (ccToCashPct > 50) {
        list.push({
          id: 'high_cc_debt_ratio',
          title: 'High Card Debt vs Savings',
          message: `Your card debt is at ${ccToCashPct.toFixed(0)}% of your liquid savings. Pay it off to protect credit scores and avoid interest.`,
          type: 'warning',
          icon: AlertTriangle,
          actionLabel: 'View Cards',
          actionPath: '/(tabs)/money-accounts',
        });
      }
    }

    return list;
  }, [
    accounts,
    moneyTransactions,
    loans,
    budgets,
    subscriptions,
    getActiveBudget,
    getCategorySpending,
    formatAmount,
  ]);

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
    countByType,
    count: insights.length,
  };
}
