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
import { StatusBar } from 'expo-status-bar';
import {
  ChevronRight,
  X,
  Check,
  Home,
  Car,
  User,
  GraduationCap,
  Landmark,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Loan, Account } from '@/types/money';
import { BankLogo } from '@/components/BankLogo';
import { formatCurrencyINR, formatIndianAmount, parseIndianAmount } from '@/utils/formatters';

const LOAN_TYPES = [
  { type: 'home', label: 'Home Loan', icon: Home, color: '#007AFF' },
  { type: 'car', label: 'Car Loan', icon: Car, color: '#34C759' },
  { type: 'personal', label: 'Personal Loan', icon: User, color: '#FF9500' },
  { type: 'education', label: 'Education Loan', icon: GraduationCap, color: '#AF52DE' },
  { type: 'other', label: 'Other Loan', icon: Landmark, color: '#8E8E93' },
] as const;

function AccountLogoOrInitials({ account, size = 24 }: { account: Account; size?: number }) {
  if (account.logo) {
    return <BankLogo logo={account.logo} size={size} style={{ marginRight: 8 }} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#00C9A720',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
      }}
    >
      <ThemedText style={{ fontSize: size * 0.45, color: '#00C9A7', fontWeight: '700' }}>
        {account.name.charAt(0).toUpperCase()}
      </ThemedText>
    </View>
  );
}

export default function AddLoanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { loans, accounts, addLoan, updateLoan, emiPayments } = useMoneyStore();

  const editingLoan = useMemo(() => {
    return id ? loans.find((l) => String(l.id) === String(id)) : null;
  }, [id, loans]);

  // Form State
  const [name, setName] = useState('');
  const [lenderName, setLenderName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [outstandingAmount, setOutstandingAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [paidEmis, setPaidEmis] = useState('0');
  const [startDate, setStartDate] = useState(new Date());
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [type, setType] = useState<Loan['type']>('home');
  const [customEmi, setCustomEmi] = useState('');

  // Modal State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const selectedTypeObj = useMemo(() => {
    return LOAN_TYPES.find((t) => t.type === type) || LOAN_TYPES[0];
  }, [type]);

  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => !a.isArchived);
  }, [accounts]);

  const linkedAccount = useMemo(() => {
    return accounts.find((a) => a.id === linkedAccountId);
  }, [accounts, linkedAccountId]);

  useEffect(() => {
    if (editingLoan) {
      setName(editingLoan.name);
      setLenderName(editingLoan.lenderName);
      setPrincipalAmount(formatIndianAmount(editingLoan.principalAmount.toString()));
      setOutstandingAmount(formatIndianAmount(editingLoan.outstandingAmount.toString()));
      setInterestRate(editingLoan.interestRate.toString());
      setTenureMonths(editingLoan.tenureMonths.toString());
      setStartDate(new Date(editingLoan.startDate));
      setLinkedAccountId(editingLoan.linkedAccountId || '');
      setType(editingLoan.type);
      setCustomEmi(editingLoan.emiAmount ? formatIndianAmount(editingLoan.emiAmount.toString()) : '');

      const existingPaid = emiPayments.filter(
        (p) => p.loanId === editingLoan.id && p.status === 'paid'
      ).length;
      if (existingPaid > 0) {
        setPaidEmis(existingPaid.toString());
      }
    } else if (activeAccounts.length > 0) {
      setLinkedAccountId(activeAccounts[0].id);
    }
  }, [editingLoan]);

  // Standard amortization EMI calculation
  const calculatedEMI = useMemo(() => {
    const P = parseIndianAmount(principalAmount);
    const annualRate = parseFloat(interestRate);
    const N = parseInt(tenureMonths, 10);

    if (isNaN(P) || isNaN(annualRate) || isNaN(N) || P <= 0 || annualRate < 0 || N <= 0) {
      return 0;
    }

    if (annualRate === 0) {
      return P / N;
    }

    const r = annualRate / 12 / 100;
    const emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
    return isFinite(emi) ? emi : 0;
  }, [principalAmount, interestRate, tenureMonths]);

  // Auto amortize paid EMIs for remaining principal balance
  useEffect(() => {
    if (editingLoan) return;
    const P = parseIndianAmount(principalAmount);
    const annualRate = parseFloat(interestRate);
    const N = parseInt(tenureMonths, 10);
    const k = parseInt(paidEmis, 10) || 0;
    const emiVal = customEmi && !isNaN(parseIndianAmount(customEmi)) ? parseIndianAmount(customEmi) : calculatedEMI;

    if (P > 0 && N > 0 && emiVal > 0) {
      const r = (annualRate || 0) / 12 / 100;
      let bal = P;
      for (let i = 0; i < k && i < N; i++) {
        const intPmt = bal * r;
        const princPmt = Math.max(0, emiVal - intPmt);
        bal = Math.max(0, bal - princPmt);
      }
      setOutstandingAmount(formatIndianAmount(Math.round(bal).toString()));
    }
  }, [principalAmount, interestRate, tenureMonths, paidEmis, customEmi, calculatedEMI, editingLoan]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a loan name.');
      return;
    }

    const P = parseIndianAmount(principalAmount);
    if (isNaN(P) || P <= 0) {
      Alert.alert('Required Field', 'Please enter a valid principal amount.');
      return;
    }

    const rate = parseFloat(interestRate);
    if (isNaN(rate) || rate < 0) {
      Alert.alert('Required Field', 'Please enter a valid interest rate.');
      return;
    }

    const N = parseInt(tenureMonths, 10);
    if (isNaN(N) || N <= 0) {
      Alert.alert('Required Field', 'Please enter loan tenure in months.');
      return;
    }

    const finalEmi = customEmi && !isNaN(parseIndianAmount(customEmi)) ? parseIndianAmount(customEmi) : Math.round(calculatedEMI);
    if (isNaN(finalEmi) || finalEmi <= 0) {
      Alert.alert('Required Field', 'Please specify a valid EMI amount.');
      return;
    }

    const outstanding = outstandingAmount && !isNaN(parseIndianAmount(outstandingAmount))
      ? parseIndianAmount(outstandingAmount)
      : P;

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + N);

    const loanData: Loan = {
      id: editingLoan ? editingLoan.id : Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      lenderName: lenderName.trim() || 'Lender',
      principalAmount: P,
      outstandingAmount: outstanding,
      interestRate: rate,
      tenureMonths: N,
      emiAmount: finalEmi,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      linkedAccountId: linkedAccountId || undefined,
      type,
      isActive: outstanding > 0,
      updatedAt: new Date().toISOString(),
    };

    if (editingLoan) {
      updateLoan(editingLoan.id, loanData);
    } else {
      addLoan(loanData);
    }

    router.back();
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: currColors.background }]}>
      <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]} edges={['top']}>
        {/* iOS Clean Header */}
        <View style={[styles.header, { backgroundColor: currColors.background, borderBottomColor: currColors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <ThemedText style={[styles.headerButtonText, { color: currColors.tint }]}>
              Cancel
            </ThemedText>
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
            {editingLoan ? 'Edit Loan & EMI' : 'Add Loan & EMI'}
          </ThemedText>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <ThemedText style={[styles.headerButtonText, styles.saveButtonText, { color: currColors.tint }]}>
              Save
            </ThemedText>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* GROUP 1: LOAN DETAILS */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              LOAN DETAILS
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {/* Name Row */}
              <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Loan Name</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="e.g. HDFC Home Loan, Car Loan"
                  placeholderTextColor={currColors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                />
              </View>

              {/* Loan Type Row */}
              <TouchableOpacity
                style={[styles.formRow, { borderBottomColor: currColors.border }]}
                onPress={() => setShowTypeModal(true)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.label, { color: currColors.text }]}>Category</ThemedText>
                <View style={styles.valueContainer}>
                  {(() => {
                    const IconComp = selectedTypeObj.icon;
                    return (
                      <View style={styles.typeBadge}>
                        <View style={[styles.typeIconWrap, { backgroundColor: `${selectedTypeObj.color}15` }]}>
                          <IconComp size={15} color={selectedTypeObj.color} />
                        </View>
                        <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                          {selectedTypeObj.label}
                        </ThemedText>
                      </View>
                    );
                  })()}
                  <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 6 }} />
                </View>
              </TouchableOpacity>

              {/* Lender Name Row */}
              <View style={[styles.formRow, styles.formRowLast]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Lender / Bank</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="e.g. SBI, HDFC, Axis"
                  placeholderTextColor={currColors.textSecondary}
                  value={lenderName}
                  onChangeText={setLenderName}
                  textAlign="right"
                />
              </View>
            </View>

            {/* GROUP 2: FINANCIAL TERMS */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              FINANCIAL TERMS
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {/* Principal Amount Row */}
              <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Principal Amount</ThemedText>
                <View style={styles.amountInputRow}>
                  <ThemedText style={[styles.currencyPrefix, { color: currColors.text }]}>₹</ThemedText>
                  <TextInput
                    style={[styles.input, { color: currColors.text }]}
                    placeholder="0"
                    placeholderTextColor={currColors.textSecondary}
                    value={principalAmount}
                    onChangeText={(val) => {
                      const formatted = formatIndianAmount(val);
                      setPrincipalAmount(formatted);
                      if (!paidEmis || paidEmis === '0') {
                        setOutstandingAmount(formatted);
                      }
                    }}
                    keyboardType="decimal-pad"
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Interest Rate Row */}
              <View style={[styles.formRow, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Annual Interest (%)</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="8.5"
                  placeholderTextColor={currColors.textSecondary}
                  value={interestRate}
                  onChangeText={setInterestRate}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>

              {/* Tenure Months Row */}
              <View style={[styles.formRow, styles.formRowLast]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Tenure (Months)</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="240 (20 Years)"
                  placeholderTextColor={currColors.textSecondary}
                  value={tenureMonths}
                  onChangeText={setTenureMonths}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
            </View>

            {/* GROUP 3: REPAYMENT & RECURRENCE */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              REPAYMENT & SCHEDULE
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {/* EMI Amount Row */}
              <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
                <View>
                  <ThemedText style={[styles.label, { color: currColors.text }]}>Monthly EMI</ThemedText>
                  {calculatedEMI > 0 && (
                    <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginTop: 1, fontFamily: 'Outfit_400Regular' }}>
                      Standard: {formatCurrencyINR(Math.round(calculatedEMI), true, 0)}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.amountInputRow}>
                  <ThemedText style={[styles.currencyPrefix, { color: currColors.text }]}>₹</ThemedText>
                  <TextInput
                    style={[styles.input, { color: currColors.text }]}
                    placeholder={calculatedEMI > 0 ? formatIndianAmount(Math.round(calculatedEMI).toString()) : '0'}
                    placeholderTextColor={currColors.textSecondary}
                    value={customEmi}
                    onChangeText={(val) => setCustomEmi(formatIndianAmount(val))}
                    keyboardType="decimal-pad"
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Start Date Row */}
              <View style={[styles.formRow, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Start Date</ThemedText>
                <View style={{ flex: 1 }}>
                  {Platform.OS === 'ios' ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        themeVariant={colorScheme}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ alignItems: 'flex-end' }}>
                      <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                        {startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {showDatePicker && Platform.OS !== 'ios' && (
                <DateTimePicker value={startDate} mode="date" display="default" onChange={onDateChange} />
              )}

              {/* Linked Payment Account Row */}
              <TouchableOpacity
                style={[styles.formRow, styles.formRowLast]}
                onPress={() => setShowAccountModal(true)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.label, { color: currColors.text }]}>Debit Account</ThemedText>
                <View style={styles.valueContainer}>
                  {linkedAccount ? (
                    <View style={styles.accountBadge}>
                      <AccountLogoOrInitials account={linkedAccount} size={20} />
                      <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                        {linkedAccount.name}
                      </ThemedText>
                    </View>
                  ) : (
                    <ThemedText style={[styles.valueText, styles.placeholderText, { color: currColors.textSecondary }]}>
                      Select Account
                    </ThemedText>
                  )}
                  <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 6 }} />
                </View>
              </TouchableOpacity>
            </View>

            {/* GROUP 4: PROGRESS & OUTSTANDING */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              PROGRESS & OUTSTANDING
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {/* EMIs Paid Count Row */}
              <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>EMIs Already Paid</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="0"
                  placeholderTextColor={currColors.textSecondary}
                  value={paidEmis}
                  onChangeText={setPaidEmis}
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>

              {/* Outstanding Principal Row */}
              <View style={[styles.formRow, styles.formRowLast]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Current Outstanding</ThemedText>
                <View style={styles.amountInputRow}>
                  <ThemedText style={[styles.currencyPrefix, { color: currColors.text }]}>₹</ThemedText>
                  <TextInput
                    style={[styles.input, { color: currColors.text }]}
                    placeholder="0"
                    placeholderTextColor={currColors.textSecondary}
                    value={outstandingAmount}
                    onChangeText={(val) => setOutstandingAmount(formatIndianAmount(val))}
                    keyboardType="decimal-pad"
                    textAlign="right"
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* LOAN CATEGORY MODAL */}
      <Modal visible={showTypeModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Loan Category</ThemedText>
            <TouchableOpacity onPress={() => setShowTypeModal(false)} style={styles.modalCloseButton}>
              <X size={20} color={currColors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={LOAN_TYPES}
            keyExtractor={(item) => item.type}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = type === item.type;
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    setType(item.type);
                    setShowTypeModal(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: `${item.color}15`,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}
                    >
                      <IconComp size={18} color={item.color} />
                    </View>
                    <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>{item.label}</ThemedText>
                  </View>
                  {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* ACCOUNT SELECTION MODAL */}
      <Modal visible={showAccountModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Select Debit Account</ThemedText>
            <TouchableOpacity onPress={() => setShowAccountModal(false)} style={styles.modalCloseButton}>
              <X size={20} color={currColors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={activeAccounts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = linkedAccountId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    setLinkedAccountId(item.id);
                    setShowAccountModal(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <AccountLogoOrInitials account={item} size={32} />
                    <View style={{ flex: 1, marginLeft: 4 }}>
                      <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>{item.name}</ThemedText>
                      <ThemedText style={[styles.itemSubtitle, { color: currColors.textSecondary }]}>
                        Balance: {formatCurrencyINR(item.balance, true, 0)}
                      </ThemedText>
                    </View>
                  </View>
                  {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  headerButtonText: {
    fontSize: 17,
    fontFamily: 'Outfit_400Regular',
  },
  cancelButton: {
    padding: 4,
  },
  saveButton: {
    padding: 4,
  },
  saveButtonText: {
    fontFamily: 'Outfit_600SemiBold',
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 40,
  },
  groupLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 12,
  },
  formGroup: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    minHeight: 48,
  },
  formRowFirst: {},
  formRowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  placeholderText: {
    opacity: 0.6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  currencyPrefix: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    fontFamily: 'Outfit_400Regular',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalCloseButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 30,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
  },
  itemSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
});
