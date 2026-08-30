import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ChatAction {
  id: string;
  type:
    | 'create_account_and_add_transaction'
    | 'add_transaction'
    | 'create_account'
    | 'pay_emi'
    | 'pay_subscription';
  accountName: string;
  accountType: 'receivable' | 'payable' | 'wallet' | 'savings' | 'credit_card' | 'investment';
  amount: number;
  transactionType: 'income' | 'expense' | 'transfer';
  category: string;
  note?: string;
  sourceAccountId?: string;
  status: 'pending' | 'confirmed' | 'dismissed';
  necessityVerdict?: 'Essential / Need' | 'Discretionary / Want' | 'Receivable / Loan' | 'Investment' | 'Neutral';
  necessityReason?: string;
  loanId?: string;
  loanName?: string;
  subscriptionId?: string;
  subscriptionName?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  action?: ChatAction;
}

export interface AiInsight {
  id: string;
  category: 'Buy' | 'Sell' | 'Hold' | 'Not Sure';
  title: string;
  badge: string;
  value: string;
  reason: string;
  color: string;
  icon: string;
  symbol?: string;
  logo?: string;
}

interface AiState {
  geminiApiKey: string;
  selectedModel: string;
  messages: ChatMessage[];
  aiStockInsights: AiInsight[];
  setGeminiApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;
  addMessage: (role: 'user' | 'model', content: string, action?: ChatAction) => void;
  updateMessageAction: (messageId: string, actionUpdates: Partial<ChatAction>) => void;
  clearMessages: () => void;
  setAiStockInsights: (insights: AiInsight[]) => void;
  clearAiStockInsights: () => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      geminiApiKey: '',
      selectedModel: 'gemini-1.5-flash',
      messages: [],
      aiStockInsights: [],
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      addMessage: (role, content, action) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role,
              content,
              timestamp: Date.now(),
              action,
            },
          ],
        })),
      updateMessageAction: (messageId, actionUpdates) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId && msg.action
              ? { ...msg, action: { ...msg.action, ...actionUpdates } }
              : msg
          ),
        })),
      clearMessages: () => set({ messages: [] }),
      setAiStockInsights: (insights) => set({ aiStockInsights: insights }),
      clearAiStockInsights: () => set({ aiStockInsights: [] }),
    }),
    {
      name: 'ai-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
