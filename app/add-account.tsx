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
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
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
import { BANK_BRANDS, BankLogo, resolveBrokerBrandLogo } from '@/components/BankLogo';
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

export default function AddAccountScreen() {
  const router = useRouter();
  const { id, type: initialType } = useLocalSearchParams<{ id?: string; type?: AccountType }>();
  const insets = useSafeAreaInsets();

  const { accounts, addAccount, updateAccount } = useMoneyStore();
  const portfolioTransactions = usePortfolioStore((state) => state.transactions);

  const editingAccount = useMemo(() => {
    return id ? accounts.find((acc) => String(acc.id) === String(id)) : null;
  }, [id, accounts]);

  // Form State
  const [type, setType] = useState<AccountType>(
    editingAccount?.type || (initialType as AccountType) || 'savings'
  );
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

  // Pre-populate when editing
  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setBalance(formatIndianAmount(Math.abs(editingAccount.balance).toString()));
      setCreditLimit(
        editingAccount.creditLimit
          ? formatIndianAmount(editingAccount.creditLimit.toString())
          : ''
      );
      setInstitution(editingAccount.institution || '');
      setLogo(editingAccount.logo || '');
      setAccountNumber(editingAccount.accountNumber || '');
      setColor(editingAccount.color);
      setIconId(
        editingAccount.icon || (editingAccount.type === 'wallet' ? 'wallet' : '')
      );
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
    } else if (
      type === 'savings' ||
      type === 'credit_card' ||
      type === 'emergency_fund'
    ) {
      setShowLogoModal(true);
    } else {
      setShowIconModal(true);
    }
  };

  const handleSave = () => {
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

    const parsedLimit = creditLimit
      ? Math.round((parseIndianAmount(creditLimit) || 0) * 100) / 100
      : undefined;

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name: name.trim(),
        type,
        balance: finalBalance,
        creditLimit: type === 'credit_card' ? parsedLimit || 0 : undefined,
        institution: institution.trim() || undefined,
        logo: logo || undefined,
        accountNumber: accountNumber.trim() || undefined,
        color,
        icon:
          type === 'receivable' || type === 'payable' || type === 'wallet'
            ? iconId ||
              (type === 'wallet'
                ? 'wallet'
                : type === 'receivable'
                ? 'receivable'
                : 'payable')
            : undefined,
        includeInAssets,
        linkedBroker:
          type === 'investment' ? linkedBroker || undefined : undefined,
      });
    } else {
      const resolvedIcon =
        type === 'receivable' || type === 'payable' || type === 'wallet'
          ? iconId ||
            (type === 'wallet'
              ? 'wallet'
              : type === 'receivable'
              ? 'receivable'
              : 'payable')
          : type === 'savings'
          ? 'Landmark'
          : type === 'investment'
          ? 'Activity'
          : type === 'emergency_fund'
          ? 'PiggyBank'
          : 'CreditCard';

      const newAccount: Account = {
        id: Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        type,
        icon: resolvedIcon,
        balance: finalBalance,
        creditLimit: type === 'credit_card' ? parsedLimit || 0 : undefined,
        institution: institution.trim() || undefined,
        logo: logo || undefined,
        accountNumber: accountNumber.trim() || undefined,
        color,
        includeInAssets,
        linkedBroker:
          type === 'investment' ? linkedBroker || undefined : undefined,
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
    const portfolioBrokers = portfolioTransactions
      .map((t) => t.broker)
      .filter(Boolean) as string[];
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

  // Credit card utilization calculations
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
            {editingAccount ? 'Edit Account' : 'Add Account'}
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
            {/* 1. HORIZONTAL ACCOUNT TYPE SELECTOR */}
            <ThemedText
              style={[styles.groupLabel, { color: currColors.textSecondary }]}
            >
              ACCOUNT TYPE
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeSelectorScroll}
              style={styles.typeSelectorContainer}
            >
              {ACCOUNT_TYPES.map((item) => {
                const isSelected = type === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? '#2C2C2E'
                            : '#FFFFFF'
                          : currColors.card,
                        borderColor: isSelected
                          ? currColors.tintMoney
                          : currColors.border,
                        borderWidth: isSelected ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setType(item.type);
                      if (item.type === 'wallet' && !iconId) {
                        setIconId('wallet');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Category3DIcon name={item.category3d} size={22} />
                    <ThemedText
                      style={[
                        styles.typePillText,
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
                      {item.title}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 2. ACCOUNT DETAILS GROUP */}
            <ThemedText
              style={[styles.groupLabel, { color: currColors.textSecondary }]}
            >
              ACCOUNT DETAILS
            </ThemedText>
            <View
              style={[styles.formGroup, { backgroundColor: currColors.card }]}
            >
              {/* Account Name & Clickable Logo */}
              <View
                style={[
                  styles.formRow,
                  styles.formRowFirst,
                  { borderBottomColor: currColors.border },
                ]}
              >
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
                      size={32}
                    />
                  )}
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
                  placeholder={
                    type === 'savings'
                      ? 'e.g. HDFC Salary Account'
                      : type === 'credit_card'
                      ? 'e.g. ICICI Sapphiro Credit Card'
                      : type === 'investment'
                      ? 'e.g. Zerodha Stock Portfolio'
                      : type === 'emergency_fund'
                      ? 'e.g. Axis 1-Year FD'
                      : type === 'receivable'
                      ? 'e.g. Loan to Rahul'
                      : type === 'payable'
                      ? 'e.g. Money Owed to Dad'
                      : 'e.g. Pocket Cash Wallet'
                  }
                  placeholderTextColor={currColors.textSecondary}
                  value={name}
                  onChangeText={handleNameChange}
                  autoCorrect={false}
                  spellCheck={false}
                  autoFocus={!editingAccount}
                />
              </View>

              {/* Institution / Linked Broker / Icon Picker Row */}
              {type === 'investment' ? (
                <TouchableOpacity
                  style={[
                    styles.formRow,
                    { borderBottomColor: currColors.border },
                  ]}
                  onPress={() => setShowBrokerModal(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText
                    style={[styles.label, { color: currColors.text }]}
                  >
                    Linked Broker
                  </ThemedText>
                  <View style={styles.valueContainer}>
                    {linkedBroker ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <BankLogo
                          logo={
                            resolveBrokerBrandLogo(linkedBroker, accounts) ||
                            linkedBroker
                          }
                          size={20}
                        />
                        <ThemedText
                          style={[styles.valueText, { color: currColors.text }]}
                        >
                          {linkedBroker}
                        </ThemedText>
                      </View>
                    ) : (
                      <ThemedText
                        style={[styles.valueText, styles.placeholderText]}
                      >
                        Select Broker
                      </ThemedText>
                    )}
                    <ChevronRight
                      size={16}
                      color={currColors.border}
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                </TouchableOpacity>
              ) : type === 'savings' ||
                type === 'credit_card' ||
                type === 'emergency_fund' ? (
                <TouchableOpacity
                  style={[
                    styles.formRow,
                    { borderBottomColor: currColors.border },
                  ]}
                  onPress={() => setShowLogoModal(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText
                    style={[styles.label, { color: currColors.text }]}
                  >
                    Bank / Institution
                  </ThemedText>
                  <View style={styles.valueContainer}>
                    {logo ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <BankLogo logo={logo} size={20} />
                        <ThemedText
                          style={[styles.valueText, { color: currColors.text }]}
                        >
                          {institution || logo}
                        </ThemedText>
                      </View>
                    ) : (
                      <ThemedText
                        style={[styles.valueText, styles.placeholderText]}
                      >
                        Select Bank
                      </ThemedText>
                    )}
                    <ChevronRight
                      size={16}
                      color={currColors.border}
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.formRow,
                    { borderBottomColor: currColors.border },
                  ]}
                  onPress={() => setShowIconModal(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText
                    style={[styles.label, { color: currColors.text }]}
                  >
                    Avatar Icon
                  </ThemedText>
                  <View style={styles.valueContainer}>
                    <Category3DIcon
                      name={iconId || activeTypeConfig.category3d}
                      size={22}
                    />
                    <ThemedText
                      style={[
                        styles.valueText,
                        { color: currColors.text, marginLeft: 6 },
                      ]}
                    >
                      {iconId ? iconId.toUpperCase() : 'Default'}
                    </ThemedText>
                    <ChevronRight
                      size={16}
                      color={currColors.border}
                      style={{ marginLeft: 6 }}
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Account Identifier */}
              <View style={[styles.formRow, styles.formRowLast]}>
                <ThemedText
                  style={[styles.label, { color: currColors.text }]}
                >
                  Last 4 Digits (Optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: currColors.text,
                      textAlign: 'right',
                    },
                  ]}
                  placeholder="•••• 4021"
                  placeholderTextColor={currColors.textSecondary}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  autoCorrect={false}
                  spellCheck={false}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* 3. BALANCES & LIMITS GROUP */}
            <ThemedText
              style={[styles.groupLabel, { color: currColors.textSecondary }]}
            >
              BALANCE & LIMITS
            </ThemedText>
            <View
              style={[styles.formGroup, { backgroundColor: currColors.card }]}
            >
              {type === 'credit_card' ? (
                <>
                  {/* Current Outstanding Due */}
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
                        Current Outstanding
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.subLabel,
                          { color: currColors.textSecondary },
                        ]}
                      >
                        Amount currently due on card
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
                        style={[
                          styles.amountInput,
                          { color: currColors.text },
                        ]}
                        placeholder="0"
                        placeholderTextColor={currColors.textSecondary}
                        keyboardType="numeric"
                        value={balance}
                        onChangeText={(val) =>
                          setBalance(formatIndianAmount(val))
                        }
                        textAlign="right"
                      />
                    </View>
                  </View>

                  {/* Total Credit Limit */}
                  <View
                    style={[
                      styles.formRow,
                      parsedLimitNum <= 0 && styles.formRowLast,
                      { borderBottomColor: currColors.border },
                    ]}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <ThemedText
                        style={[styles.label, { color: currColors.text }]}
                      >
                        Total Credit Limit
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.subLabel,
                          { color: currColors.textSecondary },
                        ]}
                      >
                        Maximum sanctioned limit
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
                        style={[
                          styles.amountInput,
                          { color: currColors.text },
                        ]}
                        placeholder="0"
                        placeholderTextColor={currColors.textSecondary}
                        keyboardType="numeric"
                        value={creditLimit}
                        onChangeText={(val) =>
                          setCreditLimit(formatIndianAmount(val))
                        }
                        textAlign="right"
                      />
                    </View>
                  </View>

                  {/* Real-time Utilization Indicator */}
                  {parsedLimitNum > 0 && (
                    <View
                      style={[
                        styles.utilizationCard,
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
                          justifyContent: 'space-between',
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {utilizationRate > 70 ? (
                            <AlertCircle size={15} color="#DC2626" />
                          ) : (
                            <ShieldCheck
                              size={15}
                              color={
                                utilizationRate > 30 ? '#D97706' : '#16A34A'
                              }
                            />
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
                            {utilizationRate}% Utilization (
                            {utilizationRate <= 30
                              ? 'Healthy'
                              : utilizationRate <= 70
                              ? 'Moderate'
                              : 'High'}
                            )
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
                          ₹
                          {Math.max(
                            0,
                            parsedLimitNum - parsedOutstandingNum
                          ).toLocaleString('en-IN')}{' '}
                          Available
                        </ThemedText>
                      </View>

                      {/* Bar indicator */}
                      <View style={styles.utilizationTrack}>
                        <View
                          style={[
                            styles.utilizationFill,
                            {
                              width: `${Math.min(
                                100,
                                Math.max(0, utilizationRate)
                              )}%`,
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
                /* Standard Balance Input */
                <>
                  <View style={[styles.formRow, styles.formRowLast]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <ThemedText
                        style={[styles.label, { color: currColors.text }]}
                      >
                        {type === 'payable'
                          ? 'Amount Currently Owed'
                          : type === 'receivable'
                          ? 'Amount Lent Out'
                          : 'Starting Balance'}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.subLabel,
                          { color: currColors.textSecondary },
                        ]}
                      >
                        {type === 'payable'
                          ? 'Debt balance you owe'
                          : type === 'receivable'
                          ? 'Asset balance due to you'
                          : 'Opening ledger balance'}
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
                        style={[
                          styles.amountInput,
                          { color: currColors.text },
                        ]}
                        placeholder="0"
                        placeholderTextColor={currColors.textSecondary}
                        keyboardType="numeric"
                        value={balance}
                        onChangeText={(val) =>
                          setBalance(formatIndianAmount(val))
                        }
                        textAlign="right"
                      />
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* 4. PREFERENCES GROUP */}
            <ThemedText
              style={[styles.groupLabel, { color: currColors.textSecondary }]}
            >
              PREFERENCES
            </ThemedText>
            <View
              style={[styles.formGroup, { backgroundColor: currColors.card }]}
            >
              <View style={[styles.formRow, styles.formRowLast]}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <ThemedText
                    style={[styles.label, { color: currColors.text }]}
                  >
                    Include in Net Worth
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.subLabel,
                      { color: currColors.textSecondary },
                    ]}
                  >
                    Aggregates balance into total assets & liabilities
                  </ThemedText>
                </View>
                <Switch
                  value={includeInAssets}
                  onValueChange={(val) => {
                    handleHaptic();
                    setIncludeInAssets(val);
                  }}
                  trackColor={{
                    false: isDark ? '#2C2C2E' : '#E5E5EA',
                    true: currColors.tintMoney,
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* ─── FULL PAGE BANK LOGO SELECTION MODAL ─── */}
      <Modal
        visible={showLogoModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => {
          setShowLogoModal(false);
          setBrandSearchQuery('');
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
                setShowLogoModal(false);
                setBrandSearchQuery('');
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
              Select Bank
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
              placeholder="Search bank name (e.g. HDFC, SBI, Axis)..."
              placeholderTextColor={currColors.textSecondary}
              value={brandSearchQuery}
              onChangeText={setBrandSearchQuery}
              autoFocus
            />
            {brandSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setBrandSearchQuery('')}>
                <X size={16} color={currColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            contentContainerStyle={styles.modalListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredBrands.map((b) => {
              const isSelected = logo.toLowerCase() === b.id.toLowerCase();
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.modalListItem,
                    { borderBottomColor: currColors.border },
                  ]}
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
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      flex: 1,
                    }}
                  >
                    <BankLogo logo={b.id} size={32} />
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        style={[
                          styles.modalItemTitle,
                          { color: currColors.text },
                        ]}
                      >
                        {b.name}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.modalItemCategory,
                          { color: currColors.textSecondary },
                        ]}
                      >
                        {b.category?.toUpperCase() || 'BANK'}
                      </ThemedText>
                    </View>
                  </View>
                  {isSelected && (
                    <Check
                      size={18}
                      color={currColors.tintMoney}
                      strokeWidth={2.5}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ─── FULL PAGE BROKER SELECTION MODAL ─── */}
      <Modal
        visible={showBrokerModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => {
          setShowBrokerModal(false);
          setBrokerSearchQuery('');
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
                setShowBrokerModal(false);
                setBrokerSearchQuery('');
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
              Select Broker
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
              placeholder="Search or add new broker (Zerodha, Groww)..."
              placeholderTextColor={currColors.textSecondary}
              value={brokerSearchQuery}
              onChangeText={setBrokerSearchQuery}
              autoFocus
            />
            {brokerSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setBrokerSearchQuery('')}>
                <X size={16} color={currColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            contentContainerStyle={styles.modalListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {brokerSearchQuery.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.modalListItem,
                  { borderBottomColor: currColors.border },
                ]}
                onPress={() => {
                  handleHaptic();
                  setLinkedBroker(brokerSearchQuery);
                  if (!name) setName(brokerSearchQuery);
                  setShowBrokerModal(false);
                  setBrokerSearchQuery('');
                }}
              >
                <ThemedText
                  style={[
                    styles.modalItemTitle,
                    { color: currColors.tintMoney },
                  ]}
                >
                  Use "{brokerSearchQuery}"
                </ThemedText>
              </TouchableOpacity>
            )}

            {filteredBrokers.map((broker) => {
              const isSelected = linkedBroker === broker;
              return (
                <TouchableOpacity
                  key={broker}
                  style={[
                    styles.modalListItem,
                    { borderBottomColor: currColors.border },
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setLinkedBroker(broker);
                    if (!name) setName(broker);
                    const brokerBrand = BANK_BRANDS.find(
                      (b) =>
                        b.name.toLowerCase().includes(broker.toLowerCase()) ||
                        b.id.toLowerCase().includes(broker.toLowerCase())
                    );
                    if (brokerBrand) {
                      setLogo(brokerBrand.id);
                    }
                    setShowBrokerModal(false);
                    setBrokerSearchQuery('');
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      flex: 1,
                    }}
                  >
                    <BankLogo
                      logo={resolveBrokerBrandLogo(broker, accounts) || broker}
                      size={30}
                    />
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        style={[
                          styles.modalItemTitle,
                          { color: currColors.text },
                        ]}
                      >
                        {broker}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.modalItemCategory,
                          { color: currColors.textSecondary },
                        ]}
                      >
                        INVESTMENT BROKER
                      </ThemedText>
                    </View>
                  </View>
                  {isSelected && (
                    <Check
                      size={18}
                      color={currColors.tintMoney}
                      strokeWidth={2.5}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ─── FULL PAGE 3D ICON PICKER MODAL ─── */}
      <Modal
        visible={showIconModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => {
          setShowIconModal(false);
          setIconSearchQuery('');
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
                setIconSearchQuery('');
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
              placeholder="Search 80+ 3D objects (cash, wallet, safe)..."
              placeholderTextColor={currColors.textSecondary}
              value={iconSearchQuery}
              onChangeText={setIconSearchQuery}
              autoFocus
            />
            {iconSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setIconSearchQuery('')}>
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
                const isSelected = iconId === item.id;
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
                      setIconId(item.id);
                      setShowIconModal(false);
                      setIconSearchQuery('');
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
  typeSelectorContainer: {
    marginBottom: 20,
  },
  typeSelectorScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  typePillText: {
    fontSize: 14,
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
  utilizationCard: {
    margin: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  utilizationLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  availableLimitText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  utilizationTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginTop: 8,
    overflow: 'hidden',
  },
  utilizationFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Modal Styles (matching Add Transaction in Investments)
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
  modalListContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  modalItemTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
  },
  modalItemCategory: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Outfit_400Regular',
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
