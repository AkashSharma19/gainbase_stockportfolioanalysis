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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  X,
  Check,
  Search,
  Calendar,
  Sparkles,
  Calculator,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Loan, Account } from '@/types/money';
import { Category3DIcon } from '@/components/Category3DIcon';
import { AccountLogoOrIcon } from '@/components/AccountLogoOrIcon';
import { AccountPickerModal } from '@/components/AccountPickerModal';
import {
  CATEGORY_3D_ICONS_LIST,
  findBest3DIconForText,
  LOAN_3D_ICON_MAP,
} from '@/constants/Category3DIcons';
import {
  formatCurrencyINR,
  formatIndianAmount,
  parseIndianAmount,
} from '@/utils/formatters';

const TENURE_PRESETS = [
  { label: '6m', months: 6 },
  { label: '12m', months: 12 },
  { label: '24m', months: 24 },
  { label: '36m', months: 36 },
  { label: '5y', months: 60 },
  { label: '10y', months: 120 },
  { label: '20y', months: 240 },
];

const RATE_PRESETS = [
  { label: '0% No-Cost', rate: '0' },
  { label: '8.5% Home', rate: '8.5' },
  { label: '9.5% Auto', rate: '9.5' },
  { label: '11.5% Personal', rate: '11.5' },
  { label: '14% Consumer', rate: '14' },
];

export default function AddLoanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

  const { loans, accounts, addLoan, updateLoan, emiPayments } = useMoneyStore();

  const editingLoan = useMemo(() => {
    return id ? loans.find((l) => String(l.id) === String(id)) : null;
  }, [id, loans]);

  // Form Fields
  const [name, setName] = useState('');
  const [lenderName, setLenderName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [outstandingAmount, setOutstandingAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [paidEmis, setPaidEmis] = useState('0');
  const [startDate, setStartDate] = useState(new Date());
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [icon, setIcon] = useState('house');
  const [isIconManuallyChosen, setIsIconManuallyChosen] = useState(false);
  const [hasManualOutstanding, setHasManualOutstanding] = useState(false);

  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  // Modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);

  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => !a.isArchived);
  }, [accounts]);

  const linkedAccount = useMemo(() => {
    return accounts.find((a) => a.id === linkedAccountId);
  }, [accounts, linkedAccountId]);

  const selectedIconItem = useMemo(() => {
    return CATEGORY_3D_ICONS_LIST.find((item) => item.id === icon);
  }, [icon]);

  const filteredIcons = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    if (!q) return CATEGORY_3D_ICONS_LIST;
    return CATEGORY_3D_ICONS_LIST.filter((item) => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchGroup = item.group.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((kw) =>
        kw.toLowerCase().includes(q)
      );
      return matchName || matchGroup || matchKeywords;
    });
  }, [iconSearch]);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    if (editingLoan) {
      setName(editingLoan.name);
      setLenderName(editingLoan.lenderName);
      setPrincipalAmount(
        formatIndianAmount(editingLoan.principalAmount.toString())
      );
      const initialOutstanding =
        editingLoan.outstandingAmount > 0
          ? editingLoan.outstandingAmount
          : editingLoan.principalAmount;
      setOutstandingAmount(formatIndianAmount(initialOutstanding.toString()));
      if (
        editingLoan.outstandingAmount > 0 &&
        editingLoan.outstandingAmount !== editingLoan.principalAmount
      ) {
        setHasManualOutstanding(true);
      }
      setInterestRate(editingLoan.interestRate.toString());
      setTenureMonths(editingLoan.tenureMonths.toString());
      setStartDate(new Date(editingLoan.startDate));
      setLinkedAccountId(editingLoan.linkedAccountId || '');
      setIcon(editingLoan.icon || LOAN_3D_ICON_MAP[editingLoan.type] || 'house');
      setIsIconManuallyChosen(true);

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

  const handleNameChange = (text: string) => {
    setName(text);
    if (!isIconManuallyChosen) {
      if (text.trim().length > 0) {
        const predicted = findBest3DIconForText(text);
        setIcon(predicted);
      } else {
        setIcon('house');
      }
    }
  };

  // Standard Amortization EMI calculation
  const calculatedEMI = useMemo(() => {
    const P = parseIndianAmount(principalAmount);
    const annualRate = parseFloat(interestRate);
    const N = parseInt(tenureMonths, 10);

    if (
      isNaN(P) ||
      isNaN(annualRate) ||
      isNaN(N) ||
      P <= 0 ||
      annualRate < 0 ||
      N <= 0
    ) {
      return 0;
    }

    if (annualRate === 0) {
      return P / N;
    }

    const r = annualRate / 12 / 100;
    const emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
    return isFinite(emi) ? emi : 0;
  }, [principalAmount, interestRate, tenureMonths]);

  const effectiveEMI = useMemo(() => {
    return Math.round(calculatedEMI);
  }, [calculatedEMI]);

  const totalPayable = useMemo(() => {
    const N = parseInt(tenureMonths, 10);
    if (isNaN(N) || N <= 0 || effectiveEMI <= 0) return 0;
    return effectiveEMI * N;
  }, [effectiveEMI, tenureMonths]);

  const totalInterest = useMemo(() => {
    const P = parseIndianAmount(principalAmount);
    if (isNaN(P) || P <= 0 || totalPayable <= 0) return 0;
    return Math.max(0, totalPayable - P);
  }, [totalPayable, principalAmount]);

  // Auto amortize remaining principal when entering paid EMIs
  useEffect(() => {
    if (editingLoan) return;
    const P = parseIndianAmount(principalAmount);
    const annualRate = parseFloat(interestRate);
    const N = parseInt(tenureMonths, 10);
    const k = parseInt(paidEmis, 10) || 0;
    const emiVal = effectiveEMI;

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
  }, [
    principalAmount,
    interestRate,
    tenureMonths,
    paidEmis,
    effectiveEMI,
    editingLoan,
  ]);

  const handleSave = () => {
    handleHaptic();

    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a name for this loan.');
      return;
    }

    const P = parseIndianAmount(principalAmount);
    if (isNaN(P) || P <= 0) {
      Alert.alert(
        'Required Field',
        'Please enter a valid principal borrowed amount.'
      );
      return;
    }

    const rate = parseFloat(interestRate);
    if (isNaN(rate) || rate < 0) {
      Alert.alert(
        'Required Field',
        'Please enter an annual interest rate (use 0 for No-Cost EMI).'
      );
      return;
    }

    const N = parseInt(tenureMonths, 10);
    if (isNaN(N) || N <= 0) {
      Alert.alert('Required Field', 'Please specify loan tenure in months.');
      return;
    }

    const finalEmi = effectiveEMI;
    const outstanding =
      outstandingAmount && !isNaN(parseIndianAmount(outstandingAmount))
        ? parseIndianAmount(outstandingAmount)
        : P;

    const endDate = new Date(startDate);
    const startDay = endDate.getDate();
    endDate.setDate(1);
    endDate.setMonth(endDate.getMonth() + N);
    const maxDays = new Date(
      endDate.getFullYear(),
      endDate.getMonth() + 1,
      0
    ).getDate();
    endDate.setDate(Math.min(startDay, maxDays));

    let loanType: Loan['type'] = editingLoan?.type || 'other';
    if (['house', 'home_garden'].includes(icon)) loanType = 'home';
    else if (['car', 'bus', 'fuel'].includes(icon)) loanType = 'car';
    else if (
      [
        'salary',
        'banknote',
        'money',
        'personal',
        'coin',
        'credit_card',
        'loan',
      ].includes(icon)
    )
      loanType = 'personal';
    else if (['education', 'books'].includes(icon)) loanType = 'education';

    const loanData: Loan = {
      id: editingLoan
        ? editingLoan.id
        : Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      lenderName: lenderName.trim() || name.trim() || 'Loan',
      principalAmount: P,
      outstandingAmount: outstanding,
      interestRate: rate,
      tenureMonths: N,
      emiAmount: finalEmi,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      linkedAccountId: linkedAccountId || undefined,
      type: loanType,
      icon: icon,
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
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  return (
    <View
      style={[
        styles.mainContainer,
        {
          backgroundColor: currColors.background,
          paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 52 : 16),
        },
      ]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.safeArea, { backgroundColor: currColors.background }]}>
        {/* HEADER BAR (Matching Add Transaction in Investments) */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: currColors.background,
              borderBottomColor: currColors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.headerIconButton,
              {
                backgroundColor: currColors.cardSecondary,
                borderColor: currColors.border,
              },
            ]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={18} color={currColors.text} strokeWidth={2.2} />
          </TouchableOpacity>
          <ThemedText
            type="semiBold"
            style={[styles.headerTitle, { color: currColors.text }]}
          >
            {editingLoan ? 'Edit Loan' : 'Add Loan'}
          </ThemedText>
          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.headerIconButton,
              {
                backgroundColor: currColors.tintMoney,
                borderColor: currColors.tintMoney,
              },
            ]}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Check
              size={18}
              color={isDark ? '#000000' : '#FFFFFF'}
              strokeWidth={2.6}
            />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. LOAN DETAILS GROUP */}
            <ThemedText
              style={[styles.groupLabel, { color: currColors.textSecondary }]}
            >
              LOAN DETAILS
            </ThemedText>
            <View
              style={[styles.formGroup, { backgroundColor: currColors.card }]}
            >
              {/* Loan Name & Clickable 3D Icon */}
              <View
                style={[
                  styles.formRow,
                  styles.formRowFirst,
                  { borderBottomColor: currColors.border },
                ]}
              >
                <TouchableOpacity
                  style={styles.logoTriggerButton}
                  onPress={() => setShowIconModal(true)}
                  activeOpacity={0.7}
                >
                  <Category3DIcon name={icon} size={32} />
                </TouchableOpacity>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: currColors.text,
                      marginLeft: 12,
                      fontSize: 16,
                    },
                  ]}
                  placeholder="e.g. HDFC Home Loan, Car Loan"
                  placeholderTextColor={currColors.textSecondary}
                  value={name}
                  onChangeText={handleNameChange}
                  autoCorrect={false}
                  spellCheck={false}
                  autoFocus={!editingLoan}
                />
              </View>

              {/* Lender / Bank Name */}
              <View
                style={[
                  styles.formRow,
                  { borderBottomColor: currColors.border },
                ]}
              >
                <ThemedText
                  style={[styles.label, { color: currColors.text }]}
                >
                  Lender / Bank
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: currColors.text,
                      textAlign: 'right',
                    },
                  ]}
                  placeholder="e.g. HDFC Bank, SBI"
                  placeholderTextColor={currColors.textSecondary}
                  value={lenderName}
                  onChangeText={setLenderName}
                  autoCorrect={false}
                  spellCheck={false}
                />
              </View>

              {/* 3D Icon Avatar Row */}
              <TouchableOpacity
                style={[styles.formRow, styles.formRowLast]}
                onPress={() => setShowIconModal(true)}
                activeOpacity={0.7}
              >
                <ThemedText
                  style={[styles.label, { color: currColors.text }]}
                >
                  Avatar Icon
                </ThemedText>
                <View style={styles.valueContainer}>
                  <Category3DIcon name={icon} size={22} />
                  <ThemedText
                    style={[
                      styles.valueText,
                      { color: currColors.text, marginLeft: 6 },
                    ]}
                  >
                    {selectedIconItem?.name || icon.toUpperCase()}
                  </ThemedText>
                  <ChevronRight
                    size={16}
                    color={currColors.border}
                    style={{ marginLeft: 6 }}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* 2. LOAN AMOUNT & PRINCIPAL GROUP */}
            <ThemedText
              style={[styles.groupLabel, { color: currColors.textSecondary }]}
            >
              AMOUNT & PRINCIPAL
            </ThemedText>
            <View
              style={[styles.formGroup, { backgroundColor: currColors.card }]}
            >
              {/* Principal Borrowed */}
              <View
                style={[
                  styles.formRow,
                  { borderBottomColor: currColors.border },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <ThemedText
                    style={[styles.label, { color: currColors.text }]}
                  >
                    Principal Borrowed
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.subLabel,
                      { color: currColors.textSecondary },
                    ]}
                  >
                    Original sanctioned loan amount
                  </ThemedText>
                </View>
                <View style={styles.amountInputWrap}>
                  <ThemedText
                    style={[
                      styles.currencyPrefix,
                      { color: currColors.textSecondary },
                    ]}
                  >
                    ₹
                  </ThemedText>
                  <TextInput
                    style={[styles.amountInput, { color: currColors.text }]}
                    placeholder="0"
                    placeholderTextColor={currColors.textSecondary}
                    keyboardType="numeric"
                    value={principalAmount}
                    onChangeText={(val) =>
                      setPrincipalAmount(formatIndianAmount(val))
                    }
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Outstanding Principal Balance */}
              <View style={[styles.formRow, styles.formRowLast]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <ThemedText
                    style={[styles.label, { color: currColors.text }]}
                  >
                    Outstanding Balance
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.subLabel,
                      { color: currColors.textSecondary },
                    ]}
                  >
                    Current remaining principal
                  </ThemedText>
                </View>
                <View style={styles.amountInputWrap}>
                  <ThemedText
                    style={[
                      styles.currencyPrefix,
                      { color: currColors.textSecondary },
                    ]}
                  >
                    ₹
                  </ThemedText>
                  <TextInput
                    style={[styles.amountInput, { color: currColors.text }]}
                    placeholder="0"
                    placeholderTextColor={currColors.textSecondary}
                    keyboardType="numeric"
                    value={outstandingAmount}
                    onChangeText={(val) => {
                      setOutstandingAmount(formatIndianAmount(val));
                      setHasManualOutstanding(true);
                    }}
                    textAlign="right"
                  />
                </View>
              </View>
            </View>

            {/* 3. INTEREST & TENURE GROUP */}
            <ThemedText
              style={[styles.groupLabel, { color: currColors.textSecondary }]}
            >
              INTEREST & TENURE
            </ThemedText>
            <View
              style={[styles.formGroup, { backgroundColor: currColors.card }]}
            >
              {/* Annual Interest Rate */}
              <View
                style={[
                  styles.formRow,
                  { borderBottomColor: currColors.border, flexDirection: 'column', alignItems: 'stretch' },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <ThemedText
                      style={[styles.label, { color: currColors.text }]}
                    >
                      Annual Interest Rate (%)
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.subLabel,
                        { color: currColors.textSecondary },
                      ]}
                    >
                      Use 0 for No-Cost EMI
                    </ThemedText>
                  </View>
                  <View style={styles.amountInputWrap}>
                    <TextInput
                      style={[
                        styles.amountInput,
                        { color: currColors.text, minWidth: 60 },
                      ]}
                      placeholder="0"
                      placeholderTextColor={currColors.textSecondary}
                      keyboardType="decimal-pad"
                      value={interestRate}
                      onChangeText={setInterestRate}
                      textAlign="right"
                    />
                    <ThemedText
                      style={[
                        styles.currencyPrefix,
                        { color: currColors.textSecondary, marginLeft: 2 },
                      ]}
                    >
                      %
                    </ThemedText>
                  </View>
                </View>

                {/* Rate Presets */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetsRow}
                >
                  {RATE_PRESETS.map((preset) => {
                    const isSelected = interestRate === preset.rate;
                    return (
                      <TouchableOpacity
                        key={preset.rate}
                        style={[
                          styles.presetPill,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? '#2C2C2E'
                                : '#FFFFFF'
                              : currColors.cardSecondary,
                            borderColor: isSelected
                              ? currColors.tintMoney
                              : currColors.border,
                            borderWidth: isSelected ? 1.5 : 1,
                          },
                        ]}
                        onPress={() => {
                          handleHaptic();
                          setInterestRate(preset.rate);
                        }}
                        activeOpacity={0.7}
                      >
                        <ThemedText
                          style={[
                            styles.presetPillText,
                            {
                              color: isSelected
                                ? currColors.text
                                : currColors.textSecondary,
                              fontFamily: isSelected
                                ? 'Outfit_600SemiBold'
                                : 'Outfit_400Regular',
                            },
                          ]}
                        >
                          {preset.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Loan Tenure in Months */}
              <View
                style={[
                  styles.formRow,
                  { borderBottomColor: currColors.border, flexDirection: 'column', alignItems: 'stretch' },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <ThemedText
                      style={[styles.label, { color: currColors.text }]}
                    >
                      Loan Tenure (Months)
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.subLabel,
                        { color: currColors.textSecondary },
                      ]}
                    >
                      Total repayment period
                    </ThemedText>
                  </View>
                  <View style={styles.amountInputWrap}>
                    <TextInput
                      style={[
                        styles.amountInput,
                        { color: currColors.text, minWidth: 60 },
                      ]}
                      placeholder="0"
                      placeholderTextColor={currColors.textSecondary}
                      keyboardType="numeric"
                      value={tenureMonths}
                      onChangeText={setTenureMonths}
                      textAlign="right"
                    />
                    <ThemedText
                      style={[
                        styles.currencyPrefix,
                        { color: currColors.textSecondary, marginLeft: 4, fontSize: 13 },
                      ]}
                    >
                      mo
                    </ThemedText>
                  </View>
                </View>

                {/* Tenure Presets */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetsRow}
                >
                  {TENURE_PRESETS.map((preset) => {
                    const isSelected =
                      tenureMonths === preset.months.toString();
                    return (
                      <TouchableOpacity
                        key={preset.label}
                        style={[
                          styles.presetPill,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? '#2C2C2E'
                                : '#FFFFFF'
                              : currColors.cardSecondary,
                            borderColor: isSelected
                              ? currColors.tintMoney
                              : currColors.border,
                            borderWidth: isSelected ? 1.5 : 1,
                          },
                        ]}
                        onPress={() => {
                          handleHaptic();
                          setTenureMonths(preset.months.toString());
                        }}
                        activeOpacity={0.7}
                      >
                        <ThemedText
                          style={[
                            styles.presetPillText,
                            {
                              color: isSelected
                                ? currColors.text
                                : currColors.textSecondary,
                              fontFamily: isSelected
                                ? 'Outfit_600SemiBold'
                                : 'Outfit_400Regular',
                            },
                          ]}
                        >
                          {preset.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Installments Already Paid */}
              <View style={[styles.formRow, styles.formRowLast]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <ThemedText
                    style={[styles.label, { color: currColors.text }]}
                  >
                    Installments Already Paid
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.subLabel,
                      { color: currColors.textSecondary },
                    ]}
                  >
                    Adjusts remaining balance automatically
                  </ThemedText>
                </View>
                <TextInput
                  style={[
                    styles.amountInput,
                    { color: currColors.text, minWidth: 60 },
                  ]}
                  placeholder="0"
                  placeholderTextColor={currColors.textSecondary}
                  keyboardType="numeric"
                  value={paidEmis}
                  onChangeText={setPaidEmis}
                  textAlign="right"
                />
              </View>

              {/* Live Amortization Summary Card */}
              {effectiveEMI > 0 && (
                <View
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: isDark
                        ? currColors.cardSecondary
                        : '#F9FAFB',
                      borderColor: currColors.border,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    <Calculator size={15} color={currColors.tintMoney} />
                    <ThemedText
                      style={[
                        styles.summaryHeaderTitle,
                        { color: currColors.text },
                      ]}
                    >
                      Repayment Summary
                    </ThemedText>
                  </View>

                  <View style={styles.summaryStatsRow}>
                    <View style={styles.summaryStatItem}>
                      <ThemedText
                        style={[
                          styles.summaryStatLabel,
                          { color: currColors.textSecondary },
                        ]}
                      >
                        Monthly EMI
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.summaryStatValue,
                          { color: currColors.tintMoney },
                        ]}
                      >
                        ₹{effectiveEMI.toLocaleString('en-IN')}
                      </ThemedText>
                    </View>

                    <View style={styles.summaryStatItem}>
                      <ThemedText
                        style={[
                          styles.summaryStatLabel,
                          { color: currColors.textSecondary },
                        ]}
                      >
                        Total Interest
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.summaryStatValue,
                          { color: currColors.text },
                        ]}
                      >
                        ₹{totalInterest.toLocaleString('en-IN')}
                      </ThemedText>
                    </View>

                    <View style={styles.summaryStatItem}>
                      <ThemedText
                        style={[
                          styles.summaryStatLabel,
                          { color: currColors.textSecondary },
                        ]}
                      >
                        Total Payable
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.summaryStatValue,
                          { color: currColors.text },
                        ]}
                      >
                        ₹{totalPayable.toLocaleString('en-IN')}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 4. SCHEDULE & AUTO-DEBIT GROUP */}
            <ThemedText
              style={[styles.groupLabel, { color: currColors.textSecondary }]}
            >
              SCHEDULE & AUTO-DEBIT
            </ThemedText>
            <View
              style={[styles.formGroup, { backgroundColor: currColors.card }]}
            >
              {/* Start Date */}
              <View
                style={[
                  styles.formRow,
                  { borderBottomColor: currColors.border },
                ]}
              >
                <ThemedText
                  style={[styles.label, { color: currColors.text }]}
                >
                  First EMI Date
                </ThemedText>
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="compact"
                    onChange={onDateChange}
                    themeVariant={colorScheme}
                    accentColor={currColors.tintMoney}
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      style={[styles.valueText, { color: currColors.text }]}
                    >
                      {startDate.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              {showDatePicker && Platform.OS !== 'ios' && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}

              {/* Linked Auto-Debit Account */}
              <TouchableOpacity
                style={[styles.formRow, styles.formRowLast]}
                onPress={() => setShowAccountModal(true)}
                activeOpacity={0.7}
              >
                <ThemedText
                  style={[styles.label, { color: currColors.text }]}
                >
                  Auto-Debit Account
                </ThemedText>
                <View style={styles.valueContainer}>
                  {linkedAccount ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <AccountLogoOrIcon account={linkedAccount} size={20} />
                      <ThemedText
                        style={[styles.valueText, { color: currColors.text }]}
                      >
                        {linkedAccount.name}
                      </ThemedText>
                    </View>
                  ) : (
                    <ThemedText
                      style={[styles.valueText, styles.placeholderText]}
                    >
                      Select Account
                    </ThemedText>
                  )}
                  <ChevronRight
                    size={16}
                    color={currColors.border}
                    style={{ marginLeft: 6 }}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* ─── FULL PAGE 3D ICON PICKER MODAL ─── */}
      <Modal
        visible={showIconModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => {
          setShowIconModal(false);
          setIconSearch('');
        }}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: currColors.background },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: currColors.background,
                borderBottomColor: currColors.border,
                paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24),
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setShowIconModal(false);
                setIconSearch('');
              }}
              style={styles.cancelButton}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ThemedText
                style={[
                  styles.headerButtonText,
                  { color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' },
                ]}
              >
                Cancel
              </ThemedText>
            </TouchableOpacity>

            <ThemedText
              type="semiBold"
              style={[styles.headerTitle, { color: currColors.text }]}
            >
              Choose 3D Avatar Icon
            </ThemedText>

            <View style={{ width: 50 }} />
          </View>

          <View
            style={[
              styles.searchBarContainer,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
              },
            ]}
          >
            <Search size={18} color={currColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: currColors.text }]}
              placeholder="Search 80+ 3D objects (house, car, cash)..."
              placeholderTextColor={currColors.textSecondary}
              value={iconSearch}
              onChangeText={setIconSearch}
              autoFocus
            />
            {iconSearch.length > 0 && (
              <TouchableOpacity onPress={() => setIconSearch('')}>
                <X size={16} color={currColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            contentContainerStyle={styles.iconGridContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconGridWrap}>
              {filteredIcons.map((item) => {
                const isSelected = icon === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.iconGridCard,
                      {
                        backgroundColor: currColors.card,
                        borderColor: isSelected
                          ? currColors.tintMoney
                          : currColors.border,
                      },
                      isSelected && styles.iconGridCardSelected,
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setIcon(item.id);
                      setIsIconManuallyChosen(true);
                      setShowIconModal(false);
                      setIconSearch('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Category3DIcon name={item.id} size={38} />
                    <ThemedText
                      style={[
                        styles.iconGridCardLabel,
                        { color: currColors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </ThemedText>
                    {isSelected && (
                      <View
                        style={[
                          styles.iconSelectedBadge,
                          { backgroundColor: currColors.tintMoney },
                        ]}
                      >
                        <Check size={10} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ─── ACCOUNT PICKER MODAL ─── */}
      <AccountPickerModal
        visible={showAccountModal}
        selectedAccountId={linkedAccountId}
        onSelectAccount={(acc: Account) => {
          handleHaptic();
          setLinkedAccountId(acc.id);
          setShowAccountModal(false);
        }}
        onClose={() => setShowAccountModal(false)}
      />
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
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  saveButton: {
    paddingVertical: 8,
    paddingLeft: 16,
  },
  headerButtonText: {
    fontSize: 17,
  },
  saveButtonText: {
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 48,
  },
  groupLabel: {
    fontSize: 12,
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Outfit_500Medium',
  },
  formGroup: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    minHeight: 52,
  },
  formRowFirst: {},
  formRowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  subLabel: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Outfit_400Regular',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  placeholderText: {
    color: '#8E8E93',
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    fontFamily: 'Outfit_400Regular',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  amountInput: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    padding: 0,
    minWidth: 80,
  },
  currencyPrefix: {
    fontSize: 16,
    marginRight: 4,
    fontFamily: 'Outfit_500Medium',
  },
  logoTriggerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetsRow: {
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  presetPillText: {
    fontSize: 12,
  },
  summaryCard: {
    margin: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryHeaderTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStatItem: {
    flex: 1,
  },
  summaryStatLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 2,
  },
  summaryStatValue: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    padding: 0,
  },
  iconGridContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  iconGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  iconGridCard: {
    width: '30.5%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconGridCardSelected: {
    borderWidth: 2,
  },
  iconGridCardLabel: {
    fontSize: 11,
    marginTop: 6,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
  },
  iconSelectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
