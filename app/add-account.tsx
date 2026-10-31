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
  Switch,
  Keyboard,
  InputAccessoryView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Search,
  Wallet,
  Landmark,
  Activity,
  CreditCard,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { formatIndianAmount, parseIndianAmount } from '@/utils/formatters';
import { Account, AccountType } from '@/types/money';
import { BANK_BRANDS, BankLogo } from '@/components/BankLogo';
import { Category3DIcon } from '@/components/Category3DIcon';
import { CATEGORY_3D_ICONS_LIST } from '@/constants/Category3DIcons';

interface AccountTypeConfig {
  type: AccountType;
  title: string;
  shortDescription: string;
  category3d: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

const ACCOUNT_TYPES: AccountTypeConfig[] = [
  {
    type: 'savings',
    title: 'Savings / Bank',
    shortDescription: 'Checking & salary accounts',
    category3d: 'bank',
    description: 'Everyday checking, salary & savings bank accounts',
    icon: Landmark,
  },
  {
    type: 'credit_card',
    title: 'Credit Card',
    shortDescription: 'Cards & credit limits',
    category3d: 'creditcard',
    description: 'Cards with credit limits, billing dates & rewards',
    icon: CreditCard,
  },
  {
    type: 'wallet',
    title: 'Cash & Wallet',
    shortDescription: 'Physical cash & UPI wallets',
    category3d: 'wallet',
    description: 'Physical cash, petty cash & digital UPI wallets',
    icon: Wallet,
  },
  {
    type: 'investment',
    title: 'Investment',
    shortDescription: 'Stocks & demat portfolios',
    category3d: 'stockmarket',
    description: 'Stocks, mutual funds, crypto & demat portfolios',
    icon: Activity,
  },
  {
    type: 'emergency_fund',
    title: 'Emergency Fund',
    shortDescription: 'Fixed deposits & reserves',
    category3d: 'emergency',
    description: 'Fixed deposits & liquid rainy-day safety nets',
    icon: PiggyBank,
  },
  {
    type: 'receivable',
    title: 'Receivable',
    shortDescription: 'Money lent out (Asset)',
    category3d: 'peer',
    description: 'Money lent out to friends, family or clients (Asset)',
    icon: ArrowDownLeft,
  },
  {
    type: 'payable',
    title: 'Payable',
    shortDescription: 'Money you owe (Debt)',
    category3d: 'debts',
    description: 'Money borrowed or informal debts you owe (Liability)',
    icon: ArrowUpRight,
  },
];

const POPULAR_BROKERS = [
  'Zerodha',
  'Groww',
  'Upstox',
  'IND Money',
  'Angel One',
  'HDFC Securities',
  'ICICI Direct',
];

const EMPTY_ACCESSORY_ID = 'gainbase-empty-accessory';

export default function AddAccountScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

  const { accounts, addAccount, updateAccount } = useMoneyStore();
  const portfolioTransactions = usePortfolioStore((state) => state.transactions);

  const editingAccount = useMemo(() => {
    return id ? accounts.find((acc) => String(acc.id) === String(id)) : null;
  }, [id, accounts]);

  // Step state: 0: Type, 1: Details & Branding, 2: Balances & Settings
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [type, setType] = useState<AccountType>('savings');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [institution, setInstitution] = useState('');
  const [logo, setLogo] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#0369A1');
  const [iconId, setIconId] = useState('');
  const [isLogoManuallySelected, setIsLogoManuallySelected] = useState(false);
  const [includeInAssets, setIncludeInAssets] = useState(true);
  const [linkedBroker, setLinkedBroker] = useState('');

  // Modals
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [brokerSearchQuery, setBrokerSearchQuery] = useState('');

  // Keyboard listener for bottom padding
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

  // Pre-populate when editing
  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setBalance(formatIndianAmount(Math.abs(editingAccount.balance).toString()));
      setCreditLimit(editingAccount.creditLimit ? formatIndianAmount(editingAccount.creditLimit.toString()) : '');
      setInstitution(editingAccount.institution || '');
      setLogo(editingAccount.logo || '');
      setAccountNumber(editingAccount.accountNumber || '');
      setColor(editingAccount.color);
      setIconId(editingAccount.icon || (editingAccount.type === 'wallet' ? 'wallet' : ''));
      setIncludeInAssets(editingAccount.includeInAssets !== false);
      setLinkedBroker(editingAccount.linkedBroker || '');
      setIsLogoManuallySelected(Boolean(editingAccount.logo));
    }
  }, [editingAccount]);

  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  const activeTypeConfig = useMemo(() => {
    return ACCOUNT_TYPES.find((t) => t.type === type) || ACCOUNT_TYPES[0];
  }, [type]);

  // Unified Native Theme
  const THEME = useMemo(() => {
    return {
      bg: currColors.background,
      cardBg: currColors.card,
      cardBorder: currColors.border,
      text: currColors.text,
      sub: currColors.textSecondary,
      accentPill: currColors.cardSecondary,
      trackActive: currColors.tintMoney,
      trackInactive: isDark ? '#2C2C2E' : '#E5E5EA',
    };
  }, [currColors, isDark]);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Auto-match bank brand or broker when typing name if not manually selected
  const handleNameChange = (inputText: string) => {
    setName(inputText);
    if (editingAccount && isLogoManuallySelected) return;

    const lowerText = inputText.toLowerCase().trim();

    if (!lowerText) {
      if (!isLogoManuallySelected) {
        setLogo('');
        setInstitution('');
        if (type === 'investment') setLinkedBroker('');
      }
      return;
    }

    // 1. Check bank brands
    const matchedBrand = BANK_BRANDS.find((brand) => {
      return (
        lowerText.includes(brand.id) ||
        lowerText.includes(brand.initials.toLowerCase()) ||
        lowerText.includes(brand.name.toLowerCase())
      );
    });

    if (matchedBrand) {
      setLogo(matchedBrand.id);
      setInstitution(matchedBrand.name);
      return;
    }

    // 2. Check brokers for investment
    if (type === 'investment') {
      const matchedBroker = POPULAR_BROKERS.find((b) =>
        lowerText.includes(b.toLowerCase())
      );
      if (matchedBroker) {
        setLinkedBroker(matchedBroker);
        const brokerBrand = BANK_BRANDS.find(
          (b) =>
            b.name.toLowerCase().includes(matchedBroker.toLowerCase()) ||
            b.id.toLowerCase().includes(matchedBroker.toLowerCase())
        );
        if (brokerBrand) {
          setLogo(brokerBrand.id);
        }
      }
    }
  };

  const handleLogoClick = () => {
    handleHaptic();
    if (type === 'investment') {
      setShowBrokerModal(true);
    } else if (type === 'savings' || type === 'credit_card' || type === 'emergency_fund') {
      setShowLogoModal(true);
    } else {
      setShowIconModal(true);
    }
  };

  // Step Validation & Navigation
  const validateStep = (step: number): boolean => {
    if (step === 0) {
      return true;
    }
    if (step === 1) {
      if (!name.trim()) {
        Alert.alert('Required Field', 'Please provide a name for this account.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      const parsedBalance = parseIndianAmount(balance);
      if (isNaN(parsedBalance) && !editingAccount && type !== 'credit_card') {
        Alert.alert('Invalid Balance', 'Please enter a valid numeric starting balance.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    handleHaptic();
    if (!validateStep(currentStep)) return;
    if (currentStep < 2) {
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
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter an account name.');
      return;
    }

    const parsedBalance = parseIndianAmount(balance) || 0;
    let finalBalance = Math.round(parsedBalance * 100) / 100;
    if (type === 'credit_card' || type === 'payable') {
      finalBalance = -Math.abs(finalBalance);
    } else {
      finalBalance = Math.abs(finalBalance);
    }

    const parsedLimit = creditLimit ? Math.round((parseIndianAmount(creditLimit) || 0) * 100) / 100 : undefined;

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
        icon: (type === 'receivable' || type === 'payable' || type === 'wallet')
          ? (iconId || (type === 'wallet' ? 'wallet' : (type === 'receivable' ? 'receivable' : 'payable')))
          : undefined,
        includeInAssets,
        linkedBroker: type === 'investment' ? (linkedBroker || undefined) : undefined,
      });
    } else {
      const resolvedIcon =
        (type === 'receivable' || type === 'payable' || type === 'wallet')
          ? (iconId || (type === 'wallet' ? 'wallet' : (type === 'receivable' ? 'receivable' : 'payable')))
          : type === 'savings' ? 'Landmark'
          : type === 'investment' ? 'Activity'
          : type === 'emergency_fund' ? 'PiggyBank'
          : 'CreditCard';

      const newAccount: Account = {
        id: Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        type,
        icon: resolvedIcon,
        balance: finalBalance,
        creditLimit: type === 'credit_card' ? (parsedLimit || 0) : undefined,
        institution: institution.trim() || undefined,
        logo: logo || undefined,
        accountNumber: accountNumber.trim() || undefined,
        color,
        includeInAssets,
        linkedBroker: type === 'investment' ? (linkedBroker || undefined) : undefined,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addAccount(newAccount);
    }

    router.back();
  };

  // Broker list with deduplication
  const availableBrokers = useMemo(() => {
    const portfolioBrokers = portfolioTransactions.map((t) => t.broker).filter(Boolean) as string[];
    const merged = new Set([...portfolioBrokers, ...POPULAR_BROKERS]);
    return Array.from(merged);
  }, [portfolioTransactions]);

  const filteredBrokers = useMemo(() => {
    if (!brokerSearchQuery.trim()) return availableBrokers;
    const q = brokerSearchQuery.toLowerCase().trim();
    return availableBrokers.filter((b) => b.toLowerCase().includes(q));
  }, [availableBrokers, brokerSearchQuery]);

  // Filtered brands for modal
  const filteredBrands = useMemo(() => {
    if (!brandSearchQuery.trim()) return BANK_BRANDS;
    const q = brandSearchQuery.toLowerCase().trim();
    return BANK_BRANDS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.initials.toLowerCase().includes(q)
    );
  }, [brandSearchQuery]);

  // Filtered 3D icons for picker
  const filteredIcons = useMemo(() => {
    if (!iconSearchQuery.trim()) return CATEGORY_3D_ICONS_LIST;
    const q = iconSearchQuery.toLowerCase().trim();
    return CATEGORY_3D_ICONS_LIST.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.some((kw) => kw.toLowerCase().includes(q)))
    );
  }, [iconSearchQuery]);

  // Calculations for Step 2
  const parsedOutstandingNum = useMemo(() => {
    return parseIndianAmount(balance) || 0;
  }, [balance]);

  const parsedLimitNum = useMemo(() => {
    return parseIndianAmount(creditLimit) || 0;
  }, [creditLimit]);

  const utilizationRate = useMemo(() => {
    if (type !== 'credit_card' || parsedLimitNum <= 0) return 0;
    return Math.round((parsedOutstandingNum / parsedLimitNum) * 100);
  }, [type, parsedOutstandingNum, parsedLimitNum]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: THEME.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

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
            {editingAccount ? 'Edit Account' : 'Add Account'}
          </ThemedText>

          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: THEME.text + '14' }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <X size={20} color={THEME.text} />
          </TouchableOpacity>
        </View>

        {/* 3-Segment Progress Bar */}
        <View style={styles.segmentedProgressBar}>
          {[0, 1, 2].map((stepIdx) => (
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
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isKeyboardVisible ? 24 : 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          {/* ════════════ STEP 0: ACCOUNT TYPE ════════════ */}
          {currentStep === 0 && (
            <View style={styles.stepContainer}>
              <View style={[styles.typeGrid, { marginTop: 6 }]}>
                {ACCOUNT_TYPES.map((item) => {
                  const isSelected = type === item.type;
                  return (
                    <TouchableOpacity
                      key={item.type}
                      style={[
                        styles.typeBox,
                        {
                          borderColor: isSelected ? currColors.tintMoney : currColors.border,
                          backgroundColor: isSelected
                            ? (isDark ? '#2C2C2E' : '#FFFFFF')
                            : (isDark ? currColors.card : '#FFFFFF'),
                        },
                      ]}
                      onPress={() => {
                        handleHaptic();
                        setType(item.type);
                        if (item.type === 'wallet' && !iconId) {
                          setIconId('wallet');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.typeBoxTopRow}>
                        <View style={styles.typeBoxIconWrap}>
                          <Category3DIcon name={item.category3d} size={38} />
                        </View>

                        {isSelected ? (
                          <View style={[styles.typeBoxCheck, { backgroundColor: currColors.tintMoney }]}>
                            <Check size={11} color={isDark ? '#003328' : '#FFFFFF'} strokeWidth={3} />
                          </View>
                        ) : (
                          <View style={[styles.typeBoxInactiveDot, { borderColor: currColors.border }]} />
                        )}
                      </View>

                      <View>
                        <ThemedText
                          style={[
                            styles.typeBoxTitle,
                            { color: currColors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.typeBoxDescription,
                            { color: currColors.textSecondary },
                          ]}
                          numberOfLines={2}
                        >
                          {item.shortDescription}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ════════════ STEP 1: DETAILS & BRANDING ════════════ */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              {/* Account Name Card with clickable brand logo on left */}
              <View style={[styles.sectionCard, { backgroundColor: THEME.cardBg, borderColor: THEME.cardBorder }]}>
                <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                  ACCOUNT NAME
                </ThemedText>
                <View style={styles.nameInputRow}>
                  {/* Clickable Logo on the left - NO BOUNDARIES */}
                  <TouchableOpacity
                    style={styles.logoTriggerButton}
                    onPress={handleLogoClick}
                    activeOpacity={0.7}
                  >
                    {logo ? (
                      <BankLogo logo={logo} size={32} />
                    ) : (
                      <Category3DIcon
                        name={iconId || activeTypeConfig.category3d}
                        size={34}
                      />
                    )}
                  </TouchableOpacity>

                  {/* TextInput */}
                  <TextInput
                    style={[
                      styles.nameTextInput,
                      {
                        backgroundColor: isDark ? currColors.cardSecondary : '#F2F2F7',
                        color: THEME.text,
                        borderColor: THEME.cardBorder,
                      },
                    ]}
                    placeholder={
                      type === 'savings'
                        ? 'e.g. HDFC Salary Account'
                        : type === 'credit_card'
                        ? 'e.g. ICICI Sapphiro Credit Card'
                        : type === 'investment'
                        ? 'e.g. Zerodha Stock Portfolio'
                        : type === 'emergency_fund'
                        ? 'e.g. Axis 1-Year FD'
                        : 'e.g. Pocket Cash Wallet'
                    }
                    placeholderTextColor={THEME.sub + '80'}
                    selectionColor={currColors.tintMoney}
                    value={name}
                    onChangeText={handleNameChange}
                    autoCorrect={false}
                    spellCheck={false}
                    returnKeyType="done"
                    autoFocus={!editingAccount}
                  />
                </View>
              </View>

              {/* Account Identifier Card */}
              <View style={[styles.sectionCard, { backgroundColor: THEME.cardBg, borderColor: THEME.cardBorder }]}>
                <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                  LAST 4 DIGITS / ACCOUNT NUMBER (OPTIONAL)
                </ThemedText>
                <TextInput
                  style={[
                    styles.standardInput,
                    {
                      backgroundColor: isDark ? currColors.cardSecondary : '#F2F2F7',
                      color: THEME.text,
                      borderColor: THEME.cardBorder,
                    },
                  ]}
                  placeholder="e.g. •••• 4021"
                  placeholderTextColor={THEME.sub + '80'}
                  selectionColor={currColors.tintMoney}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  autoCorrect={false}
                  spellCheck={false}
                  autoCapitalize="none"
                  inputAccessoryViewID={EMPTY_ACCESSORY_ID}
                />
              </View>
            </View>
          )}

          {/* ════════════ STEP 2: BALANCES & LIMITS ════════════ */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              {/* Balance & Limits Card */}
              <View style={[styles.sectionCard, { backgroundColor: THEME.cardBg, borderColor: THEME.cardBorder }]}>
                {type === 'credit_card' ? (
                  <>
                    {/* Current Outstanding */}
                    <View>
                      <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                        CURRENT OUTSTANDING DUE (₹)
                      </ThemedText>
                      <View style={styles.amountInputRow}>
                        <ThemedText style={[styles.currencyPrefix, { color: THEME.text }]}>₹</ThemedText>
                        <TextInput
                          style={[styles.heroAmountInput, { color: THEME.text }]}
                          placeholder="0"
                          placeholderTextColor={THEME.text + '4D'}
                          keyboardType="numeric"
                          value={balance}
                          onChangeText={(val) => setBalance(formatIndianAmount(val))}
                          autoFocus={true}
                          inputAccessoryViewID={EMPTY_ACCESSORY_ID}
                        />
                      </View>
                      <ThemedText style={[styles.inputExplainer, { color: THEME.sub }]}>
                        Amount billed or spent that you currently owe on this card.
                      </ThemedText>
                    </View>

                    <View style={[styles.fieldDivider, { backgroundColor: THEME.text + '14' }]} />

                    {/* Total Credit Limit */}
                    <View>
                      <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                        TOTAL CREDIT LIMIT (₹)
                      </ThemedText>
                      <View style={styles.amountInputRow}>
                        <ThemedText style={[styles.currencyPrefix, { color: THEME.text }]}>₹</ThemedText>
                        <TextInput
                          style={[styles.heroAmountInput, { color: THEME.text, fontSize: 32 }]}
                          placeholder="0"
                          placeholderTextColor={THEME.text + '4D'}
                          keyboardType="numeric"
                          value={creditLimit}
                          onChangeText={(val) => setCreditLimit(formatIndianAmount(val))}
                          inputAccessoryViewID={EMPTY_ACCESSORY_ID}
                        />
                      </View>
                    </View>

                    {/* Real-time Utilization Indicator */}
                    {parsedLimitNum > 0 && (
                      <View
                        style={[
                          styles.utilizationCard,
                          {
                            backgroundColor: isDark ? currColors.cardSecondary : '#F9FAFB',
                            borderColor: currColors.border,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {utilizationRate > 70 ? (
                              <AlertCircle size={16} color="#DC2626" />
                            ) : (
                              <ShieldCheck size={16} color={utilizationRate > 30 ? '#D97706' : '#16A34A'} />
                            )}
                            <ThemedText
                              style={[
                                styles.utilizationLabel,
                                {
                                  color:
                                    utilizationRate > 70
                                      ? '#DC2626'
                                      : utilizationRate > 30
                                      ? '#B45309'
                                      : '#15803D',
                                },
                              ]}
                            >
                              {utilizationRate}% Utilization ({utilizationRate <= 30 ? 'Healthy' : utilizationRate <= 70 ? 'Moderate' : 'High'})
                            </ThemedText>
                          </View>
                          <ThemedText
                            style={[
                              styles.availableLimitText,
                              {
                                color:
                                  utilizationRate > 70
                                    ? '#DC2626'
                                    : utilizationRate > 30
                                    ? '#B45309'
                                    : '#15803D',
                              },
                            ]}
                          >
                            ₹{Math.max(0, parsedLimitNum - parsedOutstandingNum).toLocaleString('en-IN')} Available
                          </ThemedText>
                        </View>

                        {/* Bar indicator */}
                        <View style={styles.utilizationTrack}>
                          <View
                            style={[
                              styles.utilizationFill,
                              {
                                width: `${Math.min(100, Math.max(0, utilizationRate))}%`,
                                backgroundColor:
                                  utilizationRate > 70
                                    ? '#DC2626'
                                    : utilizationRate > 30
                                    ? '#F59E0B'
                                    : '#16A34A',
                              },
                            ]}
                          />
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  /* Standard Balance Input for other account types */
                  <View>
                    <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                      {type === 'payable' ? 'AMOUNT CURRENTLY OWED (₹)' : 'STARTING BALANCE (₹)'}
                    </ThemedText>
                    <View style={styles.amountInputRow}>
                      <ThemedText style={[styles.currencyPrefix, { color: THEME.text }]}>₹</ThemedText>
                      <TextInput
                        style={[styles.heroAmountInput, { color: THEME.text }]}
                        placeholder="0"
                        placeholderTextColor={THEME.text + '4D'}
                        keyboardType="numeric"
                        value={balance}
                        onChangeText={(val) => setBalance(formatIndianAmount(val))}
                        autoFocus={true}
                        inputAccessoryViewID={EMPTY_ACCESSORY_ID}
                      />
                    </View>

                    {/* Quick Amount Preset Chips */}
                    <View style={styles.presetsWrap}>
                      {['0', '5000', '25000', '100000', '500000'].map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={[
                            styles.presetChip,
                            { backgroundColor: THEME.accentPill, borderColor: THEME.text + '20' },
                          ]}
                          onPress={() => {
                            handleHaptic();
                            setBalance(formatIndianAmount(amt));
                          }}
                          activeOpacity={0.7}
                        >
                          <ThemedText style={[styles.presetChipText, { color: THEME.text }]}>
                            ₹{Number(amt).toLocaleString('en-IN')}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Include in Total Net Worth Toggle Card */}
              <View style={[styles.sectionCard, { backgroundColor: THEME.cardBg, borderColor: THEME.cardBorder }]}>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <ThemedText style={[styles.toggleTitle, { color: THEME.text }]}>
                      Include in Total Net Worth
                    </ThemedText>
                    <ThemedText style={[styles.toggleSubtitle, { color: THEME.sub }]}>
                      When active, this balance will contribute to your aggregated assets & liabilities.
                    </ThemedText>
                  </View>
                  <Switch
                    value={includeInAssets}
                    onValueChange={(val) => {
                      handleHaptic();
                      setIncludeInAssets(val);
                    }}
                    trackColor={{ false: THEME.trackInactive, true: THEME.text }}
                    thumbColor="#FFFFFF"
                  />
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
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              paddingBottom: isKeyboardVisible
                ? 24
                : Math.max(insets.bottom, 16) + 8,
            },
          ]}
        >
          {currentStep > 0 && (
            <TouchableOpacity
              style={[
                styles.backActionButton,
                {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)',
                  backgroundColor: 'transparent',
                },
              ]}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <ArrowLeft size={18} color={currColors.text} />
              <ThemedText style={[styles.backActionText, { color: currColors.text }]}>
                Back
              </ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.primaryActionButton,
              {
                backgroundColor: isDark ? '#FFFFFF' : '#1C1917',
              },
            ]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <ThemedText style={[styles.primaryActionText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
              {currentStep === 2
                ? editingAccount
                  ? 'Update Account'
                  : 'Save Account'
                : 'Continue'}
            </ThemedText>
            {currentStep === 2 ? (
              <Check size={18} color={isDark ? '#000000' : '#FFFFFF'} strokeWidth={2.5} />
            ) : (
              <ArrowRight size={18} color={isDark ? '#000000' : '#FFFFFF'} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>

        {/* Empty InputAccessoryView to suppress the default iOS Done button toolbar */}
        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={EMPTY_ACCESSORY_ID}>
            <View />
          </InputAccessoryView>
        )}

        {/* ─── Full-Page Bank Logo Modal ─── */}
      <Modal
        visible={showLogoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLogoModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: '#F8FAFC' }]}>
          <View style={styles.modalHeaderRow}>
            <ThemedText style={styles.modalHeaderTitle}>Select Bank / Institution</ThemedText>
            <TouchableOpacity
              onPress={() => {
                setShowLogoModal(false);
                setBrandSearchQuery('');
              }}
              style={styles.modalCloseButton}
            >
              <X size={20} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchContainer}>
            <View style={styles.modalSearchBox}>
              <Search size={18} color="#9CA3AF" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search bank name (e.g. HDFC, SBI, Axis)..."
                placeholderTextColor="#9CA3AF"
                value={brandSearchQuery}
                onChangeText={setBrandSearchQuery}
                autoCorrect={false}
              />
              {brandSearchQuery ? (
                <TouchableOpacity onPress={() => setBrandSearchQuery('')}>
                  <X size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.modalListContent}>
            {filteredBrands.map((b) => {
              const isSelected = logo.toLowerCase() === b.id.toLowerCase();
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.bankModalItem, isSelected && styles.bankModalItemSelected]}
                  onPress={() => {
                    handleHaptic();
                    setLogo(b.id);
                    setInstitution(b.name);
                    setIsLogoManuallySelected(true);
                    setShowLogoModal(false);
                    setBrandSearchQuery('');
                  }}
                  activeOpacity={0.7}
                >
                  <BankLogo logo={b.id} size={36} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <ThemedText style={styles.bankModalItemTitle}>{b.name}</ThemedText>
                    <ThemedText style={styles.bankModalItemCategory}>{b.category?.toUpperCase() || 'BANK'}</ThemedText>
                  </View>
                  {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Full-Page Broker Modal ─── */}
      <Modal
        visible={showBrokerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBrokerModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: '#F8FAFC' }]}>
          <View style={styles.modalHeaderRow}>
            <ThemedText style={styles.modalHeaderTitle}>Select Broker / Platform</ThemedText>
            <TouchableOpacity
              onPress={() => {
                setShowBrokerModal(false);
                setBrokerSearchQuery('');
              }}
              style={styles.modalCloseButton}
            >
              <X size={20} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchContainer}>
            <View style={styles.modalSearchBox}>
              <Search size={18} color="#9CA3AF" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search broker (e.g. Zerodha, Groww)..."
                placeholderTextColor="#9CA3AF"
                value={brokerSearchQuery}
                onChangeText={setBrokerSearchQuery}
                autoCorrect={false}
              />
              {brokerSearchQuery ? (
                <TouchableOpacity onPress={() => setBrokerSearchQuery('')}>
                  <X size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.modalListContent}>
            {filteredBrokers.map((broker) => {
              const isSelected = linkedBroker === broker;
              return (
                <TouchableOpacity
                  key={broker}
                  style={[styles.bankModalItem, isSelected && styles.bankModalItemSelected]}
                  onPress={() => {
                    handleHaptic();
                    setLinkedBroker(broker);
                    if (!name) setName(broker);
                    setShowBrokerModal(false);
                    setBrokerSearchQuery('');
                  }}
                  activeOpacity={0.7}
                >
                  <Activity size={24} color={currColors.tintMoney} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <ThemedText style={styles.bankModalItemTitle}>{broker}</ThemedText>
                    <ThemedText style={styles.bankModalItemCategory}>INVESTMENT BROKER</ThemedText>
                  </View>
                  {isSelected && <Check size={18} color={currColors.tintMoney} strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Full-Page 3D Icon Picker Modal ─── */}
      <Modal
        visible={showIconModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowIconModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: '#F8FAFC' }]}>
          <View style={styles.modalHeaderRow}>
            <ThemedText style={styles.modalHeaderTitle}>Choose 3D Avatar Icon</ThemedText>
            <TouchableOpacity
              onPress={() => {
                setShowIconModal(false);
                setIconSearchQuery('');
              }}
              style={styles.modalCloseButton}
            >
              <X size={20} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchContainer}>
            <View style={styles.modalSearchBox}>
              <Search size={18} color="#9CA3AF" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search 80+ 3D objects (cash, safe, wallet)..."
                placeholderTextColor="#9CA3AF"
                value={iconSearchQuery}
                onChangeText={setIconSearchQuery}
                autoCorrect={false}
              />
              {iconSearchQuery ? (
                <TouchableOpacity onPress={() => setIconSearchQuery('')}>
                  <X size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.iconGridContent}>
            <View style={styles.iconGridWrap}>
              {filteredIcons.map((item) => {
                const isSelected = iconId === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.iconGridCard, isSelected && styles.iconGridCardSelected]}
                    onPress={() => {
                      handleHaptic();
                      setIconId(item.id);
                      setShowIconModal(false);
                      setIconSearchQuery('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Category3DIcon name={item.id} size={38} />
                    <ThemedText style={styles.iconGridCardLabel} numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                    {isSelected && (
                      <View style={styles.iconSelectedBadge}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerScreenTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.2,
  },
  segmentedProgressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  stepContainer: {
    width: '100%',
  },
  sectionCard: {
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  typeBox: {
    width: '48.2%',
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    padding: 14,
    justifyContent: 'space-between',
    minHeight: 126,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  typeBoxTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBoxIconWrap: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBoxCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBoxInactiveDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  typeBoxTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  typeBoxDescription: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 15,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoTriggerButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameTextInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
  },
  standardInput: {
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  presetsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  fieldDivider: {
    height: 1,
    marginVertical: 18,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    fontSize: 34,
    fontFamily: 'Outfit_600SemiBold',
    marginRight: 6,
  },
  heroAmountInput: {
    flex: 1,
    fontSize: 40,
    fontFamily: 'Outfit_700Bold',
    padding: 0,
  },
  inputExplainer: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 6,
  },
  utilizationCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  utilizationLabel: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  availableLimitText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  utilizationTrack: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  utilizationFill: {
    height: '100%',
    borderRadius: 3,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 16,
  },
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backActionButton: {
    height: 50,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexShrink: 0,
  },
  backActionText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  primaryActionButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 1,
  },
  primaryActionText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  // Modal styling
  modalRoot: {
    flex: 1,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    color: '#111827',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#111827',
  },
  modalListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bankModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  bankModalItemSelected: {
    borderColor: '#00C9A7',
    backgroundColor: '#F0FDF4',
  },
  bankModalItemTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: '#111827',
  },
  bankModalItemCategory: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    color: '#6B7280',
    marginTop: 1,
  },
  iconGridContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  iconGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  iconGridCard: {
    width: '22.5%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    position: 'relative',
  },
  iconGridCardSelected: {
    borderColor: '#00C9A7',
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
  },
  iconGridCardLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    color: '#4B5563',
    marginTop: 4,
    textAlign: 'center',
  },
  iconSelectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00C9A7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
