export type AccountType = 'wallet' | 'savings' | 'investment' | 'credit_card' | 'emergency_fund' | 'receivable' | 'payable';

export interface Account {
  id: string;
  name: string;              // e.g. "Cash Wallet", "SBI Savings", "HDFC Credit Card"
  type: AccountType;
  balance: number;           // Current balance (negative for credit card debt)
  icon: string;              // Lucide icon name or emoji representation
  color: string;             // Hex color code for branding/charts
  institution?: string;      // e.g. "SBI", "HDFC"
  logo?: string;             // Bank brand identifier, e.g. "sbi", "hdfc", "icici", "axis", "federal"
  accountNumber?: string;    // Masked account number, e.g. "...1234"
  creditLimit?: number;      // For credit cards only
  interestRate?: number;     // For savings accounts
  includeInAssets?: boolean; // If false, exclude from calculations
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MoneyTransaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;          // e.g. "Groceries", "Salary"
  subcategory?: string;
  accountId: string;         // Account ID affected (or source account for transfer)
  toAccountId?: string;      // Destination account ID (for transfer type only)
  date: string;              // ISO String
  note?: string;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  attachmentUri?: string;    // URI of receipt attachment
}

export interface Loan {
  id: string;
  name: string;              // e.g. "Home Loan", "Car Loan"
  lenderName: string;        // e.g. "HDFC Bank", "SBI"
  principalAmount: number;
  outstandingAmount: number;
  interestRate: number;      // Annual interest rate in percent (e.g. 8.5)
  emiAmount: number;         // Calculated or manual EMI amount
  tenureMonths: number;      // Total duration in months
  startDate: string;         // ISO Date String
  endDate: string;           // ISO Date String
  linkedAccountId?: string;  // Account ID from which EMIs are debited
  type: 'home' | 'car' | 'personal' | 'education' | 'other';
  isActive: boolean;
}

export interface EMIPayment {
  id: string;
  loanId: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  date: string;              // ISO Date String
  status: 'paid' | 'upcoming' | 'overdue';
  transactionId?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;              // e.g. "Food", "Bills", "Shopping"
  icon: string;              // Lucide icon name
  color: string;             // Hex color code
  limit: number;             // Allocated amount limit
  spent: number;             // Dynamically calculated spent amount
}

export interface Budget {
  id: string;
  name: string;              // e.g. "July 2026", "Vacation Budget"
  period: 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: string;         // ISO Date String
  endDate: string;           // ISO Date String
  totalLimit: number;
  categories: BudgetCategory[];
  isActive: boolean;
}

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Subscription {
  id: string;
  name: string;              // e.g. "Netflix Premium", "Spotify"
  provider: string;          // e.g. "Netflix", "Spotify AB"
  amount: number;            // Billing amount per cycle
  billingCycle: BillingCycle;
  nextPaymentDate: string;   // ISO Date String
  linkedAccountId?: string;  // Account ID from which payment is debited
  category: string;          // e.g. "Entertainment", "Utilities", "Software"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  logo?: string;
  color: string;
}

export interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  amount: number;
  date: string;              // ISO Date String
  status: 'paid' | 'upcoming' | 'missed';
  transactionId?: string;
}
