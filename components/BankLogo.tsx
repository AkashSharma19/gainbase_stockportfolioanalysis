import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';

export const BANK_BRANDS = [
  { id: 'hdfc', name: 'HDFC Bank', color: '#1C3F94', initials: 'HDFC', textColor: '#FFFFFF' },
  { id: 'icici', name: 'ICICI Bank', color: '#F58220', initials: 'ICICI', textColor: '#FFFFFF' },
  { id: 'axis', name: 'Axis Bank', color: '#971B4B', initials: 'Axis', textColor: '#FFFFFF' },
  { id: 'federal', name: 'Federal Bank', color: '#0054A6', initials: 'Fed', textColor: '#FFFFFF' },
  { id: 'sbi', name: 'SBI', color: '#0083CA', initials: 'SBI', textColor: '#FFFFFF' },
  { id: 'kotak', name: 'Kotak Bank', color: '#EE1C25', initials: 'Kotak', textColor: '#FFFFFF' },
  { id: 'pnb', name: 'PNB Bank', color: '#7F1244', initials: 'PNB', textColor: '#FFFFFF' },
  { id: 'yesbank', name: 'Yes Bank', color: '#005EA6', initials: 'Yes', textColor: '#FFFFFF' },
  { id: 'upstox', name: 'Upstox', color: '#3A2374', initials: 'Upstx', textColor: '#FFFFFF' },
  { id: 'groww', name: 'Groww', color: '#00D09C', initials: 'Groww', textColor: '#FFFFFF' },
  { id: 'indmoney', name: 'INDmoney', color: '#00B55B', initials: 'IND', textColor: '#FFFFFF' },
  { id: 'zerodha', name: 'Zerodha', color: '#387ED1', initials: 'Kite', textColor: '#FFFFFF' },
  { id: 'paytm', name: 'Paytm', color: '#00B9F5', initials: 'Paytm', textColor: '#FFFFFF' },
  { id: 'phonepe', name: 'PhonePe', color: '#5F259F', initials: 'PhnPe', textColor: '#FFFFFF' },
  { id: 'gpay', name: 'Google Pay', color: '#4285F4', initials: 'GPay', textColor: '#FFFFFF' },
  { id: 'cash', name: 'Cash', color: '#34C759', initials: 'Cash', textColor: '#FFFFFF' },
];

export function BankLogo({ logo, size = 32, style }: { logo: string; size?: number; style?: any }) {
  const brand = BANK_BRANDS.find((b) => b.id === logo);
  if (!brand) return null;

  const fontSize = size * 0.32;
  const paddingHorizontal = size * 0.1;

  return (
    <View
      style={[
        styles.badge,
        {
          width: size * 1.4,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: brand.color,
        },
        style,
      ]}
    >
      <ThemedText
        type="bold"
        style={{
          color: brand.textColor,
          fontSize,
          letterSpacing: -0.2,
          paddingHorizontal,
          fontFamily: 'Outfit_700Bold',
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {brand.initials}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
