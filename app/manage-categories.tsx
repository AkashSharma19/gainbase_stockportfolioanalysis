import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  ArrowUpDown,
  GripVertical,
  Sparkles,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackButton } from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { Category3DIcon } from '@/components/Category3DIcon';
import {
  CATEGORY_3D_ICONS_LIST,
  findBest3DIconForText,
} from '@/constants/Category3DIcons';

const DEFAULT_CATEGORIES: { income: string[]; expense: string[] } = {
  income: ['Salary', 'Investments', 'Business', 'Freelance', 'Gift', 'Refund', 'Other'],
  expense: [
    'Holiday',
    'Grocery',
    'Food',
    'Beverage',
    'Transport',
    'Internet',
    'Electric',
    'Water',
    'Gas',
    'Gym',
    'Books',
    'Shopping',
    'Medical',
    'Entertainment',
    'House',
    'Education',
    'Gifts',
    'EMI Payments',
    'Others',
  ],
};

interface CategoryRowItemProps {
  catName: string;
  index: number;
  isLast: boolean;
  isReorderMode: boolean;
  isDark: boolean;
  currColors: any;
  count: number;
  categorySearch: string;
  drag: () => void;
  isActive: boolean;
  startEditCategory: (name: string) => void;
}

function CategoryRowItem({
  catName,
  index,
  isLast,
  isReorderMode,
  isDark,
  currColors,
  count,
  categorySearch,
  drag,
  isActive,
  startEditCategory,
}: CategoryRowItemProps) {
  return (
    <ScaleDecorator activeScale={1.03}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (!isReorderMode) startEditCategory(catName);
        }}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          drag();
        }}
        disabled={Boolean(categorySearch.trim())}
        style={[
          styles.categoryRow,
          { backgroundColor: currColors.card },
          !isLast && [styles.rowBorder, { borderBottomColor: currColors.border }],
          isActive && [
            styles.activeDraggingRow,
            {
              backgroundColor: isDark ? '#00C9A726' : '#E6FAF6',
              borderColor: currColors.tintMoney,
            },
          ],
        ]}
      >
        <View style={styles.categoryLeft}>
          <View style={styles.category3DWrap}>
            <Category3DIcon name={catName} size={36} />
          </View>
          <View style={styles.categoryInfo}>
            <ThemedText style={[styles.categoryTitle, { color: currColors.text }]} numberOfLines={1}>
              {catName}
            </ThemedText>
            <ThemedText style={[styles.categorySubtitle, { color: currColors.textSecondary }]}>
              {isReorderMode ? `Position #${index + 1}` : `${count} ${count === 1 ? 'transaction' : 'transactions'}`}
            </ThemedText>
          </View>
        </View>

        {isReorderMode ? (
          <TouchableOpacity
            onPressIn={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            style={[
              styles.dragHandleBtn,
              { backgroundColor: currColors.cardSecondary },
              isActive && { backgroundColor: currColors.tintMoney },
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <GripVertical size={18} color={isActive ? '#FFFFFF' : currColors.tintMoney} strokeWidth={2.2} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => startEditCategory(catName)}
            style={[styles.editIconBtn, { backgroundColor: currColors.cardSecondary }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Pencil size={14} color={currColors.textSecondary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </ScaleDecorator>
  );
}

export default function ManageCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const headerTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24);

  // Stable selectors from Zustand store
  const rawCategories = useMoneyStore((state) => state.categories);
  const storeCategories = rawCategories || DEFAULT_CATEGORIES;
  const categoryMetadata = useMoneyStore((state) => state.categoryMetadata);
  const addCategory = useMoneyStore((state) => state.addCategory);
  const updateCategory = useMoneyStore((state) => state.updateCategory);
  const removeCategory = useMoneyStore((state) => state.removeCategory);
  const reorderCategories = useMoneyStore((state) => state.reorderCategories);
  const moneyTransactions = useMoneyStore((state) => state.moneyTransactions);

  // Tab State
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [categorySearch, setCategorySearch] = useState('');
  const [isReorderMode, setIsReorderMode] = useState(false);

  // Bottom Sheet Drawer State ('add' | 'edit' | null)
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | null>(null);

  // Add / Edit form values
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('food');
  const [editingTargetCatName, setEditingTargetCatName] = useState<string | null>(null);
  const [isIconManuallyOverridden, setIsIconManuallyOverridden] = useState(false);

  // Full-Page Icon Picker Modal State
  const [isIconPickerVisible, setIsIconPickerVisible] = useState(false);
  const [iconPickerSearch, setIconPickerSearch] = useState('');

  const drawerInputRef = useRef<TextInput>(null);

  const handleHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Transaction counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (Array.isArray(moneyTransactions)) {
      moneyTransactions.forEach((tx) => {
        if (tx && tx.category) {
          counts[tx.category] = (counts[tx.category] || 0) + 1;
        }
      });
    }
    return counts;
  }, [moneyTransactions]);

  // Current list of categories for active tab
  const currentTabCategories = useMemo(() => {
    return storeCategories[activeTab] || DEFAULT_CATEGORIES[activeTab] || [];
  }, [storeCategories, activeTab]);

  // Filtered categories for current tab with search query
  const displayedCategories = useMemo(() => {
    if (!categorySearch.trim()) return currentTabCategories;
    const q = categorySearch.toLowerCase().trim();
    return currentTabCategories.filter((c) => c.toLowerCase().includes(q));
  }, [currentTabCategories, categorySearch]);

  // Open Drawer for Add
  const openAddDrawer = useCallback(() => {
    handleHaptic();
    setIsReorderMode(false);
    setDrawerMode('add');
    setEditingTargetCatName(null);
    setFormName('');
    setIsIconManuallyOverridden(false);
    setFormIcon(activeTab === 'income' ? 'banknote' : 'food');
  }, [activeTab, handleHaptic]);

  // Open Drawer for Edit
  const startEditCategory = useCallback((catName: string) => {
    handleHaptic();
    setIsReorderMode(false);
    setDrawerMode('edit');
    setEditingTargetCatName(catName);
    setFormName(catName);
    const meta = categoryMetadata ? categoryMetadata[catName] : undefined;
    setFormIcon(meta?.icon || catName.toLowerCase());
    setIsIconManuallyOverridden(false);
  }, [categoryMetadata, handleHaptic]);

  // Close Drawer
  const closeDrawer = useCallback(() => {
    Keyboard.dismiss();
    setDrawerMode(null);
    setEditingTargetCatName(null);
    setFormName('');
  }, []);

  // Handle Form Name typing with auto-suggest icon
  const handleFormNameChange = (text: string) => {
    setFormName(text);
    if (!isIconManuallyOverridden) {
      if (text.trim().length > 0) {
        const bestIcon = findBest3DIconForText(text);
        setFormIcon(bestIcon);
      } else {
        setFormIcon(activeTab === 'income' ? 'banknote' : 'food');
      }
    }
  };

  // Submit New Category
  const handleSaveNewCategory = () => {
    const cleanName = formName.trim();
    if (!cleanName) {
      Alert.alert('Required', 'Please enter a category name.');
      return;
    }

    const currentList = storeCategories[activeTab] || [];
    const isDuplicate = currentList.some(
      (c) => c.toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      Alert.alert('Duplicate', 'A category with this name already exists.');
      return;
    }

    handleHaptic();
    addCategory(activeTab, cleanName, formIcon, currColors.tintMoney);
    closeDrawer();
  };

  // Save Edited Category
  const handleSaveEditedCategory = () => {
    if (!editingTargetCatName) return;
    const cleanName = formName.trim();
    if (!cleanName) {
      Alert.alert('Required', 'Please enter a category name.');
      return;
    }

    const currentList = storeCategories[activeTab] || [];
    const isDuplicate = currentList.some(
      (c) => c.toLowerCase() === cleanName.toLowerCase() && c !== editingTargetCatName
    );
    if (isDuplicate) {
      Alert.alert('Duplicate', 'A category with this name already exists.');
      return;
    }

    handleHaptic();
    updateCategory(activeTab, editingTargetCatName, cleanName, formIcon, currColors.tintMoney);
    closeDrawer();
  };

  // Delete Category
  const handleDelete = (catName: string) => {
    if (catName === 'Other' || catName === 'Others') {
      Alert.alert('Restricted', 'The "Other" category is required by default.');
      return;
    }

    const count = categoryCounts[catName] || 0;
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${catName}"?${
        count > 0
          ? ` ${count} existing transactions using this category will be reassigned to "Other".`
          : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            handleHaptic();
            if (drawerMode && editingTargetCatName === catName) {
              closeDrawer();
            }
            removeCategory(activeTab, catName);
          },
        },
      ]
    );
  };

  // Open Full-Page Icon Picker
  const openIconPicker = () => {
    handleHaptic();
    setIconPickerSearch('');
    setIsIconPickerVisible(true);
  };

  // Select Icon from Full-Page Picker
  const handleSelectIcon = (iconId: string) => {
    handleHaptic();
    setFormIcon(iconId);
    setIsIconManuallyOverridden(true);
    setIsIconPickerVisible(false);
  };

  // Filtered icons in full-page picker
  const filteredPickerIcons = useMemo(() => {
    if (!iconPickerSearch.trim()) {
      return CATEGORY_3D_ICONS_LIST;
    }
    const q = iconPickerSearch.toLowerCase().trim();
    return CATEGORY_3D_ICONS_LIST.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(q))
    );
  }, [iconPickerSearch]);

  // Render individual Category Item with Drag capability
  const renderCategoryItem = useCallback(
    ({ item: catName, getIndex, drag, isActive }: RenderItemParams<string>) => {
      const index = getIndex() ?? 0;
      const count = categoryCounts[catName] || 0;
      const isLast = index === displayedCategories.length - 1;

      return (
        <CategoryRowItem
          catName={catName}
          index={index}
          isLast={isLast}
          isReorderMode={isReorderMode}
          isDark={isDark}
          currColors={currColors}
          count={count}
          categorySearch={categorySearch}
          drag={drag}
          isActive={isActive}
          startEditCategory={startEditCategory}
        />
      );
    },
    [
      categoryCounts,
      displayedCategories.length,
      isReorderMode,
      isDark,
      currColors,
      categorySearch,
      startEditCategory,
    ]
  );

  return (
    <View style={[styles.container, { backgroundColor: currColors.background, paddingTop: headerTopPadding }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header */}
      <View style={styles.header}>
        <BackButton />
        <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
          Manage Categories
        </ThemedText>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              { backgroundColor: isReorderMode ? '#00C9A722' : currColors.cardSecondary },
            ]}
            onPress={() => {
              handleHaptic();
              setIsReorderMode(!isReorderMode);
              if (drawerMode) closeDrawer();
            }}
            activeOpacity={0.8}
          >
            <ArrowUpDown size={17} color={isReorderMode ? '#00C9A7' : currColors.text} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Minimal Segmented Tab Switcher (Expense / Income) */}
      <View style={[styles.tabContainer, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'expense' && [styles.tabBtnActive, { backgroundColor: currColors.card, borderColor: currColors.border }],
          ]}
          onPress={() => {
            handleHaptic();
            setActiveTab('expense');
            if (drawerMode) closeDrawer();
          }}
          activeOpacity={0.8}
        >
          <ThemedText
            style={[
              styles.tabBtnText,
              { color: activeTab === 'expense' ? '#FF3B30' : currColors.textSecondary },
              activeTab === 'expense' && styles.tabBtnTextActive,
            ]}
          >
            Expense ({storeCategories.expense?.length || 0})
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'income' && [styles.tabBtnActive, { backgroundColor: currColors.card, borderColor: currColors.border }],
          ]}
          onPress={() => {
            handleHaptic();
            setActiveTab('income');
            if (drawerMode) closeDrawer();
          }}
          activeOpacity={0.8}
        >
          <ThemedText
            style={[
              styles.tabBtnText,
              { color: activeTab === 'income' ? '#34C759' : currColors.textSecondary },
              activeTab === 'income' && styles.tabBtnTextActive,
            ]}
          >
            Income ({storeCategories.income?.length || 0})
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Search Categories Bar or Reorder Hint Banner */}
      {isReorderMode ? (
        <View style={styles.reorderHintWrapper}>
          <View style={[styles.reorderHintBanner, { backgroundColor: isDark ? '#00C9A718' : '#00C9A70F', borderColor: currColors.tintMoney }]}>
            <GripVertical size={16} color={currColors.tintMoney} />
            <ThemedText style={[styles.reorderHintText, { color: currColors.tintMoney }]}>
              Drag the handles to reorder categories
            </ThemedText>
          </View>
        </View>
      ) : (
        <View style={styles.searchBarWrapper}>
          <View style={[styles.searchBarBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
            <Search size={15} color={currColors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchBarInput, { color: currColors.text }]}
              placeholder={`Search ${activeTab} categories...`}
              placeholderTextColor={currColors.textSecondary}
              value={categorySearch}
              onChangeText={setCategorySearch}
              clearButtonMode="while-editing"
            />
            {Boolean(categorySearch) && (
              <TouchableOpacity onPress={() => setCategorySearch('')} style={{ padding: 4 }}>
                <X size={14} color={currColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Draggable Categories FlatList */}
      <View style={styles.listWrapper}>
        <View style={[styles.cardContainer, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <DraggableFlatList
            data={displayedCategories}
            onDragEnd={({ data }) => {
              if (!categorySearch.trim()) {
                reorderCategories(activeTab, data);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            keyExtractor={(item) => item}
            renderItem={renderCategoryItem}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 20) + 76,
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <ThemedText style={{ color: currColors.textSecondary, fontSize: 13 }}>
                  No categories found for "{categorySearch}"
                </ThemedText>
              </View>
            }
          />
        </View>
      </View>

      {/* Floating Add Category Action Button (Hover Bottom-Right) */}
      {drawerMode === null && !isReorderMode && (
        <TouchableOpacity
          style={[
            styles.floatingAddBtn,
            {
              backgroundColor: currColors.tintMoney,
              bottom: Math.max(insets.bottom, 20) + 12,
            },
          ]}
          onPress={openAddDrawer}
          activeOpacity={0.85}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.6} />
        </TouchableOpacity>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM SHEET DRAWER OVERLAY FOR ADD & EDIT (IN-TREE, KEYBOARD SAFE) */}
      {/* ========================================================================= */}
      {drawerMode !== null && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.drawerOverlay}
          >
            {/* Dismiss backdrop on tap */}
            <TouchableWithoutFeedback onPress={closeDrawer}>
              <View style={styles.drawerBackdrop} />
            </TouchableWithoutFeedback>

            <View
              style={[
                styles.drawerSheet,
                {
                  backgroundColor: currColors.card,
                  borderColor: currColors.border,
                  paddingBottom: Math.max(insets.bottom, 16) + 8,
                },
              ]}
            >
              {/* Drawer Drag Indicator */}
              <View style={styles.drawerHandleWrap}>
                <View style={[styles.drawerHandle, { backgroundColor: currColors.border }]} />
              </View>

              {/* Drawer Header */}
              <View style={styles.drawerHeader}>
                <View>
                  <ThemedText style={[styles.drawerTitle, { color: currColors.text }]}>
                    {drawerMode === 'add' ? 'Add New Category' : 'Edit Category'}
                  </ThemedText>
                  <ThemedText style={[styles.drawerSubtitle, { color: currColors.textSecondary }]}>
                    {activeTab === 'expense' ? 'Expense Category' : 'Income Category'}
                  </ThemedText>
                </View>

                <TouchableOpacity
                  style={[styles.drawerCloseBtn, { backgroundColor: currColors.cardSecondary }]}
                  onPress={closeDrawer}
                  activeOpacity={0.8}
                >
                  <X size={18} color={currColors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Icon Preview + Auto-suggest hints */}
              <View style={styles.drawerIconSection}>
                <TouchableOpacity
                  style={[
                    styles.drawerIconBox,
                    {
                      backgroundColor: currColors.cardSecondary,
                      borderColor: currColors.tintMoney,
                    },
                  ]}
                  onPress={openIconPicker}
                  activeOpacity={0.8}
                >
                  <Category3DIcon name={formName} icon={formIcon} size={50} />
                  <View style={[styles.drawerIconPencilBadge, { backgroundColor: currColors.tintMoney }]}>
                    <Pencil size={11} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                </TouchableOpacity>

                <View style={styles.drawerIconLabelWrap}>
                  <TouchableOpacity onPress={openIconPicker} activeOpacity={0.7}>
                    <ThemedText style={[styles.drawerChangeIconText, { color: currColors.tintMoney }]}>
                      Tap icon to change
                    </ThemedText>
                  </TouchableOpacity>
                  <View style={styles.drawerAutoSuggestBadge}>
                    <Sparkles size={12} color={currColors.tintMoney} />
                    <ThemedText style={[styles.drawerAutoSuggestText, { color: currColors.textSecondary }]}>
                      Auto-matched to your title
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Category Name Input Field */}
              <View style={styles.drawerInputSection}>
                <ThemedText style={[styles.drawerInputLabel, { color: currColors.textSecondary }]}>
                  Category Name
                </ThemedText>
                <View style={[styles.drawerInputBox, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border }]}>
                  <TextInput
                    ref={drawerInputRef}
                    style={[styles.drawerTextInput, { color: currColors.text }]}
                    placeholder="e.g. Fuel, Spotify, Pet Food, Freelance..."
                    placeholderTextColor={currColors.textSecondary}
                    value={formName}
                    onChangeText={handleFormNameChange}
                    returnKeyType="done"
                    autoFocus={true}
                    autoCapitalize="words"
                    onSubmitEditing={drawerMode === 'add' ? handleSaveNewCategory : handleSaveEditedCategory}
                  />
                  {Boolean(formName) && (
                    <TouchableOpacity onPress={() => handleFormNameChange('')} style={{ padding: 6 }}>
                      <X size={15} color={currColors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Drawer Actions */}
              <View style={styles.drawerActionsRow}>
                {drawerMode === 'edit' && editingTargetCatName && (
                  <TouchableOpacity
                    style={[styles.drawerDeleteBtn, { backgroundColor: isDark ? '#FF3B3020' : '#FF3B3014' }]}
                    onPress={() => handleDelete(editingTargetCatName)}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={18} color="#FF3B30" strokeWidth={2.2} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.drawerSubmitBtn,
                    {
                      backgroundColor: currColors.tintMoney,
                      flex: drawerMode === 'edit' ? 1 : undefined,
                      width: drawerMode === 'add' ? '100%' : undefined,
                    },
                  ]}
                  onPress={drawerMode === 'add' ? handleSaveNewCategory : handleSaveEditedCategory}
                  activeOpacity={0.85}
                >
                  {drawerMode === 'add' ? (
                    <>
                      <Plus size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                      <ThemedText style={styles.drawerSubmitBtnText}>Create Category</ThemedText>
                    </>
                  ) : (
                    <>
                      <Check size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
                      <ThemedText style={styles.drawerSubmitBtnText}>Save Changes</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* FULL-PAGE CHOOSE ICON MODAL */}
      <Modal
        visible={isIconPickerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setIsIconPickerVisible(false)}
      >
        <View
          style={[
            styles.fullModalContainer,
            { backgroundColor: currColors.background, paddingTop: headerTopPadding },
          ]}
        >
          {/* Full Page Header */}
          <View style={[styles.fullModalHeader, { borderBottomColor: currColors.border }]}>
            <BackButton onPress={() => setIsIconPickerVisible(false)} />
            <ThemedText style={[styles.fullModalTitle, { color: currColors.text }]}>
              Choose Icon
            </ThemedText>
            <TouchableOpacity
              onPress={() => setIsIconPickerVisible(false)}
              style={[styles.fullModalDoneBtn, { backgroundColor: currColors.tintMoney }]}
              activeOpacity={0.8}
            >
              <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Search Box in Full-Page Modal */}
          <View style={styles.fullModalSearchWrap}>
            <View style={[styles.searchBarBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <Search size={15} color={currColors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchBarInput, { color: currColors.text }]}
                placeholder="Search icons (spotify, netflix, gym, coffee)..."
                placeholderTextColor={currColors.textSecondary}
                value={iconPickerSearch}
                onChangeText={setIconPickerSearch}
                clearButtonMode="while-editing"
                autoCorrect={false}
              />
              {Boolean(iconPickerSearch) && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIconPickerSearch('');
                  }}
                  style={{ padding: 4 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color={currColors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 3D Icons Grid */}
          <ScrollView
            contentContainerStyle={[
              styles.fullModalGrid,
              { paddingBottom: Math.max(insets.bottom + 24, 40) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredPickerIcons.length === 0 ? (
              <View style={styles.popupEmpty}>
                <ThemedText style={{ color: currColors.textSecondary, fontSize: 13 }}>
                  No icons found for "{iconPickerSearch}"
                </ThemedText>
              </View>
            ) : (
              filteredPickerIcons.map((def, idx) => {
                const isSelected = formIcon === def.id;

                return (
                  <TouchableOpacity
                    key={`icon_${def.id}_${idx}`}
                    style={[
                      styles.iconTile,
                      { backgroundColor: currColors.card, borderColor: currColors.border },
                      isSelected && [
                        styles.iconTileSelected,
                        { borderColor: currColors.tintMoney, backgroundColor: isDark ? '#00C9A722' : '#00C9A714' },
                      ],
                    ]}
                    onPress={() => handleSelectIcon(def.id)}
                    activeOpacity={0.7}
                  >
                    <Category3DIcon name={def.id} icon={def.id} size={34} />
                    <ThemedText
                      style={[
                        styles.iconTileLabel,
                        { color: isSelected ? currColors.tintMoney : currColors.textSecondary },
                        isSelected && { fontFamily: 'Outfit_600SemiBold' },
                      ]}
                      numberOfLines={1}
                    >
                      {def.name}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingAddBtn: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 20,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  tabBtnActive: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  tabBtnTextActive: {
    fontFamily: 'Outfit_600SemiBold',
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  reorderHintWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  reorderHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reorderHintText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.1,
  },
  listWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cardContainer: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activeDraggingRow: {
    borderWidth: 1.5,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  category3DWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  categorySubtitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  editIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandleBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bottom Sheet Drawer Styles
  drawerOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  drawerHandleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  drawerHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 18,
  },
  drawerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.3,
  },
  drawerSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerIconSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 14,
  },
  drawerIconBox: {
    width: 66,
    height: 66,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  drawerIconPencilBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  drawerIconLabelWrap: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  drawerChangeIconText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  drawerAutoSuggestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  drawerAutoSuggestText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  drawerInputSection: {
    marginBottom: 20,
  },
  drawerInputLabel: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    marginBottom: 6,
  },
  drawerInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  drawerTextInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
  },
  drawerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerDeleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerSubmitBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  drawerSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.2,
  },
  // Full Screen Icon Picker
  fullModalContainer: {
    flex: 1,
  },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fullModalTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.3,
  },
  fullModalDoneBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullModalSearchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fullModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  popupEmpty: {
    width: '100%',
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTile: {
    width: '22.5%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  iconTileSelected: {
    borderWidth: 1.5,
  },
  iconTileLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    marginTop: 4,
    textAlign: 'center',
  },
});

