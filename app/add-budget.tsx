import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Budget, BudgetCategory } from '@/types/money';
import { formatCurrencyINR, formatIndianAmount, parseIndianAmount } from '@/utils/formatters';
import { Category3DIcon } from '@/components/Category3DIcon';

export default function AddBudgetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const { budgets, addBudget, updateBudget } = useMoneyStore();
  const storeCategories = useMoneyStore((state) => state.categories) || {
    income: [],
    expense: [],
  };

  const editingBudget = useMemo(() => {
    if (id) {
      return budgets.find((b) => b.id === id) || budgets[0] || null;
    }
    return budgets.find((b) => b.isActive) || budgets[0] || null;
  }, [budgets, id]);

  const [categories, setCategories] = useState<
    { id: string; name: string; limit: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const expenseCats = storeCategories.expense || [];

    if (editingBudget && Array.isArray(editingBudget.categories)) {
      const list = expenseCats.map((cat) => {
        const existing = editingBudget.categories.find(
          (c) => c.name.toLowerCase().trim() === cat.toLowerCase().trim()
        );
        const stableId = existing?.id || `cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        return {
          id: stableId,
          name: cat,
          limit: existing ? (existing.limit > 0 ? formatIndianAmount(existing.limit.toString()) : '') : '',
        };
      });
      setCategories(list);
    } else {
      const list = expenseCats.map((cat) => {
        return {
          id: `cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: cat,
          limit: '',
        };
      });
      setCategories(list);
    }
  }, [editingBudget, storeCategories]);

  const totalLimit = useMemo(() => {
    return categories.reduce((acc, cat) => {
      const val = parseIndianAmount(cat.limit);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [categories]);

  const handleLimitChange = (catId: string, val: string) => {
    setCategories(
      categories.map((c) => (c.id === catId ? { ...c, limit: formatIndianAmount(val) } : c))
    );
  };

  const handleSave = () => {
    handleHaptic();
    const now = new Date().toISOString();
    const budgetId = editingBudget ? editingBudget.id : 'global-budget';

    const budgetCategories: BudgetCategory[] = categories
      .map((c) => {
        const limitAmount = parseIndianAmount(c.limit) || 0;
        return {
          id: c.id || `cat-${c.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: c.name,
          icon: c.name,
          color: '#00C9A7',
          limit: limitAmount,
          spent: 0,
          updatedAt: now,
        };
      })
      .filter((c) => c.limit > 0);

    const budgetData: Budget = {
      id: budgetId,
      name: editingBudget?.name || 'Monthly Budget',
      period: 'monthly',
      startDate: editingBudget?.startDate || '',
      endDate: editingBudget?.endDate || '',
      totalLimit,
      categories: budgetCategories,
      isActive: true,
      updatedAt: now,
    };

    if (editingBudget) {
      updateBudget(editingBudget.id, budgetData);
    } else {
      addBudget(budgetData);
    }

    // Trigger background sync to propagate to cloud immediately
    try {
      import('@/utils/syncEngine').then(({ syncAllData }) => {
        syncAllData().catch((e) => console.warn('Background sync error on budget save:', e));
      });
    } catch (e) {
      console.warn('Sync dispatch error:', e);
    }

    router.back();
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [categories, searchQuery]);

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
          style={styles.cancelButton}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ThemedText style={[styles.headerButtonText, { color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }]}>
            Cancel
          </ThemedText>
        </TouchableOpacity>
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          Monthly Budgets
        </ThemedText>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ThemedText style={[styles.headerButtonText, styles.saveButtonText, { color: '#00C9A7', fontFamily: 'Outfit_600SemiBold' }]}>
            Save
          </ThemedText>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* TOTAL BUDGET SUMMARY CARD */}
        <View style={[styles.summaryCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <ThemedText style={{ fontSize: 12, color: currColors.textSecondary, fontFamily: 'Outfit_600SemiBold', letterSpacing: 0.5 }}>
            TOTAL MONTHLY BUDGET
          </ThemedText>
          <ThemedText style={{ fontSize: 28, color: currColors.text, fontFamily: 'Outfit_700Bold', marginTop: 4 }}>
            {formatCurrencyINR(totalLimit, true, 0)}
          </ThemedText>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBarContainer, { backgroundColor: currColors.cardSecondary }]}>
          <Search size={16} color={currColors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: currColors.text }]}
            placeholder="Search category limits..."
            placeholderTextColor={currColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 60, 80) }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
            CATEGORY SPENDING LIMITS
          </ThemedText>

          {filteredCategories.length === 0 ? (
            <View style={[styles.emptySearchContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <ThemedText style={{ color: currColors.textSecondary, fontSize: 14, fontFamily: 'Outfit_400Regular', textAlign: 'center' }}>
                No categories match "{searchQuery}"
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {filteredCategories.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === filteredCategories.length - 1;
                const hasLimit = !!item.limit && parseIndianAmount(item.limit) > 0;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.formRow,
                      isFirst && styles.formRowFirst,
                      isLast && styles.formRowLast,
                      !isLast && { borderBottomColor: currColors.border },
                    ]}
                  >
                    <View style={styles.categoryLeft}>
                      <Category3DIcon name={item.name} size={28} style={{ marginRight: 10 }} />
                      <View>
                        <ThemedText style={[styles.label, { color: currColors.text }]}>{item.name}</ThemedText>
                        {hasLimit && (
                          <ThemedText style={{ fontSize: 11, color: '#00C9A7', fontFamily: 'Outfit_500Medium' }}>
                            Budget Active
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    <TextInput
                      style={[
                        styles.input,
                        {
                          color: hasLimit ? currColors.text : currColors.textSecondary,
                          fontWeight: hasLimit ? '600' : '400',
                        },
                      ]}
                      placeholder="No limit"
                      placeholderTextColor={currColors.textSecondary}
                      value={item.limit ? `₹ ${item.limit}` : ''}
                      onChangeText={(val) => {
                        const clean = val.replace(/[^0-9.]/g, '');
                        handleLimitChange(item.id, clean);
                      }}
                      keyboardType="decimal-pad"
                      textAlign="right"
                    />
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 12,
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
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
  },
  searchBarContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  scrollContent: {
    paddingVertical: 8,
    paddingBottom: 40,
  },
  groupLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  formGroup: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    minHeight: 48,
  },
  formRowFirst: {},
  formRowLast: {
    borderBottomWidth: 0,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    fontFamily: 'Outfit_400Regular',
  },
  emptySearchContainer: {
    padding: 24,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
