import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { X, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Account, AccountType } from '@/types/money';

const COLORS = [
  '#00C9A7', // Teal
  '#007AFF', // Blue
  '#AF52DE', // Purple
  '#FF9500', // Orange
  '#FF3B30', // Red
  '#34C759', // Green
  '#5AC8FA', // Light Blue
  '#FF2D55', // Pink
];

const TYPES: { type: AccountType; label: string; emoji: string }[] = [
  { type: 'wallet', label: 'Cash / Wallet', emoji: '💵' },
  { type: 'savings', label: 'Savings / Bank', emoji: '🏦' },
  { type: 'investment', label: 'Investment', emoji: '📈' },
  { type: 'credit_card', label: 'Credit Card', emoji: '💳' },
  { type: 'emergency_fund', label: 'Emergency Fund', emoji: '🛡️' },
];

export default function AddAccountScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { accounts, addAccount, updateAccount } = useMoneyStore();

  const editingAccount = useMemo(() => {
    return id ? accounts.find((acc) => acc.id === id) : null;
  }, [id, accounts]);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('wallet');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [institution, setInstitution] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setBalance(Math.abs(editingAccount.balance).toString());
      setCreditLimit(editingAccount.creditLimit ? editingAccount.creditLimit.toString() : '');
      setInstitution(editingAccount.institution || '');
      setAccountNumber(editingAccount.accountNumber || '');
      setColor(editingAccount.color);
    }
  }, [editingAccount]);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    handleHaptic();
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter an account name.');
      return;
    }

    const parsedBalance = parseFloat(balance);
    if (isNaN(parsedBalance) && !editingAccount) {
      Alert.alert('Invalid Balance', 'Please enter a valid numeric balance.');
      return;
    }

    // For credit cards, balance is negative (debt) or positive (credit)
    let finalBalance = parsedBalance || 0;
    if (type === 'credit_card') {
      finalBalance = -Math.abs(finalBalance); // credit card outstanding is negative balance
    }

    const parsedLimit = parseFloat(creditLimit);

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name: name.trim(),
        type,
        balance: type === 'credit_card' ? -Math.abs(parsedBalance || 0) : parsedBalance || 0,
        creditLimit: type === 'credit_card' ? (parsedLimit || 0) : undefined,
        institution: institution.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        color,
      });
    } else {
      const newAccount: Account = {
        id: Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        type,
        icon: type === 'wallet' ? 'Wallet' : type === 'savings' ? 'Landmark' : type === 'investment' ? 'Activity' : 'CreditCard',
        balance: finalBalance,
        creditLimit: type === 'credit_card' ? (parsedLimit || 0) : undefined,
        institution: institution.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        color,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addAccount(newAccount);
    }

    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: currColors.cardSecondary }]}
            onPress={() => router.back()}
          >
            <X size={20} color={currColors.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
            {editingAccount ? 'Edit Account' : 'Add Account'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#00C9A7' }]}
            onPress={handleSave}
          >
            <Check size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Account Name */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>ACCOUNT NAME</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
              placeholder="e.g. Cash Wallet, SBI Savings"
              placeholderTextColor={currColors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Account Type Selector */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>ACCOUNT TYPE</ThemedText>
            <View style={styles.typeSelector}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.type}
                  style={[
                    styles.typeOption,
                    { backgroundColor: currColors.card, borderColor: currColors.border },
                    type === t.type && { borderColor: color, backgroundColor: `${color}1A` },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setType(t.type);
                    if (t.type === 'credit_card' && color === COLORS[0]) {
                      setColor(COLORS[3]); // default CC to orange color
                    } else if (t.type === 'emergency_fund' && color === COLORS[0]) {
                      setColor('#FF2D55'); // default EF to pink/rose color
                    }
                  }}
                >
                  <ThemedText style={{ fontSize: 18, marginBottom: 4 }}>{t.emoji}</ThemedText>
                  <ThemedText
                    style={[
                      styles.typeLabel,
                      { color: type === t.type ? color : currColors.textSecondary },
                    ]}
                  >
                    {t.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Balance Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>
              {type === 'credit_card' ? 'CURRENT OUTSTANDING AMOUNT' : 'CURRENT BALANCE'}
            </ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
              placeholder="0.00"
              placeholderTextColor={currColors.textSecondary}
              keyboardType="numeric"
              value={balance}
              onChangeText={setBalance}
            />
          </View>

          {/* Credit Limit (Credit Card Only) */}
          {type === 'credit_card' ? (
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>TOTAL CREDIT LIMIT</ThemedText>
              <TextInput
                style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
                placeholder="0.00"
                placeholderTextColor={currColors.textSecondary}
                keyboardType="numeric"
                value={creditLimit}
                onChangeText={setCreditLimit}
              />
            </View>
          ) : null}

          {/* Bank / Institution */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>INSTITUTION / BANK NAME (OPTIONAL)</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
              placeholder="e.g. SBI, HDFC, Upstox"
              placeholderTextColor={currColors.textSecondary}
              value={institution}
              onChangeText={setInstitution}
            />
          </View>

          {/* Account Number Last 4 digits */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>ACCOUNT NO. / LAST 4 DIGITS (OPTIONAL)</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
              placeholder="e.g. 1234"
              placeholderTextColor={currColors.textSecondary}
              keyboardType="numeric"
              maxLength={4}
              value={accountNumber}
              onChangeText={setAccountNumber}
            />
          </View>

          {/* Color Palette */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>THEME COLOR</ThemedText>
            <View style={styles.colorPalette}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    color === c && { borderColor: currColors.text, borderWidth: 3 },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setColor(c);
                  }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  inputGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeOption: {
    width: '48%',
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
