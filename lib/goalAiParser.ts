import { GoalCategory, GoalOperator, GoalUnit } from '../types/goals';
import { GOAL_VARIABLES } from './goalEvaluator';

export interface ParsedAiGoal {
  name: string;
  description?: string;
  category: GoalCategory;
  formula: string;
  targets: number[];
  targetValue: number;
  unit: GoalUnit;
  operator: GoalOperator;
  icon: string;
  color: string;
  targetDate?: string;
}

/**
 * Parses Indian currency and percentage numbers from natural language.
 * Examples: "5 lakh" -> 500000, "1.5L" -> 150000, "50k" -> 50000, "1 crore" -> 10000000, "18%" -> 18
 */
export function extractNumbersFromText(text: string): number[] {
  const results: number[] = [];
  const clean = text.toLowerCase();

  // Pattern: crore / cr
  const croreMatches = clean.matchAll(/(\d+(?:\.\d+)?)\s*(?:crore|cr)\b/gi);
  for (const m of croreMatches) {
    const val = parseFloat(m[1]) * 10000000;
    if (!isNaN(val) && !results.includes(val)) results.push(val);
  }

  // Pattern: lakh / lac / l
  const lakhMatches = clean.matchAll(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l)\b/gi);
  for (const m of lakhMatches) {
    const val = parseFloat(m[1]) * 100000;
    if (!isNaN(val) && !results.includes(val)) results.push(val);
  }

  // Pattern: thousand / k
  const kMatches = clean.matchAll(/(\d+(?:\.\d+)?)\s*(?:thousand|k)\b/gi);
  for (const m of kMatches) {
    const val = parseFloat(m[1]) * 1000;
    if (!isNaN(val) && !results.includes(val)) results.push(val);
  }

  // Pattern: percentage
  const pctMatches = clean.matchAll(/(\d+(?:\.\d+)?)\s*%/gi);
  for (const m of pctMatches) {
    const val = parseFloat(m[1]);
    if (!isNaN(val) && !results.includes(val)) results.push(val);
  }

  // Pattern: plain numbers >= 100 or 0
  const plainMatches = clean.matchAll(/(?:₹|\$|rs\.?|inr)?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d+)/gi);
  for (const m of plainMatches) {
    const raw = m[1].replace(/,/g, '');
    const val = parseFloat(raw);
    if (!isNaN(val) && !results.includes(val)) {
      results.push(val);
    }
  }

  return results;
}

/**
 * Smart offline heuristic NLP parser for natural language financial goals.
 * Handles English, Hindi/Hinglish terms, keywords, and milestone patterns.
 */
export function parseGoalPromptOffline(prompt: string): ParsedAiGoal {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  let category: GoalCategory = 'savings';
  let formula = 'Cash + Savings + Emergency';
  let unit: GoalUnit = 'currency';
  let operator: GoalOperator = '>=';
  let icon = 'Target';
  let color = '#00C9A7';
  let name = 'Financial Goal';

  const numbers = extractNumbersFromText(p);

  // 1. Determine Category, Operator, Formula & Icon based on intent keywords
  if (/debt|loan|payable|credit\s*card|emi|udhaar|chuka|pay\s*off|clear/i.test(lower)) {
    category = 'debt';
    operator = '<=';
    icon = 'CreditCard';
    color = '#007AFF';

    if (/credit\s*card/i.test(lower) && !/loan|payable/i.test(lower)) {
      formula = 'CreditCardDebt';
      name = 'Pay Off Credit Card Debt';
    } else if (/loan/i.test(lower) && !/credit|payable/i.test(lower)) {
      formula = 'LoanOutstanding';
      name = 'Pay Off Loans';
    } else if (/payable/i.test(lower) && !/loan|credit/i.test(lower)) {
      formula = 'Payables';
      name = 'Clear All Payables';
    } else {
      formula = 'TotalDebt';
      name = 'Become 100% Debt-Free';
    }
  } else if (/xirr|cagr|return|compounding/i.test(lower)) {
    category = 'investments';
    formula = 'PortfolioXIRR';
    unit = 'percentage';
    operator = '>=';
    icon = 'Activity';
    color = '#FF9500';
    name = 'Portfolio XIRR Target';
  } else if (/stock|portfolio|holding|equity|etf|share|mutual\s*fund/i.test(lower)) {
    category = 'investments';
    formula = 'HoldingsValue';
    unit = 'currency';
    operator = '>=';
    icon = 'TrendingUp';
    color = '#34C759';
    name = 'Investment Portfolio Milestone';
  } else if (/net\s*worth|wealth|crorepati|lakhpati/i.test(lower)) {
    category = 'retirement';
    formula = 'NetWorth';
    unit = 'currency';
    operator = '>=';
    icon = 'Crown';
    color = '#AF52DE';
    name = 'Net Worth Target';
  } else if (/emergency|reserve|safety\s*net|liquid|fd|fixed\s*deposit/i.test(lower)) {
    category = 'savings';
    formula = 'Cash + Savings + Emergency';
    unit = 'currency';
    operator = '>=';
    icon = 'ShieldCheck';
    color = '#00C9A7';
    name = 'Emergency Safety Fund';
  } else if (/savings\s*rate/i.test(lower)) {
    category = 'savings';
    formula = 'MonthlySavingsRate';
    unit = 'percentage';
    operator = '>=';
    icon = 'Percent';
    color = '#00C9A7';
    name = 'Monthly Savings Rate Target';
  } else if (/income/i.test(lower)) {
    category = 'custom';
    formula = 'MonthlyIncome';
    unit = 'currency';
    operator = '>=';
    icon = 'Coins';
    color = '#34C759';
    name = 'Monthly Income Target';
  } else if (/expense|spend/i.test(lower)) {
    category = 'custom';
    formula = 'MonthlyExpenses';
    unit = 'currency';
    operator = '<=';
    icon = 'ShoppingBag';
    color = '#FF3B30';
    name = 'Monthly Expense Limit';
  }

  // 2. Determine Targets / Milestones
  let targets: number[] = [];
  if (numbers.length > 0) {
    targets = numbers;
  } else {
    if (operator === '<=') {
      targets = [0];
    } else if (unit === 'percentage') {
      targets = [15, 18];
    } else {
      targets = [100000, 500000];
    }
  }

  // Sort targets appropriately
  targets = [...targets].sort((a, b) => (operator === '<=' ? b - a : a - b));
  const targetValue = targets[targets.length - 1] || 0;

  // Refine friendly name if amount is detected
  if (unit === 'percentage') {
    name = `Achieve ${targetValue}% ${formula === 'PortfolioXIRR' ? 'XIRR' : 'Savings Rate'}`;
  } else if (operator === '<=') {
    name = targetValue === 0 ? 'Clear All Debts & Payables' : `Reduce Debt to ₹${targetValue.toLocaleString('en-IN')}`;
  } else if (targetValue >= 10000000) {
    name = `₹${(targetValue / 10000000).toFixed(1).replace(/\.0$/, '')} Crore ${category === 'savings' ? 'Reserve' : category === 'retirement' ? 'Net Worth' : 'Portfolio'}`;
  } else if (targetValue >= 100000) {
    name = `₹${(targetValue / 100000).toFixed(1).replace(/\.0$/, '')} Lakh ${category === 'savings' ? 'Reserve' : category === 'retirement' ? 'Net Worth' : 'Portfolio'}`;
  }

  return {
    name,
    description: p,
    category,
    formula,
    targets,
    targetValue,
    unit,
    operator,
    icon,
    color,
  };
}

/**
 * Calls Gemini LLM to parse natural language prompt into a structured Financial Goal.
 * Falls back seamlessly to offline heuristic NLP parser on network error or missing API key.
 */
export async function parseGoalPromptWithAI(
  prompt: string,
  apiKey?: string,
  model: string = 'gemini-2.5-flash'
): Promise<ParsedAiGoal> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    return parseGoalPromptOffline('Build Emergency Fund');
  }

  if (!apiKey) {
    return parseGoalPromptOffline(cleanPrompt);
  }

  const systemInstruction = `You are a financial goal AI assistant for Gainbase, an advanced personal finance and stock portfolio tracking app.
Your task is to parse a user's natural language goal description (in English, Hinglish, Hindi, etc.) into a clean JSON object representing their financial goal.

The available live variables in Gainbase are:
- Cash & Liquidity: Cash, Savings, Emergency, LiquidCash, SafeToSpend
- Investments: HoldingsValue, InvestedCapital, PortfolioGains, PortfolioReturnsPct, PortfolioXIRR, DayGain, DayGainPct, RealizedGains, StocksCount
- Debts & Liabilities: MonthlyEMI, TotalDebt, LoanOutstanding, CreditCardDebt (current spent balance excluding blocked loan amounts), BlockedCCDebt (blocked loan principal), TotalCCDebt (credit card balance including blocked loan principal), ActiveLoansCount, DebtToIncome, Payables
- Cashflow & Budgets: MonthlyIncome, MonthlyExpenses, MonthlySavings, MonthlySavingsRate, ActiveBudgetRemaining, Receivables, NetWorth

Formulas support standard arithmetic like +, -, *, /, (, ). For example:
- "Cash + Savings + Emergency"
- "HoldingsValue"
- "TotalDebt"
- "PortfolioXIRR"
- "NetWorth"
- "MonthlySavingsRate"

Respond ONLY with valid JSON matching this schema:
{
  "name": string (Inspiring short goal title),
  "description": string (Brief summary),
  "category": "savings" | "investments" | "debt" | "retirement" | "custom",
  "formula": string (Exact valid formula expression using variable keys above),
  "targets": number[] (Array of milestone numbers. If user mentions milestones e.g. 1L, 5L, 10L, include [100000, 500000, 1000000]),
  "targetValue": number (The final destination target value),
  "unit": "currency" | "percentage" | "number",
  "operator": ">=" | "<=" (Use "<=" for debt/payoff/expense reduction; use ">=" for savings/growth/net worth),
  "icon": "Target" | "ShieldCheck" | "TrendingUp" | "Activity" | "Coins" | "Landmark" | "Wallet" | "Crown" | "Percent" | "CreditCard" | "ShoppingBag",
  "color": "#00C9A7" | "#34C759" | "#FF9500" | "#007AFF" | "#AF52DE" | "#FF2D55",
  "targetDate": string (Optional ISO date string if a timeline is mentioned like "by Dec 2027")
}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nUser Goal Request:\n"${cleanPrompt}"` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      return parseGoalPromptOffline(cleanPrompt);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return parseGoalPromptOffline(cleanPrompt);
    }

    const parsed = JSON.parse(candidateText.trim());

    // Validate and sanitize parsed targets
    let targets: number[] = Array.isArray(parsed.targets) && parsed.targets.length > 0
      ? parsed.targets.map((t: any) => parseFloat(t)).filter((t: number) => !isNaN(t))
      : [parseFloat(parsed.targetValue) || 0];

    const operator: GoalOperator = parsed.operator === '<=' ? '<=' : '>=';
    targets = targets.sort((a, b) => (operator === '<=' ? b - a : a - b));

    return {
      name: parsed.name || 'Financial Goal',
      description: parsed.description || cleanPrompt,
      category: parsed.category || 'savings',
      formula: parsed.formula || 'Cash + Savings + Emergency',
      targets: targets.length > 0 ? targets : [100000],
      targetValue: targets[targets.length - 1] || parseFloat(parsed.targetValue) || 0,
      unit: parsed.unit === 'percentage' ? 'percentage' : parsed.unit === 'number' ? 'number' : 'currency',
      operator,
      icon: parsed.icon || 'Target',
      color: parsed.color || '#00C9A7',
      targetDate: parsed.targetDate,
    };
  } catch (error) {
    return parseGoalPromptOffline(cleanPrompt);
  }
}
