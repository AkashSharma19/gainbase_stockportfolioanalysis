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
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Search,
  Calendar,
  CreditCard,
  Building,
  Sparkles,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/ThemedText';
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
import { getCardPaletteFromItem } from '@/constants/folderTheme';
import { formatCurrencyINR, formatIndianAmount, parseIndianAmount } from '@/utils/formatters';

// Fallback Static Theme
const DEFAULT_THEME = {
  bg: '#FEF08A',
  text: '#713F12',
  sub: '#854D0E',
  border: '#CA8A04',
  cardBg: '#FFFFFF',
  cardBorder: 'rgba(113, 63, 18, 0.15)',
  trackInactive: 'rgba(113, 63, 18, 0.15)',
  trackActive: '#713F12',
  accentPill: 'rgba(113, 63, 18, 0.1)',
};

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

  // Step State (0: Name, 1: Amount, 2: Terms, 3: Schedule)
  const [currentStep, setCurrentStep] = useState(0);

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

  // Dynamic Pastel Theme derived from icon (matching list view card colors)
  const THEME = useMemo(() => {
    const palette = getCardPaletteFromItem({
      icon,
      name,
      type: editingLoan?.type,
    });
    return {
      bg: palette.bg,
      text: palette.text,
      sub: palette.sub,
      border: palette.sub,
      cardBg: '#FFFFFF',
      cardBorder: `${palette.text}22`,
      trackInactive: `${palette.text}20`,
      trackActive: palette.text,
      accentPill: `${palette.text}14`,
    };
  }, [icon, name, editingLoan?.type]);

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
      const matchKeywords = item.keywords.some((kw) => kw.toLowerCase().includes(q));
      return matchName || matchGroup || matchKeywords;
    });
  }, [iconSearch]);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    if (editingLoan) {
      setName(editingLoan.name);
      setLenderName(editingLoan.lenderName);
      setPrincipalAmount(formatIndianAmount(editingLoan.principalAmount.toString()));
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
  }, [principalAmount, interestRate, tenureMonths, paidEmis, effectiveEMI, editingLoan]);

  // Step Validation & Navigation
  const validateStep = (step: number): boolean => {
    if (step === 0) {
      if (!name.trim()) {
        Alert.alert('Required Field', 'Please enter a name for this loan.');
        return false;
      }
      return true;
    }
    if (step === 1) {
      const P = parseIndianAmount(principalAmount);
      if (isNaN(P) || P <= 0) {
        Alert.alert('Required Field', 'Please enter a valid principal borrowed amount.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      const rate = parseFloat(interestRate);
      if (isNaN(rate) || rate < 0) {
        Alert.alert('Required Field', 'Please enter an annual interest rate (use 0 for No-Cost EMI).');
        return false;
      }
      const N = parseInt(tenureMonths, 10);
      if (isNaN(N) || N <= 0) {
        Alert.alert('Required Field', 'Please specify loan tenure in months.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    handleHaptic();
    if (!validateStep(currentStep)) return;
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinalSave();
    }
  };

  const handleBack = () => {
    handleHaptic();
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.back();
    }
  };

  const handleFinalSave = () => {
    handleHaptic();
    const P = parseIndianAmount(principalAmount);
    const rate = parseFloat(interestRate);
    const N = parseInt(tenureMonths, 10);
    const finalEmi = effectiveEMI;

    const outstanding = outstandingAmount && !isNaN(parseIndianAmount(outstandingAmount))
      ? parseIndianAmount(outstandingAmount)
      : P;

    const endDate = new Date(startDate);
    const startDay = endDate.getDate();
    endDate.setDate(1);
    endDate.setMonth(endDate.getMonth() + N);
    const maxDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
    endDate.setDate(Math.min(startDay, maxDays));

    let loanType: Loan['type'] = editingLoan?.type || 'other';
    if (['house', 'home_garden'].includes(icon)) loanType = 'home';
    else if (['car', 'bus', 'fuel'].includes(icon)) loanType = 'car';
    else if (['salary', 'banknote', 'money', 'personal', 'coin', 'credit_card', 'loan'].includes(icon)) loanType = 'personal';
    else if (['education', 'books'].includes(icon)) loanType = 'education';

    const loanData: Loan = {
      id: editingLoan ? editingLoan.id : Math.random().toString(36).substring(2, 9),
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

  // Step Meta Configuration
  const STEP_METAS = [
    { title: 'Name', subtitle: 'Loan Name' },
    { title: 'Amount', subtitle: 'Loan Amount' },
    { title: 'Terms', subtitle: 'Interest & Tenure' },
    { title: 'Schedule', subtitle: 'Repayment Schedule' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: THEME.bg }]}>
      <StatusBar style="dark" />

      {/* ─── Top Header & Progress Bar ─── */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <View style={styles.headerNavRow}>
          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: THEME.text + '14' }]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={THEME.text} />
          </TouchableOpacity>

          <ThemedText style={[styles.headerScreenTitle, { color: THEME.text }]}>
            {editingLoan ? 'Edit Loan' : 'Add Loan'}
          </ThemedText>

          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: THEME.text + '14' }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <X size={20} color={THEME.text} />
          </TouchableOpacity>
        </View>

        {/* 4-Segment Progress Bar */}
        <View style={styles.segmentedProgressBar}>
          {[0, 1, 2, 3].map((stepIdx) => (
            <View
              key={stepIdx}
              style={[
                styles.progressSegment,
                {
                  backgroundColor:
                    stepIdx <= currentStep ? THEME.trackActive : THEME.trackInactive,
                },
              ]}
            />
          ))}
        </View>

        {/* Step Indicator Subtitle */}
        <ThemedText style={[styles.stepLabel, { color: THEME.sub }]}>
          STEP {currentStep + 1} OF 4 • {STEP_METAS[currentStep].title.toUpperCase()}
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step Headline & Explainer */}
          <View style={styles.stepTitleContainer}>
            <ThemedText style={[styles.stepHeadline, { color: THEME.text }]}>
              {STEP_METAS[currentStep].subtitle}
            </ThemedText>
            <ThemedText style={[styles.stepExplainer, { color: THEME.sub }]}>
              {currentStep === 0 &&
                'Enter the loan name and choose an icon.'}
              {currentStep === 1 &&
                'Enter loan amount and outstanding balance.'}
              {currentStep === 2 &&
                'Set interest rate and tenure to calculate EMI.'}
              {currentStep === 3 &&
                'Set start date and linked auto-debit account.'}
            </ThemedText>
          </View>

          {/* ════════════ STEP 0: IDENTITY ════════════ */}
          {currentStep === 0 && (
            <View style={[styles.stepCard, { borderColor: THEME.cardBorder }]}>
              {/* Visual 3D Icon Preview & Tap to Pick */}
              <View style={styles.iconChooserRow}>
                <TouchableOpacity
                  style={[
                    styles.iconPreviewButton,
                    { backgroundColor: THEME.bg, borderColor: THEME.text + '33' },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setShowIconModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Category3DIcon name={icon} size={48} />
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 16 }}>
                  <TextInput
                    style={[styles.largeTextInput, { color: THEME.text }]}
                    placeholder="e.g. Home Loan, Car Loan"
                    placeholderTextColor={THEME.text + '55'}
                    value={name}
                    onChangeText={handleNameChange}
                    autoFocus={!editingLoan}
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>
          )}

          {/* ════════════ STEP 1: PRINCIPAL & BALANCE ════════════ */}
          {currentStep === 1 && (
            <View style={[styles.stepCard, { borderColor: THEME.cardBorder }]}>
              <View>
                <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                  AMOUNT (₹)
                </ThemedText>
                <View style={styles.amountInputRow}>
                  <ThemedText style={[styles.currencyPrefix, { color: THEME.text }]}>₹</ThemedText>
                  <TextInput
                    style={[styles.heroAmountInput, { color: THEME.text }]}
                    placeholder="0"
                    placeholderTextColor={THEME.text + '4D'}
                    keyboardType="numeric"
                    value={principalAmount}
                    onChangeText={(val) => {
                      const formatted = formatIndianAmount(val);
                      setPrincipalAmount(formatted);
                      // Autofill outstanding balance to match Amount unless manually edited
                      if (!hasManualOutstanding || !outstandingAmount || outstandingAmount === '0') {
                        setOutstandingAmount(formatted);
                      }
                    }}
                    autoFocus
                  />
                </View>
              </View>

              <View style={[styles.fieldDivider, { backgroundColor: THEME.text + '14' }]} />

              {/* Outstanding Balance */}
              <View>
                <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                  OUTSTANDING BALANCE (₹)
                </ThemedText>

                <View style={styles.amountInputRow}>
                  <ThemedText style={[styles.currencyPrefixSmall, { color: THEME.text }]}>₹</ThemedText>
                  <TextInput
                    style={[
                      styles.standardTextInput,
                      {
                        color: THEME.text,
                        fontSize: 22,
                        fontFamily: 'Outfit_600SemiBold',
                        flex: 1,
                        paddingVertical: 2,
                      },
                    ]}
                    placeholder={principalAmount || '0'}
                    placeholderTextColor={THEME.text + '4D'}
                    keyboardType="numeric"
                    value={outstandingAmount}
                    onChangeText={(val) => {
                      setHasManualOutstanding(true);
                      setOutstandingAmount(formatIndianAmount(val));
                    }}
                  />
                </View>
              </View>
            </View>
          )}

          {/* ════════════ STEP 2: TERMS & INTEREST ════════════ */}
          {currentStep === 2 && (
            <View style={[styles.stepCard, { borderColor: THEME.cardBorder }]}>
              {/* Interest Rate */}
              <View>
                <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                  INTEREST RATE (% P.A.)
                </ThemedText>
                <View style={styles.percentInputRow}>
                  <TextInput
                    style={[styles.heroAmountInput, { color: THEME.text }]}
                    placeholder="8.5"
                    placeholderTextColor={THEME.text + '4D'}
                    keyboardType="numeric"
                    value={interestRate}
                    onChangeText={setInterestRate}
                    autoFocus
                  />
                  <ThemedText style={[styles.currencyPrefix, { color: THEME.text }]}>%</ThemedText>
                </View>

                {/* Quick Presets */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                  {RATE_PRESETS.map((p) => {
                    const isSelected = interestRate === p.rate;
                    return (
                      <TouchableOpacity
                        key={p.label}
                        style={[
                          styles.presetPill,
                          { backgroundColor: THEME.text + '14' },
                          isSelected && { backgroundColor: THEME.text },
                        ]}
                        onPress={() => {
                          handleHaptic();
                          setInterestRate(p.rate);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.presetPillText,
                            { color: THEME.text },
                            isSelected && { color: THEME.bg },
                          ]}
                        >
                          {p.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={[styles.fieldDivider, { backgroundColor: THEME.text + '14' }]} />

              {/* Tenure Months */}
              <View>
                <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                  TENURE (MONTHS)
                </ThemedText>
                <TextInput
                  style={[styles.standardTextInput, { color: THEME.text, fontSize: 20 }]}
                  placeholder="e.g. 24, 60, 240"
                  placeholderTextColor={THEME.text + '4D'}
                  keyboardType="numeric"
                  value={tenureMonths}
                  onChangeText={setTenureMonths}
                />

                {/* Quick Tenure Presets */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                  {TENURE_PRESETS.map((p) => {
                    const isSelected = tenureMonths === p.months.toString();
                    return (
                      <TouchableOpacity
                        key={p.label}
                        style={[
                          styles.presetPill,
                          { backgroundColor: THEME.text + '14' },
                          isSelected && { backgroundColor: THEME.text },
                        ]}
                        onPress={() => {
                          handleHaptic();
                          setTenureMonths(p.months.toString());
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.presetPillText,
                            { color: THEME.text },
                            isSelected && { color: THEME.bg },
                          ]}
                        >
                          {p.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Live Amortization Breakdown Box */}
              {effectiveEMI > 0 && (
                <View style={[styles.amortizationBox, { backgroundColor: THEME.text + '0F' }]}>
                  <View style={styles.rowBetween}>
                    <ThemedText style={[styles.amortLabel, { color: THEME.sub }]}>Monthly EMI</ThemedText>
                    <ThemedText style={[styles.amortValueBold, { color: THEME.text }]}>
                      ₹{effectiveEMI.toLocaleString('en-IN')}/mo
                    </ThemedText>
                  </View>
                  <View style={[styles.rowBetween, { marginTop: 6 }]}>
                    <ThemedText style={[styles.amortLabel, { color: THEME.sub }]}>Total Interest</ThemedText>
                    <ThemedText style={[styles.amortValue, { color: THEME.text }]}>
                      ₹{Math.round(totalInterest).toLocaleString('en-IN')}
                    </ThemedText>
                  </View>
                  <View style={[styles.rowBetween, { marginTop: 6 }]}>
                    <ThemedText style={[styles.amortLabel, { color: THEME.sub }]}>Total Repayment</ThemedText>
                    <ThemedText style={[styles.amortValue, { color: THEME.text }]}>
                      ₹{Math.round(totalPayable).toLocaleString('en-IN')}
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ════════════ STEP 3: SCHEDULE & ACCOUNT ════════════ */}
          {currentStep === 3 && (
            <View style={[styles.stepCard, { borderColor: THEME.cardBorder }]}>
              {/* Start Date */}
              <View>
                <View style={styles.selectorTriggerRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Calendar size={18} color={THEME.text} />
                    <ThemedText style={[styles.selectorTriggerValue, { color: THEME.text }]}>
                      Start Date
                    </ThemedText>
                  </View>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                      themeVariant="light"
                      accentColor={THEME.text}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        handleHaptic();
                        setShowDatePicker(true);
                      }}
                    >
                      <ThemedText style={[styles.selectorTriggerValue, { color: THEME.text }]}>
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
              </View>

              <View style={[styles.fieldDivider, { backgroundColor: THEME.text + '14' }]} />

              {/* Paid EMIs count */}
              <View>
                <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                  INSTALLMENTS PAID
                </ThemedText>
                <TextInput
                  style={[styles.standardTextInput, { color: THEME.text, fontSize: 18 }]}
                  placeholder="0"
                  placeholderTextColor={THEME.text + '4D'}
                  keyboardType="numeric"
                  value={paidEmis}
                  onChangeText={setPaidEmis}
                />
                <ThemedText style={[styles.fieldHint, { color: THEME.sub }]}>
                  {parseInt(paidEmis, 10) > 0
                    ? `${paidEmis} installments completed. Outstanding balance automatically adjusted.`
                    : 'Leave as 0 for freshly sanctioned loans.'}
                </ThemedText>
              </View>

              <View style={[styles.fieldDivider, { backgroundColor: THEME.text + '14' }]} />

              {/* Linked Auto-Debit Account */}
              <View>
                <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                  AUTO-DEBIT ACCOUNT
                </ThemedText>
                <TouchableOpacity
                  style={styles.selectorTriggerRow}
                  onPress={() => {
                    handleHaptic();
                    setShowAccountModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  {linkedAccount ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <AccountLogoOrIcon account={linkedAccount} size={28} />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.selectorTriggerValue, { color: THEME.text }]} numberOfLines={1}>
                          {linkedAccount.name}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, color: THEME.sub }}>
                          Balance: ₹{linkedAccount.balance.toLocaleString('en-IN')}
                        </ThemedText>
                      </View>
                    </View>
                  ) : (
                    <ThemedText style={{ color: THEME.text + '80', fontSize: 15 }}>
                      Select bank or account
                    </ThemedText>
                  )}
                  <ChevronRight size={18} color={THEME.sub} />
                </TouchableOpacity>
              </View>

              {/* Final Review Summary Dossier */}
              <View style={[styles.reviewSummaryBox, { backgroundColor: THEME.bg, borderColor: THEME.text + '26' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Category3DIcon name={icon} size={40} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.reviewTitle, { color: THEME.text }]} numberOfLines={1}>
                      {name || 'New Loan'}
                    </ThemedText>
                    <ThemedText style={[styles.reviewSub, { color: THEME.sub }]}>
                      ₹{effectiveEMI.toLocaleString('en-IN')}/mo • {tenureMonths || 0}m tenure
                    </ThemedText>
                  </View>
                  <View style={[styles.readyBadge, { backgroundColor: THEME.text }]}>
                    <ThemedText style={[styles.readyBadgeText, { color: THEME.bg }]}>READY</ThemedText>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ─── Sticky Bottom Action Bar ─── */}
        <View
          style={[
            styles.bottomActionBar,
            {
              backgroundColor: THEME.bg,
              borderTopColor: THEME.text + '1E',
              paddingBottom: isKeyboardVisible
                ? 12
                : Math.max(insets.bottom, 16) + 8,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.primaryActionButton, { backgroundColor: THEME.text }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <ThemedText style={[styles.primaryActionText, { color: THEME.bg }]}>
              {currentStep === 3
                ? editingLoan
                  ? 'Update Loan'
                  : 'Save Loan'
                : 'Continue'}
            </ThemedText>
            {currentStep === 3 ? (
              <Check size={18} color={THEME.bg} />
            ) : (
              <ArrowRight size={18} color={THEME.bg} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ─── Full-Page Choose 3D Icon Modal ─── */}
      <Modal
        visible={showIconModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowIconModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: '#F8FAFC' }]}>
          <View style={styles.modalHeader}>
            <View>
              <ThemedText style={styles.modalTitle}>Choose 3D Icon</ThemedText>
              <ThemedText style={styles.modalSubtitle}>
                Select an icon for your loan category
              </ThemedText>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowIconModal(false)}
            >
              <X size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.modalSearchRow}>
            <Search size={16} color="#64748B" />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search icons (e.g. car, house, laptop)..."
              placeholderTextColor="#94A3B8"
              value={iconSearch}
              onChangeText={setIconSearch}
            />
            {iconSearch.length > 0 && (
              <TouchableOpacity onPress={() => setIconSearch('')}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Icon Grid */}
          <FlatList
            data={filteredIcons}
            keyExtractor={(item) => item.id}
            numColumns={4}
            contentContainerStyle={styles.iconGridContent}
            renderItem={({ item }) => {
              const isSelected = icon === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.iconGridCell,
                    isSelected && styles.iconGridCellSelected,
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setIcon(item.id);
                    setIsIconManuallyChosen(true);
                    setShowIconModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Category3DIcon name={item.id} size={36} />
                  <ThemedText style={styles.iconCellName} numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* ─── Account Picker Modal ─── */}
      <AccountPickerModal
        visible={showAccountModal}
        selectedAccountId={linkedAccountId}
        onSelectAccount={(acc: Account) => {
          setLinkedAccountId(acc.id);
        }}
        onClose={() => setShowAccountModal(false)}
        title="Select Auto-Debit Account"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(113, 63, 18, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerScreenTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.3,
  },
  segmentedProgressBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  stepTitleContainer: {
    marginBottom: 20,
  },
  stepHeadline: {
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  stepExplainer: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 20,
  },
  stepCard: {
    backgroundColor: DEFAULT_THEME.cardBg,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: DEFAULT_THEME.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  iconChooserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconPreviewButton: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: DEFAULT_THEME.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  iconEditPill: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: DEFAULT_THEME.text,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  iconEditText: {
    color: DEFAULT_THEME.bg,
    fontSize: 9,
    fontFamily: 'Outfit_600SemiBold',
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  largeTextInput: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    paddingVertical: 4,
  },
  standardTextInput: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    paddingVertical: 6,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginVertical: 18,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyPrefix: {
    fontSize: 32,
    fontFamily: 'Outfit_700Bold',
  },
  currencyPrefixSmall: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
  },
  heroAmountInput: {
    fontSize: 32,
    fontFamily: 'Outfit_700Bold',
    flex: 1,
    paddingVertical: 2,
  },
  percentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subActionLink: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    textDecorationLine: 'underline',
  },
  fieldHint: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 4,
  },
  presetScroll: {
    marginTop: 10,
  },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginRight: 8,
  },
  presetPillActive: {
    backgroundColor: DEFAULT_THEME.text,
  },
  presetPillText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    color: DEFAULT_THEME.text,
  },
  presetPillTextActive: {
    color: DEFAULT_THEME.bg,
    fontFamily: 'Outfit_600SemiBold',
  },
  amortizationBox: {
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 16,
    padding: 16,
  },
  amortLabel: {
    fontSize: 12.5,
    fontFamily: 'Outfit_400Regular',
    color: DEFAULT_THEME.sub,
  },
  amortValue: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: DEFAULT_THEME.text,
  },
  amortValueBold: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
    color: DEFAULT_THEME.text,
  },
  customEmiToggleRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
  },
  customEmiToggleText: {
    fontSize: 11.5,
    fontFamily: 'Outfit_600SemiBold',
    color: DEFAULT_THEME.text,
  },
  selectorTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  selectorTriggerValue: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  reviewSummaryBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: DEFAULT_THEME.bg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  reviewTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
    color: DEFAULT_THEME.text,
  },
  reviewSub: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: DEFAULT_THEME.sub,
    marginTop: 1,
  },
  readyBadge: {
    backgroundColor: DEFAULT_THEME.text,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  readyBadgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    color: DEFAULT_THEME.bg,
    letterSpacing: 0.5,
  },
  bottomActionBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: DEFAULT_THEME.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
  },
  primaryActionButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: DEFAULT_THEME.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryActionText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: DEFAULT_THEME.bg,
  },

  /* Modal Styles */
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12.5,
    fontFamily: 'Outfit_400Regular',
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#0F172A',
  },
  iconGridContent: {
    paddingHorizontal: 14,
    paddingBottom: 30,
  },
  iconGridCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 6,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  iconGridCellSelected: {
    borderColor: '#CA8A04',
    borderWidth: 2,
    backgroundColor: '#FEF08A',
  },
  iconCellName: {
    fontSize: 9.5,
    fontFamily: 'Outfit_500Medium',
    color: '#475569',
    marginTop: 4,
    textAlign: 'center',
  },
});
