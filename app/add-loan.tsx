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
import { X, Check, ChevronDown, Home, Car, User, GraduationCap, Landmark, Wallet, Activity, CreditCard, PiggyBank, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Loan, AccountType, EMIPayment } from '@/types/money';
import { BankLogo } from '@/components/BankLogo';

const ACCOUNT_TYPE_ICONS: Record<AccountType, { icon: any; color: string }> = {
  wallet: { icon: Wallet, color: '#00C9A7' },
  savings: { icon: Landmark, color: '#007AFF' },
  investment: { icon: Activity, color: '#AF52DE' },
  credit_card: { icon: CreditCard, color: '#FF9500' },
  emergency_fund: { icon: PiggyBank, color: '#FF2D55' },
  receivable: { icon: ArrowDownLeft, color: '#34C759' },
  payable: { icon: ArrowUpRight, color: '#FF3B30' },
};

function AccountIcon({ account, size = 24 }: { account: { logo?: string; type: AccountType }; size?: number }) {
  if (account.logo) {
    return <BankLogo logo={account.logo} size={size} style={{ marginRight: 12 }} />;
  }
  const config = ACCOUNT_TYPE_ICONS[account.type] || ACCOUNT_TYPE_ICONS.wallet;
  const IconComp = config.icon;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${config.color}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
      <IconComp size={size * 0.6} color={config.color} />
    </View>
  );
}

const TYPES = [
  { type: 'home', label: 'Home Loan', icon: Home, color: '#007AFF' },
  { type: 'car', label: 'Car Loan', icon: Car, color: '#34C759' },
  { type: 'personal', label: 'Personal Loan', icon: User, color: '#FF9500' },
  { type: 'education', label: 'Education Loan', icon: GraduationCap, color: '#AF52DE' },
  { type: 'other', label: 'Other Loan', icon: Landmark, color: '#8E8E93' },
] as const;

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
  const [paidEmis, setPaidEmis] = useState('0');
  const [startDate, setStartDate] = useState(new Date());
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [type, setType] = useState<Loan['type']>('home');
  const [customEmi, setCustomEmi] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const { emiPayments } = useMoneyStore();

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

      // Count existing paid EMIs
      const existingPaid = emiPayments.filter(
        (p) => p.loanId === editingLoan.id && p.status === 'paid'
      ).length;
      if (existingPaid > 0) {
        setPaidEmis(existingPaid.toString());
      }
    } else {
      // Default linked account
      const activeAccounts = accounts.filter((a) => !a.isArchived);
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

    const r = annualRate / 12 / 100; // monthly rate fraction
    const emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
    return isFinite(emi) ? emi : 0;
  }, [principalAmount, interestRate, tenureMonths]);

  // Amortize paid EMIs to calculate remaining balance and summary
  const paidStats = useMemo(() => {
    const P = parseFloat(principalAmount);
    const annualRate = parseFloat(interestRate);
    const N = parseInt(tenureMonths);
    const k = parseInt(paidEmis) || 0;
    const emiVal = customEmi && !isNaN(parseFloat(customEmi)) ? parseFloat(customEmi) : calculatedEMI;

    if (isNaN(P) || P <= 0 || isNaN(N) || N <= 0 || k <= 0 || emiVal <= 0) {
      return {
        remainingBalance: P || 0,
        totalPrincipalPaid: 0,
        totalInterestPaid: 0,
        remainingEmis: Math.max(0, (N || 0) - k),
      };
    }

    const r = (annualRate || 0) / 12 / 100;
    let bal = P;
    let principalPaid = 0;
    let interestPaid = 0;

    for (let i = 1; i <= k && bal > 0; i++) {
      const intPortion = bal * r;
      const prinPortion = Math.min(bal, emiVal - intPortion);
      bal = Math.max(0, bal - prinPortion);
      principalPaid += prinPortion;
      interestPaid += intPortion;
    }

    return {
      remainingBalance: bal,
      totalPrincipalPaid: principalPaid,
      totalInterestPaid: interestPaid,
      remainingEmis: Math.max(0, N - k),
    };
  }, [principalAmount, interestRate, tenureMonths, paidEmis, customEmi, calculatedEMI]);

  // When paid EMIs changes, auto-update the outstanding amount field
  const handlePaidEmisChange = (val: string) => {
    setPaidEmis(val);
    const k = parseInt(val) || 0;
    const P = parseFloat(principalAmount);
    const annualRate = parseFloat(interestRate);
    const N = parseInt(tenureMonths);
    const emiVal = customEmi && !isNaN(parseFloat(customEmi)) ? parseFloat(customEmi) : calculatedEMI;

    if (!isNaN(P) && P > 0 && !isNaN(N) && N > 0 && emiVal > 0) {
      const r = (annualRate || 0) / 12 / 100;
      let bal = P;
      for (let i = 1; i <= k && bal > 0; i++) {
        const intPortion = bal * r;
        const prinPortion = Math.min(bal, emiVal - intPortion);
        bal = Math.max(0, bal - prinPortion);
      }
      setOutstandingAmount(Math.round(bal).toString());
    }
  };

  const handleSave = () => {
    handleHaptic();
    if (!name.trim() || !lenderName.trim()) {
      Alert.alert('Required Fields', 'Please enter a loan name and lender name.');
      return;
    }

    const P = parseFloat(principalAmount);
    const R = parseFloat(interestRate);
    const N = parseInt(tenureMonths);
    const k = parseInt(paidEmis) || 0;

    if (isNaN(P) || isNaN(R) || isNaN(N) || P <= 0 || R < 0 || N <= 0) {
      Alert.alert(
        'Required Fields',
        'Please enter valid positive numbers for principal and tenure, and non-negative interest rate.'
      );
      return;
    }

    if (k > N) {
      Alert.alert('Invalid Input', 'Paid EMIs cannot exceed total tenure months.');
      return;
    }

    const outstanding = k > 0 ? paidStats.remainingBalance : (
      parseFloat(outstandingAmount) !== undefined && !isNaN(parseFloat(outstandingAmount))
        ? parseFloat(outstandingAmount)
        : P
    );

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

    const loanId = editingLoan ? editingLoan.id : Math.random().toString(36).substring(2, 9);

    const loanData: Loan = {
      id: loanId,
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

    // If new loan with already paid EMIs, generate historical EMI payment logs
    if (!editingLoan && k > 0) {
      const generatedPayments: EMIPayment[] = [];
      const r = R / 12 / 100;
      let curBal = P;

      for (let i = 1; i <= k && curBal > 0; i++) {
        const intPortion = curBal * r;
        const prinPortion = Math.min(curBal, finalEMI - intPortion);
        curBal = Math.max(0, curBal - prinPortion);

        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + (i - 1));

        generatedPayments.push({
          id: `emi-init-${loanId}-${i}-${Date.now()}`,
          loanId: loanId,
          amount: Number(finalEMI.toFixed(2)),
          principalPortion: Number(prinPortion.toFixed(2)),
          interestPortion: Number(intPortion.toFixed(2)),
          date: paymentDate.toISOString(),
          status: 'paid',
          updatedAt: new Date().toISOString(),
        });
      }

      useMoneyStore.setState((state) => ({
        loans: [...state.loans, loanData],
        emiPayments: [...state.emiPayments, ...generatedPayments],
      }));
    } else if (editingLoan) {
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

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
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
              {TYPES.map((t) => {
                const isSelected = type === t.type;
                const activeColor = t.color;
                
                return (
                  <TouchableOpacity
                    key={t.type}
                    style={[
                      styles.typeOption,
                      { backgroundColor: currColors.card, borderColor: currColors.border },
                      isSelected && { borderColor: activeColor, backgroundColor: `${activeColor}1A` },
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setType(t.type);
                    }}
                  >
                    <View style={{ marginBottom: 6 }}>
                      <t.icon size={20} color={isSelected ? activeColor : currColors.textSecondary} />
                    </View>
                    <ThemedText
                      style={[
                        styles.typeLabel,
                        { color: isSelected ? activeColor : currColors.textSecondary },
                      ]}
                    >
                      {t.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Principal & Interest */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>PRINCIPAL AMOUNT</ThemedText>
              <TextInput
                style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
                placeholder="₹10,00,000"
                placeholderTextColor={currColors.textSecondary}
                keyboardType="numeric"
                value={principalAmount}
                onChangeText={(val) => {
                  setPrincipalAmount(val);
                  if (!paidEmis || paidEmis === '0') {
                    setOutstandingAmount(val);
                  }
                }}
              />
            </View>
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
          </View>

          {/* Tenure & EMIs Already Paid */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>TOTAL TENURE (MONTHS)</ThemedText>
              <TextInput
                style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
                placeholder="e.g. 60"
                placeholderTextColor={currColors.textSecondary}
                keyboardType="numeric"
                value={tenureMonths}
                onChangeText={setTenureMonths}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={[styles.label, { color: '#00C9A7' }]}>EMIS ALREADY PAID</ThemedText>
              <TextInput
                style={[styles.textInput, { backgroundColor: currColors.card, borderColor: '#00C9A7', color: currColors.text, fontWeight: '600' }]}
                placeholder="0"
                placeholderTextColor={currColors.textSecondary}
                keyboardType="numeric"
                value={paidEmis}
                onChangeText={handlePaidEmisChange}
              />
            </View>
          </View>

          {/* Repayment Progress Pill (if paid EMIs > 0) */}
          {parseInt(paidEmis) > 0 && parseInt(tenureMonths) > 0 ? (
            <View style={[styles.paidSummaryCard, { backgroundColor: `${currColors.cardSecondary}` }]}>
              <View style={styles.paidSummaryHeader}>
                <ThemedText style={[styles.paidSummaryTitle, { color: '#00C9A7' }]}>
                  {paidEmis} of {tenureMonths} EMIs Paid ({Math.min(100, Math.round((parseInt(paidEmis) / parseInt(tenureMonths)) * 100))}%)
                </ThemedText>
                <ThemedText style={[styles.paidSummarySubtitle, { color: currColors.textSecondary }]}>
                  {paidStats.remainingEmis} EMIs Remaining
                </ThemedText>
              </View>
              <View style={styles.paidSummaryRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 11, color: currColors.textSecondary }}>Principal Paid</ThemedText>
                  <ThemedText style={{ fontSize: 14, fontWeight: '600', color: '#00C9A7', marginTop: 2 }}>
                    ₹{paidStats.totalPrincipalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </ThemedText>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <ThemedText style={{ fontSize: 11, color: currColors.textSecondary }}>Remaining Principal</ThemedText>
                  <ThemedText style={{ fontSize: 14, fontWeight: '600', color: currColors.text, marginTop: 2 }}>
                    ₹{paidStats.remainingBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </ThemedText>
                </View>
              </View>
            </View>
          ) : null}

          {/* Outstanding Amount */}
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary, marginBottom: 0 }]}>
                OUTSTANDING PRINCIPAL AMOUNT
              </ThemedText>
              {parseInt(paidEmis) > 0 ? (
                <ThemedText style={{ fontSize: 11, color: '#00C9A7', fontWeight: '500' }}>
                  Auto-calculated from paid EMIs
                </ThemedText>
              ) : null}
            </View>
            <TextInput
              style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
              placeholder={principalAmount || '0.00'}
              placeholderTextColor={currColors.textSecondary}
              keyboardType="numeric"
              value={outstandingAmount}
              onChangeText={setOutstandingAmount}
            />
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
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {selectedAccount ? (
                  <AccountIcon account={selectedAccount} size={24} />
                ) : null}
                <ThemedText style={{ color: selectedAccount ? currColors.text : currColors.textSecondary, fontSize: 15, fontFamily: 'Outfit_500Medium' }}>
                  {selectedAccount ? selectedAccount.name : 'Select Linked Account'}
                </ThemedText>
              </View>
              <ChevronDown size={18} color={currColors.textSecondary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Account Selection Modal */}
      <Modal visible={showAccountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowAccountModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <View style={styles.modalDragHandle} />
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Select Account</ThemedText>
              <TouchableOpacity onPress={() => setShowAccountModal(false)} style={styles.modalCloseIcon}>
                <X size={20} color={currColors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={activeAccounts}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: currColors.border }, item.includeInAssets === false && { opacity: 0.55 }]}
                  onPress={() => {
                    handleHaptic();
                    setLinkedAccountId(item.id);
                    setShowAccountModal(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <AccountIcon account={item} size={26} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="semiBold" style={{ color: currColors.text, fontSize: 15 }}>{item.name}</ThemedText>
                      <ThemedText style={{ color: currColors.textSecondary, fontSize: 11, marginTop: 2, fontFamily: 'Outfit_400Regular' }}>
                        Balance: {item.balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                      </ThemedText>
                    </View>
                  </View>
                  {linkedAccountId === item.id && <Check size={18} color="#00C9A7" />}
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
  paidSummaryCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  paidSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paidSummaryTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  paidSummarySubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  paidSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
});
