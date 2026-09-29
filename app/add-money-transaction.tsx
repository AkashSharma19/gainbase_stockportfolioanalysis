import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronRight,
  Search,
  X,
  Check,
  ArrowLeftRight,
  HelpCircle,
  FileText,
  Calendar,
  Delete,
  Plus,
  Wallet,
  CreditCard,
  Landmark,
  TrendingUp,
  PiggyBank,
  Users,
} from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { MoneyTransaction, Account, AccountType } from '@/types/money';
import { BankLogo } from '@/components/BankLogo';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Category3DIcon } from '@/components/Category3DIcon';
import { formatCurrencyINR, parseIndianAmount } from '@/utils/formatters';

const ACCOUNT_TYPE_ICONS: Record<AccountType, { color: string }> = {
  wallet: { color: '#00C9A7' },
  savings: { color: '#007AFF' },
  investment: { color: '#AF52DE' },
  credit_card: { color: '#FF9500' },
  emergency_fund: { color: '#FF2D55' },
  receivable: { color: '#34C759' },
  payable: { color: '#FF3B30' },
};

const SECTION_ORDER = [
  'BANK ACCOUNTS',
  'CREDIT CARDS',
  'CASH & WALLETS',
  'INVESTMENTS',
  'EMERGENCY FUND',
  'PEER BALANCES',
  'ACCOUNTS',
];

const getAccountTypeSection = (type: AccountType): string => {
  switch (type) {
    case 'savings':
      return 'BANK ACCOUNTS';
    case 'credit_card':
      return 'CREDIT CARDS';
    case 'wallet':
      return 'CASH & WALLETS';
    case 'investment':
      return 'INVESTMENTS';
    case 'emergency_fund':
      return 'EMERGENCY FUND';
    case 'receivable':
    case 'payable':
      return 'PEER BALANCES';
    default:
      return 'ACCOUNTS';
  }
};

function AccountLogoOrIcon({
  account,
  size = 26,
  variant = 'circle',
}: {
  account: Account;
  size?: number;
  variant?: 'circle' | 'card';
}) {
  const config = ACCOUNT_TYPE_ICONS[account.type] || ACCOUNT_TYPE_ICONS.wallet;

  if (variant === 'card') {
    if (account.logo) {
      return (
        <BankLogo
          logo={account.logo}
          size={30}
          style={{ width: 44, height: 30, borderRadius: 7, marginRight: 10 }}
        />
      );
    }
    return (
      <View
        style={{
          width: 44,
          height: 30,
          borderRadius: 7,
          backgroundColor: `${config.color}18`,
          borderWidth: 1,
          borderColor: `${config.color}35`,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 10,
        }}
      >
        {account.type === 'wallet' ? (
          <Wallet size={16} color={config.color} strokeWidth={2} />
        ) : account.type === 'credit_card' ? (
          <CreditCard size={16} color={config.color} strokeWidth={2} />
        ) : account.type === 'savings' ? (
          <Landmark size={16} color={config.color} strokeWidth={2} />
        ) : account.type === 'investment' ? (
          <TrendingUp size={16} color={config.color} strokeWidth={2} />
        ) : account.type === 'emergency_fund' ? (
          <PiggyBank size={16} color={config.color} strokeWidth={2} />
        ) : account.type === 'receivable' || account.type === 'payable' ? (
          <Users size={16} color={config.color} strokeWidth={2} />
        ) : (
          <ThemedText style={{ fontSize: 11, color: config.color, fontFamily: 'Outfit_700Bold' }}>
            {account.name.slice(0, 3).toUpperCase()}
          </ThemedText>
        )}
      </View>
    );
  }

  if (account.logo) {
    return <BankLogo logo={account.logo} size={size} style={{ marginRight: 6 }} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${config.color}20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
      }}
    >
      <ThemedText style={{ fontSize: size * 0.45, color: config.color, fontWeight: '700' }}>
        {account.name.charAt(0).toUpperCase()}
      </ThemedText>
    </View>
  );
}

const getPredictedAccount = (
  type: 'income' | 'expense' | 'transfer',
  category: string,
  moneyTransactions: MoneyTransaction[],
  activeAccounts: Account[]
): string => {
  const typeTxs = moneyTransactions.filter((tx) => tx.type === type);
  if (typeTxs.length === 0) return '';

  const catTxs = typeTxs.filter((tx) => tx.category === category);

  const getMostFrequentAccount = (txs: MoneyTransaction[]) => {
    const counts: Record<string, number> = {};
    txs.forEach((tx) => {
      counts[tx.accountId] = (counts[tx.accountId] || 0) + 1;
    });
    let maxCount = 0;
    let bestAccountId = '';
    Object.entries(counts).forEach(([id, count]) => {
      if (count > maxCount) {
        maxCount = count;
        bestAccountId = id;
      }
    });
    const exists = activeAccounts.some((a) => a.id === bestAccountId);
    return exists ? bestAccountId : '';
  };

  if (catTxs.length > 0) {
    const bestCatAccount = getMostFrequentAccount(catTxs);
    if (bestCatAccount) return bestCatAccount;
  }

  const bestTypeAccount = getMostFrequentAccount(typeTxs);
  if (bestTypeAccount) return bestTypeAccount;

  const lastTx = moneyTransactions[0];
  if (lastTx) {
    const exists = activeAccounts.some((a) => a.id === lastTx.accountId);
    if (exists) return lastTx.accountId;
  }

  return activeAccounts.length > 0 ? activeAccounts[0].id : '';
};

// Safe math expression evaluator for the calculator keypad
function evaluateMathExpression(expr: string): string {
  if (!expr || !expr.trim()) return '';
  const cleanExpr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  // Strip trailing operators
  const sanitized = cleanExpr.replace(/[+\-*/]+$/, '').trim();
  if (!sanitized) return '';

  try {
    // Only allow digits, decimals, basic operators, and parens
    if (!/^[\d.\s+\-*/]+$/.test(sanitized)) {
      return expr;
    }
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${sanitized})`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      // Round to max 2 decimals if fraction exists
      const rounded = Math.round(result * 100) / 100;
      return String(rounded);
    }
  } catch {
    // Return original expression if evaluation fails
  }
  return expr;
}

export default function AddMoneyTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const showCurrencySymbol = usePortfolioStore((state) => state.showCurrencySymbol);
  const currencySymbol = showCurrencySymbol !== false ? '₹' : '$';

  const storeCategories = useMoneyStore((state) => state.categories) || {
    income: [],
    expense: [],
  };

  const { accounts, moneyTransactions, addMoneyTransaction, updateMoneyTransaction } = useMoneyStore();

  const editingTx = useMemo(() => {
    return id ? moneyTransactions.find((tx) => String(tx.id) === String(id)) : null;
  }, [id, moneyTransactions]);

  // Form State
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amountExpr, setAmountExpr] = useState<string>('0');
  const [category, setCategory] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState<string>('');
  const [isAccountManuallySelected, setIsAccountManuallySelected] = useState(false);

  // Modals
  const [showNoteDateModal, setShowNoteDateModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showToAccountModal, setShowToAccountModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load defaults or editing values
  useEffect(() => {
    if (editingTx) {
      setType(editingTx.type);
      setAmountExpr(editingTx.amount.toString());
      setNote(editingTx.note || '');
      setDate(new Date(editingTx.date));
      setAccountId(editingTx.accountId);

      if (editingTx.type === 'transfer') {
        setToAccountId(editingTx.toAccountId || '');
      } else {
        setCategory(editingTx.category);
      }
    } else {
      const activeAccounts = accounts.filter((a) => !a.isArchived);
      if (activeAccounts.length > 0) {
        const predicted = getPredictedAccount(type, category, moneyTransactions, activeAccounts);
        setAccountId(predicted || activeAccounts[0].id);
        if (activeAccounts.length > 1) {
          setToAccountId(activeAccounts[1].id);
        }
      }

      const categoriesList = type === 'income' ? storeCategories.income : storeCategories.expense;
      if (categoriesList && categoriesList.length > 0) {
        setCategory(categoriesList[0]);
      } else {
        setCategory('');
      }
    }
  }, [editingTx, storeCategories, accounts]);

  // Auto-switch default category when type changes
  useEffect(() => {
    if (!editingTx) {
      const categoriesList = type === 'income' ? storeCategories.income : storeCategories.expense;
      if (categoriesList && categoriesList.length > 0) {
        setCategory(categoriesList[0]);
      } else {
        setCategory('');
      }
    }
  }, [type, storeCategories, editingTx]);

  // Auto-predict account based on category usage patterns
  useEffect(() => {
    if (editingTx || isAccountManuallySelected) return;
    const activeAccounts = accounts.filter((a) => !a.isArchived);
    if (activeAccounts.length > 0) {
      const predicted = getPredictedAccount(type, category, moneyTransactions, activeAccounts);
      if (predicted) {
        setAccountId(predicted);
      }
    }
  }, [type, category, moneyTransactions, accounts, editingTx, isAccountManuallySelected]);

  // Calculator Keypad Press Handler
  const handleKeyPress = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setAmountExpr((prev) => {
      // 1. Clear / Backspace
      if (key === 'BACK') {
        if (prev.length <= 1 || prev === '0') return '0';
        // If ends with ' + ' or ' - ' or ' × ' or ' ÷ ', strip the operator and spaces
        if (/\s[+\-×÷]\s$/.test(prev)) {
          return prev.slice(0, -3) || '0';
        }
        return prev.slice(0, -1) || '0';
      }

      // 2. Equals / Evaluate
      if (key === '=') {
        const evaluated = evaluateMathExpression(prev);
        return evaluated || prev;
      }

      // 3. Operators: +, -, ×, ÷
      if (['+', '-', '×', '÷'].includes(key)) {
        if (!prev || prev === '0') return '0';
        // If last character was already an operator, replace it
        if (/\s[+\-×÷]\s$/.test(prev)) {
          return `${prev.slice(0, -3)} ${key} `;
        }
        return `${prev} ${key} `;
      }

      // 4. Decimal point
      if (key === '.') {
        // Find last numeric segment after last operator
        const segments = prev.split(/\s[+\-×÷]\s/);
        const lastSegment = segments[segments.length - 1];
        if (lastSegment.includes('.')) return prev; // Avoid multiple dots in same number
        return `${prev}.`;
      }

      // 5. Digits 0-9
      if (/^\d$/.test(key)) {
        if (prev === '0') return key;
        return `${prev}${key}`;
      }

      return prev;
    });
  }, []);

  const handleSave = () => {
    const evaluatedAmount = evaluateMathExpression(amountExpr);
    const parsedAmount = parseIndianAmount(evaluatedAmount || amountExpr);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Required Field', 'Please enter a valid amount greater than 0.');
      return;
    }

    if (!accountId) {
      Alert.alert('Required Field', 'Please select an account.');
      return;
    }

    if (type === 'transfer' && !toAccountId) {
      Alert.alert('Required Field', 'Please select a destination account.');
      return;
    }

    if (type === 'transfer' && accountId === toAccountId) {
      Alert.alert('Invalid Operation', 'Source and destination accounts must be different.');
      return;
    }

    if (type !== 'transfer' && !category) {
      Alert.alert('Required Field', 'Please select a category.');
      return;
    }

    let finalCategory = category;
    if (type === 'transfer') {
      finalCategory = 'Transfer';
    }

    const txData: MoneyTransaction = {
      id: editingTx ? editingTx.id : Math.random().toString(36).substring(2, 9),
      type,
      amount: parsedAmount,
      category: finalCategory,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      date: date.toISOString(),
      note: note.trim() || undefined,
      isRecurring: false,
    };

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingTx) {
      updateMoneyTransaction(editingTx.id, txData);
    } else {
      addMoneyTransaction(txData);
    }

    router.back();
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => !a.isArchived);
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (!accountSearchQuery) return activeAccounts;
    return activeAccounts.filter((a) =>
      a.name.toLowerCase().includes(accountSearchQuery.toLowerCase().trim())
    );
  }, [activeAccounts, accountSearchQuery]);

  const groupedAccounts = useMemo(() => {
    const map: Record<string, Account[]> = {};
    filteredAccounts.forEach((acc) => {
      const sec = getAccountTypeSection(acc.type);
      if (!map[sec]) map[sec] = [];
      map[sec].push(acc);
    });
    return Object.entries(map)
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => {
        const idxA = SECTION_ORDER.indexOf(a.title);
        const idxB = SECTION_ORDER.indexOf(b.title);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });
  }, [filteredAccounts]);

  const groupedToAccounts = useMemo(() => {
    const list = activeAccounts.filter((a) => a.id !== accountId);
    const filtered = accountSearchQuery
      ? list.filter((a) => a.name.toLowerCase().includes(accountSearchQuery.toLowerCase().trim()))
      : list;
    const map: Record<string, Account[]> = {};
    filtered.forEach((acc) => {
      const sec = getAccountTypeSection(acc.type);
      if (!map[sec]) map[sec] = [];
      map[sec].push(acc);
    });
    return Object.entries(map)
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => {
        const idxA = SECTION_ORDER.indexOf(a.title);
        const idxB = SECTION_ORDER.indexOf(b.title);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });
  }, [activeAccounts, accountId, accountSearchQuery]);

  const sourceAccount = accounts.find((a) => a.id === accountId);
  const destAccount = accounts.find((a) => a.id === toAccountId);

  // Category list for current tab
  const rawCategoriesList = useMemo(() => {
    return type === 'income' ? storeCategories.income : storeCategories.expense;
  }, [type, storeCategories]);

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
      <View style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={[styles.headerIconButton, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border, borderWidth: StyleSheet.hairlineWidth }]}
            activeOpacity={0.7}
          >
            <X size={20} color={currColors.text} />
          </TouchableOpacity>

          <ThemedText style={[styles.headerTitleText, { color: currColors.text }]}>
            {editingTx ? 'Edit transaction' : 'Add transaction'}
          </ThemedText>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowHelpModal(true);
            }}
            style={[styles.headerIconButton, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border, borderWidth: StyleSheet.hairlineWidth }]}
            activeOpacity={0.7}
          >
            <HelpCircle size={20} color={currColors.text} />
          </TouchableOpacity>
        </View>

        {/* 3-Segment Capsule Selector */}
        <View style={styles.typeCapsuleWrapper}>
          <View style={[styles.typeCapsuleContainer, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border, borderWidth: StyleSheet.hairlineWidth }]}>
            <TouchableOpacity
              style={[
                styles.typeCapsuleTab,
                type === 'expense' && [
                  styles.typeCapsuleTabActive,
                  { backgroundColor: currColors.card, borderColor: currColors.border, borderWidth: StyleSheet.hairlineWidth },
                ],
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setType('expense');
              }}
              activeOpacity={0.8}
            >
              <ThemedText
                style={[
                  styles.typeCapsuleText,
                  { color: type === 'expense' ? '#FF3B30' : currColors.textSecondary },
                  type === 'expense' && styles.typeCapsuleTextActive,
                ]}
              >
                Spent
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeCapsuleTab,
                type === 'income' && [
                  styles.typeCapsuleTabActive,
                  { backgroundColor: currColors.card, borderColor: currColors.border, borderWidth: StyleSheet.hairlineWidth },
                ],
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setType('income');
              }}
              activeOpacity={0.8}
            >
              <ThemedText
                style={[
                  styles.typeCapsuleText,
                  { color: type === 'income' ? '#34C759' : currColors.textSecondary },
                  type === 'income' && styles.typeCapsuleTextActive,
                ]}
              >
                Income
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeCapsuleTab,
                type === 'transfer' && [
                  styles.typeCapsuleTabActive,
                  { backgroundColor: currColors.card, borderColor: currColors.border, borderWidth: StyleSheet.hairlineWidth },
                ],
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setType('transfer');
              }}
              activeOpacity={0.8}
            >
              <ThemedText
                style={[
                  styles.typeCapsuleText,
                  { color: type === 'transfer' ? currColors.tintMoney : currColors.textSecondary },
                  type === 'transfer' && styles.typeCapsuleTextActive,
                ]}
              >
                Transfer
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Visual Category 5-Column Grid (For Spent & Income) */}
        {type !== 'transfer' ? (
          <View style={styles.categoriesSection}>
            <ScrollView
              style={styles.categoriesScroll}
              contentContainerStyle={styles.categoriesGrid}
              showsVerticalScrollIndicator={false}
            >
              {rawCategoriesList.map((catName) => {
                const isSelected = category === catName;
                return (
                  <TouchableOpacity
                    key={catName}
                    style={[
                      styles.categoryItemTile,
                      isSelected && [
                        styles.categoryItemTileSelected,
                        { borderColor: currColors.tintMoney, backgroundColor: isDark ? '#00C9A722' : '#00C9A714' },
                      ],
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCategory(catName);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.category3DWrap}>
                      <Category3DIcon name={catName} size={38} />
                    </View>
                    <ThemedText
                      style={[
                        styles.categoryTileLabel,
                        { color: isSelected ? currColors.tintMoney : currColors.text },
                        isSelected && { fontFamily: 'Outfit_600SemiBold' },
                      ]}
                      numberOfLines={1}
                    >
                      {catName}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}

              {/* Manage/Add Categories Tile */}
              <TouchableOpacity
                style={styles.categoryItemTile}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/manage-categories');
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.category3DWrap,
                    styles.manageCategoryBadge,
                    {
                      backgroundColor: currColors.cardSecondary,
                      borderColor: currColors.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Plus size={20} color={currColors.textSecondary} strokeWidth={2.5} />
                </View>
                <ThemedText style={[styles.categoryTileLabel, { color: currColors.textSecondary }]} numberOfLines={1}>
                  Manage
                </ThemedText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ) : (
          <View style={styles.transferPlaceholderSection}>
            <View style={[styles.transferInfoCard, { backgroundColor: currColors.card, borderColor: currColors.border, borderWidth: 1 }]}>
              <ArrowLeftRight size={32} color={currColors.tintMoney} style={{ marginBottom: 8 }} />
              <ThemedText style={[styles.transferInfoTitle, { color: currColors.text }]}>
                Account Transfer
              </ThemedText>
              <ThemedText style={[styles.transferInfoDesc, { color: currColors.textSecondary }]}>
                Move funds seamlessly between your bank accounts, wallets, and investments.
              </ThemedText>
            </View>
          </View>
        )}

        {/* Account Selector Pill / Card Row */}
        <View style={styles.accountRowContainer}>
          {type === 'transfer' ? (
            <View style={[styles.accountSelectorCard, { backgroundColor: currColors.card, borderColor: currColors.border, borderWidth: 1 }]}>
              {/* FROM ACCOUNT */}
              <TouchableOpacity
                style={styles.transferAccountSection}
                onPress={() => setShowAccountModal(true)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.transferSectionLabel, { color: currColors.textSecondary }]}>
                  FROM
                </ThemedText>
                <View style={styles.accountBadgeRow}>
                  {sourceAccount ? (
                    <>
                      <AccountLogoOrIcon account={sourceAccount} size={22} />
                      <ThemedText style={[styles.accountSelectedName, { color: currColors.text }]} numberOfLines={1}>
                        {sourceAccount.name}
                      </ThemedText>
                    </>
                  ) : (
                    <ThemedText style={[styles.accountPlaceholder, { color: currColors.textSecondary }]}>
                      Select
                    </ThemedText>
                  )}
                </View>
              </TouchableOpacity>

              {/* SWAP BUTTON */}
              <TouchableOpacity
                style={[styles.transferSwapButton, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border, borderWidth: 1 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const temp = accountId;
                  setAccountId(toAccountId);
                  setToAccountId(temp);
                }}
                activeOpacity={0.7}
              >
                <ArrowLeftRight size={14} color={currColors.tintMoney} />
              </TouchableOpacity>

              {/* TO ACCOUNT */}
              <TouchableOpacity
                style={styles.transferAccountSection}
                onPress={() => setShowToAccountModal(true)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.transferSectionLabel, { color: currColors.textSecondary }]}>
                  TO
                </ThemedText>
                <View style={styles.accountBadgeRow}>
                  {destAccount ? (
                    <>
                      <AccountLogoOrIcon account={destAccount} size={22} />
                      <ThemedText style={[styles.accountSelectedName, { color: currColors.text }]} numberOfLines={1}>
                        {destAccount.name}
                      </ThemedText>
                    </>
                  ) : (
                    <ThemedText style={[styles.accountPlaceholder, { color: currColors.textSecondary }]}>
                      Select
                    </ThemedText>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.accountSelectorCard, { backgroundColor: currColors.card, borderColor: currColors.border, borderWidth: 1 }]}
              onPress={() => setShowAccountModal(true)}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.accountSelectLabel, { color: currColors.text }]}>
                Select Account
              </ThemedText>

              <View style={styles.accountSelectedRight}>
                {sourceAccount ? (
                  <View style={styles.accountBadgeRow}>
                    <AccountLogoOrIcon account={sourceAccount} size={22} />
                    <ThemedText style={[styles.accountSelectedName, { color: currColors.text }]} numberOfLines={1}>
                      {sourceAccount.name}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText style={[styles.accountPlaceholder, { color: currColors.textSecondary }]}>
                    Select
                  </ThemedText>
                )}
                <ChevronRight size={18} color={currColors.textSecondary} style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Calculator Keypad & Amount Sheet */}
        <View style={[styles.bottomSheetContainer, { backgroundColor: currColors.card, borderTopColor: currColors.border, borderTopWidth: 1 }]}>
          {/* Amount Display Bar */}
          <View style={styles.amountDisplayRow}>
            <View style={[styles.currencyPill, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border, borderWidth: 1 }]}>
              <ThemedText style={[styles.currencyPillText, { color: currColors.text }]}>
                {currencySymbol}
              </ThemedText>
            </View>

            <View style={styles.amountTextWrap}>
              <ThemedText style={[styles.amountValueText, { color: currColors.text }]} numberOfLines={1}>
                {amountExpr || '0'}
              </ThemedText>
            </View>

            {/* Note / Date Quick Shortcut */}
            <TouchableOpacity
              style={[
                styles.noteQuickBtn,
                { backgroundColor: currColors.cardSecondary, borderColor: currColors.border, borderWidth: 1 },
                Boolean(note) && { backgroundColor: isDark ? '#00C9A722' : '#00C9A714', borderColor: currColors.tintMoney, borderWidth: 1.5 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowNoteDateModal(true);
              }}
              activeOpacity={0.7}
            >
              <FileText size={18} color={note ? currColors.tintMoney : currColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Calculator Grid (4 Rows) */}
          <View style={styles.keypadGrid}>
            {/* ROW 1: 1, 2, 3, Note */}
            <View style={styles.keypadRow}>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('1')}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.keypadDigitText, { color: currColors.text }]}>1</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('2')}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.keypadDigitText, { color: currColors.text }]}>2</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('3')}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.keypadDigitText, { color: currColors.text }]}>3</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => setShowNoteDateModal(true)}
                activeOpacity={0.7}
              >
                <FileText size={20} color={note ? currColors.tintMoney : currColors.text} />
              </TouchableOpacity>
            </View>

            {/* ROW 2: 4, 5, 6, [ +  - ] */}
            <View style={styles.keypadRow}>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('4')}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.keypadDigitText, { color: currColors.text }]}>4</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('5')}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.keypadDigitText, { color: currColors.text }]}>5</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('6')}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.keypadDigitText, { color: currColors.text }]}>6</ThemedText>
              </TouchableOpacity>
              <View style={styles.splitOperatorRow}>
                <TouchableOpacity
                  style={[styles.keypadBtnSplit, { backgroundColor: currColors.cardSecondary }]}
                  onPress={() => handleKeyPress('+')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.keypadOperatorText, { color: currColors.text }]}>+</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.keypadBtnSplit, { backgroundColor: currColors.cardSecondary }]}
                  onPress={() => handleKeyPress('-')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.keypadOperatorText, { color: currColors.text }]}>-</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* ROW 3: 7, 8, 9, [ ×  ÷ ] */}
            <View style={styles.keypadRow}>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('7')}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.keypadDigitText, { color: currColors.text }]}>7</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('8')}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.keypadDigitText, { color: currColors.text }]}>8</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('9')}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.keypadDigitText, { color: currColors.text }]}>9</ThemedText>
              </TouchableOpacity>
              <View style={styles.splitOperatorRow}>
                <TouchableOpacity
                  style={[styles.keypadBtnSplit, { backgroundColor: currColors.cardSecondary }]}
                  onPress={() => handleKeyPress('×')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.keypadOperatorText, { color: currColors.text }]}>×</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.keypadBtnSplit, { backgroundColor: currColors.cardSecondary }]}
                  onPress={() => handleKeyPress('÷')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.keypadOperatorText, { color: currColors.text }]}>÷</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* ROW 4: . , 0 , ⌫ , = */}
            <View style={styles.keypadRow}>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('.')}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.keypadDigitText, { color: currColors.text }]}>.</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('0')}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.keypadDigitText, { color: currColors.text }]}>0</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('BACK')}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setAmountExpr('0');
                }}
                activeOpacity={0.7}
              >
                <Delete size={20} color={currColors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keypadBtn, { backgroundColor: currColors.cardSecondary }]}
                onPress={() => handleKeyPress('=')}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.keypadOperatorText, { color: currColors.tintMoney, fontFamily: 'Outfit_700Bold' }]}>
                  =
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Large Save Button */}
          <TouchableOpacity
            style={[styles.saveActionButton, { backgroundColor: currColors.tintMoney }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <ThemedText style={[styles.saveActionText, { color: '#FFFFFF' }]}>
              Save
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* NOTE & DATE MODAL */}
      <Modal visible={showNoteDateModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Transaction Note & Date</ThemedText>
            <TouchableOpacity onPress={() => setShowNoteDateModal(false)} style={styles.modalCloseButton}>
              <X size={20} color={currColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* DATE PICKER ROW */}
            <ThemedText style={[styles.modalSectionLabel, { color: currColors.textSecondary }]}>
              TRANSACTION DATE
            </ThemedText>
            <View style={[styles.modalCard, { backgroundColor: currColors.card }]}>
              <View style={styles.datePickerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={18} color="#00C9A7" style={{ marginRight: 8 }} />
                  <ThemedText style={[styles.modalLabel, { color: currColors.text }]}>Date</ThemedText>
                </View>
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    themeVariant={colorScheme}
                  />
                ) : (
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <ThemedText style={{ color: currColors.text, fontSize: 16 }}>
                      {date.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {showDatePicker && Platform.OS !== 'ios' && (
              <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
            )}

            {/* NOTE TEXT INPUT */}
            <ThemedText style={[styles.modalSectionLabel, { color: currColors.textSecondary, marginTop: 20 }]}>
              NOTE / DESCRIPTION
            </ThemedText>
            <View style={[styles.modalCard, { backgroundColor: currColors.card, padding: 12 }]}>
              <TextInput
                style={[styles.noteInput, { color: currColors.text }]}
                placeholder="Add a remark (e.g. Dinner with friends, Uber to airport)..."
                placeholderTextColor={currColors.textSecondary}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: currColors.tintMoney }]}
              onPress={() => setShowNoteDateModal(false)}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.modalDoneText}>Done</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ACCOUNT SELECTION MODAL */}
      <Modal visible={showAccountModal} animationType="slide" presentationStyle="fullScreen">
        <View
          style={[
            styles.accountModalContainer,
            {
              backgroundColor: currColors.background,
              paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <StatusBar style={isDark ? 'light' : 'dark'} />
          {/* Header */}
          <View style={styles.accountModalHeader}>
            <TouchableOpacity
              style={[styles.modalCircularBtn, { backgroundColor: currColors.cardSecondary }]}
              onPress={() => {
                setShowAccountModal(false);
                setAccountSearchQuery('');
              }}
              activeOpacity={0.7}
            >
              <X size={20} color={currColors.text} strokeWidth={2.2} />
            </TouchableOpacity>

            <ThemedText style={[styles.accountModalTitle, { color: currColors.text }]}>
              Choose Account
            </ThemedText>

            <TouchableOpacity
              style={[
                styles.modalCircularBtn,
                { backgroundColor: currColors.tintMoney },
              ]}
              onPress={() => {
                setShowAccountModal(false);
                setAccountSearchQuery('');
              }}
              activeOpacity={0.7}
            >
              <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.accountSearchWrapper, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Search size={15} color={currColors.textSecondary} />
            <TextInput
              style={[styles.accountSearchInput, { color: currColors.text }]}
              placeholder="Search account..."
              placeholderTextColor={currColors.textSecondary}
              value={accountSearchQuery}
              onChangeText={setAccountSearchQuery}
              clearButtonMode="while-editing"
            />
            {Boolean(accountSearchQuery) && (
              <TouchableOpacity onPress={() => setAccountSearchQuery('')} style={{ padding: 4 }}>
                <X size={14} color={currColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Grouped Account List */}
          <ScrollView
            style={styles.accountModalScroll}
            contentContainerStyle={styles.accountModalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {groupedAccounts.length === 0 ? (
              <View style={styles.accountEmptyState}>
                <ThemedText style={{ color: currColors.textSecondary, fontSize: 14 }}>
                  No accounts found
                </ThemedText>
              </View>
            ) : (
              groupedAccounts.map((section) => (
                <View key={section.title} style={styles.accountSectionBlock}>
                  <ThemedText style={[styles.accountSectionTitle, { color: currColors.textSecondary }]}>
                    {section.title}
                  </ThemedText>

                  <View style={styles.accountSectionCards}>
                    {section.data.map((item) => {
                      const isSelected = accountId === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.accountCardItem,
                            {
                              backgroundColor: isSelected
                                ? (isDark ? '#00C9A718' : '#00C9A70E')
                                : currColors.card,
                              borderColor: isSelected ? currColors.tintMoney : currColors.border,
                              borderWidth: isSelected ? 1.5 : 1,
                            },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setAccountId(item.id);
                            setIsAccountManuallySelected(true);
                            setShowAccountModal(false);
                            setAccountSearchQuery('');
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.accountCardLeft}>
                            <AccountLogoOrIcon account={item} variant="card" />
                            <View style={styles.accountCardInfo}>
                              <ThemedText style={[styles.accountCardName, { color: currColors.text }]} numberOfLines={1}>
                                {item.name}
                              </ThemedText>
                              <ThemedText style={[styles.accountCardSubtitle, { color: currColors.textSecondary }]} numberOfLines={1}>
                                {item.institution || item.accountNumber || (item.type === 'wallet' ? 'Cash Wallet' : item.type.replace('_', ' ').toUpperCase())}
                              </ThemedText>
                            </View>
                          </View>

                          <ThemedText style={[styles.accountCardBalance, { color: currColors.text }]}>
                            {formatCurrencyINR(item.balance, true, 0)}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Bottom Add Account Pill Button */}
          <View style={[styles.accountBottomActionWrap, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 16) }]}>
            <TouchableOpacity
              style={[styles.accountBottomPillBtn, { backgroundColor: currColors.cardSecondary }]}
              onPress={() => {
                setShowAccountModal(false);
                setAccountSearchQuery('');
                router.push('/add-account');
              }}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.accountBottomPillText, { color: currColors.text }]}>
                Add new account
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TO ACCOUNT SELECTION MODAL (Transfer only) */}
      <Modal visible={showToAccountModal} animationType="slide" presentationStyle="fullScreen">
        <View
          style={[
            styles.accountModalContainer,
            {
              backgroundColor: currColors.background,
              paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <StatusBar style={isDark ? 'light' : 'dark'} />
          {/* Header */}
          <View style={styles.accountModalHeader}>
            <TouchableOpacity
              style={[styles.modalCircularBtn, { backgroundColor: currColors.cardSecondary }]}
              onPress={() => {
                setShowToAccountModal(false);
                setAccountSearchQuery('');
              }}
              activeOpacity={0.7}
            >
              <X size={20} color={currColors.text} strokeWidth={2.2} />
            </TouchableOpacity>

            <ThemedText style={[styles.accountModalTitle, { color: currColors.text }]}>
              Destination Account
            </ThemedText>

            <TouchableOpacity
              style={[
                styles.modalCircularBtn,
                { backgroundColor: currColors.tintMoney },
              ]}
              onPress={() => {
                setShowToAccountModal(false);
                setAccountSearchQuery('');
              }}
              activeOpacity={0.7}
            >
              <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.accountSearchWrapper, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Search size={15} color={currColors.textSecondary} />
            <TextInput
              style={[styles.accountSearchInput, { color: currColors.text }]}
              placeholder="Search account..."
              placeholderTextColor={currColors.textSecondary}
              value={accountSearchQuery}
              onChangeText={setAccountSearchQuery}
              clearButtonMode="while-editing"
            />
            {Boolean(accountSearchQuery) && (
              <TouchableOpacity onPress={() => setAccountSearchQuery('')} style={{ padding: 4 }}>
                <X size={14} color={currColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Grouped Destination Account List */}
          <ScrollView
            style={styles.accountModalScroll}
            contentContainerStyle={styles.accountModalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {groupedToAccounts.length === 0 ? (
              <View style={styles.accountEmptyState}>
                <ThemedText style={{ color: currColors.textSecondary, fontSize: 14 }}>
                  No destination accounts available
                </ThemedText>
              </View>
            ) : (
              groupedToAccounts.map((section) => (
                <View key={section.title} style={styles.accountSectionBlock}>
                  <ThemedText style={[styles.accountSectionTitle, { color: currColors.textSecondary }]}>
                    {section.title}
                  </ThemedText>

                  <View style={styles.accountSectionCards}>
                    {section.data.map((item) => {
                      const isSelected = toAccountId === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.accountCardItem,
                            {
                              backgroundColor: isSelected
                                ? (isDark ? '#00C9A718' : '#00C9A70E')
                                : currColors.card,
                              borderColor: isSelected ? currColors.tintMoney : currColors.border,
                              borderWidth: isSelected ? 1.5 : 1,
                            },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setToAccountId(item.id);
                            setShowToAccountModal(false);
                            setAccountSearchQuery('');
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.accountCardLeft}>
                            <AccountLogoOrIcon account={item} variant="card" />
                            <View style={styles.accountCardInfo}>
                              <ThemedText style={[styles.accountCardName, { color: currColors.text }]} numberOfLines={1}>
                                {item.name}
                              </ThemedText>
                              <ThemedText style={[styles.accountCardSubtitle, { color: currColors.textSecondary }]} numberOfLines={1}>
                                {item.institution || item.accountNumber || (item.type === 'wallet' ? 'Cash Wallet' : item.type.replace('_', ' ').toUpperCase())}
                              </ThemedText>
                            </View>
                          </View>

                          <ThemedText style={[styles.accountCardBalance, { color: currColors.text }]}>
                            {formatCurrencyINR(item.balance, true, 0)}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Bottom Add Account Pill Button */}
          <View style={[styles.accountBottomActionWrap, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 16) }]}>
            <TouchableOpacity
              style={[styles.accountBottomPillBtn, { backgroundColor: currColors.cardSecondary }]}
              onPress={() => {
                setShowToAccountModal(false);
                setAccountSearchQuery('');
                router.push('/add-account');
              }}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.accountBottomPillText, { color: currColors.text }]}>
                Add new account
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* HELP MODAL */}
      <Modal visible={showHelpModal} animationType="fade" transparent>
        <View style={styles.helpModalOverlay}>
          <View style={[styles.helpModalCard, { backgroundColor: currColors.card }]}>
            <ThemedText style={[styles.helpModalTitle, { color: currColors.text }]}>Quick Tips</ThemedText>
            <ThemedText style={[styles.helpModalText, { color: currColors.textSecondary }]}>
              • Use the in-app keypad to do quick math (e.g. 150 + 250).
            </ThemedText>
            <ThemedText style={[styles.helpModalText, { color: currColors.textSecondary }]}>
              • Long press the backspace key to quickly reset the amount to 0.
            </ThemedText>
            <ThemedText style={[styles.helpModalText, { color: currColors.textSecondary }]}>
              • Tap the note icon to add remarks or change transaction date.
            </ThemedText>
            <ThemedText style={[styles.helpModalText, { color: currColors.textSecondary }]}>
              • Tap "Manage" in the category grid to create custom categories and icons.
            </ThemedText>
            <TouchableOpacity
              style={[styles.helpModalBtn, { backgroundColor: currColors.tintMoney }]}
              onPress={() => setShowHelpModal(false)}
            >
              <ThemedText style={{ color: '#FFFFFF', fontFamily: 'Outfit_600SemiBold', fontSize: 15 }}>
                Got it
              </ThemedText>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'space-between',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  typeCapsuleWrapper: {
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  typeCapsuleContainer: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 3,
  },
  typeCapsuleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  typeCapsuleTabActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  typeCapsuleText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  typeCapsuleTextActive: {
    fontFamily: 'Outfit_600SemiBold',
  },
  categoriesSection: {
    flex: 1,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  categoriesScroll: {
    flex: 1,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingBottom: 6,
  },
  categoryItemTile: {
    width: '20%',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  categoryItemTileSelected: {
    borderWidth: 1.5,
  },
  category3DWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  manageCategoryBadge: {
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  categoryTileLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
  },
  transferPlaceholderSection: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  transferInfoCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  transferInfoTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 6,
  },
  transferInfoDesc: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  accountRowContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  accountSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  accountSelectLabel: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  accountSelectedRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountSelectedName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    maxWidth: 120,
  },
  accountPlaceholder: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  transferAccountSection: {
    flex: 1,
  },
  transferSectionLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  transferSwapButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 8,
  },
  currencyPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPillText: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  amountTextWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  amountValueText: {
    fontSize: 28,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  noteQuickBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadGrid: {
    gap: 8,
    marginBottom: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keypadBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitOperatorRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  keypadBtnSplit: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadDigitText: {
    fontSize: 20,
    fontFamily: 'Outfit_500Medium',
  },
  keypadOperatorText: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  saveActionButton: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  saveActionText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
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
  modalBody: {
    padding: 16,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  modalCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  modalLabel: {
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
  },
  noteInput: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalDoneBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  modalDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  accountModalContainer: {
    flex: 1,
  },
  accountModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  modalCircularBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountModalTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  accountSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  accountSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  accountModalScroll: {
    flex: 1,
  },
  accountModalScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  accountSectionBlock: {
    marginBottom: 20,
  },
  accountSectionTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  accountSectionCards: {
    gap: 8,
  },
  accountCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  accountCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  accountCardInfo: {
    flex: 1,
  },
  accountCardName: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  accountCardSubtitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  accountCardBalance: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  accountBottomActionWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 10,
  },
  accountBottomPillBtn: {
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  accountBottomPillText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  accountEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  helpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  helpModalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    maxWidth: 340,
  },
  helpModalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 12,
  },
  helpModalText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 8,
    lineHeight: 20,
  },
  helpModalBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
