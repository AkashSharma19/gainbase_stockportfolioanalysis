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
import * as Haptics from 'expo-haptics';
import { X, Check, ChevronDown, Wallet, Landmark, Activity, CreditCard, PiggyBank, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { MoneyTransaction, Account } from '@/types/money';
import { BankLogo } from '@/components/BankLogo';
import { AccountType } from '@/types/money';

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

const getPredictedAccount = (
  type: 'income' | 'expense' | 'transfer',
  category: string,
  moneyTransactions: MoneyTransaction[],
  activeAccounts: Account[]
): string => {
  // Filter transactions matching the current type
  const typeTxs = moneyTransactions.filter((tx) => tx.type === type);
  if (typeTxs.length === 0) return '';

  // Try to find transactions matching the current type and selected category
  const catTxs = typeTxs.filter((tx) => tx.category === category);

  // Helper to find the most frequent accountId in a list of transactions
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
    // Verify the account is still active/exists
    const exists = activeAccounts.some((a) => a.id === bestAccountId);
    return exists ? bestAccountId : '';
  };

  // 1. Try most frequent account for this category
  if (catTxs.length > 0) {
    const bestCatAccount = getMostFrequentAccount(catTxs);
    if (bestCatAccount) return bestCatAccount;
  }

  // 2. Try most frequent account for this transaction type
  const bestTypeAccount = getMostFrequentAccount(typeTxs);
  if (bestTypeAccount) return bestTypeAccount;

  // 3. Fallback: most recently used account overall
  const lastTx = moneyTransactions[0];
  if (lastTx) {
    const exists = activeAccounts.some((a) => a.id === lastTx.accountId);
    if (exists) return lastTx.accountId;
  }

  return activeAccounts.length > 0 ? activeAccounts[0].id : '';
};

export default function AddMoneyTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const storeCategories = useMoneyStore((state) => state.categories) || {
    income: [],
    expense: []
  };

  const { accounts, moneyTransactions, addMoneyTransaction, updateMoneyTransaction } = useMoneyStore();

  const editingTx = useMemo(() => {
    return id ? moneyTransactions.find((tx) => tx.id === id) : null;
  }, [id, moneyTransactions]);

  // Form State
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [isAccountManuallySelected, setIsAccountManuallySelected] = useState(false);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showToAccountModal, setShowToAccountModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(!editingTx);

  // Calculator Keyboard Helpers
  const evaluateExpression = (expr: string): string => {
    try {
      let evalExpr = expr.replace(/÷/g, '/').replace(/×/g, '*');
      evalExpr = evalExpr.replace(/[^0-9+\-*/.]/g, '');
      if (!evalExpr) return '';
      
      // eslint-disable-next-line no-new-func
      const result = new Function(`return (${evalExpr})`)();
      if (result === undefined || isNaN(result) || !isFinite(result)) {
        return '';
      }
      return Number(result.toFixed(2)).toString();
    } catch (e) {
      return '';
    }
  };

  const handleCalcKeyPress = (key: string) => {
    handleHaptic();
    if (key === 'C') {
      setAmount('');
    } else if (key === '⌫') {
      setAmount((prev) => prev.slice(0, -1));
    } else if (key === '=') {
      const sanitized = amount.replace(/[+−×÷\-*/]+$/, '');
      if (sanitized) {
        const result = evaluateExpression(sanitized);
        if (result) {
          setAmount(result);
        }
      }
    } else if (key === 'Done') {
      const sanitized = amount.replace(/[+−×÷\-*/]+$/, '');
      if (sanitized) {
        const result = evaluateExpression(sanitized);
        if (result) {
          setAmount(result);
        }
      }
      setShowCalculator(false);
    } else {
      const operators = ['+', '-', '×', '÷'];
      const isKeyOperator = operators.includes(key);
      
      setAmount((prev) => {
        if (prev === '' && isKeyOperator) {
          return key === '-' ? '-' : '';
        }
        
        const lastChar = prev.slice(-1);
        const isLastCharOperator = operators.includes(lastChar);
        
        if (isKeyOperator && isLastCharOperator) {
          return prev.slice(0, -1) + key;
        }
        
        if (key === '.') {
          const parts = prev.split(/[+−×÷\-*/]/);
          const currentPart = parts[parts.length - 1];
          if (currentPart.includes('.')) {
            return prev;
          }
        }

        return prev + key;
      });
    }
  };

  const calcKeys = [
    ['C', '⌫', '÷', '×'],
    ['1', '2', '3', '-'],
    ['4', '5', '6', '+'],
    ['7', '8', '9', '='],
    ['.', '0', 'Done'],
  ];

  // Sort categories by historical proximity to typed amount, falling back to usage frequency
  const sortedCategoriesByUsage = useMemo(() => {
    const list = type === 'income' ? storeCategories.income : storeCategories.expense;
    if (!list) return [];

    // 1. Calculate overall usage counts for fallback sorting
    const counts: { [key: string]: number } = {};
    list.forEach(cat => {
      counts[cat] = 0;
    });
    moneyTransactions.forEach(tx => {
      if (tx.type === type && counts[tx.category] !== undefined) {
        counts[tx.category]++;
      }
    });

    // 2. Parse/evaluate the currently typed amount value
    let typedValue = 0;
    if (amount) {
      const sanitized = amount.replace(/[+−×÷\-*/]+$/, '');
      const evaluated = evaluateExpression(sanitized);
      const parsed = parseFloat(evaluated || sanitized);
      if (!isNaN(parsed) && parsed > 0) {
        typedValue = parsed;
      }
    }

    // 3. Compute amount similarity scores if we have a typed value
    const similarityScores: { [key: string]: number } = {};
    list.forEach(cat => {
      similarityScores[cat] = 0;
    });

    if (typedValue > 0) {
      const tolerance = typedValue * 0.2; // 20% tolerance range
      moneyTransactions.forEach(tx => {
        if (tx.type === type && similarityScores[tx.category] !== undefined) {
          const diff = Math.abs(tx.amount - typedValue);
          if (diff <= tolerance && tolerance > 0) {
            // Similarity ranges from 0 (at boundary) to 1 (exact match)
            const similarity = 1 - (diff / tolerance);
            similarityScores[tx.category] += similarity;
          }
        }
      });
    }

    // 4. Sort categories: similarity score first, then overall usage count, then alphabetically
    return [...list].sort((a, b) => {
      const scoreDiff = similarityScores[b] - similarityScores[a];
      if (scoreDiff !== 0) return scoreDiff;

      const countDiff = counts[b] - counts[a];
      if (countDiff !== 0) return countDiff;

      return a.localeCompare(b);
    });
  }, [type, storeCategories, moneyTransactions, amount]);

  // Distribute categories + See All into exactly 3 rows
  const tagRows = useMemo(() => {
    const maxToShow = 8;
    const visibleCats = sortedCategoriesByUsage.slice(0, maxToShow);
    const items = [...visibleCats, 'SEE_ALL'];
    const count = items.length;
    
    let r1: string[] = [];
    let r2: string[] = [];
    let r3: string[] = [];
    
    if (count >= 9) {
      r1 = items.slice(0, 3);
      r2 = items.slice(3, 6);
      r3 = items.slice(6, 9);
    } else if (count === 8) {
      r1 = items.slice(0, 3);
      r2 = items.slice(3, 6);
      r3 = items.slice(6, 8);
    } else if (count === 7) {
      r1 = items.slice(0, 3);
      r2 = items.slice(3, 5);
      r3 = items.slice(5, 7);
    } else if (count === 6) {
      r1 = items.slice(0, 2);
      r2 = items.slice(2, 4);
      r3 = items.slice(4, 6);
    } else if (count === 5) {
      r1 = items.slice(0, 2);
      r2 = items.slice(2, 4);
      r3 = items.slice(4, 5);
    } else if (count === 4) {
      r1 = items.slice(0, 2);
      r2 = items.slice(2, 3);
      r3 = items.slice(3, 4);
    } else {
      r1 = items.slice(0, 1);
      r2 = items.slice(1, 2);
      r3 = items.slice(2, 3);
    }
    
    return [r1, r2, r3];
  }, [sortedCategoriesByUsage]);

  // Load defaults or editing values
  useEffect(() => {
    if (editingTx) {
      setType(editingTx.type);
      setAmount(editingTx.amount.toString());
      setNote(editingTx.note || '');
      setDate(new Date(editingTx.date));
      setAccountId(editingTx.accountId);
      
      if (editingTx.type === 'transfer') {
        setToAccountId(editingTx.toAccountId || '');
      } else {
        setCategory(editingTx.category);
      }
    } else {
      // Default to first active account or predicted account
      const activeAccounts = accounts.filter((a) => !a.isArchived);
      if (activeAccounts.length > 0) {
        const predicted = getPredictedAccount(type, category, moneyTransactions, activeAccounts);
        setAccountId(predicted || activeAccounts[0].id);
        if (activeAccounts.length > 1) {
          setToAccountId(activeAccounts[1].id);
        }
      }
      
      // Default category
      const categoriesList = type === 'income' ? storeCategories.income : storeCategories.expense;
      if (categoriesList && categoriesList.length > 0) {
        setCategory(categoriesList[0]);
      } else {
        setCategory('');
      }
    }
  }, [editingTx, storeCategories, accounts]);

  // Auto-switch categories when type changes
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

  // Auto-fill/update account based on selected type/category usage patterns
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

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    handleHaptic();
    let finalAmountStr = amount;
    if (amount.includes('+') || amount.includes('-') || amount.includes('×') || amount.includes('÷')) {
      const sanitized = amount.replace(/[+−×÷\-*/]+$/, '');
      const evaluated = evaluateExpression(sanitized);
      if (evaluated) {
        finalAmountStr = evaluated;
        setAmount(evaluated); // Sync back to input
      }
    }

    const parsedAmount = parseFloat(finalAmountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Required Field', 'Please enter a valid amount.');
      return;
    }

    if (!accountId) {
      Alert.alert('Required Field', 'Please select an account. If none exist, please create an account on the Accounts tab first.');
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

    // Determine final category string
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

    if (editingTx) {
      updateMoneyTransaction(editingTx.id, txData);
    } else {
      addMoneyTransaction(txData);
    }

    router.back();
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // Get active accounts
  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => !a.isArchived);
  }, [accounts]);

  const sourceAccount = accounts.find((a) => a.id === accountId);
  const destAccount = accounts.find((a) => a.id === toAccountId);

  const categoriesList = type === 'income' 
    ? storeCategories.income 
    : storeCategories.expense;

  // Amount color coding based on transaction type
  const getAmountColor = () => {
    if (type === 'income') return '#34C759'; // Green
    if (type === 'expense') return '#FF3B30'; // Red
    return currColors.text; // Default/white
  };

  const segmentActiveColor = () => {
    if (type === 'income') return '#34C759';
    if (type === 'expense') return '#FF3B30';
    return '#00C9A7';
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
            {editingTx ? 'Edit Transaction' : 'Add Transaction'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#00C9A7' }]}
            onPress={handleSave}
          >
            <Check size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          {/* Transaction Type Segmented Controller */}
          <View style={[styles.segmentContainer, { backgroundColor: currColors.cardSecondary }]}>
            {(['expense', 'income', 'transfer'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.segmentTab,
                  type === t && { backgroundColor: segmentActiveColor() },
                ]}
                onPress={() => {
                  handleHaptic();
                  setType(t);
                }}
              >
                <ThemedText
                  style={[
                    styles.segmentLabel,
                    {
                      color: type === t ? '#FFFFFF' : currColors.textSecondary,
                      fontFamily: type === t ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
                    },
                  ]}
                >
                  {t.toUpperCase()}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount input */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>AMOUNT</ThemedText>
            <View style={[styles.amountInputContainer, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.currencyPrefix, { color: getAmountColor() }]}>₹</ThemedText>
              <TextInput
                style={[styles.amountInput, { color: getAmountColor() }]}
                placeholder="0"
                placeholderTextColor={currColors.textSecondary}
                showSoftInputOnFocus={false}
                onFocus={() => {
                  setShowCalculator(true);
                  Keyboard.dismiss();
                }}
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          {/* Category Tags Selection Grid (Income/Expense only) */}
          {type !== 'transfer' ? (
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>CATEGORY</ThemedText>
              <View style={styles.tagsContainer}>
                {tagRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.tagRow}>
                    {row.map((item) => {
                      if (item === 'SEE_ALL') {
                        return (
                          <TouchableOpacity
                            key="see-all"
                            style={[styles.tagButton, styles.seeAllTagButton, { borderColor: '#00C9A7' }]}
                            onPress={() => {
                              handleHaptic();
                              setShowCategoryModal(true);
                              setShowCalculator(false);
                            }}
                          >
                            <ThemedText style={[styles.tagText, { color: '#00C9A7', fontFamily: 'Outfit_600SemiBold' }]}>
                              See All
                            </ThemedText>
                          </TouchableOpacity>
                        );
                      }

                      const isSelected = category === item;
                      const activeColor = type === 'income' ? '#34C759' : '#FF3B30';
                      
                      return (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.tagButton,
                            { 
                              backgroundColor: isSelected ? activeColor : currColors.card,
                              borderColor: isSelected ? activeColor : currColors.border,
                            }
                          ]}
                          onPress={() => {
                            handleHaptic();
                            setCategory(item);
                            setShowCalculator(false);
                          }}
                        >
                          <ThemedText 
                            style={[
                              styles.tagText, 
                              { 
                                color: isSelected ? '#FFFFFF' : currColors.text,
                                fontFamily: isSelected ? 'Outfit_600SemiBold' : 'Outfit_400Regular'
                              }
                            ]}
                            numberOfLines={1}
                          >
                            {item}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Account Selector (Source Account) */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>
              {type === 'transfer' ? 'FROM ACCOUNT' : 'ACCOUNT'}
            </ThemedText>
            <TouchableOpacity
              style={[styles.selectBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}
              onPress={() => {
                handleHaptic();
                setShowAccountModal(true);
                setShowCalculator(false);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {sourceAccount ? (
                  <AccountIcon account={sourceAccount} size={24} />
                ) : null}
                <ThemedText style={{ color: sourceAccount ? currColors.text : currColors.textSecondary, fontSize: 15, fontFamily: 'Outfit_500Medium' }}>
                  {sourceAccount ? sourceAccount.name : 'Select Account'}
                </ThemedText>
              </View>
              <ChevronDown size={18} color={currColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Destination Account Selector (Transfer only) */}
          {type === 'transfer' ? (
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>TO ACCOUNT</ThemedText>
              <TouchableOpacity
                style={[styles.selectBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                onPress={() => {
                  handleHaptic();
                  setShowToAccountModal(true);
                  setShowCalculator(false);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {destAccount ? (
                    <AccountIcon account={destAccount} size={24} />
                  ) : null}
                  <ThemedText style={{ color: destAccount ? currColors.text : currColors.textSecondary, fontSize: 15, fontFamily: 'Outfit_500Medium' }}>
                    {destAccount ? destAccount.name : 'Select Destination Account'}
                  </ThemedText>
                </View>
                <ChevronDown size={18} color={currColors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Date Selector */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>DATE</ThemedText>
            {Platform.OS === 'ios' ? (
              <View style={styles.iosDatePickerContainer}>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  themeVariant={colorScheme}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.selectBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                onPress={() => {
                  handleHaptic();
                  setShowDatePicker(true);
                  setShowCalculator(false);
                }}
              >
                <ThemedText style={{ color: currColors.text, fontSize: 15, fontFamily: 'Outfit_500Medium' }}>
                  {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </ThemedText>
              </TouchableOpacity>
            )}
            {showDatePicker && Platform.OS !== 'ios' && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </View>

          {/* Note Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>NOTE (OPTIONAL)</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
              placeholder="Add details about this transaction"
              placeholderTextColor={currColors.textSecondary}
              value={note}
              onChangeText={setNote}
              onFocus={() => setShowCalculator(false)}
            />
          </View>
        </ScrollView>

        {/* Calculator Keyboard */}
        {showCalculator && (
          <View style={[styles.calcContainer, { backgroundColor: currColors.card, borderTopColor: currColors.border }]}>
            {calcKeys.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.calcRow}>
                {row.map((key) => {
                  const isDone = key === 'Done';
                  const isOperator = ['÷', '×', '-', '+', '=', 'Done'].includes(key);
                  const isClearOrBack = ['C', '⌫'].includes(key);
                  
                  let btnBg = currColors.cardSecondary;
                  let textCol = currColors.text;
                  
                  if (isOperator) {
                    btnBg = '#00C9A71A';
                    textCol = '#00C9A7';
                  }
                  if (key === 'Done') {
                    btnBg = '#00C9A7';
                    textCol = '#FFFFFF';
                  }
                  if (isClearOrBack) {
                    btnBg = colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA';
                    textCol = '#FF3B30';
                  }

                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.calcButton,
                        isDone && { flex: 2 },
                        { backgroundColor: btnBg }
                      ]}
                      onPress={() => handleCalcKeyPress(key)}
                    >
                      <ThemedText style={[styles.calcButtonText, { color: textCol }]}>
                        {key}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Account Selection Modal Bottom Sheet */}
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
                    setAccountId(item.id);
                    setIsAccountManuallySelected(true);
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
                  {accountId === item.id && <Check size={18} color="#00C9A7" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Destination Account Selection Modal Bottom Sheet */}
      <Modal visible={showToAccountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowToAccountModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <View style={styles.modalDragHandle} />
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Select Destination Account</ThemedText>
              <TouchableOpacity onPress={() => setShowToAccountModal(false)} style={styles.modalCloseIcon}>
                <X size={20} color={currColors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={activeAccounts.filter((a) => a.id !== accountId)}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: currColors.border }, item.includeInAssets === false && { opacity: 0.55 }]}
                  onPress={() => {
                    setToAccountId(item.id);
                    setShowToAccountModal(false);
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
                  {toAccountId === item.id && <Check size={18} color="#00C9A7" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Category Selection Modal Bottom Sheet */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowCategoryModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <View style={styles.modalDragHandle} />
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Select Category</ThemedText>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.modalCloseIcon}>
                <X size={20} color={currColors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categoriesList}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    setCategory(item);
                    setShowCategoryModal(false);
                  }}
                >
                  <ThemedText type="semiBold" style={{ color: currColors.text, fontSize: 15, flex: 1 }}>{item}</ThemedText>
                  {category === item && <Check size={18} color="#00C9A7" />}
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
  segmentContainer: {
    flexDirection: 'row',
    height: 46,
    borderRadius: 14,
    padding: 3,
    marginBottom: 26,
  },
  segmentTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  segmentLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
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
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  currencyPrefix: {
    fontSize: 34,
    fontFamily: 'Outfit_700Bold',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 40,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'left',
    minWidth: 100,
    padding: 0,
  },
  selectBox: {
    height: 54,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  tagsContainer: {
    marginTop: 4,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tagButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  seeAllTagButton: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  tagText: {
    fontSize: 13,
  },
  textInput: {
    height: 54,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
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
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  calcContainer: {
    padding: 8,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  calcRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  calcButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcButtonText: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
});
