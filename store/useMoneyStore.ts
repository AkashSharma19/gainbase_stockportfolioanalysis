import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Account, MoneyTransaction, Loan, EMIPayment, Budget, AccountType, Subscription, SubscriptionPayment } from '../types/money';

interface MoneyState {
  accounts: Account[];
  moneyTransactions: MoneyTransaction[];
  loans: Loan[];
  emiPayments: EMIPayment[];
  budgets: Budget[];
  subscriptions: Subscription[];
  subscriptionPayments: SubscriptionPayment[];
  
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
  removeEMIPayment: (paymentId: string) => void;
  
  // Subscription Actions
  addSubscription: (subscription: Subscription) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  addSubscriptionPayment: (payment: SubscriptionPayment) => void;
  removeSubscriptionPayment: (paymentId: string) => void;
  
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
    subscriptions: Subscription[];
    subscriptionPayments: SubscriptionPayment[];
  }) => void;

  // Reset Data
  clearAllMoneyData: () => void;

  
  // Computed Selectors (Invoked as store functions)
  getNetWorth: () => number;
  getMonthlyEMIBurden: () => number;
  getMonthlySubscriptionBurden: () => number;
  getActiveBudget: () => Budget | null;
  getCategorySpending: (budgetId: string, year: number, month: number) => { [category: string]: number };
}

export const useMoneyStore = create<MoneyState>()(
  persist(
    (set, get) => ({
      accounts: [],
      moneyTransactions: [],
      loans: [],
      emiPayments: [],
      budgets: [],
      subscriptions: [],
      subscriptionPayments: [],
      categories: {
        income: ['Salary', 'Investments', 'Business', 'Gift', 'Refund', 'Other'],
        expense: [
          'Food & Dining',
          'Food',
          'Junk',
          'Rent & Bills',
          'House',
          'Electricity Bill',
          'Shopping',
          'Shopping - Electronics',
          'Shopping - Clothes',
          'Entertainment',
          'Subscriptions - OTT',
          'Subscriptions - WiFi',
          'Travel',
          'Travel/ Trips',
          'Transport - Fuel',
          'Transport - Cab',
          'Medical',
          'Education',
          'Maintainance',
          'Family',
          'Gifts',
          'EMI Payments',
          'Others'
        ]
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
          const tempAccounts = state.accounts.map((acc) => {
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

          // Check if there is an EMI payment associated with this transaction
          let matchedEmiPayment = state.emiPayments.find((p) => p.transactionId === id);
          if (!matchedEmiPayment) {
            // Fallback match: same amount and within 5 seconds of the transaction date
            const txTime = new Date(oldTx.date).getTime();
            matchedEmiPayment = state.emiPayments.find((p) => {
              if (p.transactionId) return false;
              const pTime = new Date(p.date).getTime();
              return Math.abs(txTime - pTime) < 5000 && p.amount === oldTx.amount;
            });
          }

          let updatedLoans = state.loans;
          let updatedEmiPayments = state.emiPayments;
          if (matchedEmiPayment) {
            updatedEmiPayments = state.emiPayments.filter((p) => p.id !== matchedEmiPayment!.id);
            updatedLoans = state.loans.map((loan) => {
              if (loan.id === matchedEmiPayment!.loanId) {
                return {
                  ...loan,
                  outstandingAmount: loan.outstandingAmount + matchedEmiPayment!.principalPortion,
                };
              }
              return loan;
            });
          }

          // Check if there is a subscription payment associated with this transaction
          let matchedSubPayment = state.subscriptionPayments.find((p) => p.transactionId === id);
          if (!matchedSubPayment) {
            // Fallback match: same amount and within 5 seconds of the transaction date
            const txTime = new Date(oldTx.date).getTime();
            matchedSubPayment = state.subscriptionPayments.find((p) => {
              if (p.transactionId) return false;
              const pTime = new Date(p.date).getTime();
              return Math.abs(txTime - pTime) < 5000 && p.amount === oldTx.amount;
            });
          }

          let updatedSubscriptions = state.subscriptions;
          let updatedSubPayments = state.subscriptionPayments;
          if (matchedSubPayment) {
            updatedSubPayments = state.subscriptionPayments.filter((p) => p.id !== matchedSubPayment!.id);
            updatedSubscriptions = state.subscriptions.map((sub) => {
              if (sub.id === matchedSubPayment!.subscriptionId) {
                const nextDate = new Date(sub.nextPaymentDate);
                const prevDate = new Date(nextDate);
                if (sub.billingCycle === 'weekly') prevDate.setDate(prevDate.getDate() - 7);
                else if (sub.billingCycle === 'monthly') prevDate.setMonth(prevDate.getMonth() - 1);
                else if (sub.billingCycle === 'quarterly') prevDate.setMonth(prevDate.getMonth() - 3);
                else if (sub.billingCycle === 'yearly') prevDate.setFullYear(prevDate.getFullYear() - 1);
                return { ...sub, nextPaymentDate: prevDate.toISOString(), updatedAt: new Date().toISOString() };
              }
              return sub;
            });
          }

          return {
            moneyTransactions: state.moneyTransactions.filter((t) => t.id !== id),
            accounts: revertedAccounts,
            loans: updatedLoans,
            emiPayments: updatedEmiPayments,
            subscriptions: updatedSubscriptions,
            subscriptionPayments: updatedSubPayments,
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
      removeEMIPayment: (paymentId) => {
        set((state) => {
          const payment = state.emiPayments.find((p) => p.id === paymentId);
          if (!payment) return {};

          const updatedLoans = state.loans.map((loan) => {
            if (loan.id === payment.loanId) {
              return {
                ...loan,
                outstandingAmount: loan.outstandingAmount + payment.principalPortion,
              };
            }
            return loan;
          });

          return {
            emiPayments: state.emiPayments.filter((p) => p.id !== paymentId),
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

      addSubscription: (subscription) =>
        set((state) => ({
          subscriptions: [...state.subscriptions, subscription],
        })),
      updateSubscription: (id, updates) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)),
        })),
      removeSubscription: (id) =>
        set((state) => ({
          subscriptions: state.subscriptions.filter((s) => s.id !== id),
          subscriptionPayments: state.subscriptionPayments.filter((p) => p.subscriptionId !== id),
        })),
      addSubscriptionPayment: (payment) => {
        set((state) => {
          const updatedSubs = state.subscriptions.map((sub) => {
            if (sub.id === payment.subscriptionId) {
              const nextDate = new Date(sub.nextPaymentDate);
              const newNext = new Date(nextDate);
              if (sub.billingCycle === 'weekly') newNext.setDate(newNext.getDate() + 7);
              else if (sub.billingCycle === 'monthly') newNext.setMonth(newNext.getMonth() + 1);
              else if (sub.billingCycle === 'quarterly') newNext.setMonth(newNext.getMonth() + 3);
              else if (sub.billingCycle === 'yearly') newNext.setFullYear(newNext.getFullYear() + 1);
              return { ...sub, nextPaymentDate: newNext.toISOString() };
            }
            return sub;
          });
          return {
            subscriptionPayments: [...state.subscriptionPayments, payment],
            subscriptions: updatedSubs,
          };
        });
      },
      removeSubscriptionPayment: (paymentId) => {
        set((state) => {
          const payment = state.subscriptionPayments.find((p) => p.id === paymentId);
          if (!payment) return {};

          const updatedSubscriptions = state.subscriptions.map((sub) => {
            if (sub.id === payment.subscriptionId) {
              const nextDate = new Date(sub.nextPaymentDate);
              const prevDate = new Date(nextDate);
              if (sub.billingCycle === 'weekly') prevDate.setDate(prevDate.getDate() - 7);
              else if (sub.billingCycle === 'monthly') prevDate.setMonth(prevDate.getMonth() - 1);
              else if (sub.billingCycle === 'quarterly') prevDate.setMonth(prevDate.getMonth() - 3);
              else if (sub.billingCycle === 'yearly') prevDate.setFullYear(prevDate.getFullYear() - 1);
              return { ...sub, nextPaymentDate: prevDate.toISOString(), updatedAt: new Date().toISOString() };
            }
            return sub;
          });

          return {
            subscriptionPayments: state.subscriptionPayments.filter((p) => p.id !== paymentId),
            subscriptions: updatedSubscriptions,
          };
        });
      },

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
          subscriptions: data.subscriptions || [],
          subscriptionPayments: data.subscriptionPayments || [],
        })),

      clearAllMoneyData: () =>
        set({
          accounts: [],
          moneyTransactions: [],
          loans: [],
          emiPayments: [],
          budgets: [],
          subscriptions: [],
          subscriptionPayments: [],
          categories: {
            income: [],
            expense: []
          },
        }),


      // --- Computed Values ---
      getNetWorth: () => {
        const { accounts, loans } = get();
        const assetBalance = accounts
          .filter((a) => a.includeInAssets !== false)
          .reduce((acc, current) => acc + current.balance, 0);
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

      getMonthlySubscriptionBurden: () => {
        const { subscriptions } = get();
        return subscriptions
          .filter((s) => s.isActive)
          .reduce((acc, current) => {
            if (current.billingCycle === 'weekly') return acc + (current.amount * 52) / 12;
            if (current.billingCycle === 'monthly') return acc + current.amount;
            if (current.billingCycle === 'quarterly') return acc + current.amount / 3;
            if (current.billingCycle === 'yearly') return acc + current.amount / 12;
            return acc + current.amount;
          }, 0);
      },

      getActiveBudget: () => {
        const { budgets } = get();
        const active = budgets.find((b) => b.isActive);
        return active || budgets[0] || null;
      },

      getCategorySpending: (budgetId, year, month) => {
        const { budgets, moneyTransactions } = get();
        const budget = budgets.find((b) => b.id === budgetId);
        if (!budget) return {};

        const start = new Date(year, month, 1, 0, 0, 0, 0).getTime();
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

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
