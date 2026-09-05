import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';

export interface BankBrand {
  id: string;
  name: string;
  color: string;
  initials: string;
  textColor: string;
  category?: 'bank' | 'wallet' | 'broker' | 'govt' | 'custom';
}

export const BANK_BRANDS: BankBrand[] = [
  // ─── Major Indian & International Banks ───
  { id: 'hdfc', name: 'HDFC Bank', color: '#1C3F94', initials: 'HDFC', textColor: '#FFFFFF', category: 'bank' },
  { id: 'icici', name: 'ICICI Bank', color: '#F58220', initials: 'ICICI', textColor: '#FFFFFF', category: 'bank' },
  { id: 'sbi', name: 'State Bank of India (SBI)', color: '#0083CA', initials: 'SBI', textColor: '#FFFFFF', category: 'bank' },
  { id: 'axis', name: 'Axis Bank', color: '#971B4B', initials: 'Axis', textColor: '#FFFFFF', category: 'bank' },
  { id: 'kotak', name: 'Kotak Mahindra Bank', color: '#EE1C25', initials: 'Kotak', textColor: '#FFFFFF', category: 'bank' },
  { id: 'pnb', name: 'Punjab National Bank (PNB)', color: '#7F1244', initials: 'PNB', textColor: '#FFFFFF', category: 'bank' },
  { id: 'bob', name: 'Bank of Baroda', color: '#F26522', initials: 'BOB', textColor: '#FFFFFF', category: 'bank' },
  { id: 'canara', name: 'Canara Bank', color: '#0054A6', initials: 'Canara', textColor: '#FFFFFF', category: 'bank' },
  { id: 'union', name: 'Union Bank of India', color: '#004B87', initials: 'Union', textColor: '#FFFFFF', category: 'bank' },
  { id: 'indusind', name: 'IndusInd Bank', color: '#800000', initials: 'Indus', textColor: '#FFFFFF', category: 'bank' },
  { id: 'idfc', name: 'IDFC FIRST Bank', color: '#9E1B32', initials: 'IDFC', textColor: '#FFFFFF', category: 'bank' },
  { id: 'federal', name: 'Federal Bank', color: '#0054A6', initials: 'Fed', textColor: '#FFFFFF', category: 'bank' },
  { id: 'yesbank', name: 'Yes Bank', color: '#005EA6', initials: 'Yes', textColor: '#FFFFFF', category: 'bank' },
  { id: 'rbl', name: 'RBL Bank', color: '#0A2240', initials: 'RBL', textColor: '#FFFFFF', category: 'bank' },
  { id: 'aubank', name: 'AU Small Finance Bank', color: '#E31837', initials: 'AU', textColor: '#FFFFFF', category: 'bank' },
  { id: 'bandhan', name: 'Bandhan Bank', color: '#003366', initials: 'Bandh', textColor: '#FFFFFF', category: 'bank' },
  { id: 'idbi', name: 'IDBI Bank', color: '#006644', initials: 'IDBI', textColor: '#FFFFFF', category: 'bank' },
  { id: 'indianbank', name: 'Indian Bank', color: '#004080', initials: 'IndBnk', textColor: '#FFFFFF', category: 'bank' },
  { id: 'centralbank', name: 'Central Bank of India', color: '#002D62', initials: 'CBI', textColor: '#FFFFFF', category: 'bank' },
  { id: 'iob', name: 'Indian Overseas Bank', color: '#005696', initials: 'IOB', textColor: '#FFFFFF', category: 'bank' },
  { id: 'uco', name: 'UCO Bank', color: '#0055A5', initials: 'UCO', textColor: '#FFFFFF', category: 'bank' },
  { id: 'southindian', name: 'South Indian Bank', color: '#990000', initials: 'SIB', textColor: '#FFFFFF', category: 'bank' },
  { id: 'dbs', name: 'DBS Bank', color: '#D91C1C', initials: 'DBS', textColor: '#FFFFFF', category: 'bank' },
  { id: 'scb', name: 'Standard Chartered', color: '#009900', initials: 'StanC', textColor: '#FFFFFF', category: 'bank' },
  { id: 'hsbc', name: 'HSBC Bank', color: '#DB0011', initials: 'HSBC', textColor: '#FFFFFF', category: 'bank' },
  { id: 'citi', name: 'Citibank', color: '#003B70', initials: 'Citi', textColor: '#FFFFFF', category: 'bank' },
  { id: 'chase', name: 'Chase Bank', color: '#117ACA', initials: 'Chase', textColor: '#FFFFFF', category: 'bank' },
  { id: 'bofa', name: 'Bank of America', color: '#012169', initials: 'BofA', textColor: '#FFFFFF', category: 'bank' },

  // ─── Neo-banks & Digital Wallets ───
  { id: 'jupiter', name: 'Jupiter Money', color: '#FF6F61', initials: 'Jupi', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'fi', name: 'Fi Money', color: '#00D09C', initials: 'Fi', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'niyo', name: 'Niyo Global', color: '#0066FF', initials: 'Niyo', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'paytm', name: 'Paytm / Payments Bank', color: '#00B9F5', initials: 'Paytm', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'phonepe', name: 'PhonePe', color: '#5F259F', initials: 'PhnPe', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'gpay', name: 'Google Pay', color: '#4285F4', initials: 'GPay', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'amazonpay', name: 'Amazon Pay', color: '#FF9900', initials: 'AmzPay', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'cred', name: 'CRED', color: '#1C1C1E', initials: 'CRED', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'mobikwik', name: 'MobiKwik', color: '#008ECC', initials: 'Mobi', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'airtel', name: 'Airtel Payments Bank', color: '#ED1C24', initials: 'Airtel', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'jio', name: 'Jio Payments Bank', color: '#005CAB', initials: 'Jio', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'slice', name: 'Slice Card', color: '#6A1B9A', initials: 'Slice', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'onecard', name: 'OneCard', color: '#FF3366', initials: 'One', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'uni', name: 'Uni Card', color: '#00D26A', initials: 'Uni', textColor: '#FFFFFF', category: 'wallet' },

  // ─── Brokers & Investment Apps ───
  { id: 'zerodha', name: 'Zerodha (Kite)', color: '#387ED1', initials: 'Kite', textColor: '#FFFFFF', category: 'broker' },
  { id: 'groww', name: 'Groww', color: '#00D09C', initials: 'Groww', textColor: '#FFFFFF', category: 'broker' },
  { id: 'upstox', name: 'Upstox', color: '#3A2374', initials: 'Upstx', textColor: '#FFFFFF', category: 'broker' },
  { id: 'indmoney', name: 'INDmoney', color: '#00B55B', initials: 'IND', textColor: '#FFFFFF', category: 'broker' },
  { id: 'angelone', name: 'Angel One', color: '#FF6F00', initials: 'Angel', textColor: '#FFFFFF', category: 'broker' },
  { id: 'dhan', name: 'Dhan', color: '#5452F6', initials: 'Dhan', textColor: '#FFFFFF', category: 'broker' },
  { id: '5paisa', name: '5paisa', color: '#ED1C24', initials: '5Paisa', textColor: '#FFFFFF', category: 'broker' },
  { id: 'motilal', name: 'Motilal Oswal', color: '#E5A000', initials: 'MOSL', textColor: '#FFFFFF', category: 'broker' },
  { id: 'sharekhan', name: 'Sharekhan', color: '#FF6600', initials: 'Sher', textColor: '#FFFFFF', category: 'broker' },
  { id: 'paytmmoney', name: 'Paytm Money', color: '#002E6E', initials: 'PMoney', textColor: '#FFFFFF', category: 'broker' },
  { id: 'iifl', name: 'IIFL Securities', color: '#D2232A', initials: 'IIFL', textColor: '#FFFFFF', category: 'broker' },
  { id: 'kuvera', name: 'Kuvera', color: '#00C49F', initials: 'Kuvera', textColor: '#FFFFFF', category: 'broker' },
  { id: 'mirae', name: 'm.Stock (Mirae)', color: '#002B49', initials: 'mStock', textColor: '#FFFFFF', category: 'broker' },

  // ─── Government, Post & International ───
  { id: 'ippb', name: 'India Post / IPPB', color: '#D2232A', initials: 'Post', textColor: '#FFFFFF', category: 'govt' },
  { id: 'epfo', name: 'EPFO (Provident Fund)', color: '#004D40', initials: 'EPFO', textColor: '#FFFFFF', category: 'govt' },
  { id: 'ppf', name: 'Public Provident Fund', color: '#1A237E', initials: 'PPF', textColor: '#FFFFFF', category: 'govt' },
  { id: 'nps', name: 'NPS Pension', color: '#E65100', initials: 'NPS', textColor: '#FFFFFF', category: 'govt' },
  { id: 'paypal', name: 'PayPal', color: '#003087', initials: 'PayPal', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'wise', name: 'Wise', color: '#7EB932', initials: 'Wise', textColor: '#FFFFFF', category: 'wallet' },
  { id: 'revolut', name: 'Revolut', color: '#191C1F', initials: 'Revo', textColor: '#FFFFFF', category: 'wallet' },

  // ─── Generic / Custom Themed Badges ───
  { id: 'cash', name: 'Cash / Physical Wallet', color: '#34C759', initials: 'Cash', textColor: '#FFFFFF', category: 'custom' },
  { id: 'wallet', name: 'Digital Wallet', color: '#00C9A7', initials: 'Wallet', textColor: '#FFFFFF', category: 'custom' },
  { id: 'bank', name: 'Generic Bank', color: '#007AFF', initials: 'Bank', textColor: '#FFFFFF', category: 'custom' },
  { id: 'vault', name: 'Locker / Safe', color: '#5856D6', initials: 'Vault', textColor: '#FFFFFF', category: 'custom' },
  { id: 'piggy', name: 'Piggy Bank / Savings', color: '#FF2D55', initials: 'Save', textColor: '#FFFFFF', category: 'custom' },
  { id: 'gold', name: 'Gold & Bullion', color: '#D99B00', initials: 'Gold', textColor: '#FFFFFF', category: 'custom' },
  { id: 'salary', name: 'Salary Account', color: '#007AFF', initials: 'Salary', textColor: '#FFFFFF', category: 'custom' },
  { id: 'corp', name: 'Business / Corporate', color: '#1C3F94', initials: 'Corp', textColor: '#FFFFFF', category: 'custom' },
  { id: 'family', name: 'Joint / Family Pool', color: '#FF9500', initials: 'Joint', textColor: '#FFFFFF', category: 'custom' },
  { id: 'emerg', name: 'Emergency Fund', color: '#FF3B30', initials: 'Emerg', textColor: '#FFFFFF', category: 'custom' },
  { id: 'crypto', name: 'Web3 / Crypto', color: '#AF52DE', initials: 'Web3', textColor: '#FFFFFF', category: 'custom' },
];

const FALLBACK_PALETTE = [
  '#007AFF',
  '#00C9A7',
  '#AF52DE',
  '#FF9500',
  '#FF3B30',
  '#34C759',
  '#5856D6',
  '#FF2D55',
  '#5AC8FA',
  '#FFCC00',
];

export function getCustomInitials(text: string): string {
  if (!text) return 'BNK';
  const clean = text.replace(/^custom[:_]/i, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0] + (words[2] ? words[2][0] : '')).toUpperCase().slice(0, 4);
  }
  return clean.slice(0, 4).toUpperCase();
}

export function getCustomBrandColor(text: string): string {
  if (!text) return FALLBACK_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[index];
}

export function BankLogo({ logo, size = 32, style }: { logo: string; size?: number; style?: any }) {
  if (!logo) return null;

  const brand = BANK_BRANDS.find((b) => b.id.toLowerCase() === logo.toLowerCase());
  
  const initials = brand ? brand.initials : getCustomInitials(logo);
  const bgColor = brand ? brand.color : getCustomBrandColor(logo);
  const textColor = brand ? brand.textColor : '#FFFFFF';

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
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      <ThemedText
        type="bold"
        style={{
          color: textColor,
          fontSize,
          letterSpacing: -0.2,
          paddingHorizontal,
          fontFamily: 'Outfit_700Bold',
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {initials}
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

