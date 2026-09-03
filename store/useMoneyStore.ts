import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Account, MoneyTransaction, Loan, EMIPayment, Budget, AccountType, Subscription, SubscriptionPayment } from '../types/money';
import { usePortfolioStore } from './usePortfolioStore';

interface MoneyState {
  accounts: Account[];
  moneyTransactions: MoneyTransaction[];
  loans: Loan[];
  emiPayments: EMIPayment[];
  budgets: Budget[];
  subscriptions: Subscription[];
  subscriptionPayments: SubscriptionPayment[];
  
  // Deleted tracking lists for Sync
  deletedAccountIds: string[];
  deletedTransactionIds: string[];
  deletedLoanIds: string[];
  deletedEmiPaymentIds: string[];
  deletedBudgetIds: string[];
  deletedBudgetCategoryIds: string[];
  deletedSubscriptionIds: string[];
  deletedSubscriptionPaymentIds: string[];
  
  // Account Ordering & Actions
  accountTypesOrder?: AccountType[];
  setAccountTypesOrder: (order: AccountType[]) => void;
  reorderAccounts: (accounts: Account[]) => void;
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
  categoryMetadata?: Record<string, { icon: string; color: string }>;
  setCategoryMetadata: (name: string, icon: string, color: string) => void;
  addCategory: (type: 'income' | 'expense', name: string, icon?: string, color?: string) => void;
  updateCategory: (type: 'income' | 'expense', oldName: string, newName: string, icon?: string, color?: string) => void;
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
      deletedAccountIds: [],
      deletedTransactionIds: [],
      deletedLoanIds: [],
      deletedEmiPaymentIds: [],
      deletedBudgetIds: [],
      deletedBudgetCategoryIds: [],
      deletedSubscriptionIds: [],
      deletedSubscriptionPaymentIds: [],
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



      accountTypesOrder: [
        'savings',
        'credit_card',
        'wallet',
        'investment',
        'emergency_fund',
        'receivable',
        'payable',
      ],
      setAccountTypesOrder: (order) => set({ accountTypesOrder: order }),
      reorderAccounts: (accounts) => set({ accounts }),

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
          deletedAccountIds: [...(state.deletedAccountIds || []), id],
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

          const txWithTime = { ...tx, updatedAt: new Date().toISOString() };
          return {
            moneyTransactions: [txWithTime, ...state.moneyTransactions],
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

          const updatedTxWithTime = { ...updatedTx, updatedAt: new Date().toISOString() };
          return {
            moneyTransactions: state.moneyTransactions.map((t) => (t.id === id ? updatedTxWithTime : t)),
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
            deletedTransactionIds: [...(state.deletedTransactionIds || []), id],
            accounts: revertedAccounts,
            loans: updatedLoans,
            emiPayments: updatedEmiPayments,
            deletedEmiPaymentIds: matchedEmiPayment 
              ? [...(state.deletedEmiPaymentIds || []), matchedEmiPayment.id]
              : state.deletedEmiPaymentIds || [],
            subscriptions: updatedSubscriptions,
            subscriptionPayments: updatedSubPayments,
            deletedSubscriptionPaymentIds: matchedSubPayment
              ? [...(state.deletedSubscriptionPaymentIds || []), matchedSubPayment.id]
              : state.deletedSubscriptionPaymentIds || [],
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
          loans: state.loans.map((loan) => (loan.id === id ? { ...loan, ...updates, updatedAt: new Date().toISOString() } : loan)),
        })),
      removeLoan: (id) =>
        set((state) => {
          const relatedEmiIds = state.emiPayments.filter((p) => p.loanId === id).map((p) => p.id);
          return {
            loans: state.loans.filter((loan) => loan.id !== id),
            deletedLoanIds: [...(state.deletedLoanIds || []), id],
            emiPayments: state.emiPayments.filter((p) => p.loanId !== id),
            deletedEmiPaymentIds: [...(state.deletedEmiPaymentIds || []), ...relatedEmiIds],
          };
        }),
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
            deletedEmiPaymentIds: [...(state.deletedEmiPaymentIds || []), paymentId],
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
          budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b)),
        })),
      removeBudget: (id) =>
        set((state) => {
          const targetBudget = state.budgets.find(b => b.id === id);
          const relatedCatIds = targetBudget && targetBudget.categories 
            ? targetBudget.categories.map(c => c.id) 
            : [];
          return {
            budgets: state.budgets.filter((b) => b.id !== id),
            deletedBudgetIds: [...(state.deletedBudgetIds || []), id],
            deletedBudgetCategoryIds: [...(state.deletedBudgetCategoryIds || []), ...relatedCatIds],
          };
        }),

      addSubscription: (subscription) =>
        set((state) => ({
          subscriptions: [...state.subscriptions, subscription],
        })),
      updateSubscription: (id, updates) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)),
        })),
      removeSubscription: (id) =>
        set((state) => {
          const relatedPayIds = state.subscriptionPayments.filter((p) => p.subscriptionId === id).map((p) => p.id);
          return {
            subscriptions: state.subscriptions.filter((s) => s.id !== id),
            deletedSubscriptionIds: [...(state.deletedSubscriptionIds || []), id],
            subscriptionPayments: state.subscriptionPayments.filter((p) => p.subscriptionId !== id),
            deletedSubscriptionPaymentIds: [...(state.deletedSubscriptionPaymentIds || []), ...relatedPayIds],
          };
        }),
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
            deletedSubscriptionPaymentIds: [...(state.deletedSubscriptionPaymentIds || []), paymentId],
            subscriptions: updatedSubscriptions,
          };
        });
      },

      setCategoryMetadata: (name, icon, color) =>
        set((state) => ({
          categoryMetadata: {
            ...(state.categoryMetadata || {}),
            [name]: { icon, color },
          },
        })),
      addCategory: (type, name, icon, color) =>
        set((state) => {
          const current = state.categories?.[type] || [];
          const updated = current.includes(name) ? current : [...current, name];
          const newMeta = { ...(state.categoryMetadata || {}) };
          if (icon && color) {
            newMeta[name] = { icon, color };
          }
          return {
            categories: {
              ...(state.categories || {
                income: [],
                expense: []
              }),
              [type]: updated,
            },
            categoryMetadata: newMeta,
          };
        }),
      updateCategory: (type, oldName, newName, icon, color) =>
        set((state) => {
          const current = state.categories?.[type] || [];
          const updatedCategories = current.map((c) => (c === oldName ? newName : c));
          const updatedTransactions = state.moneyTransactions.map((tx) => {
            if (tx.type === type && tx.category === oldName) {
              return { ...tx, category: newName, updatedAt: new Date().toISOString() };
            }
            return tx;
          });
          const newMeta = { ...(state.categoryMetadata || {}) };
          if (oldName !== newName) {
            const existing = newMeta[oldName];
            delete newMeta[oldName];
            if (icon && color) {
              newMeta[newName] = { icon, color };
            } else if (existing) {
              newMeta[newName] = existing;
            }
          } else if (icon && color) {
            newMeta[newName] = { icon, color };
          }
          return {
            categories: {
              ...(state.categories || {
                income: [],
                expense: []
              }),
              [type]: updatedCategories,
            },
            categoryMetadata: newMeta,
            moneyTransactions: updatedTransactions,
          };
        }),
      removeCategory: (type, name) =>
        set((state) => {
          const current = state.categories?.[type] || [];
          const updatedCategories = current.filter((c) => c !== name);
          const updatedTransactions = state.moneyTransactions.map((tx) => {
            if (tx.type === type && tx.category === name) {
              return { ...tx, category: 'Other', updatedAt: new Date().toISOString() };
            }
            return tx;
          });
          const newMeta = { ...(state.categoryMetadata || {}) };
          delete newMeta[name];
          return {
            categories: {
              ...(state.categories || {
                income: [],
                expense: []
              }),
              [type]: updatedCategories,
            },
            categoryMetadata: newMeta,
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
            expense: [],
          },
          deletedAccountIds: [],
          deletedTransactionIds: [],
          deletedLoanIds: [],
          deletedEmiPaymentIds: [],
          deletedBudgetIds: [],
          deletedBudgetCategoryIds: [],
          deletedSubscriptionIds: [],
          deletedSubscriptionPaymentIds: [],
        }),


      // --- Computed Values ---
      getNetWorth: () => {
        const { accounts, loans } = get();

        let brokerAllocations: any[] = [];
        try {
          brokerAllocations = usePortfolioStore.getState().getAllocationData('Broker');
        } catch (e) {
          console.error('Failed to get broker allocations in getNetWorth:', e);
        }

        const assetBalance = accounts
          .filter((a) => a.includeInAssets !== false)
          .reduce((acc, current) => {
            if (current.type === 'investment' && current.linkedBroker) {
              const allocation = brokerAllocations.find(
                (b) => b.name.toLowerCase().trim() === current.linkedBroker!.toLowerCase().trim()
              );
              return acc + (allocation ? allocation.value : 0);
            }
            return acc + current.balance;
          }, 0);

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
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Deduplicate moneyTransactions
        if (Array.isArray(state.moneyTransactions)) {
          const seenIds = new Set<string>();
          const seenFp = new Set<string>();
          const uniqueTxs: MoneyTransaction[] = [];
          for (const t of state.moneyTransactions) {
            if (!t) continue;
            const id = t.id ? String(t.id) : '';
            const dateKey = t.date ? (typeof t.date === 'string' ? t.date.slice(0, 10) : new Date(t.date).toISOString().slice(0, 10)) : '';
            const fp = `${t.type || 'expense'}|${Number(t.amount || 0)}|${(t.category || '').trim().toLowerCase()}|${t.accountId || ''}|${dateKey}|${(t.note || '').trim().toLowerCase()}`;
            if (id && seenIds.has(id)) continue;
            if (seenFp.has(fp)) continue;
            if (id) seenIds.add(id);
            seenFp.add(fp);
            uniqueTxs.push(t);
          }
          if (uniqueTxs.length !== state.moneyTransactions.length) {
            state.moneyTransactions = uniqueTxs;
          }
        }

        // Deduplicate accounts
        if (Array.isArray(state.accounts)) {
          const seenIds = new Set<string>();
          const seenFp = new Set<string>();
          const uniqueAccs: Account[] = [];
          for (const a of state.accounts) {
            if (!a) continue;
            const id = a.id ? String(a.id) : '';
            const fp = `${(a.name || '').trim().toLowerCase()}|${(a.type || '').toLowerCase()}|${(a.institution || '').trim().toLowerCase()}`;
            if (id && seenIds.has(id)) continue;
            if (seenFp.has(fp)) continue;
            if (id) seenIds.add(id);
            seenFp.add(fp);
            uniqueAccs.push(a);
          }
          if (uniqueAccs.length !== state.accounts.length) {
            state.accounts = uniqueAccs;
          }
        }
      },
    }
  )
);
