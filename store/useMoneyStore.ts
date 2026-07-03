import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Account, MoneyTransaction, Loan, EMIPayment, Budget, AccountType } from '../types/money';

interface MoneyState {
  accounts: Account[];
  moneyTransactions: MoneyTransaction[];
  loans: Loan[];
  emiPayments: EMIPayment[];
  budgets: Budget[];
  
  // Account Actions
  addAccount: (account: Account) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  
  // Transaction Actions
  addMoneyTransaction: (transaction: MoneyTransaction) => void;
  updateMoneyTransaction: (id: string, transaction: MoneyTransaction) => void;
  removeMoneyTransaction: (id: string) => void;
  
  // Loan Actions
  addLoan: (loan: Loan) => void;
  updateLoan: (id: string, updates: Partial<Loan>) => void;
  removeLoan: (id: string) => void;
  addEMIPayment: (payment: EMIPayment) => void;
  
  // Budget Actions
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  removeBudget: (id: string) => void;
  
  // Category Actions
  categories: {
    income: string[];
    expense: string[];
  };
  addCategory: (type: 'income' | 'expense', name: string) => void;
  updateCategory: (type: 'income' | 'expense', oldName: string, newName: string) => void;
  removeCategory: (type: 'income' | 'expense', name: string) => void;

  
  importMoneyData: (transactions: MoneyTransaction[], accounts: Account[]) => void;
  restoreMoneyData: (data: {
    accounts: Account[];
    transactions: MoneyTransaction[];
    loans: Loan[];
    emiPayments: EMIPayment[];
    budgets: Budget[];
    categories: { income: string[]; expense: string[] };
  }) => void;

  // Reset Data
  clearAllMoneyData: () => void;

  
  // Computed Selectors (Invoked as store functions)
  getNetWorth: () => number;
  getMonthlyEMIBurden: () => number;
  getActiveBudget: () => Budget | null;
  getCategorySpending: (budgetId: string) => { [category: string]: number };
}

export const useMoneyStore = create<MoneyState>()(
  persist(
    (set, get) => ({
      accounts: [],
      moneyTransactions: [],
      loans: [],
      emiPayments: [],
      budgets: [],
      categories: {
        income: [],
        expense: []
      },



      // --- Account Actions ---
      addAccount: (account) =>
        set((state) => ({
          accounts: [...state.accounts, account],
        })),
      updateAccount: (id, updates) =>
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === id ? { ...acc, ...updates, updatedAt: new Date().toISOString() } : acc
          ),
        })),
      removeAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.filter((acc) => acc.id !== id),
          // Clean up transaction associations if needed, or keep them
        })),

      // --- Transaction Actions ---
      addMoneyTransaction: (tx) => {
        set((state) => {
          // Adjust account balance based on transaction type
          const updatedAccounts = state.accounts.map((acc) => {
            if (acc.id === tx.accountId) {
              let newBalance = acc.balance;
              if (tx.type === 'income') {
                newBalance += tx.amount;
              } else if (tx.type === 'expense') {
                newBalance -= tx.amount;
              } else if (tx.type === 'transfer') {
                newBalance -= tx.amount; // Deduct from source
              }
              return { ...acc, balance: newBalance, updatedAt: new Date().toISOString() };
            }
            // If it is a transfer, add to destination account
            if (tx.type === 'transfer' && acc.id === tx.toAccountId) {
              return { ...acc, balance: acc.balance + tx.amount, updatedAt: new Date().toISOString() };
            }
            return acc;
          });

          return {
            moneyTransactions: [tx, ...state.moneyTransactions],
            accounts: updatedAccounts,
          };
        });
      },

      updateMoneyTransaction: (id, updatedTx) => {
        set((state) => {
          const oldTx = state.moneyTransactions.find((t) => t.id === id);
          if (!oldTx) return state;

          // Revert old transaction balances first
          let tempAccounts = state.accounts.map((acc) => {
            let bal = acc.balance;
            if (acc.id === oldTx.accountId) {
              if (oldTx.type === 'income') bal -= oldTx.amount;
              else if (oldTx.type === 'expense') bal += oldTx.amount;
              else if (oldTx.type === 'transfer') bal += oldTx.amount;
            }
            if (oldTx.type === 'transfer' && acc.id === oldTx.toAccountId) {
              bal -= oldTx.amount;
            }
            return { ...acc, balance: bal };
          });

          // Apply new transaction balances
          const finalAccounts = tempAccounts.map((acc) => {
            let bal = acc.balance;
            if (acc.id === updatedTx.accountId) {
              if (updatedTx.type === 'income') bal += updatedTx.amount;
              else if (updatedTx.type === 'expense') bal -= updatedTx.amount;
              else if (updatedTx.type === 'transfer') bal -= updatedTx.amount;
            }
            if (updatedTx.type === 'transfer' && acc.id === updatedTx.toAccountId) {
              bal += updatedTx.amount;
            }
            return { ...acc, balance: bal, updatedAt: new Date().toISOString() };
          });

          return {
            moneyTransactions: state.moneyTransactions.map((t) => (t.id === id ? updatedTx : t)),
            accounts: finalAccounts,
          };
        });
      },

      removeMoneyTransaction: (id) => {
        set((state) => {
          const oldTx = state.moneyTransactions.find((t) => t.id === id);
          if (!oldTx) return state;

          // Revert transaction impact on account balances
          const revertedAccounts = state.accounts.map((acc) => {
            let bal = acc.balance;
            if (acc.id === oldTx.accountId) {
              if (oldTx.type === 'income') bal -= oldTx.amount;
              else if (oldTx.type === 'expense') bal += oldTx.amount;
              else if (oldTx.type === 'transfer') bal += oldTx.amount;
            }
            if (oldTx.type === 'transfer' && acc.id === oldTx.toAccountId) {
              bal -= oldTx.amount;
            }
            return { ...acc, balance: bal, updatedAt: new Date().toISOString() };
          });

          return {
            moneyTransactions: state.moneyTransactions.filter((t) => t.id !== id),
            accounts: revertedAccounts,
          };
        });
      },

      // --- Loan Actions ---
      addLoan: (loan) =>
        set((state) => ({
          loans: [...state.loans, loan],
        })),
      updateLoan: (id, updates) =>
        set((state) => ({
          loans: state.loans.map((loan) => (loan.id === id ? { ...loan, ...updates } : loan)),
        })),
      removeLoan: (id) =>
        set((state) => ({
          loans: state.loans.filter((loan) => loan.id !== id),
          emiPayments: state.emiPayments.filter((p) => p.loanId !== id),
        })),
      addEMIPayment: (payment) => {
        set((state) => {
          // Adjust outstanding amount of the loan
          const updatedLoans = state.loans.map((loan) => {
            if (loan.id === payment.loanId) {
              // outstandingAmount decreases when a payment is made (principal portion subtracted)
              const newOutstanding = Math.max(0, loan.outstandingAmount - payment.principalPortion);
              return { ...loan, outstandingAmount: newOutstanding };
            }
            return loan;
          });

          return {
            emiPayments: [...state.emiPayments, payment],
            loans: updatedLoans,
          };
        });
      },

      // --- Budget Actions ---
      addBudget: (budget) =>
        set((state) => ({
          budgets: [...state.budgets, budget],
        })),
      updateBudget: (id, updates) =>
        set((state) => ({
          budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),
      removeBudget: (id) =>
        set((state) => ({
          budgets: state.budgets.filter((b) => b.id !== id),
        })),

      addCategory: (type, name) =>
        set((state) => {
          const current = state.categories?.[type] || [];
          if (current.includes(name)) return state;
          return {
            categories: {
              ...(state.categories || {
                income: [],
                expense: []
              }),
              [type]: [...current, name],
            },
          };
        }),
      updateCategory: (type, oldName, newName) =>
        set((state) => {
          const current = state.categories?.[type] || [];
          const updatedCategories = current.map((c) => (c === oldName ? newName : c));
          const updatedTransactions = state.moneyTransactions.map((tx) => {
            if (tx.type === type && tx.category === oldName) {
              return { ...tx, category: newName };
            }
            return tx;
          });
          return {
            categories: {
              ...(state.categories || {
                income: [],
                expense: []
              }),
              [type]: updatedCategories,
            },
            moneyTransactions: updatedTransactions,
          };
        }),
      removeCategory: (type, name) =>
        set((state) => {
          const current = state.categories?.[type] || [];
          const updatedCategories = current.filter((c) => c !== name);
          const updatedTransactions = state.moneyTransactions.map((tx) => {
            if (tx.type === type && tx.category === name) {
              return { ...tx, category: 'Other' };
            }
            return tx;
          });
          return {
            categories: {
              ...(state.categories || {
                income: [],
                expense: []
              }),
              [type]: updatedCategories,
            },
            moneyTransactions: updatedTransactions,
          };
        }),


      importMoneyData: (transactions, accounts) =>
        set((state) => ({
          moneyTransactions: [...transactions, ...state.moneyTransactions],
          accounts: accounts,
        })),

      restoreMoneyData: (data) =>
        set(() => ({
          accounts: data.accounts,
          moneyTransactions: data.transactions,
          loans: data.loans,
          emiPayments: data.emiPayments,
          budgets: data.budgets,
          categories: data.categories,
        })),

      clearAllMoneyData: () =>
        set({
          accounts: [],
          moneyTransactions: [],
          loans: [],
          emiPayments: [],
          budgets: [],
          categories: {
            income: [],
            expense: []
          },
        }),


      // --- Computed Values ---
      getNetWorth: () => {
        const { accounts, loans } = get();
        const assetBalance = accounts.reduce((acc, current) => acc + current.balance, 0);
        const activeLoansOutstanding = loans
          .filter((l) => l.isActive)
          .reduce((acc, current) => acc + current.outstandingAmount, 0);
        return assetBalance - activeLoansOutstanding;
      },

      getMonthlyEMIBurden: () => {
        const { loans } = get();
        return loans
          .filter((l) => l.isActive)
          .reduce((acc, current) => acc + current.emiAmount, 0);
      },

      getActiveBudget: () => {
        const { budgets } = get();
        const now = new Date();
        const active = budgets.find(
          (b) => b.isActive && new Date(b.startDate) <= now && new Date(b.endDate) >= now
        );
        return active || budgets[0] || null; // fallback to first budget if none matches date range
      },

      getCategorySpending: (budgetId) => {
        const { budgets, moneyTransactions } = get();
        const budget = budgets.find((b) => b.id === budgetId);
        if (!budget) return {};

        const start = new Date(budget.startDate).getTime();
        const end = new Date(budget.endDate).getTime();

        // Calculate total expense transactions falling in this range grouped by category
        const totals: { [category: string]: number } = {};
        
        moneyTransactions.forEach((tx) => {
          if (tx.type !== 'expense') return;
          const txTime = new Date(tx.date).getTime();
          if (txTime >= start && txTime <= end) {
            totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
          }
        });

        return totals;
      },
    }),
    {
      name: 'money-manager-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
