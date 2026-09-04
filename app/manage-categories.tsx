import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  Sparkles,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react-native';
import * as LucideIcons from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { CategoryIcon } from '@/components/CategoryIcon';
import {
  CATEGORY_ICONS_LIST,
  CATEGORY_COLOR_PALETTE,
  getSmartIconSuggestions,
  IconDefinition,
} from '@/constants/CategoryIcons';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ManageCategoriesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

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
      'Others',
    ],
  };

  const categoryMetadata = useMoneyStore((state) => state.categoryMetadata) || {};
  const addCategory = useMoneyStore((state) => state.addCategory);
  const updateCategory = useMoneyStore((state) => state.updateCategory);
  const removeCategory = useMoneyStore((state) => state.removeCategory);
  const moneyTransactions = useMoneyStore((state) => state.moneyTransactions) || [];

  // Tab State
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [searchQuery, setSearchQuery] = useState('');

  // Category Editor Modal State
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingOldName, setEditingOldName] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('Tag');
  const [formColor, setFormColor] = useState(CATEGORY_COLOR_PALETTE[0]);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [selectedIconGroup, setSelectedIconGroup] = useState<string>('All');

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Transaction count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    moneyTransactions.forEach((tx) => {
      if (tx.category) {
        counts[tx.category] = (counts[tx.category] || 0) + 1;
      }
    });
    return counts;
  }, [moneyTransactions]);

  // Filtered categories for current tab
  const displayedCategories = useMemo(() => {
    const list = storeCategories[activeTab] || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((c) => c.toLowerCase().includes(q));
  }, [storeCategories, activeTab, searchQuery]);

  // Smart suggestions for editor
  const smartSuggestions = useMemo(() => {
    return getSmartIconSuggestions(formName);
  }, [formName]);

  // Icon groups for catalog filter
  const iconGroups = useMemo(() => {
    const groups = new Set<string>();
    CATEGORY_ICONS_LIST.forEach((item) => groups.add(item.category));
    return ['All', ...Array.from(groups)];
  }, []);

  // Filtered 100+ icons in catalog
  const filteredCatalogIcons = useMemo(() => {
    let list = CATEGORY_ICONS_LIST;
    if (selectedIconGroup !== 'All') {
      list = list.filter((item) => item.category === selectedIconGroup);
    }
    if (iconSearchQuery.trim()) {
      const q = iconSearchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.keywords.some((kw) => kw.toLowerCase().includes(q))
      );
    }
    return list;
  }, [selectedIconGroup, iconSearchQuery]);

  const openCreateModal = () => {
    handleHaptic();
    setEditingOldName(null);
    setFormName('');
    setFormIcon('Tag');
    setFormColor(activeTab === 'income' ? '#00C9A7' : '#FF3B30');
    setIconSearchQuery('');
    setSelectedIconGroup('All');
    setIsEditorVisible(true);
  };

  const openEditModal = (catName: string) => {
    handleHaptic();
    const meta = categoryMetadata[catName];
    setEditingOldName(catName);
    setFormName(catName);
    setFormIcon(meta?.icon || 'Tag');
    setFormColor(meta?.color || '#00C9A7');
    setIconSearchQuery('');
    setSelectedIconGroup('All');
    setIsEditorVisible(true);
  };

  const handleSaveCategory = () => {
    const cleanName = formName.trim();
    if (!cleanName) {
      Alert.alert('Required', 'Please enter a category name.');
      return;
    }

    const currentList = storeCategories[activeTab] || [];
    const isDuplicate = currentList.some(
      (c) => c.toLowerCase() === cleanName.toLowerCase() && c !== editingOldName
    );

    if (isDuplicate) {
      Alert.alert('Duplicate', 'A category with this name already exists.');
      return;
    }

    handleHaptic();
    if (editingOldName) {
      updateCategory(activeTab, editingOldName, cleanName, formIcon, formColor);
    } else {
      addCategory(activeTab, cleanName, formIcon, formColor);
    }

    setIsEditorVisible(false);
  };

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
            removeCategory(activeTab, catName);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currColors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: currColors.cardSecondary }]}
          onPress={() => {
            handleHaptic();
            router.back();
          }}
        >
          <ArrowLeft size={20} color={currColors.text} />
        </TouchableOpacity>
        <ThemedText type="semiBold" style={[styles.headerTitle, { color: currColors.text }]}>
          Manage Categories
        </ThemedText>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#00C9A7' }]} onPress={openCreateModal}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Segment Tab Selector (Expense vs Income) */}
      <View style={[styles.tabSelectorContainer, { backgroundColor: currColors.cardSecondary }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'expense' && { backgroundColor: currColors.card }]}
          onPress={() => {
            handleHaptic();
            setActiveTab('expense');
          }}
        >
          <ThemedText
            style={[
              styles.tabText,
              { color: activeTab === 'expense' ? currColors.text : currColors.textSecondary },
            ]}
          >
            Expense ({storeCategories.expense?.length || 0})
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'income' && { backgroundColor: currColors.card }]}
          onPress={() => {
            handleHaptic();
            setActiveTab('income');
          }}
        >
          <ThemedText
            style={[
              styles.tabText,
              { color: activeTab === 'income' ? currColors.text : currColors.textSecondary },
            ]}
          >
            Income ({storeCategories.income?.length || 0})
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          <Search size={18} color={currColors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: currColors.text }]}
            placeholder={`Search ${activeTab} categories...`}
            placeholderTextColor={currColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={currColors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Categories List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={[styles.cardList, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
          {displayedCategories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={{ color: currColors.textSecondary, fontSize: 14 }}>
                No categories found matching "{searchQuery}".
              </ThemedText>
            </View>
          ) : (
            displayedCategories.map((catName, index) => {
              const isLast = index === displayedCategories.length - 1;
              const count = categoryCounts[catName] || 0;
              const meta = categoryMetadata[catName];
              const badgeColor = meta?.color || (activeTab === 'income' ? '#34C759' : '#00C9A7');

              return (
                <TouchableOpacity
                  key={catName}
                  activeOpacity={0.7}
                  onPress={() => openEditModal(catName)}
                  style={[
                    styles.categoryRow,
                    !isLast && [styles.rowBorder, { borderBottomColor: currColors.border }],
                  ]}
                >
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryIconWrap, { backgroundColor: `${badgeColor}18` }]}>
                      <CategoryIcon name={catName} color={badgeColor} size={20} />
                    </View>
                    <View style={styles.categoryInfo}>
                      <ThemedText style={[styles.categoryTitle, { color: currColors.text }]} numberOfLines={1}>
                        {catName}
                      </ThemedText>
                      <ThemedText style={[styles.categorySubtitle, { color: currColors.textSecondary }]}>
                        {count} {count === 1 ? 'transaction' : 'transactions'}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={[styles.iconActionBtn, { backgroundColor: currColors.cardSecondary }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        openEditModal(catName);
                      }}
                    >
                      <Pencil size={15} color={currColors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={[styles.iconActionBtn, { backgroundColor: currColors.cardSecondary }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(catName);
                      }}
                    >
                      <Trash2 size={15} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Dedicated Category Designer & Icon Studio Modal */}
      <Modal
        visible={isEditorVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setIsEditorVisible(false)} />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: currColors.card, borderColor: currColors.border },
            ]}
          >
            <View style={styles.modalDragHandle} />

            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
              <View>
                <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                  {editingOldName ? 'Edit Category' : 'New Category'}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: currColors.textSecondary, marginTop: 2 }}>
                  Customize icon, badge color, and name
                </ThemedText>
              </View>
              <TouchableOpacity style={[styles.doneBtn, { backgroundColor: '#00C9A7' }]} onPress={handleSaveCategory}>
                <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={{ maxHeight: 580 }}>
              {/* Live Preview Card */}
              <View
                style={[
                  styles.previewCard,
                  { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                ]}
              >
                <View style={[styles.previewIconWrap, { backgroundColor: `${formColor}22` }]}>
                  {(() => {
                    const PreviewIconComp = (LucideIcons as any)[formIcon] || LucideIcons.Tag;
                    return <PreviewIconComp size={24} color={formColor} />;
                  })()}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    LIVE PREVIEW
                  </ThemedText>
                  <ThemedText style={[styles.previewName, { color: currColors.text }]} numberOfLines={1}>
                    {formName.trim() || 'Category Name'}
                  </ThemedText>
                </View>
              </View>

              {/* Category Name Input */}
              <View style={styles.editorInputSection}>
                <ThemedText style={[styles.sectionLabel, { color: currColors.textSecondary }]}>
                  CATEGORY NAME
                </ThemedText>
                <TextInput
                  style={[
                    styles.nameInput,
                    { backgroundColor: currColors.cardSecondary, borderColor: currColors.border, color: currColors.text },
                  ]}
                  placeholder="e.g. Coffee, Freelance, Gym, Groceries"
                  placeholderTextColor={currColors.textSecondary}
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              {/* Smart Suggested Icons */}
              {smartSuggestions.length > 0 && (
                <View style={styles.editorInputSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Sparkles size={14} color="#FFCC00" style={{ marginRight: 6 }} />
                    <ThemedText style={[styles.sectionLabel, { color: currColors.textSecondary, marginBottom: 0 }]}>
                      SMART SUGGESTIONS (BASED ON NAME)
                    </ThemedText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {smartSuggestions.map((item, idx) => {
                      const IconComp = (LucideIcons as any)[item.name] || LucideIcons.Tag;
                      const isSelected = formIcon === item.name;
                      return (
                        <TouchableOpacity
                          key={`sugg_${item.name}_${idx}`}
                          style={[
                            styles.suggestionPill,
                            { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                            isSelected && { borderColor: formColor, backgroundColor: `${formColor}18` },
                          ]}
                          onPress={() => {
                            handleHaptic();
                            setFormIcon(item.name);
                          }}
                        >
                          <IconComp size={16} color={isSelected ? formColor : currColors.text} />
                          <ThemedText
                            style={{
                              fontSize: 12,
                              color: isSelected ? formColor : currColors.text,
                              marginLeft: 6,
                              fontFamily: isSelected ? 'Outfit_600SemiBold' : 'Outfit_400Regular',
                            }}
                          >
                            {item.name}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Color Palette */}
              <View style={styles.editorInputSection}>
                <ThemedText style={[styles.sectionLabel, { color: currColors.textSecondary }]}>
                  BADGE COLOR
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {CATEGORY_COLOR_PALETTE.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        formColor === c && { borderColor: currColors.text, borderWidth: 3 },
                      ]}
                      onPress={() => {
                        handleHaptic();
                        setFormColor(c);
                      }}
                    >
                      {formColor === c && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 100+ Icons Full Catalog */}
              <View style={styles.editorInputSection}>
                <ThemedText style={[styles.sectionLabel, { color: currColors.textSecondary }]}>
                  ICON CATALOG (130+ ICONS)
                </ThemedText>

                {/* Icon Search Input */}
                <View
                  style={[
                    styles.iconSearchBox,
                    { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                  ]}
                >
                  <Search size={16} color={currColors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.iconSearchInput, { color: currColors.text }]}
                    placeholder="Search 130+ icons (e.g. coffee, car, flight)..."
                    placeholderTextColor={currColors.textSecondary}
                    value={iconSearchQuery}
                    onChangeText={setIconSearchQuery}
                    clearButtonMode="while-editing"
                  />
                </View>

                {/* Group Filter Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, marginBottom: 12 }}
                >
                  {iconGroups.map((grp) => {
                    const isSelected = selectedIconGroup === grp;
                    return (
                      <TouchableOpacity
                        key={grp}
                        style={[
                          styles.groupChip,
                          { backgroundColor: currColors.cardSecondary },
                          isSelected && { backgroundColor: formColor },
                        ]}
                        onPress={() => {
                          handleHaptic();
                          setSelectedIconGroup(grp);
                        }}
                      >
                        <ThemedText
                          style={{
                            fontSize: 11,
                            fontFamily: 'Outfit_500Medium',
                            color: isSelected ? '#FFFFFF' : currColors.textSecondary,
                          }}
                        >
                          {grp}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Icon Grid */}
                <View style={styles.iconGrid}>
                  {filteredCatalogIcons.length === 0 ? (
                    <View style={{ padding: 20, alignItems: 'center', width: '100%' }}>
                      <ThemedText style={{ color: currColors.textSecondary, fontSize: 13 }}>
                        No icons found for "{iconSearchQuery}"
                      </ThemedText>
                    </View>
                  ) : (
                    filteredCatalogIcons.map((def, index) => {
                      const IconComp = (LucideIcons as any)[def.name] || LucideIcons.Tag;
                      const isSelected = formIcon === def.name;
                      return (
                        <TouchableOpacity
                          key={`${def.category}_${def.name}_${index}`}
                          style={[
                            styles.iconGridTile,
                            { backgroundColor: currColors.cardSecondary, borderColor: currColors.border },
                            isSelected && {
                              borderColor: formColor,
                              backgroundColor: `${formColor}20`,
                              borderWidth: 2,
                            },
                          ]}
                          onPress={() => {
                            handleHaptic();
                            setFormIcon(def.name);
                          }}
                        >
                          <IconComp size={22} color={isSelected ? formColor : currColors.text} />
                          <ThemedText
                            style={[
                              styles.iconTileLabel,
                              { color: isSelected ? formColor : currColors.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {def.name}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </View>
            </ScrollView>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabSelectorContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  cardList: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  categoryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
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
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(142, 142, 147, 0.3)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  doneBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  previewIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewName: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 2,
  },
  editorInputSection: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  nameInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  iconSearchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  groupChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 8,
    paddingBottom: 28,
  },
  iconGridTile: {
    width: '22.8%',
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  iconTileLabel: {
    fontSize: 9,
    fontFamily: 'Outfit_400Regular',
    marginTop: 4,
    textAlign: 'center',
  },
});
