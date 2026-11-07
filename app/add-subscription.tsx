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
  TrendingUp,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Subscription, Account } from '@/types/money';
import { Category3DIcon } from '@/components/Category3DIcon';
import { AccountLogoOrIcon } from '@/components/AccountLogoOrIcon';
import { AccountPickerModal } from '@/components/AccountPickerModal';
import {
  CATEGORY_3D_ICONS_LIST,
  findBest3DIconForText,
} from '@/constants/Category3DIcons';
import {
  formatCurrencyINR,
  formatIndianAmount,
  parseIndianAmount,
} from '@/utils/formatters';

const CYCLES: {
  cycle: Subscription['billingCycle'];
  label: string;
}[] = [
  { cycle: 'monthly', label: 'Monthly' },
  { cycle: 'yearly', label: 'Yearly' },
  { cycle: 'quarterly', label: 'Quarterly' },
  { cycle: 'weekly', label: 'Weekly' },
];

export default function AddSubscriptionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

  const { subscriptions, accounts, addSubscription, updateSubscription } =
    useMoneyStore();

  const editingSubscription = useMemo(() => {
    return id ? subscriptions.find((s) => String(s.id) === String(id)) : null;
  }, [id, subscriptions]);

  // Form Fields
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] =
    useState<Subscription['billingCycle']>('monthly');
  const [nextPaymentDate, setNextPaymentDate] = useState(new Date());
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [color, setColor] = useState('#7E22CE');
  const [icon, setIcon] = useState('tv');
  const [isIconManuallyChosen, setIsIconManuallyChosen] = useState(false);

  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  // Modals & Pickers
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
    if (editingSubscription) {
      setName(editingSubscription.name);
      setAmount(formatIndianAmount(editingSubscription.amount.toString()));
      setBillingCycle(editingSubscription.billingCycle);
      setNextPaymentDate(new Date(editingSubscription.nextPaymentDate));
      setLinkedAccountId(editingSubscription.linkedAccountId || '');
      setColor(editingSubscription.color || '#7E22CE');
      setIcon(editingSubscription.logo || editingSubscription.icon || 'tv');
      setIsIconManuallyChosen(true);
    } else if (activeAccounts.length > 0) {
      setLinkedAccountId(activeAccounts[0].id);
    }
  }, [editingSubscription]);

  // Auto-predict 3D icon when service name is entered
  const handleNameChange = (text: string) => {
    setName(text);
    if (!isIconManuallyChosen) {
      if (text.trim().length > 0) {
        const predicted = findBest3DIconForText(text);
        setIcon(predicted);
      } else {
        setIcon('tv');
      }
    }
  };

  // Cost Insights calculations
  const parsedAmountNum = useMemo(() => {
    return parseIndianAmount(amount) || 0;
  }, [amount]);

  const monthlyEquivalent = useMemo(() => {
    if (parsedAmountNum <= 0) return 0;
    switch (billingCycle) {
      case 'yearly':
        return Math.round(parsedAmountNum / 12);
      case 'quarterly':
        return Math.round(parsedAmountNum / 3);
      case 'weekly':
        return Math.round((parsedAmountNum * 52) / 12);
      case 'monthly':
      default:
        return parsedAmountNum;
    }
  }, [parsedAmountNum, billingCycle]);

  const yearlyEquivalent = useMemo(() => {
    if (parsedAmountNum <= 0) return 0;
    switch (billingCycle) {
      case 'yearly':
        return parsedAmountNum;
      case 'quarterly':
        return parsedAmountNum * 4;
      case 'weekly':
        return parsedAmountNum * 52;
      case 'monthly':
      default:
        return parsedAmountNum * 12;
    }
  }, [parsedAmountNum, billingCycle]);

  const handleSave = () => {
    handleHaptic();
    if (parsedAmountNum <= 0 || !name.trim()) {
      Alert.alert(
        'Required Field',
        'Please enter a service name and valid subscription amount.'
      );
      return;
    }

    const subData: Subscription = {
      id: editingSubscription
        ? editingSubscription.id
        : Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      provider: name.trim(),
      amount: parsedAmountNum,
      billingCycle,
      nextPaymentDate: nextPaymentDate.toISOString(),
      linkedAccountId: linkedAccountId || undefined,
      category: editingSubscription?.category || 'Subscriptions',
      color,
      logo: icon,
      icon: icon,
      isActive: true,
      createdAt: editingSubscription
        ? editingSubscription.createdAt
        : new Date().toISOString(),
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
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setNextPaymentDate(selectedDate);
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
            {editingSubscription ? 'Edit Subscription' : 'Add Subscription'}
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
            {/* 1. SERVICE DETAILS GROUP */}
            <ThemedText
              style={[styles.groupLabel, { color: currColors.textSecondary }]}
            >
              SERVICE DETAILS
            </ThemedText>
            <View
              style={[styles.formGroup, { backgroundColor: currColors.card }]}
            >
              {/* Service Name & Clickable 3D Icon */}
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
                  placeholder="e.g. Netflix, Spotify, Amazon Prime"
                  placeholderTextColor={currColors.textSecondary}
                  value={name}
                  onChangeText={handleNameChange}
                  autoCorrect={false}
                  spellCheck={false}
                  autoFocus={!editingSubscription}
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

            {/* 2. BILLING & COST GROUP */}
            <ThemedText
              style={[styles.groupLabel, { color: currColors.textSecondary }]}
            >
              BILLING & COST
            </ThemedText>
            <View
              style={[styles.formGroup, { backgroundColor: currColors.card }]}
            >
              {/* Subscription Amount */}
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
                    Subscription Cost
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.subLabel,
                      { color: currColors.textSecondary },
                    ]}
                  >
                    Recurring amount billed
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
                    value={amount}
                    onChangeText={(val) => setAmount(formatIndianAmount(val))}
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Billing Frequency / Cycle */}
              <View
                style={[
                  styles.formRow,
                  parsedAmountNum <= 0 && styles.formRowLast,
                  { borderBottomColor: currColors.border, flexDirection: 'column', alignItems: 'stretch' },
                ]}
              >
                <ThemedText
                  style={[styles.label, { color: currColors.text, marginBottom: 8 }]}
                >
                  Billing Frequency
                </ThemedText>
                <View style={styles.cyclesRow}>
                  {CYCLES.map((c) => {
                    const isSelected = billingCycle === c.cycle;
                    return (
                      <TouchableOpacity
                        key={c.cycle}
                        style={[
                          styles.cyclePill,
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
                          setBillingCycle(c.cycle);
                        }}
                        activeOpacity={0.7}
                      >
                        <ThemedText
                          style={[
                            styles.cyclePillText,
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
                          {c.label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Annualized Cost Insights Card */}
              {parsedAmountNum > 0 && (
                <View
                  style={[
                    styles.insightsCard,
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
                      marginBottom: 8,
                    }}
                  >
                    <TrendingUp size={15} color={currColors.tintMoney} />
                    <ThemedText
                      style={[
                        styles.insightsHeaderTitle,
                        { color: currColors.text },
                      ]}
                    >
                      Cost Projections
                    </ThemedText>
                  </View>

                  <View style={styles.insightsStatsRow}>
                    <View style={styles.insightsStatItem}>
                      <ThemedText
                        style={[
                          styles.insightsStatLabel,
                          { color: currColors.textSecondary },
                        ]}
                      >
                        Monthly Run-Rate
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.insightsStatValue,
                          { color: currColors.tintMoney },
                        ]}
                      >
                        ₹{monthlyEquivalent.toLocaleString('en-IN')}/mo
                      </ThemedText>
                    </View>

                    <View style={styles.insightsStatItem}>
                      <ThemedText
                        style={[
                          styles.insightsStatLabel,
                          { color: currColors.textSecondary },
                        ]}
                      >
                        Annualized Spend
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.insightsStatValue,
                          { color: currColors.text },
                        ]}
                      >
                        ₹{yearlyEquivalent.toLocaleString('en-IN')}/yr
                      </ThemedText>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 3. RENEWAL & PAYMENT GROUP */}
            <ThemedText
              style={[styles.groupLabel, { color: currColors.textSecondary }]}
            >
              RENEWAL & PAYMENT
            </ThemedText>
            <View
              style={[styles.formGroup, { backgroundColor: currColors.card }]}
            >
              {/* Next Payment Date */}
              <View
                style={[
                  styles.formRow,
                  { borderBottomColor: currColors.border },
                ]}
              >
                <ThemedText
                  style={[styles.label, { color: currColors.text }]}
                >
                  Next Renewal Date
                </ThemedText>
                {Platform.OS === 'ios' ? (
                  <DateTimePicker
                    value={nextPaymentDate}
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
                      {nextPaymentDate.toLocaleDateString('en-IN', {
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
                  value={nextPaymentDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}

              {/* Paid From Account */}
              <TouchableOpacity
                style={[styles.formRow, styles.formRowLast]}
                onPress={() => setShowAccountModal(true)}
                activeOpacity={0.7}
              >
                <ThemedText
                  style={[styles.label, { color: currColors.text }]}
                >
                  Paid From Account
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
              placeholder="Search 80+ 3D objects (tv, music, cloud)..."
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
  cyclesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cyclePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cyclePillText: {
    fontSize: 13,
  },
  insightsCard: {
    margin: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  insightsHeaderTitle: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  insightsStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightsStatItem: {
    flex: 1,
  },
  insightsStatLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 2,
  },
  insightsStatValue: {
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
