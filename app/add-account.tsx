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
  Modal,
  FlatList,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { X, Check, ChevronDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Account, AccountType } from '@/types/money';
import { BANK_BRANDS } from '@/components/BankLogo';

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
  { type: 'receivable', label: 'Accounts Receivable', emoji: '📥' },
  { type: 'payable', label: 'Accounts Payable', emoji: '📤' },
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
  const [logo, setLogo] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [isLogoManuallySelected, setIsLogoManuallySelected] = useState(false);
  const [includeInAssets, setIncludeInAssets] = useState(true);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const selectedTypeObj = useMemo(() => {
    return TYPES.find((t) => t.type === type);
  }, [type]);

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setBalance(Math.abs(editingAccount.balance).toString());
      setCreditLimit(editingAccount.creditLimit ? editingAccount.creditLimit.toString() : '');
      setInstitution(editingAccount.institution || '');
      setLogo(editingAccount.logo || '');
      setAccountNumber(editingAccount.accountNumber || '');
      setColor(editingAccount.color);
      setIncludeInAssets(editingAccount.includeInAssets !== false);
    }
  }, [editingAccount]);

  const checkBrandMatch = (inputText: string, otherFieldText: string) => {
    if (editingAccount || isLogoManuallySelected) return;
    const lowerText = (inputText + ' ' + otherFieldText).toLowerCase();
    const matchedBrand = BANK_BRANDS.find(brand => {
      return lowerText.includes(brand.id) || 
             lowerText.includes(brand.initials.toLowerCase()) || 
             lowerText.includes(brand.name.toLowerCase());
    });
    if (matchedBrand) {
      setLogo(matchedBrand.id);
      setColor(matchedBrand.color);
    }
  };

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
    if (type === 'credit_card' || type === 'payable') {
      finalBalance = -Math.abs(finalBalance); // credit card / payable outstanding is negative balance
    } else {
      finalBalance = Math.abs(finalBalance);
    }

    const parsedLimit = parseFloat(creditLimit);

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name: name.trim(),
        type,
        balance: finalBalance,
        creditLimit: type === 'credit_card' ? (parsedLimit || 0) : undefined,
        institution: institution.trim() || undefined,
        logo: logo || undefined,
        accountNumber: accountNumber.trim() || undefined,
        color,
        includeInAssets,
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
        logo: logo || undefined,
        accountNumber: accountNumber.trim() || undefined,
        color,
        includeInAssets,
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
              onChangeText={(val) => {
                setName(val);
                checkBrandMatch(val, institution);
              }}
            />
          </View>

          {/* Account Type Selector (Dropdown modal) */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>ACCOUNT TYPE</ThemedText>
            <TouchableOpacity
              style={[styles.selectBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}
              onPress={() => {
                handleHaptic();
                setShowTypeModal(true);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ThemedText style={{ fontSize: 16, marginRight: 8 }}>{selectedTypeObj?.emoji}</ThemedText>
                <ThemedText style={{ color: currColors.text, fontSize: 15, fontFamily: 'Outfit_500Medium' }}>
                  {selectedTypeObj?.label || 'Select Account Type'}
                </ThemedText>
              </View>
              <ChevronDown size={18} color={currColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Include in Assets Toggle Switch */}
          <View style={[styles.inputGroup, styles.toggleContainer, { backgroundColor: currColors.card, borderColor: currColors.border, borderWidth: 1, borderRadius: 12, padding: 16 }]}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary, marginBottom: 4 }]}>INCLUDE IN ASSETS</ThemedText>
              <ThemedText style={{ color: currColors.textSecondary, fontSize: 11, fontFamily: 'Outfit_400Regular', lineHeight: 15 }}>
                If enabled, this account's balance will be counted towards net worth and asset stats.
              </ThemedText>
            </View>
            <Switch
              value={includeInAssets}
              onValueChange={(val) => {
                handleHaptic();
                setIncludeInAssets(val);
              }}
              trackColor={{ false: colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA', true: '#00C9A7' }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : includeInAssets ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          {/* Account Logo Selector */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>ACCOUNT LOGO / BRAND (OPTIONAL)</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bankBrandsScroll}>
              <TouchableOpacity
                style={[
                  styles.bankBrandOption,
                  { backgroundColor: currColors.card, borderColor: currColors.border },
                  !logo && { borderColor: '#00C9A7', backgroundColor: '#00C9A710' }
                ]}
                onPress={() => {
                  handleHaptic();
                  setLogo('');
                  setIsLogoManuallySelected(true);
                }}
              >
                <ThemedText style={[styles.bankBrandInitials, { color: currColors.textSecondary }]}>None</ThemedText>
              </TouchableOpacity>
              {BANK_BRANDS.map((brand) => (
                <TouchableOpacity
                  key={brand.id}
                  style={[
                    styles.bankBrandOption,
                    { backgroundColor: currColors.card, borderColor: currColors.border },
                    logo === brand.id && { borderColor: brand.color, backgroundColor: `${brand.color}15` }
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setLogo(brand.id);
                    setColor(brand.color);
                    setInstitution(brand.name);
                    setIsLogoManuallySelected(true);
                    if (!name.trim()) {
                      setName(brand.initials + ' Account');
                    }
                  }}
                >
                  <View style={[styles.bankBrandBadge, { backgroundColor: brand.color }]}>
                    <ThemedText style={styles.bankBrandBadgeText}>{brand.initials}</ThemedText>
                  </View>
                  <ThemedText style={[styles.bankBrandLabel, { color: currColors.text }]} numberOfLines={1}>
                    {brand.initials}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
              onChangeText={(val) => {
                setInstitution(val);
                checkBrandMatch(val, name);
              }}
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

      {/* Account Type Selection Modal Bottom Sheet */}
      <Modal visible={showTypeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowTypeModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <View style={styles.modalDragHandle} />
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Select Account Type</ThemedText>
              <TouchableOpacity onPress={() => setShowTypeModal(false)} style={styles.modalCloseIcon}>
                <X size={20} color={currColors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TYPES}
              keyExtractor={(item) => item.type}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    handleHaptic();
                    setType(item.type);
                    setShowTypeModal(false);
                    if (item.type === 'credit_card' && color === COLORS[0]) {
                      setColor(COLORS[3]);
                    } else if (item.type === 'emergency_fund' && color === COLORS[0]) {
                      setColor('#FF2D55');
                    } else if (item.type === 'receivable' && color === COLORS[0]) {
                      setColor('#34C759');
                    } else if (item.type === 'payable' && color === COLORS[0]) {
                      setColor('#FF3B30');
                    }
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <ThemedText style={{ fontSize: 18, marginRight: 12 }}>{item.emoji}</ThemedText>
                    <ThemedText type="semiBold" style={{ color: currColors.text, fontSize: 15 }}>{item.label}</ThemedText>
                  </View>
                  {type === item.type && <Check size={18} color="#00C9A7" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
    fontSize: 17,
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
    marginBottom: 24,
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
  selectBox: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  bankBrandsScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  bankBrandOption: {
    width: 76,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  bankBrandInitials: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  bankBrandBadge: {
    width: 48,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  bankBrandBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
  },
  bankBrandLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '65%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(142, 142, 147, 0.3)',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalCloseIcon: {
    padding: 4,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
});
