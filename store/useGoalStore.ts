import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinancialGoal } from '../types/goals';

export interface GoalState {
  goals: FinancialGoal[];
  
  // Actions
  addGoal: (goal: Omit<FinancialGoal, 'id' | 'createdAt' | 'updatedAt' | 'isManuallyCompleted'>) => string;
  updateGoal: (id: string, updates: Partial<FinancialGoal>) => void;
  deleteGoal: (id: string) => void;
  toggleGoalCompleted: (id: string) => void;
  reorderGoals: (newOrder: FinancialGoal[]) => void;
  resetToDefaults: () => void;
}

const DEFAULT_GOALS: FinancialGoal[] = [
  {
    id: 'goal-emergency-fund',
    name: 'Build 6-Month Liquid Reserve',
    description: 'Ensure a solid financial safety net in Cash, Savings, and Emergency funds',
    category: 'savings',
    icon: 'ShieldCheck',
    color: '#00C9A7',
    formula: 'Cash + Savings + Emergency',
    targetValue: 300000,
    targets: [100000, 200000, 300000],
    unit: 'currency',
    operator: '>=',
    isManuallyCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'goal-equity-milestone',
    name: '₹10 Lakh Stock Portfolio',
    description: 'Grow direct equity and ETF investment holdings value',
    category: 'investments',
    icon: 'TrendingUp',
    color: '#34C759',
    formula: 'HoldingsValue',
    targetValue: 1000000,
    targets: [250000, 500000, 1000000],
    unit: 'currency',
    operator: '>=',
    isManuallyCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'goal-xirr-target',
    name: 'Achieve 18% Annualized XIRR',
    description: 'Maintain high-performing compounding returns on invested capital',
    category: 'investments',
    icon: 'Activity',
    color: '#FF9500',
    formula: 'PortfolioXIRR',
    targetValue: 18,
    targets: [12, 15, 18],
    unit: 'percentage',
    operator: '>=',
    isManuallyCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: DEFAULT_GOALS,

      addGoal: (goalData) => {
        const id = `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const newGoal: FinancialGoal = {
          ...goalData,
          id,
          isManuallyCompleted: false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          goals: [newGoal, ...state.goals],
        }));

        return id;
      },

      updateGoal: (id, updates) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id
              ? { ...g, ...updates, updatedAt: new Date().toISOString() }
              : g
          ),
        }));
      },

      deleteGoal: (id) => {
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        }));
      },

      toggleGoalCompleted: (id) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id
              ? {
                  ...g,
                  isManuallyCompleted: !g.isManuallyCompleted,
                  updatedAt: new Date().toISOString(),
                }
              : g
          ),
        }));
      },

      reorderGoals: (newOrder) => {
        set({ goals: newOrder });
      },

      resetToDefaults: () => {
        set({ goals: DEFAULT_GOALS });
      },
    }),
    {
      name: 'gainbase-goals-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
