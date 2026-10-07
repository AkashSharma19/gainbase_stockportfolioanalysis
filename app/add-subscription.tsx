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
import { Subscription, Account } from '@/types/money';
import { formatCurrencyINR, formatIndianAmount, parseIndianAmount } from '@/utils/formatters';
import { BankLogo } from '@/components/BankLogo';
import { Category3DIcon } from '@/components/Category3DIcon';
import { AccountLogoOrIcon } from '@/components/AccountLogoOrIcon';
import { AccountPickerModal } from '@/components/AccountPickerModal';
import {
  CATEGORY_3D_ICONS_LIST,
  findBest3DIconForText,
} from '@/constants/Category3DIcons';

const CYCLES: { cycle: Subscription['billingCycle']; label: string }[] = [
  { cycle: 'monthly', label: 'Monthly' },
  { cycle: 'yearly', label: 'Yearly' },
  { cycle: 'quarterly', label: 'Quarterly' },
  { cycle: 'weekly', label: 'Weekly' },
];

export default function AddSubscriptionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

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
  const [icon, setIcon] = useState('tv');
  const [isIconManuallyChosen, setIsIconManuallyChosen] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);
  const [iconSearch, setIconSearch] = useState('');

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
    if (editingSubscription) {
      setName(editingSubscription.name);
      setAmount(formatIndianAmount(editingSubscription.amount.toString()));
      setBillingCycle(editingSubscription.billingCycle);
      setNextPaymentDate(new Date(editingSubscription.nextPaymentDate));
      setLinkedAccountId(editingSubscription.linkedAccountId || '');
      setCategory(editingSubscription.category || 'Entertainment');
      setColor(editingSubscription.color || '#007AFF');
      setIcon(editingSubscription.logo || 'tv');
      setIsIconManuallyChosen(true);
    } else if (activeAccounts.length > 0) {
      setLinkedAccountId(activeAccounts[0].id);
    }
  }, [editingSubscription]);

  // Auto-predict 3D icon when subscription name is typed (unless manually chosen)
  const handleNameChange = (text: string) => {
    setName(text);
    if (!isIconManuallyChosen) {
      if (text.trim().length > 0) {
        const predicted = findBest3DIconForText(text);
        setIcon(predicted);
        // Auto categorize if possible
        const item = CATEGORY_3D_ICONS_LIST.find((i) => i.id === predicted);
        if (item) {
          setCategory(item.group);
        }
      } else {
        setIcon('tv');
      }
    }
  };

  const handleSave = () => {
    handleHaptic();
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
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNextPaymentDate(selectedDate);
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
          {editingSubscription ? 'Edit Subscription' : 'Add Subscription'}
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
                placeholder="e.g. Netflix, Spotify, Gym, iCloud"
                placeholderTextColor={currColors.textSecondary}
                value={name}
                onChangeText={handleNameChange}
                textAlign="right"
              />
            </View>

            {/* Choose Icon Row (Replaced Brand Preset with Full Page 3D Icon Picker) */}
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
                <View style={styles.iconBadge}>
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

            {/* Category Row */}
            <View style={[styles.formRow, styles.formRowLast]}>
              <ThemedText style={[styles.label, { color: currColors.text }]}>Category</ThemedText>
              <TextInput
                style={[styles.input, { color: currColors.text }]}
                placeholder="Entertainment, Software, Utilities"
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
              <TextInput
                style={[styles.input, { color: currColors.text }]}
                placeholder="₹ 0"
                placeholderTextColor={currColors.textSecondary}
                value={amount ? `₹ ${amount}` : ''}
                onChangeText={(val) => {
                  const clean = val.replace(/[^0-9.]/g, '');
                  setAmount(formatIndianAmount(clean));
                }}
                keyboardType="decimal-pad"
                textAlign="right"
              />
            </View>

            {/* Billing Cycle Row */}
            <TouchableOpacity
              style={[styles.formRow, { borderBottomColor: currColors.border }]}
              onPress={() => {
                handleHaptic();
                setShowCycleModal(true);
              }}
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
            <TouchableOpacity
              style={[styles.formRow, { borderBottomColor: currColors.border }]}
              onPress={() => {
                handleHaptic();
                setShowDatePicker(true);
              }}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.label, { color: currColors.text }]}>Next Due Date</ThemedText>
              <View style={styles.valueContainer}>
                <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                  {nextPaymentDate.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </ThemedText>
                <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>

            {/* Date Picker */}
            {showDatePicker && (
              <View style={{ padding: 12, alignItems: 'center', backgroundColor: currColors.cardSecondary }}>
                <DateTimePicker
                  value={nextPaymentDate}
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

            {/* Linked Debit Account Row */}
            <TouchableOpacity
              style={[styles.formRow, styles.formRowLast]}
              onPress={() => {
                handleHaptic();
                setShowAccountModal(true);
              }}
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
          {/* Modal Header with safe top insets */}
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
                placeholder="Search icons (tv, movie, music, cloud, game)..."
                placeholderTextColor={currColors.textSecondary}
                value={iconSearch}
                onChangeText={setIconSearch}
                clearButtonMode="while-editing"
                autoCorrect={false}
              />
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
                        const cat = CATEGORY_3D_ICONS_LIST.find((i) => i.id === item.id);
                        if (cat) {
                          setCategory(cat.group);
                        }
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

      {/* BILLING CYCLE MODAL */}
      <Modal
        visible={showCycleModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setShowCycleModal(false)}
      >
        <View style={[styles.modalMainContainer, { backgroundColor: currColors.background }]}>
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
                setShowCycleModal(false);
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
              Billing Frequency
            </ThemedText>

            <View style={{ width: 50 }} />
          </View>

          <FlatList
            data={CYCLES}
            keyExtractor={(item) => item.cycle}
            contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
            renderItem={({ item }) => {
              const isSelected = billingCycle === item.cycle;
              return (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    handleHaptic();
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
  iconBadge: {
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
