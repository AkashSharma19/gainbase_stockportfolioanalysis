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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { X, Check, ChevronDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Loan } from '@/types/money';

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#8E8E93'];

const TYPES: { type: Loan['type']; label: string; emoji: string }[] = [
  { type: 'home', label: 'Home Loan', emoji: '🏠' },
  { type: 'car', label: 'Car Loan', emoji: '🚗' },
  { type: 'personal', label: 'Personal Loan', emoji: '💰' },
  { type: 'education', label: 'Education Loan', emoji: '🎓' },
  { type: 'other', label: 'Other Loan', emoji: '🏦' },
];

export default function AddLoanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { loans, accounts, addLoan, updateLoan } = useMoneyStore();

  const editingLoan = useMemo(() => {
    return id ? loans.find((l) => l.id === id) : null;
  }, [id, loans]);

  // Form State
  const [name, setName] = useState('');
  const [lenderName, setLenderName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [outstandingAmount, setOutstandingAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [type, setType] = useState<Loan['type']>('home');
  const [customEmi, setCustomEmi] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    if (editingLoan) {
      setName(editingLoan.name);
      setLenderName(editingLoan.lenderName);
      setPrincipalAmount(editingLoan.principalAmount.toString());
      setOutstandingAmount(editingLoan.outstandingAmount.toString());
      setInterestRate(editingLoan.interestRate.toString());
      setTenureMonths(editingLoan.tenureMonths.toString());
      setStartDate(new Date(editingLoan.startDate));
      setLinkedAccountId(editingLoan.linkedAccountId || '');
      setType(editingLoan.type);
      setCustomEmi(editingLoan.emiAmount.toString());
    } else {
      // Default linked account
      const activeAccounts = accounts.filter(a => !a.isArchived);
      if (activeAccounts.length > 0) {
        setLinkedAccountId(activeAccounts[0].id);
      }
    }
  }, [editingLoan]);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Auto calculate EMI using standard formula: P * r * (1+r)^n / ((1+r)^n - 1)
  const calculatedEMI = useMemo(() => {
    const P = parseFloat(principalAmount);
    const annualRate = parseFloat(interestRate);
    const N = parseInt(tenureMonths);

    if (isNaN(P) || isNaN(annualRate) || isNaN(N) || P <= 0 || annualRate < 0 || N <= 0) {
      return 0;
    }

    if (annualRate === 0) {
      return P / N;
    }

    const r = (annualRate / 12) / 100; // monthly rate fraction
    const emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
    return isFinite(emi) ? emi : 0;
  }, [principalAmount, interestRate, tenureMonths]);

  const handleSave = () => {
    handleHaptic();
    if (!name.trim() || !lenderName.trim()) {
      Alert.alert('Required Fields', 'Please enter a loan name and lender name.');
      return;
    }

    const P = parseFloat(principalAmount);
    const R = parseFloat(interestRate);
    const N = parseInt(tenureMonths);

    if (isNaN(P) || isNaN(R) || isNaN(N) || P <= 0 || R < 0 || N <= 0) {
      Alert.alert('Required Fields', 'Please enter valid positive numbers for principal and tenure, and non-negative interest rate.');
      return;
    }

    const outstanding = parseFloat(outstandingAmount) || P;
    
    // Determine EMI amount (either calculated or custom override)
    const emiOverride = parseFloat(customEmi);
    const finalEMI = isNaN(emiOverride) ? calculatedEMI : emiOverride;

    if (finalEMI <= 0) {
      Alert.alert('Required Field', 'Please enter a valid EMI amount.');
      return;
    }

    // Calculate end date
    const end = new Date(startDate);
    end.setMonth(end.getMonth() + N);

    const loanData: Loan = {
      id: editingLoan ? editingLoan.id : Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      lenderName: lenderName.trim(),
      principalAmount: P,
      outstandingAmount: outstanding,
      interestRate: R,
      emiAmount: finalEMI,
      tenureMonths: N,
      startDate: startDate.toISOString(),
      endDate: end.toISOString(),
      linkedAccountId: linkedAccountId || undefined,
      type,
      isActive: outstanding > 0,
    };

    if (editingLoan) {
      updateLoan(editingLoan.id, loanData);
    } else {
      addLoan(loanData);
    }

    router.back();
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => !a.isArchived);
  }, [accounts]);

  const selectedAccount = accounts.find((a) => a.id === linkedAccountId);

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
            {editingLoan ? 'Edit Loan' : 'Add Loan'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#00C9A7' }]}
            onPress={handleSave}
          >
            <Check size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Loan Name */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>LOAN NAME</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
              placeholder="e.g. Home Loan, Car Loan"
              placeholderTextColor={currColors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Lender Name */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>LENDER NAME</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
              placeholder="e.g. HDFC Bank, SBI"
              placeholderTextColor={currColors.textSecondary}
              value={lenderName}
              onChangeText={setLenderName}
            />
          </View>

          {/* Loan Type Selector */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>LOAN TYPE</ThemedText>
            <View style={styles.typeSelector}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.type}
                  style={[
                    styles.typeOption,
                    { backgroundColor: currColors.card, borderColor: currColors.border },
                    type === t.type && { borderColor: COLORS[0], backgroundColor: `${COLORS[0]}1A` },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setType(t.type);
                  }}
                >
                  <ThemedText style={{ fontSize: 18, marginBottom: 4 }}>{t.emoji}</ThemedText>
                  <ThemedText
                    style={[
                      styles.typeLabel,
                      { color: type === t.type ? COLORS[0] : currColors.textSecondary },
                    ]}
                  >
                    {t.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Principal & Outstanding */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>PRINCIPAL AMOUNT</ThemedText>
              <TextInput
                style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
                placeholder="0.00"
                placeholderTextColor={currColors.textSecondary}
                keyboardType="numeric"
                value={principalAmount}
                onChangeText={setPrincipalAmount}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>OUTSTANDING AMOUNT</ThemedText>
              <TextInput
                style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
                placeholder={principalAmount || '0.00'}
                placeholderTextColor={currColors.textSecondary}
                keyboardType="numeric"
                value={outstandingAmount}
                onChangeText={setOutstandingAmount}
              />
            </View>
          </View>

          {/* Interest & Tenure */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>ANNUAL INTEREST (%)</ThemedText>
              <TextInput
                style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
                placeholder="8.5"
                placeholderTextColor={currColors.textSecondary}
                keyboardType="numeric"
                value={interestRate}
                onChangeText={setInterestRate}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>TENURE (MONTHS)</ThemedText>
              <TextInput
                style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
                placeholder="120"
                placeholderTextColor={currColors.textSecondary}
                keyboardType="numeric"
                value={tenureMonths}
                onChangeText={setTenureMonths}
              />
            </View>
          </View>

          {/* EMI Indicator and Override */}
          <View style={styles.emiHighlightCard}>
            <View>
              <ThemedText style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'Outfit_500Medium', letterSpacing: 0.5 }}>
                CALCULATED MONTHLY EMI
              </ThemedText>
              <ThemedText style={{ fontSize: 24, fontFamily: 'Outfit_600SemiBold', color: '#FFFFFF', marginTop: 4 }}>
                ₹{calculatedEMI.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </ThemedText>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <ThemedText style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'Outfit_500Medium', letterSpacing: 0.5 }}>
                MANUAL EMI OVERRIDE (OPTIONAL)
              </ThemedText>
              <TextInput
                style={[styles.miniInput]}
                placeholder="Override EMI"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
                value={customEmi}
                onChangeText={setCustomEmi}
              />
            </View>
          </View>

          {/* Start Date */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>LOAN START DATE</ThemedText>
            {Platform.OS === 'ios' ? (
              <View style={styles.iosDatePickerContainer}>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  themeVariant={colorScheme}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.selectBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText style={{ color: currColors.text, fontSize: 16 }}>
                  {startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </ThemedText>
              </TouchableOpacity>
            )}
            {showDatePicker && Platform.OS !== 'ios' && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </View>

          {/* Linked Account */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>DEBIT ACCOUNT FOR EMI (OPTIONAL)</ThemedText>
            <TouchableOpacity
              style={[styles.selectBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}
              onPress={() => {
                handleHaptic();
                setShowAccountModal(true);
              }}
            >
              <ThemedText style={{ color: selectedAccount ? currColors.text : currColors.textSecondary, fontSize: 16 }}>
                {selectedAccount ? selectedAccount.name : 'Select Linked Account'}
              </ThemedText>
              <ChevronDown size={18} color={currColors.textSecondary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Account Selection Modal */}
      <Modal visible={showAccountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currColors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Select Account</ThemedText>
              <TouchableOpacity onPress={() => setShowAccountModal(false)}>
                <X size={22} color={currColors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={activeAccounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    setLinkedAccountId(item.id);
                    setShowAccountModal(false);
                  }}
                >
                  <ThemedText style={{ color: currColors.text, fontSize: 16 }}>{item.name}</ThemedText>
                  <ThemedText style={{ color: currColors.textSecondary, fontSize: 12 }}>
                    {item.balance.toLocaleString('en-IN')}
                  </ThemedText>
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
    marginBottom: 22,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeOption: {
    width: '31%',
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  typeLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
  },
  emiHighlightCard: {
    backgroundColor: '#00C9A7',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  miniInput: {
    height: 40,
    borderColor: 'rgba(255,255,255,0.4)',
    borderBottomWidth: 1.5,
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Outfit_600SemiBold',
    paddingHorizontal: 4,
  },
  iosDatePickerContainer: {
    alignItems: 'flex-start',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
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
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
});
