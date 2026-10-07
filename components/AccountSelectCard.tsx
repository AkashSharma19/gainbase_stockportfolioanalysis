import React from 'react';
import { TouchableOpacity, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Account } from '@/types/money';
import { ThemedText } from '@/components/ThemedText';
import { AccountLogoOrIcon } from '@/components/AccountLogoOrIcon';
import { ChevronRight } from 'lucide-react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface AccountSelectCardProps {
  selectedAccount?: Account | null;
  onPress: () => void;
  label?: string;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function AccountSelectCard({
  selectedAccount,
  onPress,
  label = 'Select Account',
  placeholder = 'Select',
  style,
  disabled = false,
}: AccountSelectCardProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  return (
    <TouchableOpacity
      style={[
        styles.accountSelectorCard,
        {
          backgroundColor: currColors.card,
          borderColor: currColors.border,
          borderWidth: 1,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <ThemedText style={[styles.accountSelectLabel, { color: currColors.text }]}>
        {label}
      </ThemedText>

      <View style={styles.accountSelectedRight}>
        {selectedAccount ? (
          <View style={styles.accountBadgeRow}>
            <AccountLogoOrIcon account={selectedAccount} size={22} />
            <ThemedText
              style={[styles.accountSelectedName, { color: currColors.text }]}
              numberOfLines={1}
            >
              {selectedAccount.name}
            </ThemedText>
          </View>
        ) : (
          <ThemedText style={[styles.accountPlaceholder, { color: currColors.textSecondary }]}>
            {placeholder}
          </ThemedText>
        )}
        <ChevronRight size={18} color={currColors.textSecondary} style={{ marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  accountSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  accountSelectLabel: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  accountSelectedRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountSelectedName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    maxWidth: 140,
  },
  accountPlaceholder: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
});
