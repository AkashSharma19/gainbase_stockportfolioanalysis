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
  Switch,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  Search,
  X,
  Check,
  Wallet,
  Landmark,
  Activity,
  CreditCard,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Category3DIcon } from '@/components/Category3DIcon';
import { CATEGORY_3D_ICONS_LIST } from '@/constants/Category3DIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { formatIndianAmount, parseIndianAmount } from '@/utils/formatters';
import { Account, AccountType } from '@/types/money';
import { BANK_BRANDS, BankLogo, getCustomBrandColor } from '@/components/BankLogo';

const COLORS = [
  '#00C9A7',
  '#007AFF',
  '#AF52DE',
  '#FF9500',
  '#FF3B30',
  '#34C759',
  '#5AC8FA',
  '#FF2D55',
];

const TYPES: { type: AccountType; label: string; icon: any; color: string }[] = [
  { type: 'savings', label: 'Savings / Bank', icon: Landmark, color: '#007AFF' },
  { type: 'credit_card', label: 'Credit Card', icon: CreditCard, color: '#FF9500' },
  { type: 'wallet', label: 'Cash / Wallet', icon: Wallet, color: '#00C9A7' },
  { type: 'investment', label: 'Investment Account', icon: Activity, color: '#AF52DE' },
  { type: 'emergency_fund', label: 'Emergency Fund', icon: PiggyBank, color: '#FF2D55' },
  { type: 'receivable', label: 'Accounts Receivable', icon: ArrowDownLeft, color: '#34C759' },
  { type: 'payable', label: 'Accounts Payable', icon: ArrowUpRight, color: '#FF3B30' },
];

export default function AddAccountScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const { accounts, addAccount, updateAccount } = useMoneyStore();

  const editingAccount = useMemo(() => {
    return id ? accounts.find((acc) => String(acc.id) === String(id)) : null;
  }, [id, accounts]);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('savings');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [institution, setInstitution] = useState('');
  const [logo, setLogo] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [iconId, setIconId] = useState(''); // 3D icon ID for receivable/payable
  const [isLogoManuallySelected, setIsLogoManuallySelected] = useState(false);
  const [includeInAssets, setIncludeInAssets] = useState(true);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [linkedBroker, setLinkedBroker] = useState('');
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');

  const selectedTypeObj = useMemo(() => {
    return TYPES.find((t) => t.type === type) || TYPES[0];
  }, [type]);

  const portfolioTransactions = usePortfolioStore((state) => state.transactions);
  const availableBrokers = useMemo(() => {
    const portfolioBrokers = portfolioTransactions.map((t) => t.broker).filter(Boolean);
    const defaults = ['Groww', 'Upstox', 'Zerodha', 'IND Money', 'Angel One', 'HDFC Securities', 'ICICI Direct'];
    const merged = new Set([...portfolioBrokers, ...defaults]);
    return Array.from(merged);
  }, [portfolioTransactions]);

  // Filtered 3D icons for receivable/payable icon picker
  const filteredIcons = useMemo(() => {
    if (!iconSearchQuery.trim()) return CATEGORY_3D_ICONS_LIST;
    const q = iconSearchQuery.toLowerCase().trim();
    return CATEGORY_3D_ICONS_LIST.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.some((kw) => kw.toLowerCase().includes(q)))
    );
  }, [iconSearchQuery]);

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name);
      setType(editingAccount.type);
      setBalance(formatIndianAmount(Math.abs(editingAccount.balance).toString()));
      setCreditLimit(editingAccount.creditLimit ? formatIndianAmount(editingAccount.creditLimit.toString()) : '');
      setInstitution(editingAccount.institution || '');
      setLogo(editingAccount.logo || '');
      setAccountNumber(editingAccount.accountNumber || '');
      setColor(editingAccount.color);
      setIconId(editingAccount.icon || (editingAccount.type === 'wallet' ? 'wallet' : ''));
      setIncludeInAssets(editingAccount.includeInAssets !== false);
      setLinkedBroker(editingAccount.linkedBroker || '');
    }
  }, [editingAccount]);

  const checkBrandMatch = (inputText: string) => {
    if (editingAccount || isLogoManuallySelected) return;
    const lowerText = inputText.toLowerCase();
    const matchedBrand = BANK_BRANDS.find((brand) => {
      return (
        lowerText.includes(brand.id) ||
        lowerText.includes(brand.initials.toLowerCase()) ||
        lowerText.includes(brand.name.toLowerCase())
      );
    });
    if (matchedBrand) {
      setLogo(matchedBrand.id);
      setColor(matchedBrand.color);
    }
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    handleHaptic();
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter an account name.');
      return;
    }

    const parsedBalance = parseIndianAmount(balance);
    if (isNaN(parsedBalance) && !editingAccount) {
      Alert.alert('Invalid Balance', 'Please enter a valid numeric balance.');
      return;
    }

    let finalBalance = parsedBalance || 0;
    if (type === 'credit_card' || type === 'payable') {
      finalBalance = -Math.abs(finalBalance);
    } else {
      finalBalance = Math.abs(finalBalance);
    }

    const parsedLimit = parseIndianAmount(creditLimit);

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name: name.trim(),
        type,
        balance: finalBalance,
        creditLimit: type === 'credit_card' ? (parsedLimit || 0) : undefined,
        institution: institution.trim() || undefined,
        logo: logo || undefined,
        accountNumber: accountNumber.trim() || undefined,
        color,
        icon: (type === 'receivable' || type === 'payable' || type === 'wallet')
          ? (iconId || (type === 'wallet' ? 'wallet' : (type === 'receivable' ? 'receivable' : 'payable')))
          : undefined,
        includeInAssets,
        linkedBroker: type === 'investment' ? (linkedBroker || undefined) : undefined,
      });
    } else {
      const resolvedIcon =
        (type === 'receivable' || type === 'payable' || type === 'wallet')
          ? (iconId || (type === 'wallet' ? 'wallet' : (type === 'receivable' ? 'receivable' : 'payable')))
          : type === 'savings' ? 'Landmark'
          : type === 'investment' ? 'Activity'
          : type === 'emergency_fund' ? 'PiggyBank'
          : 'CreditCard';
      const newAccount: Account = {
        id: Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        type,
        icon: resolvedIcon,
        balance: finalBalance,
        creditLimit: type === 'credit_card' ? (parsedLimit || 0) : undefined,
        institution: institution.trim() || undefined,
        logo: logo || undefined,
        accountNumber: accountNumber.trim() || undefined,
        color,
        includeInAssets,
        linkedBroker: type === 'investment' ? (linkedBroker || undefined) : undefined,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addAccount(newAccount);
    }

    router.back();
  };

  const filteredBrands = useMemo(() => {
    if (!brandSearchQuery.trim()) return BANK_BRANDS;
    const q = brandSearchQuery.toLowerCase().trim();
    return BANK_BRANDS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.initials.toLowerCase().includes(q)
    );
  }, [brandSearchQuery]);

  const selectedBrandObj = useMemo(() => {
    return BANK_BRANDS.find((b) => b.id.toLowerCase() === (logo || '').toLowerCase());
  }, [logo]);

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
          {editingAccount ? 'Edit Account' : 'Add Account'}
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
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* GROUP 1: ACCOUNT DETAILS */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              ACCOUNT DETAILS
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {/* Name Row */}
              <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Name</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="e.g. HDFC Salary, Main Wallet"
                  placeholderTextColor={currColors.textSecondary}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    checkBrandMatch(val);
                  }}
                  textAlign="right"
                />
              </View>

              {/* Account Type Row */}
              <TouchableOpacity
                style={[styles.formRow, styles.formRowLast]}
                onPress={() => setShowTypeModal(true)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.label, { color: currColors.text }]}>Account Type</ThemedText>
                <View style={styles.valueContainer}>
                  {(() => {
                    const IconComp = selectedTypeObj.icon;
                    return (
                      <View style={styles.typeBadge}>
                        <View style={[styles.typeIconWrap, { backgroundColor: `${selectedTypeObj.color}15` }]}>
                          <IconComp size={15} color={selectedTypeObj.color} />
                        </View>
                        <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                          {selectedTypeObj.label}
                        </ThemedText>
                      </View>
                    );
                  })()}
                  <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 6 }} />
                </View>
              </TouchableOpacity>
            </View>

            {/* GROUP 2: BALANCE & INSTITUTION */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              BALANCE & INSTITUTION
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {/* Balance Row */}
              <View style={[styles.formRow, styles.formRowFirst, { borderBottomColor: currColors.border }]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>
                  {type === 'credit_card' ? 'Outstanding Debt' : 'Current Balance'}
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="₹ 0"
                  placeholderTextColor={currColors.textSecondary}
                  value={balance ? `₹ ${balance}` : ''}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9.]/g, '');
                    setBalance(formatIndianAmount(clean));
                  }}
                  keyboardType="decimal-pad"
                  textAlign="right"
                />
              </View>

              {/* Credit Limit Row (Credit Card Only) */}
              {type === 'credit_card' ? (
                <View style={[styles.formRow, { borderBottomColor: currColors.border }]}>
                  <ThemedText style={[styles.label, { color: currColors.text }]}>Total Credit Limit</ThemedText>
                  <TextInput
                    style={[styles.input, { color: currColors.text }]}
                    placeholder="₹ 0"
                    placeholderTextColor={currColors.textSecondary}
                    value={creditLimit ? `₹ ${creditLimit}` : ''}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^0-9.]/g, '');
                      setCreditLimit(formatIndianAmount(clean));
                    }}
                    keyboardType="decimal-pad"
                    textAlign="right"
                  />
                </View>
              ) : null}

              {/* Institution / Brand Logo Row */}
              <TouchableOpacity
                style={[styles.formRow, { borderBottomColor: currColors.border }]}
                onPress={() => setShowLogoModal(true)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.label, { color: currColors.text }]}>Institution Logo</ThemedText>
                <View style={styles.valueContainer}>
                  {logo ? (
                    <View style={styles.brandBadge}>
                      <BankLogo logo={logo} size={22} style={{ marginRight: 6 }} />
                      <ThemedText style={[styles.valueText, { color: currColors.text }]}>
                        {selectedBrandObj ? selectedBrandObj.name : logo.replace(/^custom[:_]/i, '')}
                      </ThemedText>
                    </View>
                  ) : (
                    <ThemedText style={[styles.valueText, styles.placeholderText, { color: currColors.textSecondary }]}>
                      Select Brand
                    </ThemedText>
                  )}
                  <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 6 }} />
                </View>
              </TouchableOpacity>

              {/* Account Number Row (Optional) */}
              <View style={[styles.formRow, styles.formRowLast]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Account No. (Optional)</ThemedText>
                <TextInput
                  style={[styles.input, { color: currColors.text }]}
                  placeholder="Last 4 digits"
                  placeholderTextColor={currColors.textSecondary}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="numeric"
                  maxLength={8}
                  textAlign="right"
                />
              </View>
            </View>

            {/* GROUP 3: LINKED PORTFOLIO & SETTINGS */}
            <ThemedText style={[styles.groupLabel, { color: currColors.textSecondary }]}>
              SETTINGS & INTEGRATION
            </ThemedText>
            <View style={[styles.formGroup, { backgroundColor: currColors.card }]}>
              {/* Linked Broker Row (Investment account only) */}
              {type === 'investment' ? (
                <TouchableOpacity
                  style={[styles.formRow, { borderBottomColor: currColors.border }]}
                  onPress={() => setShowBrokerModal(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.label, { color: currColors.text }]}>Linked Portfolio Broker</ThemedText>
                  <View style={styles.valueContainer}>
                    <ThemedText
                      style={[
                        styles.valueText,
                        !linkedBroker && styles.placeholderText,
                        { color: linkedBroker ? currColors.text : currColors.textSecondary },
                      ]}
                    >
                      {linkedBroker || 'None (Manual)'}
                    </ThemedText>
                    <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 6 }} />
                  </View>
                </TouchableOpacity>
              ) : null}

              {/* Icon Row (for receivable/payable/wallet) */}
              {(type === 'receivable' || type === 'payable' || type === 'wallet') ? (
                <TouchableOpacity
                  style={[styles.formRow, { borderBottomColor: currColors.border }]}
                  onPress={() => setShowIconModal(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.label, { color: currColors.text }]}>Account Icon</ThemedText>
                  <View style={styles.valueContainer}>
                    <View style={styles.typeBadge}>
                      {(() => {
                        const defaultIcon = type === 'wallet' ? 'wallet' : (type === 'receivable' ? 'receivable' : 'payable');
                        const activeIcon = iconId || defaultIcon;
                        return (
                          <>
                            <Category3DIcon name={activeIcon} icon={activeIcon} size={26} />
                            <ThemedText style={[styles.valueText, { color: currColors.text, marginLeft: 8 }]}>
                              {CATEGORY_3D_ICONS_LIST.find((i) => i.id === activeIcon)?.name || 'Default'}
                            </ThemedText>
                          </>
                        );
                      })()}
                    </View>
                    <ChevronRight size={16} color={currColors.border} style={{ marginLeft: 6 }} />
                  </View>
                </TouchableOpacity>
              ) : null}

              {/* Include in Net Worth Switch */}
              <View style={[styles.formRow, styles.formRowLast]}>
                <ThemedText style={[styles.label, { color: currColors.text }]}>Include in Net Worth</ThemedText>
                <Switch
                  value={includeInAssets}
                  onValueChange={setIncludeInAssets}
                  trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                  thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

      {/* ACCOUNT TYPE SELECTION MODAL */}
      <Modal
        visible={showTypeModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setShowTypeModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View
            style={[
              styles.modalHeader,
              {
                paddingTop: headerTopPadding,
                borderBottomColor: currColors.border,
                backgroundColor: currColors.background,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                setShowTypeModal(false);
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
              Account Type
            </ThemedText>

            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                setShowTypeModal(false);
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

          <FlatList
            data={TYPES}
            keyExtractor={(item) => item.type}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = type === item.type;
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    handleHaptic();
                    setType(item.type);
                    setShowTypeModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.typeIconCircle, { backgroundColor: `${item.color}15` }]}>
                      <IconComp size={18} color={item.color} />
                    </View>
                    <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>{item.label}</ThemedText>
                  </View>
                  {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* BANK BRAND LOGO SELECTION MODAL */}
      <Modal
        visible={showLogoModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setShowLogoModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View
            style={[
              styles.modalHeader,
              {
                paddingTop: headerTopPadding,
                borderBottomColor: currColors.border,
                backgroundColor: currColors.background,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                setShowLogoModal(false);
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
              Institution Logo
            </ThemedText>

            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                setShowLogoModal(false);
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

          <View style={styles.searchBarContainer}>
            <View style={[styles.searchBox, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
              <Search size={16} color={currColors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: currColors.text }]}
                placeholder="Search banks, wallets, brokers..."
                placeholderTextColor={currColors.textSecondary}
                value={brandSearchQuery}
                onChangeText={setBrandSearchQuery}
                clearButtonMode="while-editing"
                autoCorrect={false}
              />
              {Boolean(brandSearchQuery) && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setBrandSearchQuery('');
                  }}
                  style={{ padding: 4 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color={currColors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Custom Logo Generator Card on Search */}
          {brandSearchQuery.trim().length > 0 && (
            <TouchableOpacity
              style={[styles.customBadgeCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
              onPress={() => {
                handleHaptic();
                const customId = `custom:${brandSearchQuery.trim()}`;
                setLogo(customId);
                setColor(getCustomBrandColor(brandSearchQuery.trim()));
                setIsLogoManuallySelected(true);
                setShowLogoModal(false);
                setBrandSearchQuery('');
              }}
              activeOpacity={0.7}
            >
              <BankLogo logo={`custom:${brandSearchQuery.trim()}`} size={32} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.itemTitle, { color: currColors.text }]} numberOfLines={1}>
                  Create badge: "{brandSearchQuery.trim()}"
                </ThemedText>
                <ThemedText style={{ fontSize: 11, color: currColors.textSecondary, marginTop: 2, fontFamily: 'Outfit_400Regular' }}>
                  Use this custom name as a branded badge
                </ThemedText>
              </View>
              <Check size={16} color="#00C9A7" />
            </TouchableOpacity>
          )}

          <FlatList
            data={filteredBrands}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              !brandSearchQuery.trim() ? (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    handleHaptic();
                    setLogo('');
                    setIsLogoManuallySelected(true);
                    setShowLogoModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.noLogoCircle, { backgroundColor: currColors.cardSecondary }]}>
                      <ThemedText style={{ fontSize: 10, color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' }}>
                        NONE
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.itemTitle, { color: currColors.textSecondary }]}>
                      No Specific Brand (Default)
                    </ThemedText>
                  </View>
                  {!logo && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                </TouchableOpacity>
              ) : null
            }
            renderItem={({ item }) => {
              const isSelected = logo.toLowerCase() === item.id.toLowerCase();
              return (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    handleHaptic();
                    setLogo(item.id);
                    setColor(item.color);
                    setIsLogoManuallySelected(true);
                    setShowLogoModal(false);
                    setBrandSearchQuery('');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <BankLogo logo={item.id} size={32} style={{ marginRight: 12 }} />
                    <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>{item.name}</ThemedText>
                  </View>
                  {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* BROKER SELECTION MODAL */}
      <Modal
        visible={showBrokerModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setShowBrokerModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View
            style={[
              styles.modalHeader,
              {
                paddingTop: headerTopPadding,
                borderBottomColor: currColors.border,
                backgroundColor: currColors.background,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                setShowBrokerModal(false);
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
              Link Broker
            </ThemedText>

            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                setShowBrokerModal(false);
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

          <FlatList
            data={['None (Manual Balance)', ...availableBrokers]}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = item === 'None (Manual Balance)' ? !linkedBroker : linkedBroker === item;
              return (
                <TouchableOpacity
                  style={[styles.listItem, { borderBottomColor: currColors.border }]}
                  onPress={() => {
                    handleHaptic();
                    setLinkedBroker(item === 'None (Manual Balance)' ? '' : item);
                    setShowBrokerModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>{item}</ThemedText>
                  {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* ICON PICKER MODAL (3D Icons for Receivable/Payable) */}
      <Modal
        visible={showIconModal}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setShowIconModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View
            style={[
              styles.modalHeader,
              {
                paddingTop: headerTopPadding,
                borderBottomColor: currColors.border,
                backgroundColor: currColors.background,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                setShowIconModal(false);
                setIconSearchQuery('');
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
              Account Icon
            </ThemedText>

            <TouchableOpacity
              onPress={() => {
                handleHaptic();
                setShowIconModal(false);
                setIconSearchQuery('');
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

          {/* Search */}
          <View style={[styles.iconSearchBar, { backgroundColor: currColors.cardSecondary }]}>
            <Search size={16} color={currColors.textSecondary} />
            <TextInput
              style={[styles.iconSearchInput, { color: currColors.text }]}
              placeholder="Search icons (people, money, star, fire)..."
              placeholderTextColor={currColors.textSecondary}
              value={iconSearchQuery}
              onChangeText={setIconSearchQuery}
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
            {Boolean(iconSearchQuery) && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIconSearchQuery('');
                }}
                style={{ padding: 4 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} color={currColors.textSecondary} />
              </TouchableOpacity>
            )}
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
                  No icons found for "{iconSearchQuery}"
                </ThemedText>
              </View>
            ) : (
              <View style={styles.gridRowWrap}>
                {filteredIcons.map((item) => {
                  const isSelected = iconId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.iconTile,
                        { backgroundColor: currColors.card, borderColor: currColors.border },
                        isSelected && [
                          styles.iconTileSelected,
                          { borderColor: '#00C9A7', backgroundColor: colorScheme === 'dark' ? '#00C9A722' : '#00C9A714' },
                        ],
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        handleHaptic();
                        setIconId(item.id);
                        setShowIconModal(false);
                        setIconSearchQuery('');
                      }}
                    >
                      <Category3DIcon name={item.id} icon={item.id} size={36} />
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
    paddingHorizontal: 2,
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
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  typeIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  brandBadge: {
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  searchBarContainer: {
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
  typeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  // Icon Picker Grid
  iconSearchBar: {
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  iconSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
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
});
