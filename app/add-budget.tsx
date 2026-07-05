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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { X, Check, Plus, Trash2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Budget, BudgetCategory } from '@/types/money';
import { CategoryIcon } from '@/components/CategoryIcon';

const DEFAULT_ICONS_COLORS: { [key: string]: { icon: string; color: string } } = {
  'Food & Dining': { icon: 'Utensils', color: '#FF3B30' },
  'Rent & Bills': { icon: 'Receipt', color: '#007AFF' },
  'Shopping': { icon: 'ShoppingBag', color: '#FF9500' },
  'Entertainment': { icon: 'Clapperboard', color: '#AF52DE' },
  'Travel': { icon: 'Plane', color: '#34C759' },
  'Medical': { icon: 'Pill', color: '#FF2D55' },
  'Education': { icon: 'GraduationCap', color: '#5AC8FA' },
  'Food': { icon: 'UtensilsCrossed', color: '#FF3B30' },
  'Junk': { icon: 'Cookie', color: '#FF9500' },
  'Shopping - Electronics': { icon: 'Laptop', color: '#5856D6' },
  'Shopping - Clothes': { icon: 'Shirt', color: '#FF2D55' },
  'Subscriptions - OTT': { icon: 'Tv', color: '#AF52DE' },
  'Subscriptions - WiFi': { icon: 'Wifi', color: '#5AC8FA' },
  'House': { icon: 'Home', color: '#34C759' },
  'Electricity Bill': { icon: 'Zap', color: '#FFCC00' },
  'Transport - Fuel': { icon: 'Fuel', color: '#FF9500' },
  'Transport - Cab': { icon: 'Car', color: '#FFCC00' },
  'Maintainance': { icon: 'Wrench', color: '#8E8E93' },
  'Maintenance': { icon: 'Wrench', color: '#8E8E93' },
  'Travel/ Trips': { icon: 'Compass', color: '#007AFF' },
  'Family': { icon: 'Users', color: '#FF2D55' },
  'Gifts': { icon: 'Gift', color: '#AF52DE' },
  'EMI Payments': { icon: 'CalendarRange', color: '#FF9500' },
  'Others': { icon: 'Tag', color: '#8E8E93' },
  'Other': { icon: 'Tag', color: '#8E8E93' }
};

const CATEGORY_COLORS = [
  '#FF3B30', // Red
  '#007AFF', // Blue
  '#FF9500', // Orange
  '#34C759', // Green
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#5AC8FA', // Teal
  '#FFCC00', // Yellow
  '#5856D6', // Indigo
  '#00C9A7', // Emerald
  '#FF5E3A', // Coral red
  '#9B59B6', // Amethyst
  '#34495E', // Wet asphalt
  '#16A085', // Greenish teal
  '#E67E22', // Carrot
  '#D35400', // Pumpkin
];

const getCategoryIconColor = (name: string) => {
  const meta = DEFAULT_ICONS_COLORS[name];
  if (meta) return meta;
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return { icon: '🏷️', color: CATEGORY_COLORS[index] };
};


export default function AddBudgetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { budgets, addBudget, updateBudget } = useMoneyStore();
  const storeCategories = useMoneyStore((state) => state.categories) || {
    income: ['Salary', 'Investments', 'Business', 'Gift', 'Refund', 'Other'],
    expense: [
      'Food & Dining',
      'Food',
      'Junk',
      'Rent & Bills',
      'House',
      'Electricity Bill',
      'Shopping',
      'Shopping - Electronics',
      'Shopping - Clothes',
      'Entertainment',
      'Subscriptions - OTT',
      'Subscriptions - WiFi',
      'Travel',
      'Travel/ Trips',
      'Transport - Fuel',
      'Transport - Cab',
      'Medical',
      'Education',
      'Maintainance',
      'Family',
      'Gifts',
      'EMI Payments',
      'Others'
    ]
  };

  const editingBudget = useMemo(() => {
    return budgets[0] || null;
  }, [budgets]);

  // Form State
  // (We use a fixed name for the single budget)

  // Category list limits state
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string; color: string; limit: string }[]>([]);

  useEffect(() => {
    const expenseCats = storeCategories.expense;

    if (editingBudget) {
      // Build categories list from store configuration
      const list = expenseCats.map((cat, index) => {
        const existing = editingBudget.categories.find((c) => c.name.toLowerCase() === cat.toLowerCase());
        const info = getCategoryIconColor(cat);
        return {
          id: existing ? existing.id : Math.random().toString(36).substring(2, 9) + index,
          name: cat,
          icon: info.icon,
          color: info.color,
          limit: existing ? existing.limit.toString() : '0',
        };
      });
      setCategories(list);
    } else {
      // Prepopulate categories from store configuration
      const list = expenseCats.map((cat, index) => {
        const info = getCategoryIconColor(cat);
        return {
          id: Math.random().toString(36).substring(2, 9) + index,
          name: cat,
          icon: info.icon,
          color: info.color,
          limit: '0',
        };
      });
      setCategories(list);
    }
  }, [editingBudget, storeCategories]);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const totalLimit = useMemo(() => {
    return categories.reduce((acc, cat) => {
      const val = parseFloat(cat.limit);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [categories]);

  const handleLimitChange = (catId: string, val: string) => {
    setCategories(
      categories.map((c) => (c.id === catId ? { ...c, limit: val } : c))
    );
  };


  const handleSave = () => {
    handleHaptic();

    const budgetCategories: BudgetCategory[] = categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        limit: parseFloat(c.limit) || 0,
        spent: 0,
      }));

    const budgetData: Budget = {
      id: editingBudget ? editingBudget.id : 'global-budget',
      name: 'Monthly Budget',
      period: 'monthly',
      startDate: '',
      endDate: '',
      totalLimit,
      categories: budgetCategories,
      isActive: true,
    };

    if (editingBudget) {
      updateBudget(editingBudget.id, budgetData);
    } else {
      addBudget(budgetData);
    }

    router.back();
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
            {editingBudget ? 'Edit Budget' : 'Create Budget'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#00C9A7' }]}
            onPress={handleSave}
          >
            <Check size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>


          {/* Total Budget limit highlight */}
          <View style={styles.totalBurdenHighlight}>
            <ThemedText style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 0.5 }}>
              TOTAL ALLOCATED BUDGET
            </ThemedText>
            <ThemedText style={{ fontSize: 26, fontFamily: 'Outfit_700Bold', color: '#FFFFFF', marginTop: 4 }}>
              ₹{totalLimit.toLocaleString('en-IN')}
            </ThemedText>
          </View>

          {/* Category List */}
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
              ALLOCATE BUDGET BY CATEGORY
            </ThemedText>
          </View>

          {categories.map((cat) => (
            <View key={cat.id} style={[styles.catAllocationCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <View style={styles.catLeft}>
                <CategoryIcon name={cat.icon || cat.name} color={cat.color || '#8E8E93'} size={18} style={{ marginRight: 10 }} />
                <ThemedText style={[styles.catName, { color: currColors.text }]} numberOfLines={1}>
                  {cat.name}
                </ThemedText>
              </View>
              <View style={styles.catRight}>
                <ThemedText style={{ color: currColors.textSecondary, marginRight: 6 }}>₹</ThemedText>
                <TextInput
                  style={[styles.catLimitInput, { color: currColors.text, borderColor: currColors.border }]}
                  placeholder="0"
                  placeholderTextColor={currColors.textSecondary}
                  keyboardType="numeric"
                  value={cat.limit}
                  onChangeText={(val) => handleLimitChange(cat.id, val)}
                />
              </View>
            </View>
          ))}

        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 60,
    paddingTop: 10,
  },
  inputGroup: {
    marginBottom: 20,
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
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  iosDatePickerContainer: {
    alignItems: 'flex-start',
  },
  totalBurdenHighlight: {
    backgroundColor: '#00C9A7',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  catAllocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.2,
  },
  catName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    flex: 1,
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    gap: 4,
  },
  catLimitInput: {
    width: 80,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'right',
  },
  deleteBtn: {
    padding: 6,
  },
  addCustomCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 14,
    gap: 8,
  },
  customCatInputBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  customCatActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  customCatBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
