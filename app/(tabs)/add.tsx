import { Redirect } from 'expo-router';
import { useAppModeStore } from '@/store/useAppModeStore';

export default function AddTab() {
  const { activeMode } = useAppModeStore();
  return (
    <Redirect
      href={
        activeMode === 'investments'
          ? '/add-transaction'
          : '/add-money-transaction'
      }
    />
  );
}

