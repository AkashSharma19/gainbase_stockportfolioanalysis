import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X, Check, Plus } from 'lucide-react-native';
import { Account } from '@/types/money';
import { useMoneyStore } from '@/store/useMoneyStore';
import { ThemedText } from '@/components/ThemedText';
import {
  AccountLogoOrIcon,
  ACCOUNT_SECTION_ORDER,
  getAccountTypeSection,
} from '@/components/AccountLogoOrIcon';
import { formatCurrencyINR } from '@/utils/formatters';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export interface AccountPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAccount: (account: Account) => void;
  selectedAccountId?: string;
  title?: string;
  filterAccounts?: (account: Account) => boolean;
  showAddAccountButton?: boolean;
  onAddNewAccount?: () => void;
}

export function AccountPickerModal({
  visible,
  onClose,
  onSelectAccount,
  selectedAccountId,
  title = 'Choose Account',
  filterAccounts,
  showAddAccountButton = true,
  onAddNewAccount,
}: AccountPickerModalProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const accounts = useMoneyStore((state) => state.accounts);
  const [searchQuery, setSearchQuery] = useState('');

  const activeAccounts = useMemo(() => {
    let list = accounts.filter((a) => !a.isArchived);
    if (filterAccounts) {
      list = list.filter(filterAccounts);
    }
    return list;
  }, [accounts, filterAccounts]);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return activeAccounts;
    const q = searchQuery.toLowerCase().trim();
    return activeAccounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.institution && a.institution.toLowerCase().includes(q)) ||
        (a.accountNumber && a.accountNumber.includes(q)) ||
        a.type.toLowerCase().includes(q)
    );
  }, [activeAccounts, searchQuery]);

  const groupedAccounts = useMemo(() => {
    const map: Record<string, Account[]> = {};
    for (const acc of filteredAccounts) {
      const sec = getAccountTypeSection(acc.type);
      if (!map[sec]) map[sec] = [];
      map[sec].push(acc);
    }

    const sections: { title: string; data: Account[] }[] = [];
    for (const secName of ACCOUNT_SECTION_ORDER) {
      if (map[secName] && map[secName].length > 0) {
        sections.push({ title: secName, data: map[secName] });
      }
    }
    return sections;
  }, [filteredAccounts]);

  const handleClose = () => {
    onClose();
    setSearchQuery('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.accountModalContainer,
          {
            backgroundColor: currColors.background,
            paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24),
          },
        ]}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* Header */}
        <View style={styles.accountModalHeader}>
          <TouchableOpacity
            style={[styles.modalCircularBtn, { backgroundColor: currColors.cardSecondary }]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <X size={20} color={currColors.text} strokeWidth={2.2} />
          </TouchableOpacity>

          <ThemedText style={[styles.accountModalTitle, { color: currColors.text }]}>
            {title}
          </ThemedText>

          <TouchableOpacity
            style={[styles.modalCircularBtn, { backgroundColor: currColors.tintMoney }]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.accountSearchWrapper,
            { backgroundColor: currColors.card, borderColor: currColors.border },
          ]}
        >
          <Search size={15} color={currColors.textSecondary} />
          <TextInput
            style={[styles.accountSearchInput, { color: currColors.text }]}
            placeholder="Search account..."
            placeholderTextColor={currColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {Boolean(searchQuery) && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <X size={14} color={currColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Grouped Account List */}
        <ScrollView
          style={styles.accountModalScroll}
          contentContainerStyle={styles.accountModalScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {groupedAccounts.length === 0 ? (
            <View style={styles.accountEmptyState}>
              <ThemedText style={{ color: currColors.textSecondary, fontSize: 14 }}>
                No accounts found
              </ThemedText>
            </View>
          ) : (
            groupedAccounts.map((section) => (
              <View key={section.title} style={styles.accountSectionBlock}>
                <ThemedText
                  style={[styles.accountSectionTitle, { color: currColors.textSecondary }]}
                >
                  {section.title}
                </ThemedText>

                <View style={styles.accountSectionCards}>
                  {section.data.map((item) => {
                    const isSelected = selectedAccountId === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.accountCardItem,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? '#00C9A718'
                                : '#00C9A70E'
                              : currColors.card,
                            borderColor: isSelected ? currColors.tintMoney : currColors.border,
                            borderWidth: isSelected ? 1.5 : 1,
                          },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onSelectAccount(item);
                          handleClose();
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.accountCardLeft}>
                          <AccountLogoOrIcon account={item} variant="card" />
                          <View style={styles.accountCardInfo}>
                            <ThemedText
                              style={[styles.accountCardName, { color: currColors.text }]}
                              numberOfLines={1}
                            >
                              {item.name}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.accountCardSubtitle,
                                { color: currColors.textSecondary },
                              ]}
                              numberOfLines={1}
                            >
                              {item.institution ||
                                item.accountNumber ||
                                (item.type === 'wallet'
                                  ? 'Cash Wallet'
                                  : item.type.replace('_', ' ').toUpperCase())}
                            </ThemedText>
                          </View>
                        </View>

                        <ThemedText
                          style={[styles.accountCardBalance, { color: currColors.text }]}
                        >
                          {formatCurrencyINR(item.balance, true, 0)}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Bottom Add Account Pill Button with smooth gradient backdrop */}
        {showAddAccountButton && (
          <LinearGradient
            colors={[
              currColors.background + '00',
              currColors.background + 'D9',
              currColors.background,
            ]}
            locations={[0, 0.45, 0.85]}
            style={[
              styles.accountBottomActionWrap,
              { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 16) },
            ]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={[
                styles.accountBottomPillBtn,
                {
                  backgroundColor: isDark ? '#1C1E22' : '#FFFFFF',
                  borderColor: isDark ? '#2E3238' : '#DCE0E8',
                },
              ]}
              onPress={() => {
                handleClose();
                if (onAddNewAccount) {
                  onAddNewAccount();
                } else {
                  router.push('/add-account');
                }
              }}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.plusIconBadge,
                  { backgroundColor: isDark ? '#00C9A722' : '#00876E18' },
                ]}
              >
                <Plus size={13} color={currColors.tintMoney} strokeWidth={2.6} />
              </View>
              <ThemedText style={[styles.accountBottomPillText, { color: currColors.text }]}>
                Add new account
              </ThemedText>
            </TouchableOpacity>
          </LinearGradient>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  accountModalContainer: {
    flex: 1,
  },
  accountModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  modalCircularBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountModalTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  accountSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  accountSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  accountModalScroll: {
    flex: 1,
  },
  accountModalScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  accountSectionBlock: {
    marginBottom: 20,
  },
  accountSectionTitle: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  accountSectionCards: {
    gap: 8,
  },
  accountCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  accountCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  accountCardInfo: {
    flex: 1,
  },
  accountCardName: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  accountCardSubtitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  accountCardBalance: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  accountEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  accountBottomActionWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
  },
  accountBottomPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 18,
    borderRadius: 24,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  plusIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  accountBottomPillText: {
    fontSize: 13.5,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.2,
  },
});
