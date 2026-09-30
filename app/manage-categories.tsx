import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { Swipeable } from 'react-native-gesture-handler';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  ArrowUpDown,
  GripVertical,
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

interface CategoryRowItemProps {
  catName: string;
  index: number;
  isLast: boolean;
  isReorderMode: boolean;
  isDark: boolean;
  currColors: any;
  count: number;
  categorySearch: string;
  isInlineAdding: boolean;
  editingCatName: string | null;
  drag: () => void;
  isActive: boolean;
  startEditCategory: (name: string) => void;
  handleDelete: (name: string) => void;
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
  isInlineAdding,
  editingCatName,
  drag,
  isActive,
  startEditCategory,
  handleDelete,
}: CategoryRowItemProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = () => (
    <View style={styles.swipeRightActionsContainer}>
      <TouchableOpacity
        style={styles.swipeDeleteBtn}
        onPress={() => {
          swipeableRef.current?.close();
          handleDelete(catName);
        }}
        activeOpacity={0.8}
      >
        <Trash2 size={17} color="#FFFFFF" strokeWidth={2.2} />
        <ThemedText style={styles.swipeDeleteText}>Delete</ThemedText>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScaleDecorator activeScale={1.03}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        enabled={!isReorderMode && !Boolean(categorySearch.trim())}
        friction={2}
        rightThreshold={30}
        overshootRight={false}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (!isReorderMode) startEditCategory(catName);
          }}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            drag();
          }}
          disabled={Boolean(categorySearch.trim()) || isInlineAdding || Boolean(editingCatName)}
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

          {isReorderMode && (
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
          )}
        </TouchableOpacity>
      </Swipeable>
    </ScaleDecorator>
  );
}

export default function ManageCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const headerTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24);

  const storeCategories = useMoneyStore((state) => state.categories) || {
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

  const categoryMetadata = useMoneyStore((state) => state.categoryMetadata) || {};
  const addCategory = useMoneyStore((state) => state.addCategory);
  const updateCategory = useMoneyStore((state) => state.updateCategory);
  const removeCategory = useMoneyStore((state) => state.removeCategory);
  const reorderCategories = useMoneyStore((state) => state.reorderCategories);
  const moneyTransactions = useMoneyStore((state) => state.moneyTransactions) || [];

  // Tab State
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [categorySearch, setCategorySearch] = useState('');
  const [isReorderMode, setIsReorderMode] = useState(false);

  // Inline Adding State
  const [isInlineAdding, setIsInlineAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('food');
  const [isIconManuallyOverridden, setIsIconManuallyOverridden] = useState(false);

  // Inline Editing State
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [editFormName, setEditFormName] = useState('');
  const [editFormIcon, setEditFormIcon] = useState('');

  // Icon Picker Full Page Modal State
  const [isIconPickerVisible, setIsIconPickerVisible] = useState(false);
  const [iconPickerTarget, setIconPickerTarget] = useState<'add' | 'edit'>('add');
  const [iconPickerSearch, setIconPickerSearch] = useState('');

  const flatListRef = useRef<any>(null);
  const addInputRef = useRef<TextInput>(null);
  const editInputRef = useRef<TextInput>(null);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Transaction counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    moneyTransactions.forEach((tx) => {
      if (tx.category) {
        counts[tx.category] = (counts[tx.category] || 0) + 1;
      }
    });
    return counts;
  }, [moneyTransactions]);

  // Current list of categories for active tab
  const currentTabCategories = useMemo(() => {
    return storeCategories[activeTab] || [];
  }, [storeCategories, activeTab]);

  // Filtered categories for current tab with search query
  const displayedCategories = useMemo(() => {
    if (!categorySearch.trim()) return currentTabCategories;
    const q = categorySearch.toLowerCase().trim();
    return currentTabCategories.filter((c) => c.toLowerCase().includes(q));
  }, [currentTabCategories, categorySearch]);

  // Auto-suggest icon when typing new category name
  const handleNewNameChange = (text: string) => {
    setNewCatName(text);
    if (!isIconManuallyOverridden) {
      if (text.trim().length > 0) {
        const bestIcon = findBest3DIconForText(text);
        setNewCatIcon(bestIcon);
      } else {
        setNewCatIcon(activeTab === 'income' ? 'banknote' : 'food');
      }
    }
  };

  // Auto-suggest icon when editing category name
  const handleEditNameChange = (text: string) => {
    setEditFormName(text);
    if (!isIconManuallyOverridden && text.trim().length > 0) {
      const bestIcon = findBest3DIconForText(text);
      setEditFormIcon(bestIcon);
    }
  };

  // Start Inline Add
  const startInlineAdd = () => {
    handleHaptic();
    setEditingCatName(null);
    setIsReorderMode(false);
    setIsInlineAdding(true);
    setNewCatName('');
    setIsIconManuallyOverridden(false);
    setNewCatIcon(activeTab === 'income' ? 'banknote' : 'food');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);

    setTimeout(() => {
      addInputRef.current?.focus();
    }, 50);
  };

  // Start Inline Edit
  const startEditCategory = (catName: string) => {
    handleHaptic();
    setIsInlineAdding(false);
    setIsReorderMode(false);
    setEditingCatName(catName);
    setEditFormName(catName);
    const meta = categoryMetadata[catName];
    setEditFormIcon(meta?.icon || catName.toLowerCase());
    setIsIconManuallyOverridden(false);

    const index = displayedCategories.findIndex((c) => c === catName);
    if (index >= 0) {
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({
            index,
            viewPosition: 1,
            animated: true,
          });
        } catch {
          flatListRef.current?.scrollToOffset({ offset: index * 56, animated: true });
        }
      }, 150);
    }

    setTimeout(() => {
      editInputRef.current?.focus();
    }, 100);
  };

  // Submit New Category
  const handleSaveNewCategory = () => {
    const cleanName = newCatName.trim();
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
    addCategory(activeTab, cleanName, newCatIcon, currColors.tintMoney);
    setNewCatName('');
    setIsInlineAdding(false);
    setIsIconManuallyOverridden(false);
  };

  // Save Edited Category
  const handleSaveEditedCategory = () => {
    if (!editingCatName) return;
    const cleanName = editFormName.trim();
    if (!cleanName) {
      Alert.alert('Required', 'Please enter a category name.');
      return;
    }

    const currentList = storeCategories[activeTab] || [];
    const isDuplicate = currentList.some(
      (c) => c.toLowerCase() === cleanName.toLowerCase() && c !== editingCatName
    );
    if (isDuplicate) {
      Alert.alert('Duplicate', 'A category with this name already exists.');
      return;
    }

    handleHaptic();
    updateCategory(activeTab, editingCatName, cleanName, editFormIcon, currColors.tintMoney);
    setEditingCatName(null);
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
            if (editingCatName === catName) {
              setEditingCatName(null);
            }
            removeCategory(activeTab, catName);
          },
        },
      ]
    );
  };

  // Open Full-Page Icon Picker
  const openIconPicker = (target: 'add' | 'edit') => {
    handleHaptic();
    setIconPickerTarget(target);
    setIconPickerSearch('');
    setIsIconPickerVisible(true);
  };

  // Select Icon from Full-Page Picker
  const handleSelectIcon = (iconId: string) => {
    handleHaptic();
    if (iconPickerTarget === 'add') {
      setNewCatIcon(iconId);
      setIsIconManuallyOverridden(true);
    } else {
      setEditFormIcon(iconId);
      setIsIconManuallyOverridden(true);
    }
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
  const renderCategoryItem = ({ item: catName, getIndex, drag, isActive }: RenderItemParams<string>) => {
    const index = getIndex() ?? 0;
    const count = categoryCounts[catName] || 0;
    const isEditingThis = editingCatName === catName;
    const isLast = index === displayedCategories.length - 1 && !isInlineAdding;

    if (isEditingThis) {
      // Inline Edit Row
      return (
        <View
          style={[
            styles.inlineEditRow,
            { backgroundColor: isDark ? '#00C9A714' : '#00C9A70A', borderColor: currColors.tintMoney },
            !isLast && [styles.rowBorder, { borderBottomColor: currColors.border }],
          ]}
        >
          {/* 3D Icon Button (Tap to pick) */}
          <TouchableOpacity
            style={[styles.inlineIconButton, { backgroundColor: currColors.cardSecondary, borderColor: currColors.tintMoney }]}
            onPress={() => openIconPicker('edit')}
            activeOpacity={0.7}
          >
            <Category3DIcon name={editFormName} icon={editFormIcon} size={34} />
            <View style={[styles.iconEditBadge, { backgroundColor: currColors.tintMoney }]}>
              <Pencil size={8} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

          {/* Category Name Input */}
          <View style={styles.inlineInputWrap}>
            <TextInput
              ref={editInputRef}
              style={[styles.inlineInput, { color: currColors.text }]}
              value={editFormName}
              onChangeText={handleEditNameChange}
              placeholder="Category name"
              placeholderTextColor={currColors.textSecondary}
              returnKeyType="done"
              onSubmitEditing={handleSaveEditedCategory}
            />
          </View>

          {/* Actions: Cancel & Save */}
          <View style={styles.inlineActionButtons}>
            <TouchableOpacity
              style={[styles.inlineSmallBtn, { backgroundColor: currColors.cardSecondary }]}
              onPress={() => setEditingCatName(null)}
            >
              <X size={15} color={currColors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inlineSmallBtn, { backgroundColor: currColors.tintMoney }]}
              onPress={handleSaveEditedCategory}
            >
              <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

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
        isInlineAdding={isInlineAdding}
        editingCatName={editingCatName}
        drag={drag}
        isActive={isActive}
        startEditCategory={startEditCategory}
        handleDelete={handleDelete}
      />
    );
  };

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
              if (isInlineAdding) setIsInlineAdding(false);
              if (editingCatName) setEditingCatName(null);
            }}
            activeOpacity={0.8}
          >
            <ArrowUpDown size={17} color={isReorderMode ? '#00C9A7' : currColors.text} strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerAddBtn, { backgroundColor: currColors.tintMoney }]}
            onPress={startInlineAdd}
            activeOpacity={0.8}
          >
            <Plus size={19} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content wrapped in KeyboardAvoidingView */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
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
              setIsInlineAdding(false);
              setEditingCatName(null);
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
              setIsInlineAdding(false);
              setEditingCatName(null);
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
              ref={flatListRef}
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
              keyboardDismissMode="on-drag"
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToOffset({
                    offset: info.averageItemLength * info.index,
                    animated: true,
                  });
                }, 100);
              }}
              contentContainerStyle={{
                paddingBottom: isInlineAdding ? 16 : Math.max(insets.bottom, 16),
              }}
              ListEmptyComponent={
                !isInlineAdding ? (
                  <View style={styles.emptyWrap}>
                    <ThemedText style={{ color: currColors.textSecondary, fontSize: 13 }}>
                      No categories found for "{categorySearch}"
                    </ThemedText>
                  </View>
                ) : null
              }
              ListFooterComponent={
                isInlineAdding ? (
                  <View
                    style={[
                      styles.inlineAddRow,
                      { backgroundColor: isDark ? '#00C9A718' : '#00C9A70D', borderColor: currColors.tintMoney },
                    ]}
                  >
                    {/* Tap to Pick 3D Icon */}
                    <TouchableOpacity
                      style={[styles.inlineIconButton, { backgroundColor: currColors.cardSecondary, borderColor: currColors.tintMoney }]}
                      onPress={() => openIconPicker('add')}
                      activeOpacity={0.7}
                    >
                      <Category3DIcon name={newCatName} icon={newCatIcon} size={34} />
                      <View style={[styles.iconEditBadge, { backgroundColor: currColors.tintMoney }]}>
                        <ChevronDown size={8} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    </TouchableOpacity>

                    {/* Inline Text Input */}
                    <View style={styles.inlineInputWrap}>
                      <TextInput
                        ref={addInputRef}
                        style={[styles.inlineInput, { color: currColors.text }]}
                        placeholder="New category name (e.g. Fuel, Pet)..."
                        placeholderTextColor={currColors.textSecondary}
                        value={newCatName}
                        onChangeText={handleNewNameChange}
                        returnKeyType="done"
                        onSubmitEditing={handleSaveNewCategory}
                        autoCapitalize="words"
                      />
                      <ThemedText style={[styles.inlineHint, { color: currColors.tintMoney }]}>
                        Auto-suggesting icon • Tap icon to choose
                      </ThemedText>
                    </View>

                    {/* Inline Actions */}
                    <View style={styles.inlineActionButtons}>
                      <TouchableOpacity
                        style={[styles.inlineSmallBtn, { backgroundColor: currColors.cardSecondary }]}
                        onPress={() => setIsInlineAdding(false)}
                      >
                        <X size={15} color={currColors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.inlineSmallBtn, { backgroundColor: currColors.tintMoney }]}
                        onPress={handleSaveNewCategory}
                      >
                        <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>

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
                const isSelected =
                  iconPickerTarget === 'add' ? newCatIcon === def.id : editFormIcon === def.id;

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
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
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
  swipeRightActionsContainer: {
    width: 78,
    height: '100%',
    flexDirection: 'row',
  },
  swipeDeleteBtn: {
    flex: 1,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  inlineEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    margin: 6,
  },
  inlineIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 10,
  },
  iconEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineInputWrap: {
    flex: 1,
    marginRight: 8,
  },
  inlineInput: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    paddingVertical: 4,
  },
  inlineHint: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  inlineActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineSmallBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
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
