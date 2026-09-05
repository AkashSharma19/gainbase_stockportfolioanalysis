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
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Search } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Budget, BudgetCategory } from '@/types/money';
import { formatCurrencyINR, formatIndianAmount, parseIndianAmount } from '@/utils/formatters';
import { CategoryIcon } from '@/components/CategoryIcon';

export default function AddBudgetScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { budgets, addBudget, updateBudget } = useMoneyStore();
  const storeCategories = useMoneyStore((state) => state.categories) || {
    income: [],
    expense: [],
  };

  const editingBudget = useMemo(() => {
    return budgets[0] || null;
  }, [budgets]);

  const [categories, setCategories] = useState<
    { id: string; name: string; limit: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const expenseCats = storeCategories.expense;

    if (editingBudget) {
      const list = expenseCats.map((cat, index) => {
        const existing = editingBudget.categories.find(
          (c) => c.name.toLowerCase() === cat.toLowerCase()
        );
        return {
          id: existing ? existing.id : Math.random().toString(36).substring(2, 9) + index,
          name: cat,
          limit: existing ? (existing.limit > 0 ? formatIndianAmount(existing.limit.toString()) : '') : '',
        };
      });
      setCategories(list);
    } else {
      const list = expenseCats.map((cat, index) => {
        return {
          id: Math.random().toString(36).substring(2, 9) + index,
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
    const budgetCategories: BudgetCategory[] = categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        icon: 'Tag',
        color: '#00C9A7',
        limit: parseIndianAmount(c.limit) || 0,
        spent: 0,
      }))
      .filter((c) => c.limit > 0);

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

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [categories, searchQuery]);

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
            Monthly Budgets
          </ThemedText>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <ThemedText style={[styles.headerButtonText, styles.saveButtonText, { color: currColors.tint }]}>
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

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              CATEGORY SPENDING LIMITS
            </ThemedText>

            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {filteredCategories.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === filteredCategories.length - 1;
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
                      <View
                        style={[
                          styles.categoryIconWrap,
                          { backgroundColor: `${currColors.tint}15` },
                        ]}
                      >
                        <CategoryIcon name={item.name} color={currColors.tint} size={16} />
                      </View>
                      <ThemedText style={[styles.label, { color: currColors.text }]}>{item.name}</ThemedText>
                    </View>

                    <View style={styles.amountInputRow}>
                      <ThemedText style={[styles.currencyPrefix, { color: currColors.text }]}>₹</ThemedText>
                      <TextInput
                        style={[styles.input, { color: currColors.text }]}
                        placeholder="No limit"
                        placeholderTextColor={currColors.textSecondary}
                        value={item.limit}
                        onChangeText={(val) => handleLimitChange(item.id, val)}
                        keyboardType="decimal-pad"
                        textAlign="right"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  categoryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 140,
    justifyContent: 'flex-end',
  },
  currencyPrefix: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    marginRight: 3,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    fontFamily: 'Outfit_400Regular',
  },
});
