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
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  X,
  Check,
  Search,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Loan, Account } from '@/types/money';
import { BankLogo } from '@/components/BankLogo';
import { Category3DIcon } from '@/components/Category3DIcon';
import { AccountLogoOrIcon } from '@/components/AccountLogoOrIcon';
import { AccountPickerModal } from '@/components/AccountPickerModal';
import {
  CATEGORY_3D_ICONS_LIST,
  findBest3DIconForText,
  LOAN_3D_ICON_MAP,
} from '@/constants/Category3DIcons';
import { formatCurrencyINR, formatIndianAmount, parseIndianAmount } from '@/utils/formatters';

export default function AddLoanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

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
  const [icon, setIcon] = useState('house');
  const [isIconManuallyChosen, setIsIconManuallyChosen] = useState(false);
  const [customEmi, setCustomEmi] = useState('');

  // Modal State
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

  // Filter 3D icons for Choose Icon Modal
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

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

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
      setIcon(editingLoan.icon || LOAN_3D_ICON_MAP[editingLoan.type] || 'house');
      setIsIconManuallyChosen(true);
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

  // Auto-predict 3D icon when loan name is typed (unless manually chosen)
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
    handleHaptic();
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
    const startDay = endDate.getDate();
    endDate.setDate(1);
    endDate.setMonth(endDate.getMonth() + N);
    const maxDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
    endDate.setDate(Math.min(startDay, maxDays));

    // Determine type from icon if not existing
    let loanType: Loan['type'] = editingLoan?.type || 'other';
    if (['house', 'home_garden'].includes(icon)) loanType = 'home';
    else if (['car', 'bus', 'fuel'].includes(icon)) loanType = 'car';
    else if (['salary', 'banknote', 'money', 'personal', 'coin', 'credit_card'].includes(icon)) loanType = 'personal';
    else if (['education', 'books'].includes(icon)) loanType = 'education';

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
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const headerTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24);

  return (
    <View style={[styles.mainContainer, { backgroundColor: currColors.background }]}>
      <StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />
      
      {/* iOS Full Page Clean Header with dynamic top safe padding */}
      <View style={[styles.header, { paddingTop: headerTopPadding, backgroundColor: currColors.background, borderBottomColor: currColors.border }]}>
        <TouchableOpacity
          onPress={() => {
            handleHaptic();
            router.back();
          }}
          style={styles.headerButton}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ThemedText style={[styles.headerButtonText, { color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }]}>
            Cancel
          </ThemedText>
        </TouchableOpacity>
        
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          {editingLoan ? 'Edit Loan & EMI' : 'Add Loan & EMI'}
        </ThemedText>

        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerButton}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ThemedText style={[styles.headerButtonText, styles.saveButtonText, { color: '#00C9A7', fontFamily: 'Outfit_600SemiBold' }]}>
            Save
          </ThemedText>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                onChangeText={handleNameChange}
                textAlign="right"
              />
            </View>

            {/* Choose Icon Row (Replaced Category with Full Page 3D Icon Picker) */}
            <TouchableOpacity
              style={[styles.formRow, { borderBottomColor: currColors.border }]}
              onPress={() => {
                handleHaptic();
                setIconSearch('');
                setShowIconModal(true);
              }}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.label, { color: currColors.text }]}>Choose Icon</ThemedText>
              <View style={styles.valueContainer}>
                <View style={styles.typeBadge}>
                  <Category3DIcon
                    name={icon}
                    size={26}
                    style={{ marginRight: 8 }}
                  />
                  <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                    {selectedIconItem?.name || icon.charAt(0).toUpperCase() + icon.slice(1)}
                  </ThemedText>
                </View>
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
              <TextInput
                style={[styles.input, { color: currColors.text }]}
                placeholder="₹ 0"
                placeholderTextColor={currColors.textSecondary}
                value={principalAmount ? `₹ ${principalAmount}` : ''}
                onChangeText={(val) => {
                  const clean = val.replace(/[^0-9.]/g, '');
                  const formatted = formatIndianAmount(clean);
                  setPrincipalAmount(formatted);
                  if (!paidEmis || paidEmis === '0') {
                    setOutstandingAmount(formatted);
                  }
                }}
                keyboardType="decimal-pad"
                textAlign="right"
              />
            </View>

            {/* Interest Rate Row */}
            <View style={[styles.formRow, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.label, { color: currColors.text }]}>Interest Rate (Annual %)</ThemedText>
              <TextInput
                style={[styles.input, { color: currColors.text }]}
                placeholder="0%"
                placeholderTextColor={currColors.textSecondary}
                value={interestRate ? `${interestRate}%` : ''}
                onChangeText={(val) => {
                  const clean = val.replace(/[^0-9.]/g, '');
                  setInterestRate(clean);
                }}
                keyboardType="decimal-pad"
                textAlign="right"
              />
            </View>

            {/* Tenure in Months Row */}
            <View style={[styles.formRow, styles.formRowLast]}>
              <ThemedText style={[styles.label, { color: currColors.text }]}>Tenure (Months)</ThemedText>
              <TextInput
                style={[styles.input, { color: currColors.text }]}
                placeholder="e.g. 240 (20 Years)"
                placeholderTextColor={currColors.textSecondary}
                value={tenureMonths}
                onChangeText={setTenureMonths}
                keyboardType="number-pad"
                textAlign="right"
              />
            </View>
          </View>

          {/* GROUP 3: EMI & REPAYMENT */}
          <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
            EMI & REPAYMENT
          </ThemedText>
          <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
            {/* Calculated EMI Display Row */}
            <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.label, { color: currColors.text }]}>Standard Calculated EMI</ThemedText>
              <ThemedText style={[styles.valueText, { color: '#00C9A7', fontFamily: 'Outfit_600SemiBold' }]}>
                {formatCurrencyINR(Math.round(calculatedEMI), true, 0)}/mo
              </ThemedText>
            </View>

            {/* Custom EMI Override Row */}
            <View style={[styles.formRow, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.label, { color: currColors.text }]}>Custom EMI (Optional)</ThemedText>
              <TextInput
                style={[styles.input, { color: currColors.text }]}
                placeholder={calculatedEMI > 0 ? `₹ ${Math.round(calculatedEMI).toLocaleString('en-IN')}` : '₹ 0'}
                placeholderTextColor={currColors.textSecondary}
                value={customEmi ? `₹ ${customEmi}` : ''}
                onChangeText={(val) => {
                  const clean = val.replace(/[^0-9.]/g, '');
                  setCustomEmi(formatIndianAmount(clean));
                }}
                keyboardType="decimal-pad"
                textAlign="right"
              />
            </View>

            {/* EMIs Already Paid Row */}
            {!editingLoan && (
              <View style={[styles.formRow, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>EMIs Already Paid</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="0"
                  placeholderTextColor={currColors.textSecondary}
                  value={paidEmis}
                  onChangeText={setPaidEmis}
                  keyboardType="number-pad"
                  textAlign="right"
                />
              </View>
            )}

            {/* Current Outstanding Balance Row */}
            <View style={[styles.formRow, styles.formRowLast]}>
              <ThemedText style={[styles.label, { color: currColors.text }]}>Current Outstanding</ThemedText>
              <TextInput
                style={[styles.input, { color: currColors.text }]}
                placeholder="₹ 0"
                placeholderTextColor={currColors.textSecondary}
                value={outstandingAmount ? `₹ ${outstandingAmount}` : ''}
                onChangeText={(val) => {
                  const clean = val.replace(/[^0-9.]/g, '');
                  setOutstandingAmount(formatIndianAmount(clean));
                }}
                keyboardType="decimal-pad"
                textAlign="right"
              />
            </View>
          </View>

          {/* GROUP 4: SCHEDULE & LINKED ACCOUNT */}
          <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
            SCHEDULE & ACCOUNT
          </ThemedText>
          <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
            {/* Start Date Row */}
            <TouchableOpacity
              style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.label, { color: currColors.text }]}>First EMI / Start Date</ThemedText>
              <View style={styles.valueContainer}>
                <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                  {startDate.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </ThemedText>
                <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>

            {/* iOS Inline / Modal Date Picker */}
            {showDatePicker && (
              <View style={{ padding: 12, alignItems: 'center', backgroundColor: currColors.cardSecondary }}>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={onDateChange}
                  themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={{
                      marginTop: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: '#00C9A7',
                    }}
                  >
                    <ThemedText style={{ color: '#FFFFFF', fontFamily: 'Outfit_600SemiBold', fontSize: 13 }}>Done</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Debit Account Row */}
            <TouchableOpacity
              style={[styles.formRow, styles.formRowLast]}
              onPress={() => setShowAccountModal(true)}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.label, { color: currColors.text }]}>Debit Account</ThemedText>
              <View style={styles.valueContainer}>
                {linkedAccount ? (
                  <View style={styles.accountBadge}>
                    <AccountLogoOrIcon account={linkedAccount} size={20} />
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
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FULL PAGE 3D ICON PICKER MODAL */}
      <Modal
        visible={showIconModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setShowIconModal(false)}
      >
        <View style={[styles.modalMainContainer, { backgroundColor: currColors.background }]}>
          {/* Modal Header with safe top insets avoiding notch / Dynamic Island */}
          <View
            style={[
              styles.iconModalHeader,
              {
                paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24),
                borderBottomColor: currColors.border,
                backgroundColor: currColors.background,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                setShowIconModal(false);
              }}
              style={styles.headerButton}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ThemedText style={[styles.headerButtonText, { color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }]}>
                Cancel
              </ThemedText>
            </TouchableOpacity>

            <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
              Choose Icon
            </ThemedText>

            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                setShowIconModal(false);
              }}
              style={styles.headerButton}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ThemedText style={[styles.headerButtonText, styles.saveButtonText, { color: '#00C9A7', fontFamily: 'Outfit_600SemiBold' }]}>
                Done
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Search Bar in Modal */}
          <View style={styles.searchWrap}>
            <View style={[styles.searchBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <Search size={16} color={currColors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: currColors.text }]}
                placeholder="Search icons (house, car, cash, book, education)..."
                placeholderTextColor={currColors.textSecondary}
                value={iconSearch}
                onChangeText={setIconSearch}
                clearButtonMode="while-editing"
                autoCorrect={false}
              />
              {Boolean(iconSearch) && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIconSearch('');
                  }}
                  style={{ padding: 4 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color={currColors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 3D Icons Grid */}
          <ScrollView
            contentContainerStyle={[styles.iconsGridContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredIcons.length === 0 ? (
              <View style={styles.emptyWrap}>
                <ThemedText style={{ color: currColors.textSecondary, fontSize: 14, fontFamily: 'Outfit_400Regular' }}>
                  No icons found for "{iconSearch}"
                </ThemedText>
              </View>
            ) : (
              <View style={styles.gridRowWrap}>
                {filteredIcons.map((item) => {
                  const isSelected = icon === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.iconTile,
                        { backgroundColor: currColors.card, borderColor: currColors.border },
                        isSelected && [
                          styles.iconTileSelected,
                          { borderColor: '#00C9A7', backgroundColor: isDark ? '#00C9A722' : '#00C9A714' },
                        ],
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        handleHaptic();
                        setIcon(item.id);
                        setIsIconManuallyChosen(true);
                        setShowIconModal(false);
                      }}
                    >
                      <Category3DIcon name={item.id} size={38} />
                      <ThemedText
                        style={[
                          styles.iconTileLabel,
                          { color: isSelected ? '#00C9A7' : currColors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </ThemedText>
                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <Check size={10} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* UNIFIED ACCOUNT PICKER MODAL */}
      <AccountPickerModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onSelectAccount={(acc) => {
          setLinkedAccountId(acc.id);
        }}
        selectedAccountId={linkedAccountId}
        title="Select Debit Account"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  headerButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  headerButtonText: {
    fontSize: 17,
    fontFamily: 'Outfit_400Regular',
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
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    fontFamily: 'Outfit_400Regular',
  },
  modalMainContainer: {
    flex: 1,
  },
  iconModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  iconModalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    paddingVertical: 0,
  },
  iconsGridContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  gridRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
  },
  iconTile: {
    width: '22.5%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    position: 'relative',
  },
  iconTileSelected: {
    borderWidth: 1.5,
  },
  iconTileLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    marginTop: 4,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00C9A7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
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
