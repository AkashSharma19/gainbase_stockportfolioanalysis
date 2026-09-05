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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [isLogoManuallySelected, setIsLogoManuallySelected] = useState(false);
  const [includeInAssets, setIncludeInAssets] = useState(true);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
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

  const handleSave = () => {
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
        includeInAssets,
        linkedBroker: type === 'investment' ? (linkedBroker || undefined) : undefined,
      });
    } else {
      const newAccount: Account = {
        id: Math.random().toString(36).substring(2, 9),
        name: name.trim(),
        type,
        icon: type === 'wallet' ? 'Wallet' : type === 'savings' ? 'Landmark' : type === 'investment' ? 'Activity' : 'CreditCard',
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
            {editingAccount ? 'Edit Account' : 'Add Account'}
          </ThemedText>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <ThemedText style={[styles.headerButtonText, styles.saveButtonText, { color: currColors.tint }]}>
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
                <View style={styles.amountInputRow}>
                  <ThemedText style={[styles.currencyPrefix, { color: currColors.text }]}>₹</ThemedText>
                  <TextInput
                    style={[styles.input, { color: currColors.text }]}
                    placeholder="0"
                    placeholderTextColor={currColors.textSecondary}
                    value={balance}
                    onChangeText={(val) => setBalance(formatIndianAmount(val))}
                    keyboardType="decimal-pad"
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Credit Limit Row (Credit Card Only) */}
              {type === 'credit_card' ? (
                <View style={[styles.formRow, { borderBottomColor: currColors.border }]}>
                  <ThemedText style={[styles.label, { color: currColors.text }]}>Total Credit Limit</ThemedText>
                  <View style={styles.amountInputRow}>
                    <ThemedText style={[styles.currencyPrefix, { color: currColors.text }]}>₹</ThemedText>
                    <TextInput
                      style={[styles.input, { color: currColors.text }]}
                      placeholder="0"
                      placeholderTextColor={currColors.textSecondary}
                      value={creditLimit}
                      onChangeText={(val) => setCreditLimit(formatIndianAmount(val))}
                      keyboardType="decimal-pad"
                      textAlign="right"
                    />
                  </View>
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
      </SafeAreaView>

      {/* ACCOUNT TYPE SELECTION MODAL */}
      <Modal visible={showTypeModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Account Type</ThemedText>
            <TouchableOpacity onPress={() => setShowTypeModal(false)} style={styles.modalCloseButton}>
              <X size={20} color={currColors.text} />
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
                    setType(item.type);
                    setShowTypeModal(false);
                  }}
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
      <Modal visible={showLogoModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Select Bank / Brand</ThemedText>
            <TouchableOpacity onPress={() => setShowLogoModal(false)} style={styles.modalCloseButton}>
              <X size={20} color={currColors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBarContainer, { backgroundColor: currColors.cardSecondary }]}>
            <Search size={16} color={currColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: currColors.text }]}
              placeholder="Search banks, wallets, brokers..."
              placeholderTextColor={currColors.textSecondary}
              value={brandSearchQuery}
              onChangeText={setBrandSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Custom Logo Generator Card on Search */}
          {brandSearchQuery.trim().length > 0 && (
            <TouchableOpacity
              style={[styles.customBadgeCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}
              onPress={() => {
                const customId = `custom:${brandSearchQuery.trim()}`;
                setLogo(customId);
                setColor(getCustomBrandColor(brandSearchQuery.trim()));
                setIsLogoManuallySelected(true);
                setShowLogoModal(false);
                setBrandSearchQuery('');
              }}
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
                    setLogo('');
                    setIsLogoManuallySelected(true);
                    setShowLogoModal(false);
                  }}
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
                    setLogo(item.id);
                    setColor(item.color);
                    setIsLogoManuallySelected(true);
                    setShowLogoModal(false);
                    setBrandSearchQuery('');
                  }}
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
      <Modal visible={showBrokerModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: currColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>Link Portfolio Broker</ThemedText>
            <TouchableOpacity onPress={() => setShowBrokerModal(false)} style={styles.modalCloseButton}>
              <X size={20} color={currColors.text} />
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
                    setLinkedBroker(item === 'None (Manual Balance)' ? '' : item);
                    setShowBrokerModal(false);
                  }}
                >
                  <ThemedText style={[styles.itemTitle, { color: currColors.text }]}>{item}</ThemedText>
                  {isSelected && <Check size={18} color="#00C9A7" strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
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
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  currencyPrefix: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    marginRight: 4,
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
    padding: 16,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
  },
  modalCloseButton: {
    padding: 4,
  },
  searchBarContainer: {
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
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
});
