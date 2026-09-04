import { usePortfolioStore } from '@/store/usePortfolioStore';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  const deviceColorScheme = useDeviceColorScheme();
  const themePreference = usePortfolioStore((state) => state.theme);

  if (themePreference === 'system') {
    return deviceColorScheme === 'dark' ? 'dark' : 'light';
  }
  return themePreference === 'dark' ? 'dark' : 'light';
}

