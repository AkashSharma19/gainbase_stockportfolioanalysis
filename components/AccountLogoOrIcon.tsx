import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Account, AccountType } from '@/types/money';
import { BankLogo } from '@/components/BankLogo';
import { ThemedText } from '@/components/ThemedText';
import {
  Wallet,
  CreditCard,
  Landmark,
  TrendingUp,
  PiggyBank,
  Users,
} from 'lucide-react-native';

export const ACCOUNT_TYPE_ICONS: Record<AccountType, { color: string }> = {
  wallet: { color: '#00C9A7' },
  savings: { color: '#007AFF' },
  investment: { color: '#AF52DE' },
  credit_card: { color: '#FF9500' },
  emergency_fund: { color: '#FF2D55' },
  receivable: { color: '#34C759' },
  payable: { color: '#FF3B30' },
};

export const ACCOUNT_SECTION_ORDER = [
  'BANK ACCOUNTS',
  'CREDIT CARDS',
  'CASH & WALLETS',
  'INVESTMENTS',
  'EMERGENCY FUND',
  'PEER BALANCES',
  'ACCOUNTS',
];

export const getAccountTypeSection = (type: AccountType): string => {
  switch (type) {
    case 'savings':
      return 'BANK ACCOUNTS';
    case 'credit_card':
      return 'CREDIT CARDS';
    case 'wallet':
      return 'CASH & WALLETS';
    case 'investment':
      return 'INVESTMENTS';
    case 'emergency_fund':
      return 'EMERGENCY FUND';
    case 'receivable':
    case 'payable':
      return 'PEER BALANCES';
    default:
      return 'ACCOUNTS';
  }
};

export interface AccountLogoOrIconProps {
  account: Account;
  size?: number;
  variant?: 'circle' | 'card' | 'badge';
  style?: StyleProp<ViewStyle>;
}

export function AccountLogoOrIcon({
  account,
  size = 24,
  variant = 'circle',
  style,
}: AccountLogoOrIconProps) {
  const config = ACCOUNT_TYPE_ICONS[account.type] || ACCOUNT_TYPE_ICONS.wallet;

  if (variant === 'card') {
    if (account.logo) {
      return (
        <BankLogo
          logo={account.logo}
          size={30}
          style={[{ width: 44, height: 30, borderRadius: 7, marginRight: 10 }, style]}
        />
      );
    }
    return (
      <View
        style={[
          {
            width: 44,
            height: 30,
            borderRadius: 7,
            backgroundColor: `${config.color}18`,
            borderWidth: 1,
            borderColor: `${config.color}35`,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 10,
          },
          style,
        ]}
      >
        {account.type === 'wallet' ? (
          <Wallet size={16} color={config.color} strokeWidth={2} />
        ) : account.type === 'credit_card' ? (
          <CreditCard size={16} color={config.color} strokeWidth={2} />
        ) : account.type === 'savings' ? (
          <Landmark size={16} color={config.color} strokeWidth={2} />
        ) : account.type === 'investment' ? (
          <TrendingUp size={16} color={config.color} strokeWidth={2} />
        ) : account.type === 'emergency_fund' ? (
          <PiggyBank size={16} color={config.color} strokeWidth={2} />
        ) : account.type === 'receivable' || account.type === 'payable' ? (
          <Users size={16} color={config.color} strokeWidth={2} />
        ) : (
          <ThemedText style={{ fontSize: 11, color: config.color, fontFamily: 'Outfit_700Bold' }}>
            {account.name.slice(0, 3).toUpperCase()}
          </ThemedText>
        )}
      </View>
    );
  }

  // Circle or Badge
  if (account.logo) {
    return <BankLogo logo={account.logo} size={size} style={[{ marginRight: 6 }, style]} />;
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${config.color}20`,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 6,
        },
        style,
      ]}
    >
      <ThemedText style={{ fontSize: size * 0.45, color: config.color, fontWeight: '700' }}>
        {account.name.charAt(0).toUpperCase()}
      </ThemedText>
    </View>
  );
}
