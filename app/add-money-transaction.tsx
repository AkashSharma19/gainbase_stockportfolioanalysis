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
import { MoneyTransaction } from '@/types/money';

export default function AddMoneyTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const storeCategories = useMoneyStore((state) => state.categories) || {
    income: ['Salary', 'Investments', 'Business', 'Gift', 'Refund', 'Other'],
    expense: ['Food & Dining', 'Rent & Bills', 'Shopping', 'Entertainment', 'Travel', 'Medical', 'Education', 'Other']
  };

  const { accounts, moneyTransactions, addMoneyTransaction, updateMoneyTransaction } = useMoneyStore();


  const editingTx = useMemo(() => {
    return id ? moneyTransactions.find((tx) => tx.id === id) : null;
  }, [id, moneyTransactions]);

  // Form State
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showToAccountModal, setShowToAccountModal] = useState(false);

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
        setIsCustomCategory(false);
      }
    } else {
      // Default to first active account
      const activeAccounts = accounts.filter((a) => !a.isArchived);
      if (activeAccounts.length > 0) {
        setAccountId(activeAccounts[0].id);
        if (activeAccounts.length > 1) {
          setToAccountId(activeAccounts[1].id);
        }
      }
      
      // Default category
      setCategory(type === 'income' ? storeCategories.income[0] : storeCategories.expense[0]);
    }
  }, [editingTx, storeCategories]);

  // Auto-switch categories when type changes
  useEffect(() => {
    if (!editingTx) {
      if (type === 'income') {
        setCategory(storeCategories.income[0]);
        setIsCustomCategory(false);
      } else if (type === 'expense') {
        setCategory(storeCategories.expense[0]);
        setIsCustomCategory(false);
      }
    }
  }, [type, storeCategories]);


  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    handleHaptic();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Required Field', 'Please enter a valid amount.');
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

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Transaction Type Segmented Controller */}
          <View style={[styles.segmentContainer, { backgroundColor: currColors.cardSecondary }]}>
            {(['expense', 'income', 'transfer'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.segmentTab,
                  type === t && {
                    backgroundColor:
                      t === 'income'
                        ? '#34C759'
                        : t === 'expense'
                        ? '#FF3B30'
                        : currColors.card,
                  },
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
            <TextInput
              style={[styles.amountInput, { color: currColors.text, borderBottomColor: currColors.border }]}
              placeholder="0"
              placeholderTextColor={currColors.textSecondary}
              keyboardType="numeric"
              autoFocus={!editingTx}
              value={amount}
              onChangeText={setAmount}
            />
          </View>

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
              }}
            >
              <ThemedText style={{ color: sourceAccount ? currColors.text : currColors.textSecondary, fontSize: 16 }}>
                {sourceAccount ? sourceAccount.name : 'Select Account'}
              </ThemedText>
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
                }}
              >
                <ThemedText style={{ color: destAccount ? currColors.text : currColors.textSecondary, fontSize: 16 }}>
                  {destAccount ? destAccount.name : 'Select Destination Account'}
                </ThemedText>
                <ChevronDown size={18} color={currColors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Category Selector (Income/Expense only) */}
          {type !== 'transfer' ? (
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>CATEGORY</ThemedText>
              <TouchableOpacity
                style={[styles.selectBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}
                onPress={() => {
                  handleHaptic();
                  setShowCategoryModal(true);
                }}
              >
                <ThemedText style={{ color: category ? currColors.text : currColors.textSecondary, fontSize: 16 }}>
                  {category === 'Custom' && customCategory ? `Custom: ${customCategory}` : category || 'Select Category'}
                </ThemedText>
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
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText style={{ color: currColors.text, fontSize: 16 }}>
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
            />
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
                    setAccountId(item.id);
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

      {/* Destination Account Selection Modal */}
      <Modal visible={showToAccountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currColors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Select Destination</ThemedText>
              <TouchableOpacity onPress={() => setShowToAccountModal(false)}>
                <X size={22} color={currColors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={activeAccounts.filter((a) => a.id !== accountId)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    setToAccountId(item.id);
                    setShowToAccountModal(false);
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

      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currColors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Select Category</ThemedText>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <X size={22} color={currColors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categoriesList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    setCategory(item);
                    setIsCustomCategory(false);
                    setShowCategoryModal(false);
                  }}
                >
                  <ThemedText style={{ color: currColors.text, fontSize: 16 }}>
                    {item}
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
    fontSize: 18,
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
    height: 44,
    borderRadius: 12,
    padding: 3,
    marginBottom: 26,
  },
  segmentTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentLabel: {
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  amountInput: {
    fontSize: 36,
    fontFamily: 'Outfit_700Bold',
    borderBottomWidth: 1,
    paddingVertical: 8,
    textAlign: 'center',
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
  textInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
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
