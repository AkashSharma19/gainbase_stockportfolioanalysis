import { GoalVariableDefinition, FinancialGoal, EvaluatedGoal, GoalOperator, EvaluatedMilestoneSegment } from '../types/goals';
import { Account, Loan, MoneyTransaction, Subscription, Budget } from '../types/money';

export const GOAL_VARIABLES: GoalVariableDefinition[] = [
  // --- Cash & Liquid Accounts ---
  {
    key: 'Cash',
    label: 'Cash & Wallet',
    description: 'Total active wallet & cash balances (Included in assets)',
    category: 'money',
    unit: 'currency',
    iconName: 'Wallet',
  },
  {
    key: 'Savings',
    label: 'Savings Accounts',
    description: 'Total balances across all savings bank accounts',
    category: 'money',
    unit: 'currency',
    iconName: 'Landmark',
  },
  {
    key: 'Emergency',
    label: 'Emergency Fund',
    description: 'Total emergency fund reserve balances',
    category: 'money',
    unit: 'currency',
    iconName: 'ShieldCheck',
  },
  {
    key: 'LiquidCash',
    label: 'Total Liquid Cash',
    description: 'Combined balance of Cash, Savings, and Emergency funds',
    category: 'money',
    unit: 'currency',
    iconName: 'Coins',
  },
  {
    key: 'SafeToSpend',
    label: 'Daily Safe-to-Spend',
    description: 'Daily disposable run-rate based on remaining liquid cash and days left',
    category: 'money',
    unit: 'currency',
    iconName: 'Sparkles',
  },

  // --- Debts & Obligations ---
  {
    key: 'MonthlyEMI',
    label: 'Monthly EMI Burden',
    description: 'Total monthly EMI repayment obligation across all active loans',
    category: 'money',
    unit: 'currency',
    iconName: 'Calendar',
  },
  {
    key: 'TotalDebt',
    label: 'Total Debt & Liabilities',
    description: 'Combined outstanding loans and credit card liabilities',
    category: 'money',
    unit: 'currency',
    iconName: 'CreditCard',
  },
  {
    key: 'LoanOutstanding',
    label: 'Loan Outstanding Debt',
    description: 'Total unpaid principal balance across active loans',
    category: 'money',
    unit: 'currency',
    iconName: 'TrendingDown',
  },
  {
    key: 'CreditCardDebt',
    label: 'Credit Card Debt (Excl. Blocked)',
    description: 'Total outstanding balances on credit cards (does not include blocked loan EMI amounts)',
    category: 'money',
    unit: 'currency',
    iconName: 'CreditCard',
  },
  {
    key: 'BlockedCCDebt',
    label: 'Blocked CC Loan Amount',
    description: 'Total active loan principal blocked on credit cards',
    category: 'money',
    unit: 'currency',
    iconName: 'CreditCard',
  },
  {
    key: 'TotalCCDebt',
    label: 'Total CC Debt (Incl. Blocked)',
    description: 'Combined credit card balance plus active blocked loan principal',
    category: 'money',
    unit: 'currency',
    iconName: 'CreditCard',
  },
  {
    key: 'ActiveLoansCount',
    label: 'Active Loans Count',
    description: 'Total number of currently active loans',
    category: 'money',
    unit: 'number',
    iconName: 'Layers',
  },
  {
    key: 'DebtToIncome',
    label: 'Debt-to-Income (DTI) %',
    description: 'Ratio of monthly EMI burden relative to monthly income',
    category: 'money',
    unit: 'percentage',
    iconName: 'Percent',
  },

  // --- Subscriptions ---
  {
    key: 'MonthlySubscriptions',
    label: 'Monthly Subscriptions',
    description: 'Total monthly SaaS and recurring service cost burden',
    category: 'money',
    unit: 'currency',
    iconName: 'Repeat',
  },
  {
    key: 'ActiveSubscriptionsCount',
    label: 'Active Subscriptions Count',
    description: 'Total number of active recurring subscriptions',
    category: 'money',
    unit: 'number',
    iconName: 'Tv',
  },

  // --- Cash Flow & Budgets ---
  {
    key: 'MonthlyIncome',
    label: 'Monthly Income',
    description: 'Total income recorded in the current calendar month',
    category: 'money',
    unit: 'currency',
    iconName: 'ArrowDownLeft',
  },
  {
    key: 'MonthlyExpenses',
    label: 'Monthly Expenses',
    description: 'Total expenses recorded in the current calendar month',
    category: 'money',
    unit: 'currency',
    iconName: 'ShoppingBag',
  },
  {
    key: 'MonthlySavings',
    label: 'Monthly Net Savings',
    description: 'Net cash surplus in current month (Income - Expenses)',
    category: 'money',
    unit: 'currency',
    iconName: 'PiggyBank',
  },
  {
    key: 'MonthlySavingsRate',
    label: 'Monthly Savings Rate %',
    description: 'Percentage of current month income saved',
    category: 'money',
    unit: 'percentage',
    iconName: 'PieChart',
  },
  {
    key: 'ActiveBudgetRemaining',
    label: 'Budget Remaining Limit',
    description: 'Unspent amount remaining in active monthly budget',
    category: 'money',
    unit: 'currency',
    iconName: 'Target',
  },

  // --- Investments & Portfolio ---
  {
    key: 'HoldingsValue',
    label: 'Total Holdings Value',
    description: 'Live market value of all stock & equity holdings',
    category: 'investments',
    unit: 'currency',
    iconName: 'TrendingUp',
  },
  {
    key: 'InvestedCapital',
    label: 'Invested Capital',
    description: 'Total principal invested into stock holdings',
    category: 'investments',
    unit: 'currency',
    iconName: 'PiggyBank',
  },
  {
    key: 'PortfolioGains',
    label: 'Portfolio Total Gains',
    description: 'Absolute profit / loss from investments (Holdings - Invested)',
    category: 'investments',
    unit: 'currency',
    iconName: 'ArrowUpRight',
  },
  {
    key: 'PortfolioReturnsPct',
    label: 'Portfolio Return %',
    description: 'Overall percentage return on investment portfolio',
    category: 'investments',
    unit: 'percentage',
    iconName: 'Percent',
  },
  {
    key: 'PortfolioXIRR',
    label: 'Portfolio XIRR',
    description: 'Annualized internal rate of return across all investment cash flows',
    category: 'investments',
    unit: 'percentage',
    iconName: 'Activity',
  },
  {
    key: 'DayGain',
    label: "Today's Portfolio Gain (₹)",
    description: "Today's change in portfolio value in rupees",
    category: 'investments',
    unit: 'currency',
    iconName: 'TrendingUp',
  },
  {
    key: 'DayGainPct',
    label: "Today's Portfolio Gain (%)",
    description: "Today's percentage change in portfolio value",
    category: 'investments',
    unit: 'percentage',
    iconName: 'Percent',
  },
  {
    key: 'RealizedGains',
    label: 'Booked Realized Returns',
    description: 'Cumulative realized profit from past stock sales',
    category: 'investments',
    unit: 'currency',
    iconName: 'CheckCircle2',
  },
  {
    key: 'StocksCount',
    label: 'Portfolio Stocks Count',
    description: 'Number of unique stock tickers in portfolio',
    category: 'investments',
    unit: 'number',
    iconName: 'Layers',
  },

  // --- Receivables & Payables ---
  {
    key: 'Receivables',
    label: 'Money Receivables (IOUs)',
    description: 'Total money lent / owed to you by others',
    category: 'money',
    unit: 'currency',
    iconName: 'ArrowDownLeft',
  },
  {
    key: 'Payables',
    label: 'Money Payables',
    description: 'Total money borrowed / owed to others',
    category: 'money',
    unit: 'currency',
    iconName: 'ArrowUpRight',
  },

  // --- Overall Net Worth ---
  {
    key: 'NetWorth',
    label: 'Total Net Worth',
    description: 'Combined total net worth across all assets and liabilities',
    category: 'combined',
    unit: 'currency',
    iconName: 'Crown',
  },
];

export interface LiveVariableValues {
  [key: string]: number;
}

/**
 * Computes live values for all goal variables from stores.
 */
export function extractLiveVariableValues(params: {
  accounts: Account[];
  loans: Loan[];
  subscriptions?: Subscription[];
  budgets?: Budget[];
  moneyTransactions: MoneyTransaction[];
  netWorth: number;
  totalHoldingsValue: number;
  totalInvested: number;
  portfolioXirr: number;
  dayGain?: number;
  dayGainPct?: number;
  realizedGains?: number;
  stocksCount?: number;
}): LiveVariableValues {
  const {
    accounts,
    loans,
    subscriptions = [],
    budgets = [],
    moneyTransactions,
    netWorth,
    totalHoldingsValue,
    totalInvested,
    portfolioXirr,
    dayGain = 0,
    dayGainPct = 0,
    realizedGains = 0,
    stocksCount = 0,
  } = params;

  // 1. Account balances (Only active accounts with includeInAssets !== false)
  const cash = accounts
    .filter((a) => !a.isArchived && a.includeInAssets !== false && a.type === 'wallet')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const savings = accounts
    .filter((a) => !a.isArchived && a.includeInAssets !== false && a.type === 'savings')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const emergency = accounts
    .filter((a) => !a.isArchived && a.includeInAssets !== false && a.type === 'emergency_fund')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const receivables = accounts
    .filter((a) => !a.isArchived && a.includeInAssets !== false && a.type === 'receivable')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const payableAccounts = accounts.filter((a) => !a.isArchived && a.includeInAssets !== false && a.type === 'payable');
  const payableAccountIds = new Set(payableAccounts.map((a) => a.id));
  const payables = payableAccounts.reduce((sum, a) => sum + Math.abs(a.balance || 0), 0);

  // Dynamic repayments towards payables (transfers into payable account or income credited)
  const payablesRepaid = moneyTransactions
    .filter((tx) => (tx.type === 'transfer' && tx.toAccountId && payableAccountIds.has(tx.toAccountId)) || (tx.type === 'income' && payableAccountIds.has(tx.accountId)))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const liquidCash = cash + savings + emergency;

  // 2. Loans & EMIs
  const activeLoans = loans.filter((l) => l.isActive);
  const loanOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);
  const monthlyEMI = activeLoans.reduce((sum, l) => sum + (l.emiAmount || 0), 0);
  const activeLoansCount = activeLoans.length;
  const loansRepaid = activeLoans.reduce((sum, l) => sum + Math.max(0, (l.principalAmount || l.outstandingAmount) - l.outstandingAmount), 0);

  // 3. Credit Card Debt
  const ccAccounts = accounts.filter((a) => !a.isArchived && a.includeInAssets !== false && a.type === 'credit_card');
  const ccAccountIds = new Set(ccAccounts.map((a) => a.id));
  const ccDebt = ccAccounts.reduce((sum, a) => sum + Math.abs(a.balance || 0), 0);
  const ccRepaid = moneyTransactions
    .filter((tx) => (tx.type === 'transfer' && tx.toAccountId && ccAccountIds.has(tx.toAccountId)) || (tx.type === 'income' && ccAccountIds.has(tx.accountId)))
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Blocked principal on credit cards from linked active loans
  const blockedCCDebt = activeLoans
    .filter((l) => l.linkedAccountId && ccAccountIds.has(l.linkedAccountId))
    .reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);

  const totalCCDebt = ccDebt + blockedCCDebt;

  const totalDebt = loanOutstanding + ccDebt + payables;
  const totalDebtRepaid = payablesRepaid + loansRepaid + ccRepaid;

  // 4. Subscriptions
  const activeSubs = subscriptions.filter((s) => s.isActive);
  const monthlySubscriptions = activeSubs.reduce((sum, s) => {
    if (s.billingCycle === 'weekly') return sum + (s.amount * 52) / 12;
    if (s.billingCycle === 'monthly') return sum + s.amount;
    if (s.billingCycle === 'quarterly') return sum + s.amount / 3;
    if (s.billingCycle === 'yearly') return sum + s.amount / 12;
    return sum + s.amount;
  }, 0);
  const activeSubscriptionsCount = activeSubs.length;

  // 5. Current month cashflow
  const now = new Date();
  const currentDay = now.getDate();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  moneyTransactions.forEach((tx) => {
    const txTime = new Date(tx.date).getTime();
    if (txTime >= startOfMonth && txTime <= endOfMonth) {
      if (tx.type === 'income') monthlyIncome += tx.amount;
      else if (tx.type === 'expense') monthlyExpenses += tx.amount;
    }
  });

  const monthlySavings = monthlyIncome - monthlyExpenses;
  const monthlySavingsRate =
    monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const debtToIncome = monthlyIncome > 0 ? (monthlyEMI / monthlyIncome) * 100 : 0;

  // Safe to Spend Daily Run-Rate
  const safeToSpend = liquidCash > 0 ? liquidCash / daysRemaining : 0;

  // 6. Active Budget
  const activeBudget = budgets.find((b) => b.isActive) || budgets[0];
  const activeBudgetLimit = activeBudget ? activeBudget.totalLimit : 0;
  const activeBudgetRemaining = activeBudget
    ? Math.max(0, activeBudget.totalLimit - monthlyExpenses)
    : 0;

  // 7. Portfolio values
  const portfolioGains = totalHoldingsValue - totalInvested;
  const portfolioReturnsPct =
    totalInvested > 0 ? (portfolioGains / totalInvested) * 100 : 0;

  return {
    // Cash & Liquid
    Cash: Math.round(cash * 100) / 100,
    Savings: Math.round(savings * 100) / 100,
    Emergency: Math.round(emergency * 100) / 100,
    LiquidCash: Math.round(liquidCash * 100) / 100,
    SafeToSpend: Math.round(safeToSpend * 100) / 100,

    // Debts & EMIs
    MonthlyEMI: Math.round(monthlyEMI * 100) / 100,
    TotalDebt: Math.round(totalDebt * 100) / 100,
    LoanOutstanding: Math.round(loanOutstanding * 100) / 100,
    CreditCardDebt: Math.round(ccDebt * 100) / 100,
    BlockedCCDebt: Math.round(blockedCCDebt * 100) / 100,
    TotalCCDebt: Math.round(totalCCDebt * 100) / 100,
    ActiveLoansCount: activeLoansCount,
    DebtToIncome: Math.round(debtToIncome * 10) / 10,

    // Subscriptions
    MonthlySubscriptions: Math.round(monthlySubscriptions * 100) / 100,
    ActiveSubscriptionsCount: activeSubscriptionsCount,

    // Cashflow & Budgets
    MonthlyIncome: Math.round(monthlyIncome * 100) / 100,
    MonthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
    MonthlySavings: Math.round(monthlySavings * 100) / 100,
    MonthlySavingsRate: Math.round(monthlySavingsRate * 10) / 10,
    ActiveBudgetLimit: Math.round(activeBudgetLimit * 100) / 100,
    ActiveBudgetRemaining: Math.round(activeBudgetRemaining * 100) / 100,

    // Portfolio
    HoldingsValue: Math.round(totalHoldingsValue * 100) / 100,
    InvestedCapital: Math.round(totalInvested * 100) / 100,
    PortfolioGains: Math.round(portfolioGains * 100) / 100,
    PortfolioReturnsPct: Math.round(portfolioReturnsPct * 100) / 100,
    PortfolioXIRR: Math.round(portfolioXirr * 100) / 100,
    DayGain: Math.round(dayGain * 100) / 100,
    DayGainPct: Math.round(dayGainPct * 100) / 100,
    RealizedGains: Math.round(realizedGains * 100) / 100,
    StocksCount: stocksCount,

    // Receivables & Payables
    Receivables: Math.round(receivables * 100) / 100,
    Payables: Math.round(payables * 100) / 100,

    // Dynamic Debt Repayments (for dynamic reduction goals)
    _payablesRepaid: Math.round(payablesRepaid * 100) / 100,
    _loansRepaid: Math.round(loansRepaid * 100) / 100,
    _ccRepaid: Math.round(ccRepaid * 100) / 100,
    _totalDebtRepaid: Math.round(totalDebtRepaid * 100) / 100,

    // Overall Net Worth
    NetWorth: Math.round(netWorth * 100) / 100,
  };
}

/**
 * Safely evaluates a user's formula expression using live variable values.
 * Supports aliases like "Cash + Savings + Emergency" or "MonthlyEMI".
 */
export function evaluateFormula(formula: string, liveValues: LiveVariableValues): number {
  if (!formula || typeof formula !== 'string') return 0;

  try {
    let sanitized = formula;

    // Friendly Aliases Dictionary
    const aliases: { [key: string]: string } = {
      'Emergency Fund': 'Emergency',
      'Holdings Value': 'HoldingsValue',
      'Total Holdings Value': 'HoldingsValue',
      'Invested Amount': 'InvestedCapital',
      'Invested Capital': 'InvestedCapital',
      'Portfolio Returns': 'PortfolioGains',
      'Portfolio Return': 'PortfolioReturnsPct',
      'Portfolio Gains': 'PortfolioGains',
      'XIRR': 'PortfolioXIRR',
      'Liquid Wealth': 'LiquidCash',
      'Liquid Cash': 'LiquidCash',
      'Safe to Spend': 'SafeToSpend',
      'EMI': 'MonthlyEMI',
      'Monthly EMI': 'MonthlyEMI',
      'EMIs': 'MonthlyEMI',
      'Loan Debt': 'LoanOutstanding',
      'Loans': 'LoanOutstanding',
      'Loan': 'LoanOutstanding',
      'Credit Card': 'CreditCardDebt',
      'Credit Card Debt': 'CreditCardDebt',
      'Credit Card Debt (Excl. Blocked)': 'CreditCardDebt',
      'CC Debt': 'CreditCardDebt',
      'Blocked CC Debt': 'BlockedCCDebt',
      'Blocked CC Loan Amount': 'BlockedCCDebt',
      'Total CC Debt': 'TotalCCDebt',
      'Total CC Debt (Incl. Blocked)': 'TotalCCDebt',
      'DTI': 'DebtToIncome',
      'Subscriptions': 'MonthlySubscriptions',
      'Subscription': 'MonthlySubscriptions',
      'Savings Rate': 'MonthlySavingsRate',
      'Savings': 'Savings',
      'Savings Accounts': 'Savings',
      'Savings Account': 'Savings',
      'Debt': 'TotalDebt',
      'Income': 'MonthlyIncome',
      'Expenses': 'MonthlyExpenses',
      'Budget': 'ActiveBudgetRemaining',
      'Today Gain': 'DayGain',
      'Day Change': 'DayGain',
      'Accounts Payable': 'Payables',
      'Account Payable': 'Payables',
      'Account Payble': 'Payables',
      'Payable': 'Payables',
      'Payables': 'Payables',
      'Accounts Receivable': 'Receivables',
      'Account Receivable': 'Receivables',
      'Receivable': 'Receivables',
      'Receivables': 'Receivables',
      'Net Worth': 'NetWorth',
      'Holdings': 'HoldingsValue',
      'Stocks': 'StocksCount',
      'Realized Profit': 'RealizedGains',
      'Realized Gain': 'RealizedGains',
    };

    // Sort aliases by length descending
    const sortedAliases = Object.keys(aliases).sort((a, b) => b.length - a.length);
    sortedAliases.forEach((alias) => {
      const reg = new RegExp(`\\b${alias}\\b`, 'gi');
      sanitized = sanitized.replace(reg, aliases[alias]);
    });

    // Sort live value keys by length descending to prevent partial prefix replacements
    const sortedKeys = Object.keys(liveValues).sort((a, b) => b.length - a.length);
    sortedKeys.forEach((key) => {
      const val = liveValues[key] !== undefined ? liveValues[key] : 0;
      const numStr = val < 0 ? `(${val})` : val.toString();
      const reg = new RegExp(`\\b${key}\\b`, 'gi');
      sanitized = sanitized.replace(reg, numStr);
    });

    // Remove any character that is NOT a digit, decimal point, whitespace, or safe arithmetic operator (+, -, *, /, (, ))
    let safeExpr = sanitized.replace(/[^0-9.\s+\-*/()]/g, '');

    // Strip trailing dangling arithmetic operators (e.g. user typed "Cash + ")
    safeExpr = safeExpr.trim().replace(/[+\-*/\s]+$/, '').trim();

    if (!safeExpr) return 0;

    // Safe mathematical calculation via Function without scope leakage
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${safeExpr})`)();

    if (typeof result === 'number' && isFinite(result)) {
      return Math.round(result * 100) / 100;
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Evaluates a FinancialGoal into an EvaluatedGoal with progress and completion status.
 */
export function evaluateGoal(goal: FinancialGoal, liveValues: LiveVariableValues): EvaluatedGoal {
  const currentValue = evaluateFormula(goal.formula, liveValues);
  const target = goal.targetValue;

  // Intelligent operator determination:
  // If target is 0 or goal explicitly uses <=, or category is 'debt', treat as reduction/payoff goal
  const isDebtOrReduction =
    goal.operator === '<=' ||
    target === 0 ||
    goal.category === 'debt' ||
    /Payables|Debt|Loan|CreditCard|MonthlyEMI/i.test(goal.formula);

  const effectiveOperator: GoalOperator = isDebtOrReduction ? '<=' : (goal.operator || '>=');

  // Targets list normalization:
  // Use goal.targets array if provided and non-empty, otherwise fallback to [goal.targetValue]
  const rawTargets = (goal.targets && goal.targets.length > 0) ? goal.targets : [goal.targetValue];
  
  // Sort targets:
  // For growth (>=), sort ascending [1L, 5L, 10L]
  // For reduction (<=), sort descending [50k, 20k, 0]
  let sortedTargets = [...rawTargets].sort((a, b) => (effectiveOperator === '<=' ? b - a : a - b));
  if (sortedTargets.length === 0) sortedTargets = [target];

  const totalSegments = sortedTargets.length;
  const milestoneSegments: EvaluatedMilestoneSegment[] = [];

  let activeMilestoneIndex = 0;
  let activeMilestoneTarget = sortedTargets[0];
  let foundActive = false;

  const finalTarget = sortedTargets[sortedTargets.length - 1];

  // Determine dynamic repayments for this goal formula
  let repaidAmount = 0;
  if (/Payables/i.test(goal.formula)) {
    repaidAmount = liveValues._payablesRepaid || 0;
  } else if (/LoanOutstanding|Loan/i.test(goal.formula)) {
    repaidAmount = liveValues._loansRepaid || 0;
  } else if (/CreditCardDebt|CreditCard/i.test(goal.formula)) {
    repaidAmount = liveValues._ccRepaid || 0;
  } else if (/TotalDebt|Debt/i.test(goal.formula)) {
    repaidAmount = liveValues._totalDebtRepaid || 0;
  }

  // Dynamic Debt Peak Baseline:
  // Automatically computed from (current outstanding debt + cumulative repayments)
  // If user borrows more, peak debt increases dynamically; as they repay, progress fills dynamically!
  const dynamicDebtPeak = (repaidAmount > 0)
    ? (currentValue + repaidAmount)
    : (goal.initialValue && goal.initialValue > finalTarget ? goal.initialValue : Math.max(currentValue, sortedTargets[0] || 0));

  const startBaseline = Math.max(dynamicDebtPeak, sortedTargets[0] || 0);

  // Pre-calculate segment spans to compute ratios
  const segmentSpans: number[] = [];
  let totalSpan = 0;
  for (let i = 0; i < totalSegments; i++) {
    const segmentTarget = sortedTargets[i];
    let rStart = 0;
    let rEnd = segmentTarget;

    if (effectiveOperator === '<=' || target === 0) {
      rStart = i === 0 ? (startBaseline <= segmentTarget ? segmentTarget * 1.5 || 100 : startBaseline) : sortedTargets[i - 1];
      rEnd = segmentTarget;
    } else {
      rStart = i === 0 ? 0 : sortedTargets[i - 1];
      rEnd = segmentTarget;
    }

    const span = Math.max(0, Math.abs(rStart - rEnd));
    segmentSpans.push(span);
    totalSpan += span;
  }

  for (let i = 0; i < totalSegments; i++) {
    const segmentTarget = sortedTargets[i];
    let rangeStart = 0;
    let rangeEnd = segmentTarget;

    let segAchieved = false;
    let segFill = 0;

    if (effectiveOperator === '<=' || target === 0) {
      // Reduction segment: Segment 0 starts from startBaseline down to sortedTargets[0]
      rangeStart = i === 0 ? (startBaseline <= segmentTarget ? segmentTarget * 1.5 || 100 : startBaseline) : sortedTargets[i - 1];
      rangeEnd = segmentTarget;

      segAchieved = currentValue <= segmentTarget;
      if (segAchieved) {
        segFill = 100;
      } else {
        const span = rangeStart - segmentTarget;
        if (span > 0 && currentValue < rangeStart) {
          segFill = Math.max(0, Math.min(100, ((rangeStart - currentValue) / span) * 100));
        } else {
          segFill = 0;
        }
      }
    } else {
      // Growth segment
      rangeStart = i === 0 ? 0 : sortedTargets[i - 1];
      rangeEnd = segmentTarget;

      segAchieved = currentValue >= segmentTarget;
      if (segAchieved) {
        segFill = 100;
      } else {
        const span = segmentTarget - rangeStart;
        if (span > 0 && currentValue > rangeStart) {
          segFill = Math.max(0, Math.min(100, ((currentValue - rangeStart) / span) * 100));
        } else {
          segFill = 0;
        }
      }
    }

    if (!segAchieved && !foundActive) {
      activeMilestoneIndex = i;
      activeMilestoneTarget = segmentTarget;
      foundActive = true;
    }

    const spanRatio = totalSpan > 0 ? (segmentSpans[i] / totalSpan) : (1 / totalSegments);

    milestoneSegments.push({
      targetValue: segmentTarget,
      segmentIndex: i,
      totalSegments,
      isAchieved: segAchieved,
      fillPercentage: Math.round(segFill * 10) / 10,
      rangeStart,
      rangeEnd,
      spanRatio: Math.round(spanRatio * 1000) / 1000,
    });
  }

  if (!foundActive) {
    activeMilestoneIndex = totalSegments - 1;
    activeMilestoneTarget = sortedTargets[totalSegments - 1];
  }

  // Calculate overall progress across all segments weighted by their respective goal ratios
  const weightedProgress = milestoneSegments.reduce(
    (sum, seg) => sum + (seg.fillPercentage * (seg.spanRatio ?? (1 / totalSegments))),
    0
  );
  const progressPercentage = totalSegments > 0 ? Math.round(weightedProgress * 10) / 10 : 0;

  // Final condition is met when the final target milestone is achieved
  let isConditionMet = false;
  let remainingValue = 0;

  if (effectiveOperator === '<=' || target === 0) {
    isConditionMet = currentValue <= finalTarget;
    remainingValue = Math.max(0, currentValue - finalTarget);
  } else if (effectiveOperator === '>=') {
    isConditionMet = currentValue >= finalTarget;
    remainingValue = Math.max(0, finalTarget - currentValue);
  } else {
    isConditionMet = Math.abs(currentValue - finalTarget) < 0.01;
    remainingValue = Math.abs(finalTarget - currentValue);
  }

  const isAchieved = goal.isManuallyCompleted || isConditionMet;

  let daysRemaining: number | undefined;
  if (goal.targetDate) {
    const targetTime = new Date(goal.targetDate).getTime();
    const nowTime = new Date().getTime();
    const diffDays = Math.ceil((targetTime - nowTime) / (1000 * 60 * 60 * 24));
    daysRemaining = diffDays;
  }

  return {
    ...goal,
    currentValue,
    progressPercentage: Math.min(100, progressPercentage),
    milestoneSegments,
    activeMilestoneIndex,
    activeMilestoneTarget,
    isConditionMet,
    isAchieved,
    remainingValue,
    daysRemaining,
  };
}
