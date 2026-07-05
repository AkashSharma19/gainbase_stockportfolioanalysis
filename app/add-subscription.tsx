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
import { X, Check, ChevronDown, Tv, Music, Youtube, ShoppingBag, Cloud, Gamepad2, Sparkles, Layers, Repeat } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Subscription } from '@/types/money';

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#00C9A7', '#5AC8FA'];

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

const AVAILABLE_ICONS = [
  { name: 'tv', icon: Tv, label: 'Video' },
  { name: 'music', icon: Music, label: 'Music' },
  { name: 'youtube', icon: Youtube, label: 'Social' },
  { name: 'shopping-bag', icon: ShoppingBag, label: 'Shopping' },
  { name: 'sparkles', icon: Sparkles, label: 'AI/Tech' },
  { name: 'cloud', icon: Cloud, label: 'Cloud' },
  { name: 'gamepad-2', icon: Gamepad2, label: 'Gaming' },
  { name: 'layers', icon: Layers, label: 'Design' },
  { name: 'repeat', icon: Repeat, label: 'Other' },
] as const;

const CYCLES: { cycle: Subscription['billingCycle']; label: string }[] = [
  { cycle: 'weekly', label: 'Weekly' },
  { cycle: 'monthly', label: 'Monthly' },
  { cycle: 'quarterly', label: 'Quarterly' },
  { cycle: 'yearly', label: 'Yearly' },
];

export default function AddSubscriptionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { subscriptions, accounts, addSubscription, updateSubscription } = useMoneyStore();

  const editingSubscription = useMemo(() => {
    return id ? subscriptions.find((s) => s.id === id) : null;
  }, [id, subscriptions]);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<Subscription['billingCycle']>('monthly');
  const [nextPaymentDate, setNextPaymentDate] = useState(new Date());
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [color, setColor] = useState(COLORS[0]);
  const [logo, setLogo] = useState('repeat');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    if (editingSubscription) {
      setName(editingSubscription.name);
      setAmount(editingSubscription.amount.toString());
      setBillingCycle(editingSubscription.billingCycle);
      setNextPaymentDate(new Date(editingSubscription.nextPaymentDate));
      setLinkedAccountId(editingSubscription.linkedAccountId || '');
      setCategory(editingSubscription.category);
      setColor(editingSubscription.color || COLORS[0]);
      setLogo(editingSubscription.logo || 'repeat');
    } else {
      const activeAccounts = accounts.filter(a => !a.isArchived);
      if (activeAccounts.length > 0) {
        setLinkedAccountId(activeAccounts[0].id);
      }
    }
  }, [editingSubscription, accounts]);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    handleHaptic();
    if (!name.trim()) {
      Alert.alert('Required Fields', 'Please enter a subscription name.');
      return;
    }

    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      Alert.alert('Required Field', 'Please enter a valid billing amount.');
      return;
    }

    const subData: Subscription = {
      id: editingSubscription ? editingSubscription.id : Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      provider: name.trim(),
      amount: amountVal,
      billingCycle,
      nextPaymentDate: nextPaymentDate.toISOString(),
      linkedAccountId: linkedAccountId || undefined,
      category: category.trim() || 'Other',
      isActive: true,
      createdAt: editingSubscription ? editingSubscription.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color,
      logo,
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

  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => !a.isArchived);
  }, [accounts]);

  const selectedAccount = accounts.find((a) => a.id === linkedAccountId);

  const suggestedCategories = [
    'Entertainment', 'Software', 'Utilities', 'Fitness', 'Music', 'Gaming', 'Education', 'Other'
  ];

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
            {editingSubscription ? 'Edit Subscription' : 'Add Subscription'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#00C9A7' }]}
            onPress={handleSave}
          >
            <Check size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          {/* Brand Presets */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>POPULAR BRANDS (TAP TO AUTO-FILL)</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsContainer} bounces={false}>
              {BRAND_PRESETS.map((brand) => (
                <TouchableOpacity
                  key={brand.id}
                  style={[
                    styles.brandChip,
                    { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setName(brand.name);
                    setColor(brand.color);
                    setCategory(brand.category);
                    setLogo(brand.iconName);
                  }}
                >
                  <brand.icon size={16} color={brand.color} style={{ marginRight: 6 }} />
                  <ThemedText style={[styles.brandChipText, { color: currColors.text }]}>{brand.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Subscription Name */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>SUBSCRIPTION NAME</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
              placeholder="e.g. Netflix Premium, Spotify"
              placeholderTextColor={currColors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Icon Selector (Choose Logo) */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>CHOOSE SUBSCRIPTION ICON</ThemedText>
            <View style={styles.iconSelectorGrid}>
              {AVAILABLE_ICONS.map((item) => {
                const isSelected = logo === item.name;
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.iconOption,
                      { backgroundColor: currColors.card, borderColor: currColors.border },
                      isSelected && { borderColor: color || '#00C9A7', backgroundColor: `${color || '#00C9A7'}1A` }
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setLogo(item.name);
                    }}
                  >
                    <IconComponent size={20} color={isSelected ? (color || '#00C9A7') : currColors.textSecondary} />
                    <ThemedText style={[styles.iconLabel, { color: isSelected ? currColors.text : currColors.textSecondary }]}>
                      {item.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>


          {/* Amount input */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>AMOUNT (₹)</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: currColors.card, borderColor: currColors.border, color: currColors.text }]}
              placeholder="0.00"
              placeholderTextColor={currColors.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          {/* Billing Cycle Selector */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>BILLING CYCLE</ThemedText>
            <View style={[styles.segmentContainer, { backgroundColor: currColors.cardSecondary }]}>
              {CYCLES.map((c) => {
                const isSelected = billingCycle === c.cycle;
                return (
                  <TouchableOpacity
                    key={c.cycle}
                    style={[
                      styles.segmentTab,
                      isSelected && { backgroundColor: '#00C9A7' },
                    ]}
                    onPress={() => {
                      handleHaptic();
                      setBillingCycle(c.cycle);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.segmentLabel,
                        {
                          color: isSelected ? '#FFFFFF' : currColors.textSecondary,
                          fontFamily: isSelected ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
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

          {/* Next Payment Date */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>NEXT PAYMENT DATE</ThemedText>
            {Platform.OS === 'ios' ? (
              <View style={styles.iosDatePickerContainer}>
                <DateTimePicker
                  value={nextPaymentDate}
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
                  {nextPaymentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </ThemedText>
              </TouchableOpacity>
            )}
            {showDatePicker && Platform.OS !== 'ios' && (
              <DateTimePicker
                value={nextPaymentDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </View>

          {/* Linked Account */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>PAYMENT ACCOUNT (OPTIONAL)</ThemedText>
            <TouchableOpacity
              style={[styles.selectBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}
              onPress={() => {
                handleHaptic();
                setShowAccountModal(true);
              }}
            >
              <ThemedText style={{ color: selectedAccount ? currColors.text : currColors.textSecondary, fontSize: 16 }}>
                {selectedAccount ? selectedAccount.name : 'Select Account'}
              </ThemedText>
              <ChevronDown size={18} color={currColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>CATEGORY</ThemedText>
            <TouchableOpacity
              style={[styles.selectBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}
              onPress={() => {
                handleHaptic();
                setShowCategoryModal(true);
              }}
            >
              <ThemedText style={{ color: currColors.text, fontSize: 16 }}>
                {category}
              </ThemedText>
              <ChevronDown size={18} color={currColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Color Picker */}
          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: currColors.textSecondary }]}>COLOR TAG</ThemedText>
            <View style={styles.colorRow}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    color === c && styles.colorDotActive,
                  ]}
                  onPress={() => {
                    handleHaptic();
                    setColor(c);
                  }}
                />
              ))}
            </View>
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
              bounces={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    handleHaptic();
                    setLinkedAccountId(item.id);
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
              data={suggestedCategories}
              keyExtractor={(item) => item}
              bounces={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    handleHaptic();
                    setCategory(item);
                    setShowCategoryModal(false);
                  }}
                >
                  <ThemedText style={{ color: category === item ? '#00C9A7' : currColors.text, fontSize: 16 }}>
                    {item}
                  </ThemedText>
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
  inputGroup: {
    marginBottom: 22,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
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
  segmentContainer: {
    flexDirection: 'row',
    height: 46,
    borderRadius: 14,
    padding: 3,
    marginTop: 4,
  },
  segmentTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  segmentLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  iosDatePickerContainer: {
    alignItems: 'flex-start',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '60%',
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
    borderBottomWidth: 1,
  },
  presetsContainer: {
    paddingRight: 10,
    gap: 8,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  brandChipText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  iconSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  iconOption: {
    width: '31%',
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  iconLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    marginTop: 4,
  },
});
