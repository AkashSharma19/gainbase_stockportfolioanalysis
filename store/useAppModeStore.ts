import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppMode = 'investments' | 'money';

interface AppModeState {
  activeMode: AppMode;
  setActiveMode: (mode: AppMode) => void;
  isTransitioning: boolean;
  setIsTransitioning: (val: boolean) => void;
}

export const useAppModeStore = create<AppModeState>()(
  persist(
    (set) => ({
      activeMode: 'investments',
      setActiveMode: (mode) => set({ activeMode: mode }),
      isTransitioning: false,
      setIsTransitioning: (val) => set({ isTransitioning: val }),
    }),
    {
      name: 'app-mode-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ activeMode: state.activeMode }), // Only persist activeMode, not the transient transitioning flag
    }
  )
);
