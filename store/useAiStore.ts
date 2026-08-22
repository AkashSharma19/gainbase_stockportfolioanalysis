import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface AiInsight {
  id: string;
  category: 'Buy' | 'Sell/Hold' | 'Observe';
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
  addMessage: (role: 'user' | 'model', content: string) => void;
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
      addMessage: (role, content) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role,
              content,
              timestamp: Date.now(),
            },
          ],
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
