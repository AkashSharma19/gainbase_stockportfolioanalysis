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
  Tv,
  Music,
  Youtube,
  ShoppingBag,
  Cloud,
  Gamepad2,
  Sparkles,
  Layers,
  Repeat,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Subscription, Account } from '@/types/money';
import { formatCurrencyINR, formatIndianAmount, parseIndianAmount } from '@/utils/formatters';
import { BankLogo } from '@/components/BankLogo';

const BRAND_PRESETS = [
  { id: 'netflix', name: 'Netflix', iconName: 'tv', icon: Tv, color: '#E50914', category: 'Entertainment' },
  { id: 'spotify', name: 'Spotify', iconName: 'music', icon: Music, color: '#1DB954', category: 'Entertainment' },
  { id: 'youtube', name: 'YouTube Premium', iconName: 'youtube', icon: Youtube, color: '#FF0000', category: 'Entertainment' },
  { id: 'prime', name: 'Amazon Prime', iconName: 'shopping-bag', icon: ShoppingBag, color: '#FF9900', category: 'Shopping' },
  { id: 'chatgpt', name: 'ChatGPT Plus', iconName: 'sparkles', icon: Sparkles, color: '#10A37F', category: 'Software' },
  { id: 'googleone', name: 'Google One', iconName: 'cloud', icon: Cloud, color: '#4285F4', category: 'Utilities' },
  { id: 'playstation', name: 'PS Plus', iconName: 'gamepad-2', icon: Gamepad2, color: '#003087', category: 'Entertainment' },
  { id: 'adobe', name: 'Adobe CC', iconName: 'layers', icon: Layers, color: '#FF0000', category: 'Software' },
] as const;

const CYCLES: { cycle: Subscription['billingCycle']; label: string }[] = [
  { cycle: 'monthly', label: 'Monthly' },
  { cycle: 'yearly', label: 'Yearly' },
  { cycle: 'quarterly', label: 'Quarterly' },
  { cycle: 'weekly', label: 'Weekly' },
];

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

export default function AddSubscriptionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { subscriptions, accounts, addSubscription, updateSubscription } = useMoneyStore();

  const editingSubscription = useMemo(() => {
    return id ? subscriptions.find((s) => String(s.id) === String(id)) : null;
  }, [id, subscriptions]);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<Subscription['billingCycle']>('monthly');
  const [nextPaymentDate, setNextPaymentDate] = useState(new Date());
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [color, setColor] = useState('#007AFF');
  const [logo, setLogo] = useState<string | undefined>();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);

  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => !a.isArchived);
  }, [accounts]);

  const linkedAccount = useMemo(() => {
    return accounts.find((a) => a.id === linkedAccountId);
  }, [accounts, linkedAccountId]);

  useEffect(() => {
    if (editingSubscription) {
      setName(editingSubscription.name);
      setAmount(formatIndianAmount(editingSubscription.amount.toString()));
      setBillingCycle(editingSubscription.billingCycle);
      setNextPaymentDate(new Date(editingSubscription.nextPaymentDate));
      setLinkedAccountId(editingSubscription.linkedAccountId || '');
      setCategory(editingSubscription.category || 'Entertainment');
      setColor(editingSubscription.color || '#007AFF');
      setLogo(editingSubscription.logo);
    } else if (activeAccounts.length > 0) {
      setLinkedAccountId(activeAccounts[0].id);
    }
  }, [editingSubscription]);

  const selectedBrandObj = useMemo(() => {
    return BRAND_PRESETS.find((b) => b.iconName === logo || b.id === logo);
  }, [logo]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a subscription name.');
      return;
    }

    const parsedAmount = parseIndianAmount(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Required Field', 'Please enter a valid subscription amount.');
      return;
    }

    const subData: Subscription = {
      id: editingSubscription ? editingSubscription.id : Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      provider: name.trim(),
      amount: parsedAmount,
      billingCycle,
      nextPaymentDate: nextPaymentDate.toISOString(),
      linkedAccountId: linkedAccountId || undefined,
      category: category.trim() || 'Entertainment',
      color,
      logo,
      isActive: true,
      createdAt: editingSubscription ? editingSubscription.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingSubscription) {
      updateSubscription(editingSubscription.id, subData);
    } else {
      addSubscription(subData);
    }

    router.back();
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNextPaymentDate(selectedDate);
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
            {editingSubscription ? 'Edit Subscription' : 'Add Subscription'}
          </ThemedText>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <ThemedText style={[styles.headerButtonText, styles.saveButtonText, { color: currColors.tint }]}>
              Save
            </ThemedText>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* GROUP 1: SERVICE DETAILS */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              SERVICE DETAILS
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {/* Name Row */}
              <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Service Name</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="e.g. Netflix, Spotify, Gym"
                  placeholderTextColor={currColors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                />
              </View>

              {/* Brand Preset Row */}
              <TouchableOpacity
                style={[styles.formRow, { borderBottomColor: currColors.border }]}
                onPress={() => setShowBrandModal(true)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.label, { color: currColors.text }]}>Brand Preset</ThemedText>
                <View style={styles.valueContainer}>
                  {selectedBrandObj ? (
                    (() => {
                      const IconComp = selectedBrandObj.icon;
                      return (
                        <View style={styles.typeBadge}>
                          <View style={[styles.typeIconWrap, { backgroundColor: `${selectedBrandObj.color}15` }]}>
                            <IconComp size={15} color={selectedBrandObj.color} />
                          </View>
                          <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                            {selectedBrandObj.name}
                          </ThemedText>
                        </View>
                      );
                    })()
                  ) : (
                    <ThemedText style={[styles.valueText, styles.placeholderText, { color: currColors.textSecondary }]}>
                      Choose Preset
                    </ThemedText>
                  )}
                  <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 6 }} />
                </View>
              </TouchableOpacity>

              {/* Category Row */}
              <View style={[styles.formRow, styles.formRowLast]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Category</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="Entertainment, Software"
                  placeholderTextColor={currColors.textSecondary}
                  value={category}
                  onChangeText={setCategory}
                  textAlign="right"
                />
              </View>
            </View>

            {/* GROUP 2: BILLING & PAYMENT */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              BILLING & PAYMENT
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {/* Amount Row */}
              <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Recurring Amount</ThemedText>
                <View style={styles.amountInputRow}>
                  <ThemedText style={[styles.currencyPrefix, { color: currColors.text }]}>₹</ThemedText>
                  <TextInput
                    style={[styles.input, { color: currColors.text }]}
                    placeholder="0"
                    placeholderTextColor={currColors.textSecondary}
                    value={amount}
                    onChangeText={(val) => setAmount(formatIndianAmount(val))}
                    keyboardType="decimal-pad"
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Billing Cycle Row */}
              <TouchableOpacity
                style={[styles.formRow, { borderBottomColor: currColors.border }]}
                onPress={() => setShowCycleModal(true)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.label, { color: currColors.text }]}>Billing Cycle</ThemedText>
                <View style={styles.valueContainer}>
                  <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                    {CYCLES.find((c) => c.cycle === billingCycle)?.label || 'Monthly'}
                  </ThemedText>
                  <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 6 }} />
                </View>
              </TouchableOpacity>

              {/* Next Renewal Date Row */}
              <View style={[styles.formRow, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Next Due Date</ThemedText>
                <View style={{ flex: 1 }}>
                  {Platform.OS === 'ios' ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <DateTimePicker
                        value={nextPaymentDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        themeVariant={colorScheme}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ alignItems: 'flex-end' }}>
                      <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                        {nextPaymentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {showDatePicker && Platform.OS !== 'ios' && (
                <DateTimePicker value={nextPaymentDate} mode="date" display="default" onChange={onDateChange} />
              )}

              {/* Linked Debit Account Row */}
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* BILLING CYCLE MODAL */}
      <Modal visible={showCycleModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Billing Frequency</ThemedText>
            <TouchableOpacity onPress={() => setShowCycleModal(false)} style={styles.modalCloseButton}>
              <X size={20} color={currColors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={CYCLES}
            keyExtractor={(item) => item.cycle}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = billingCycle === item.cycle;
              return (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    setBillingCycle(item.cycle);
                    setShowCycleModal(false);
                  }}
                >
                  <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>{item.label}</ThemedText>
                  {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* BRAND PRESETS MODAL */}
      <Modal visible={showBrandModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Popular Subscriptions</ThemedText>
            <TouchableOpacity onPress={() => setShowBrandModal(false)} style={styles.modalCloseButton}>
              <X size={20} color={currColors.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={BRAND_PRESETS}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    setName(item.name);
                    setColor(item.color);
                    setLogo(item.iconName);
                    setCategory(item.category);
                    setShowBrandModal(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: `${item.color}18`,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}
                    >
                      <IconComponent size={18} color={item.color} />
                    </View>
                    <View>
                      <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>{item.name}</ThemedText>
                      <ThemedText style={[styles.itemSubtitle, { color: currColors.textSecondary }]}>
                        {item.category}
                      </ThemedText>
                    </View>
                  </View>
                  <ChevronRight size={16} color={currColors.border} />
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
