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
  Sparkles,
  CreditCard,
  Tag,
  Clock,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/ThemedText';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Subscription, Account } from '@/types/money';
import { Category3DIcon } from '@/components/Category3DIcon';
import { AccountLogoOrIcon } from '@/components/AccountLogoOrIcon';
import { AccountPickerModal } from '@/components/AccountPickerModal';
import {
  CATEGORY_3D_ICONS_LIST,
  findBest3DIconForText,
} from '@/constants/Category3DIcons';
import { getCardPaletteFromItem } from '@/constants/folderTheme';
import { formatCurrencyINR, formatIndianAmount, parseIndianAmount } from '@/utils/formatters';

// Fallback Static Theme
const DEFAULT_THEME = {
  bg: '#E9D5FF',
  text: '#581C87',
  sub: '#7E22CE',
  border: '#9333EA',
  cardBg: '#FFFFFF',
  cardBorder: 'rgba(88, 28, 135, 0.15)',
  trackInactive: 'rgba(88, 28, 135, 0.15)',
  trackActive: '#581C87',
  accentPill: 'rgba(88, 28, 135, 0.08)',
};

const CYCLES: {
  cycle: Subscription['billingCycle'];
  label: string;
  tag: string;
  periodText: string;
}[] = [
  { cycle: 'monthly', label: 'Monthly', tag: 'Most popular', periodText: '/mo' },
  { cycle: 'yearly', label: 'Yearly', tag: 'Save on annual plans', periodText: '/yr' },
  { cycle: 'quarterly', label: 'Quarterly', tag: 'Every 3 months', periodText: '/qtr' },
  { cycle: 'weekly', label: 'Weekly', tag: 'Every 7 days', periodText: '/wk' },
];

export default function AddSubscriptionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

  const { subscriptions, accounts, addSubscription, updateSubscription } = useMoneyStore();

  const editingSubscription = useMemo(() => {
    return id ? subscriptions.find((s) => String(s.id) === String(id)) : null;
  }, [id, subscriptions]);

  // Step State (0: Service, 1: Cost & Cycle, 2: Renewal & Account)
  const [currentStep, setCurrentStep] = useState(0);

  // Form Fields
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<Subscription['billingCycle']>('monthly');
  const [nextPaymentDate, setNextPaymentDate] = useState(new Date());
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [color, setColor] = useState('#7E22CE');
  const [icon, setIcon] = useState('tv');
  const [isIconManuallyChosen, setIsIconManuallyChosen] = useState(false);

  // Dynamic Pastel Theme derived from icon (matching list view card colors)
  const THEME = useMemo(() => {
    const palette = getCardPaletteFromItem({
      icon,
      name,
      color: editingSubscription?.color,
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
  }, [icon, name, editingSubscription?.color]);

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

  // Step Validation & Navigation
  const validateStep = (step: number): boolean => {
    if (step === 0) {
      if (!name.trim()) {
        Alert.alert('Required Field', 'Please enter a subscription or service name.');
        return false;
      }
      return true;
    }
    if (step === 1) {
      if (parsedAmountNum <= 0) {
        Alert.alert('Required Field', 'Please enter a valid subscription amount.');
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
    if (parsedAmountNum <= 0 || !name.trim()) {
      Alert.alert('Validation Error', 'Please complete all required subscription details.');
      return;
    }

    const subData: Subscription = {
      id: editingSubscription ? editingSubscription.id : Math.random().toString(36).substring(2, 9),
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
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setNextPaymentDate(selectedDate);
    }
  };

  // Step Meta Configuration
  const STEP_METAS = [
    { title: 'Name', subtitle: 'Subscription Name' },
    { title: 'Billing', subtitle: 'Billing & Plan' },
    { title: 'Renewal', subtitle: 'Renewal Schedule' },
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
            {editingSubscription ? 'Edit Subscription' : 'Add Subscription'}
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

        {/* Step Indicator Subtitle */}
        <ThemedText style={[styles.stepLabel, { color: THEME.sub }]}>
          STEP {currentStep + 1} OF 3 • {STEP_METAS[currentStep].title.toUpperCase()}
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
                'Enter the subscription name and choose an icon.'}
              {currentStep === 1 &&
                'Enter the amount and billing frequency.'}
              {currentStep === 2 &&
                'Set the next renewal date and payment account.'}
            </ThemedText>
          </View>

          {/* ════════════ STEP 0: SUBSCRIPTION NAME & ICON ════════════ */}
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
                    style={[
                      styles.largeTextInput,
                      { color: THEME.text, borderBottomColor: THEME.text + '33' },
                    ]}
                    placeholder="e.g. Netflix, Spotify, iCloud"
                    placeholderTextColor={THEME.text + '55'}
                    value={name}
                    onChangeText={handleNameChange}
                    autoFocus={!editingSubscription}
                    returnKeyType="next"
                  />
                </View>
              </View>
            </View>
          )}

          {/* ════════════ STEP 1: COST & BILLING CYCLE ════════════ */}
          {currentStep === 1 && (
            <View style={[styles.stepCard, { borderColor: THEME.cardBorder }]}>
              {/* Amount Input */}
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
                    value={amount}
                    onChangeText={(val) => setAmount(formatIndianAmount(val))}
                    autoFocus={true}
                    returnKeyType="done"
                  />
                </View>
              </View>

              <View style={[styles.fieldDivider, { backgroundColor: THEME.text + '14' }]} />

              {/* Billing Cycle Picker Cards */}
              <View>
                <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                  BILLING CYCLE
                </ThemedText>
                <View style={styles.cycleGrid}>
                  {CYCLES.map((c) => {
                    const isSelected = billingCycle === c.cycle;
                    return (
                      <TouchableOpacity
                        key={c.cycle}
                        style={[
                          styles.cycleCard,
                          {
                            borderColor: isSelected ? THEME.text : THEME.text + '26',
                            backgroundColor: isSelected ? THEME.text + '14' : THEME.text + '08',
                          },
                        ]}
                        onPress={() => {
                          handleHaptic();
                          setBillingCycle(c.cycle);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <ThemedText
                            style={[
                              styles.cycleCardTitle,
                              { color: THEME.text },
                            ]}
                          >
                            {c.label}
                          </ThemedText>
                          {isSelected && (
                            <View style={[styles.cycleCheckPill, { backgroundColor: THEME.text }]}>
                              <Check size={12} color={THEME.bg} strokeWidth={3} />
                            </View>
                          )}
                        </View>
                        <ThemedText
                          style={[
                            styles.cycleCardSub,
                            { color: isSelected ? THEME.text : THEME.sub },
                          ]}
                        >
                          {c.tag}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Dynamic Annualized Spend Box */}
              {parsedAmountNum > 0 && (
                <View style={[styles.costBreakdownBox, { backgroundColor: THEME.text + '0F', borderColor: THEME.text + '1F' }]}>
                  <View style={styles.costBreakdownHeader}>
                    <Sparkles size={16} color={THEME.text} />
                    <ThemedText style={[styles.costBreakdownTitle, { color: THEME.text }]}>
                      Cash Flow Impact
                    </ThemedText>
                  </View>

                  <View style={styles.costMetricsRow}>
                    <View style={styles.costMetricCol}>
                      <ThemedText style={[styles.costMetricLabel, { color: THEME.sub }]}>Monthly Cost</ThemedText>
                      <ThemedText style={[styles.costMetricValue, { color: THEME.text }]}>
                        ₹{monthlyEquivalent.toLocaleString('en-IN')}/mo
                      </ThemedText>
                    </View>
                    <View style={[styles.costMetricDivider, { backgroundColor: THEME.text + '26' }]} />
                    <View style={styles.costMetricCol}>
                      <ThemedText style={[styles.costMetricLabel, { color: THEME.sub }]}>Yearly Cost</ThemedText>
                      <ThemedText style={[styles.costMetricValue, { color: THEME.text }]}>
                        ₹{yearlyEquivalent.toLocaleString('en-IN')}/yr
                      </ThemedText>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ════════════ STEP 2: RENEWAL & DEBIT ACCOUNT ════════════ */}
          {currentStep === 2 && (
            <View style={[styles.stepCard, { borderColor: THEME.cardBorder }]}>
              {/* Next Payment Date */}
              <View>
                <View style={styles.selectorTriggerRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Calendar size={18} color={THEME.text} />
                    <ThemedText style={[styles.selectorTriggerValue, { color: THEME.text }]}>
                      Renewal Date
                    </ThemedText>
                  </View>
                  {Platform.OS === 'ios' ? (
                     <DateTimePicker
                      value={nextPaymentDate}
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
              </View>

              <View style={[styles.fieldDivider, { backgroundColor: THEME.text + '14' }]} />

              {/* Linked Debit Account */}
              <View>
                <ThemedText style={[styles.inputLabel, { color: THEME.sub }]}>
                  PAYMENT ACCOUNT
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
                  <Category3DIcon name={icon} size={42} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.reviewTitle, { color: THEME.text }]} numberOfLines={1}>
                      {name || 'New Subscription'}
                    </ThemedText>
                    <ThemedText style={[styles.reviewSub, { color: THEME.sub }]}>
                      ₹{parsedAmountNum.toLocaleString('en-IN')} {CYCLES.find((c) => c.cycle === billingCycle)?.periodText} • {CYCLES.find((c) => c.cycle === billingCycle)?.label}
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
              {currentStep === 2
                ? editingSubscription
                  ? 'Update Subscription'
                  : 'Save Subscription'
                : 'Continue'}
            </ThemedText>
            {currentStep === 2 ? (
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
        <View style={[styles.modalContainer, { backgroundColor: THEME.bg }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowIconModal(false)}
              style={[styles.modalCloseBtn, { backgroundColor: THEME.text + '14' }]}
            >
              <X size={20} color={THEME.text} />
            </TouchableOpacity>
            <ThemedText style={[styles.modalHeaderTitle, { color: THEME.text }]}>
              Choose 3D Icon
            </ThemedText>
            <View style={{ width: 36 }} />
          </View>

          {/* Search Box */}
          <View style={[styles.modalSearchBox, { borderColor: THEME.text + '26' }]}>
            <Search size={18} color={THEME.sub} />
            <TextInput
              style={[styles.modalSearchInput, { color: THEME.text }]}
              placeholder="Search icons (e.g. streaming, game, music, food)..."
              placeholderTextColor={THEME.text + '66'}
              value={iconSearch}
              onChangeText={setIconSearch}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Icon Grid */}
          <ScrollView
            contentContainerStyle={styles.iconGridContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconGrid}>
              {filteredIcons.map((item) => {
                const isSelected = icon === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.iconGridTile,
                      isSelected && [styles.iconGridTileActive, { borderColor: THEME.text, backgroundColor: THEME.text + '14' }],
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setIcon(item.id);
                      setIsIconManuallyChosen(true);
                      setShowIconModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Category3DIcon name={item.id} size={42} />
                    <ThemedText
                      style={[
                        styles.iconGridLabel,
                        { color: isSelected ? THEME.text : THEME.text + 'B0' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </ThemedText>
                    {isSelected && (
                      <View style={[styles.iconGridCheck, { backgroundColor: THEME.text }]}>
                        <Check size={10} color={THEME.bg} strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Unified Account Picker Modal ─── */}
      <AccountPickerModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onSelectAccount={(acc) => {
          setLinkedAccountId(acc.id);
        }}
        selectedAccountId={linkedAccountId}
        title="Select Payment Method"
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
    paddingBottom: 16,
  },
  headerNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(88, 28, 135, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerScreenTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.3,
  },
  segmentedProgressBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1.2,
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
    fontSize: 26,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.8,
    lineHeight: 32,
    marginBottom: 6,
  },
  stepExplainer: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 20,
  },
  stepCard: {
    backgroundColor: DEFAULT_THEME.cardBg,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: DEFAULT_THEME.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: 'rgba(88, 28, 135, 0.08)',
    marginVertical: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  iconChooserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconPreviewButton: {
    width: 76,
    height: 76,
    borderRadius: 18,
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
    borderRadius: 8,
  },
  iconEditText: {
    color: DEFAULT_THEME.bg,
    fontSize: 8,
    fontFamily: 'Outfit_600SemiBold',
  },
  largeTextInput: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
    paddingVertical: 6,
  },
  standardTextInput: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },

  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    fontSize: 32,
    fontFamily: 'Outfit_600SemiBold',
    marginRight: 6,
  },
  heroAmountInput: {
    flex: 1,
    fontSize: 36,
    fontFamily: 'Outfit_600SemiBold',
    padding: 0,
    letterSpacing: -1,
  },
  cycleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cycleCard: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  cycleCardActive: {
    borderColor: DEFAULT_THEME.text,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  cycleCardTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: DEFAULT_THEME.text,
  },
  cycleCardTitleActive: {
    color: DEFAULT_THEME.text,
  },
  cycleCardSub: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: DEFAULT_THEME.sub,
    marginTop: 4,
  },
  cycleCardSubActive: {
    color: DEFAULT_THEME.text,
    fontFamily: 'Outfit_500Medium',
  },
  cycleCheckPill: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: DEFAULT_THEME.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  costBreakdownBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  costBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  costBreakdownTitle: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: DEFAULT_THEME.text,
    letterSpacing: 0.5,
  },
  costMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costMetricCol: {
    flex: 1,
  },
  costMetricLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: DEFAULT_THEME.sub,
    marginBottom: 2,
  },
  costMetricValue: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: DEFAULT_THEME.text,
  },
  costMetricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    marginHorizontal: 12,
  },
  selectorTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  selectorTriggerValue: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  datePickerDoneButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  datePickerDoneText: {
    color: DEFAULT_THEME.text,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
  },
  reviewSummaryBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: DEFAULT_THEME.bg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  reviewTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: DEFAULT_THEME.text,
  },
  reviewSub: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: DEFAULT_THEME.sub,
    marginTop: 2,
  },
  readyBadge: {
    backgroundColor: DEFAULT_THEME.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  readyBadgeText: {
    color: DEFAULT_THEME.bg,
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionText: {
    color: DEFAULT_THEME.bg,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    gap: 8,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  iconGridContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconGridTile: {
    width: '22.5%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    position: 'relative',
  },
  iconGridTileActive: {
    borderColor: DEFAULT_THEME.text,
    borderWidth: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  iconGridLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    marginTop: 4,
    textAlign: 'center',
  },
  iconGridCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: DEFAULT_THEME.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
