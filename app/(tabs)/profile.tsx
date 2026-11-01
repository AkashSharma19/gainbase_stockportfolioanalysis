import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronRight,
  Cloud,
  Database,
  Download,
  Edit2,
  FileText,
  MessageSquare,
  Phone,
  Settings,
  Tag,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Wallet,
  X,
} from 'lucide-react-native';
import { useMoneyStore } from '@/store/useMoneyStore';
import { AccountType, Account, Loan, EMIPayment, Budget } from '../../types/money';
import { Subscription, SubscriptionPayment } from '../../types/money';


import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { VersionCheckFooter } from '@/components/VersionCheckFooter';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';

function ProfileDrawerSheet({
  visible,
  onClose,
  children,
  isDark,
  cardBg,
  borderColor,
  bottomPadding,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  bottomPadding: number;
}) {
  const [showModal, setShowModal] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
  }, [visible, anim]);

  if (!showModal) return null;

  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const sheetTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <Modal
      visible={showModal}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.45)',
              opacity: backdropOpacity,
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', justifyContent: 'flex-end' }}
        >
          <Animated.View
            style={[
              styles.modalSheetContainer,
              {
                backgroundColor: cardBg,
                borderColor: borderColor,
                paddingBottom: bottomPadding,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  const importTransactions = usePortfolioStore(
    (state) => state.importTransactions,
  );
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const togglePrivacyMode = usePortfolioStore((state) => state.togglePrivacyMode);
  const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
  const userName = usePortfolioStore((state) => state.userName);
  const userEmail = usePortfolioStore((state) => state.userEmail);
  const userMobile = usePortfolioStore((state) => state.userMobile);
  const userImage = usePortfolioStore((state) => state.userImage);
  const updateProfile = usePortfolioStore((state) => state.updateProfile);
  const theme = usePortfolioStore((state) => state.theme);
  const setTheme = usePortfolioStore((state) => state.setTheme);
  const showCurrencySymbol = usePortfolioStore(
    (state) => state.showCurrencySymbol,
  );
  const clearAllData = usePortfolioStore((state) => state.clearAllData);

  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [dataSheetType, setDataSheetType] = useState<'investments' | 'money_manager' | null>(null);

  // Modal Edit State
  const [editName, setEditName] = useState(userName);
  const [editEmail, setEditEmail] = useState(userEmail);
  const [editMobile, setEditMobile] = useState(userMobile);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const storeCategories = useMoneyStore((state) => state.categories) || {
    income: [],
    expense: [],
  };



  const moneyTransactions = useMoneyStore((state) => state.moneyTransactions);
  const moneyAccounts = useMoneyStore((state) => state.accounts);
  const getNetWorth = useMoneyStore((state) => state.getNetWorth);
  const moneyLoans = useMoneyStore((state) => state.loans);
  const moneyBudgets = useMoneyStore((state) => state.budgets);
  const moneyEmiPayments = useMoneyStore((state) => state.emiPayments);
  const subscriptions: Subscription[] = useMoneyStore((state) => state.subscriptions) || [];
  const subscriptionPayments: SubscriptionPayment[] = useMoneyStore((state) => state.subscriptionPayments) || [];
  const importMoneyData = useMoneyStore((state) => state.importMoneyData);
  const restoreMoneyData = useMoneyStore((state) => state.restoreMoneyData);
  const clearAllMoneyData = useMoneyStore((state) => state.clearAllMoneyData);



  const handleDownloadMoneySample = async () => {
    try {
      // 1. Transactions Sample Sheet
      const sampleTransactions = [
        {
          Date: '2026-07-01',
          Type: 'EXPENSE',
          Amount: 450.0,
          Category: 'Food & Dining',
          Account: 'HDFC Savings Account',
          'To Account (Transfers only)': '',
          Note: 'Dinner with colleagues',
        },
        {
          Date: '2026-07-02',
          Type: 'INCOME',
          Amount: 85000.0,
          Category: 'Salary',
          Account: 'HDFC Savings Account',
          'To Account (Transfers only)': '',
          Note: 'Monthly Salary Credit',
        },
        {
          Date: '2026-07-03',
          Type: 'TRANSFER',
          Amount: 15000.0,
          Category: 'Transfer',
          Account: 'HDFC Savings Account',
          'To Account (Transfers only)': 'Emergency Reserve',
          Note: 'Monthly Emergency Fund Allocation',
        },
        {
          Date: '2026-07-05',
          Type: 'EXPENSE',
          Amount: 1499.0,
          Category: 'Subscriptions',
          Account: 'ICICI Credit Card',
          'To Account (Transfers only)': '',
          Note: 'Broadband Wifi Bill',
        },
      ];

      // 2. Accounts Sample Sheet
      const sampleAccounts = [
        {
          'Account Name': 'HDFC Savings Account',
          Type: 'savings',
          Balance: 125000.0,
          Icon: 'landmark',
          Color: '#007AFF',
          Institution: 'HDFC Bank',
          'Account Number': '•••• 4821',
          'Credit Limit': 0,
          'Interest Rate': 3.5,
          'Include In Assets': 'YES',
          'Linked Broker': '',
        },
        {
          'Account Name': 'ICICI Credit Card',
          Type: 'credit_card',
          Balance: -12450.0,
          Icon: 'credit_card',
          Color: '#FF9500',
          Institution: 'ICICI Bank',
          'Account Number': '•••• 9934',
          'Credit Limit': 250000.0,
          'Interest Rate': 0,
          'Include In Assets': 'YES',
          'Linked Broker': '',
        },
        {
          'Account Name': 'Cash Wallet',
          Type: 'wallet',
          Balance: 4500.0,
          Icon: 'wallet',
          Color: '#34C759',
          Institution: 'Cash',
          'Account Number': '',
          'Credit Limit': 0,
          'Interest Rate': 0,
          'Include In Assets': 'YES',
          'Linked Broker': '',
        },
        {
          'Account Name': 'Zerodha Trading',
          Type: 'investment',
          Balance: 340000.0,
          Icon: 'trending_up',
          Color: '#5856D6',
          Institution: 'Zerodha',
          'Account Number': 'ZR8821',
          'Credit Limit': 0,
          'Interest Rate': 0,
          'Include In Assets': 'YES',
          'Linked Broker': 'Zerodha',
        },
        {
          'Account Name': 'Emergency Reserve',
          Type: 'emergency_fund',
          Balance: 150000.0,
          Icon: 'shield_check',
          Color: '#00C9A7',
          Institution: 'SBI Bank',
          'Account Number': '•••• 1102',
          'Credit Limit': 0,
          'Interest Rate': 6.8,
          'Include In Assets': 'YES',
          'Linked Broker': '',
        },
      ];

      // 3. Loans Sample Sheet
      const sampleLoans = [
        {
          'Loan Name': 'Home Loan',
          'Lender Name': 'SBI Home Finance',
          Principal: 4500000.0,
          Outstanding: 3850000.0,
          'Interest Rate': 8.5,
          'EMI Amount': 39050.0,
          'Tenure Months': 240,
          'Start Date': '2023-01-10',
          'End Date': '2043-01-10',
          'Linked Account': 'HDFC Savings Account',
          Type: 'home',
          'Is Active': 'YES',
        },
        {
          'Loan Name': 'Car Loan',
          'Lender Name': 'HDFC Auto Loans',
          Principal: 800000.0,
          Outstanding: 420000.0,
          'Interest Rate': 8.9,
          'EMI Amount': 16500.0,
          'Tenure Months': 60,
          'Start Date': '2023-06-15',
          'End Date': '2028-06-15',
          'Linked Account': 'HDFC Savings Account',
          Type: 'car',
          'Is Active': 'YES',
        },
      ];

      // 4. EMI Payments Sample Sheet
      const sampleEmis = [
        {
          'Loan Name': 'Home Loan',
          Amount: 39050.0,
          'Principal Portion': 11800.0,
          'Interest Portion': 27250.0,
          Date: '2026-06-10',
          Status: 'PAID',
        },
        {
          'Loan Name': 'Car Loan',
          Amount: 16500.0,
          'Principal Portion': 13385.0,
          'Interest Portion': 3115.0,
          Date: '2026-06-15',
          Status: 'PAID',
        },
      ];

      // 5. Subscriptions Sample Sheet
      const sampleSubscriptions = [
        {
          Name: 'Netflix Premium 4K',
          Provider: 'Netflix',
          Amount: 649.0,
          'Billing Cycle': 'monthly',
          'Next Payment Date': '2026-08-01',
          Color: '#E50914',
          Logo: 'tv',
          'Linked Account': 'ICICI Credit Card',
          Category: 'Entertainment',
          'Is Active': 'YES',
        },
        {
          Name: 'Spotify Duo',
          Provider: 'Spotify',
          Amount: 149.0,
          'Billing Cycle': 'monthly',
          'Next Payment Date': '2026-08-10',
          Color: '#1DB954',
          Logo: 'music',
          'Linked Account': 'ICICI Credit Card',
          Category: 'Entertainment',
          'Is Active': 'YES',
        },
      ];

      // 6. Subscription Payments Sample Sheet
      const sampleSubPayments = [
        {
          'Subscription Name': 'Netflix Premium 4K',
          Amount: 649.0,
          Date: '2026-07-01',
          Status: 'PAID',
        },
      ];

      // 7. Budgets Sample Sheet
      const sampleBudgets = [
        {
          'Budget Name': 'Monthly Living Expenses',
          Period: 'monthly',
          'Start Date': '2026-07-01',
          'End Date': '2026-07-31',
          'Total Limit': 45000.0,
          'Category Name': 'Food & Dining',
          'Category Icon': 'food',
          'Category Color': '#FF9500',
          'Category Limit': 15000.0,
          'Category Spent': 450.0,
          'Is Active': 'YES',
        },
        {
          'Budget Name': 'Monthly Living Expenses',
          Period: 'monthly',
          'Start Date': '2026-07-01',
          'End Date': '2026-07-31',
          'Total Limit': 45000.0,
          'Category Name': 'Shopping',
          'Category Icon': 'shopping',
          'Category Color': '#5856D6',
          'Category Limit': 10000.0,
          'Category Spent': 0.0,
          'Is Active': 'YES',
        },
      ];

      // 8. Categories Sample Sheet
      const sampleCategories = [
        { Type: 'INCOME', 'Category Name': 'Salary' },
        { Type: 'INCOME', 'Category Name': 'Investments' },
        { Type: 'INCOME', 'Category Name': 'Freelance' },
        { Type: 'EXPENSE', 'Category Name': 'Food & Dining' },
        { Type: 'EXPENSE', 'Category Name': 'Shopping' },
        { Type: 'EXPENSE', 'Category Name': 'Rent & Utilities' },
        { Type: 'EXPENSE', 'Category Name': 'Transport' },
        { Type: 'EXPENSE', 'Category Name': 'EMI Payments' },
        { Type: 'EXPENSE', 'Category Name': 'Subscriptions' },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sampleTransactions), 'Transactions');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sampleAccounts), 'Accounts');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sampleLoans), 'Loans');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sampleEmis), 'EMIPayments');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sampleSubscriptions), 'Subscriptions');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sampleSubPayments), 'SubscriptionPayments');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sampleBudgets), 'Budgets');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sampleCategories), 'Categories');

      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const filename = `Gainbase_Money_Manager_Sample_Template.xlsx`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Download Money Manager Template',
          UTI: 'com.microsoft.excel.xlsx',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Money Sample Download Error:', error);
      Alert.alert('Error', 'Failed to generate sample template.');
    }
  };

  const handleExportMoney = async () => {
    if (moneyTransactions.length === 0 && moneyAccounts.length === 0) {
      Alert.alert('No Data', 'There is no data to export.');
      return;
    }

    try {
      const accountMap = new Map(moneyAccounts.map((a) => [a.id, a.name]));

      // 1. Transactions
      const txsSheetData = moneyTransactions.map((tx) => ({
        Date: tx.date.split('T')[0],
        Type: tx.type.toUpperCase(),
        Amount: tx.amount,
        Category: tx.category,
        Account: accountMap.get(tx.accountId) || 'Unknown Account',
        'To Account (Transfers only)': tx.toAccountId ? accountMap.get(tx.toAccountId) || 'Unknown Account' : '',
        Note: tx.note || '',
      }));
      const worksheetTxs = XLSX.utils.json_to_sheet(txsSheetData);

      // 2. Accounts
      const accsSheetData = moneyAccounts.map((a) => ({
        'Account Name': a.name,
        Type: a.type,
        Balance: a.balance,
        Icon: a.icon || 'wallet',
        Color: a.color || '#007AFF',
        Institution: a.institution || '',
        'Account Number': a.accountNumber || '',
        'Credit Limit': a.creditLimit || 0,
        'Interest Rate': a.interestRate || 0,
        'Include In Assets': a.includeInAssets !== false ? 'YES' : 'NO',
        'Linked Broker': a.linkedBroker || '',
      }));
      const worksheetAccs = XLSX.utils.json_to_sheet(accsSheetData);

      // 3. Loans
      const loansSheetData = moneyLoans.map((l) => ({
        'Loan Name': l.name,
        'Lender Name': l.lenderName,
        Principal: l.principalAmount,
        Outstanding: l.outstandingAmount,
        'Interest Rate': l.interestRate,
        'EMI Amount': l.emiAmount,
        'Tenure Months': l.tenureMonths,
        'Start Date': l.startDate.split('T')[0],
        'End Date': l.endDate.split('T')[0],
        'Linked Account': l.linkedAccountId ? accountMap.get(l.linkedAccountId) || '' : '',
        Type: l.type,
        'Is Active': l.isActive ? 'YES' : 'NO',
      }));
      const worksheetLoans = XLSX.utils.json_to_sheet(loansSheetData);

      // 4. EMI Payments
      const loanMap = new Map(moneyLoans.map((l) => [l.id, l.name]));
      const emiSheetData = moneyEmiPayments.map((p) => ({
        'Loan Name': loanMap.get(p.loanId) || 'Unknown Loan',
        Amount: p.amount,
        'Principal Portion': p.principalPortion,
        'Interest Portion': p.interestPortion,
        Date: p.date.split('T')[0],
        Status: p.status.toUpperCase(),
      }));
      const worksheetEmi = XLSX.utils.json_to_sheet(emiSheetData);

      // 5. Subscriptions
      const subscriptionsSheetData = subscriptions.map((s: Subscription) => ({
        Name: s.name,
        Provider: s.provider || '',
        Amount: s.amount,
        'Billing Cycle': s.billingCycle,
        'Next Payment Date': s.nextPaymentDate ? s.nextPaymentDate.split('T')[0] : '',
        Color: s.color || '#00C9A7',
        Logo: s.logo || s.icon || '',
        'Linked Account': s.linkedAccountId ? accountMap.get(s.linkedAccountId) || '' : '',
        Category: s.category || '',
        'Is Active': s.isActive ? 'YES' : 'NO',
      }));
      const worksheetSubscriptions = XLSX.utils.json_to_sheet(subscriptionsSheetData);

      // 6. Subscription Payments
      const subMap = new Map(subscriptions.map((s: Subscription) => [s.id, s.name]));
      const subPaymentsSheetData = subscriptionPayments.map((p: SubscriptionPayment) => ({
        'Subscription Name': subMap.get(p.subscriptionId) || 'Unknown Subscription',
        Amount: p.amount,
        Date: p.date.split('T')[0],
        Status: p.status.toUpperCase(),
      }));
      const worksheetSubPayments = XLSX.utils.json_to_sheet(subPaymentsSheetData);

      // 7. Budgets
      const budgetsSheetData: any[] = [];
      moneyBudgets.forEach((b) => {
        if (b.categories.length === 0) {
          budgetsSheetData.push({
            'Budget Name': b.name,
            Period: b.period,
            'Start Date': b.startDate.split('T')[0],
            'End Date': b.endDate.split('T')[0],
            'Total Limit': b.totalLimit,
            'Category Name': '',
            'Category Icon': '',
            'Category Color': '',
            'Category Limit': 0,
            'Category Spent': 0,
            'Is Active': b.isActive ? 'YES' : 'NO',
          });
        } else {
          b.categories.forEach((cat) => {
            budgetsSheetData.push({
              'Budget Name': b.name,
              Period: b.period,
              'Start Date': b.startDate.split('T')[0],
              'End Date': b.endDate.split('T')[0],
              'Total Limit': b.totalLimit,
              'Category Name': cat.name,
              'Category Icon': cat.icon,
              'Category Color': cat.color,
              'Category Limit': cat.limit,
              'Category Spent': cat.spent,
              'Is Active': b.isActive ? 'YES' : 'NO',
            });
          });
        }
      });
      const worksheetBudgets = XLSX.utils.json_to_sheet(budgetsSheetData);

      // 8. Categories
      const categoriesSheetData: any[] = [];
      (storeCategories.income || []).forEach((name) => {
        categoriesSheetData.push({ Type: 'INCOME', 'Category Name': name });
      });
      (storeCategories.expense || []).forEach((name) => {
        categoriesSheetData.push({ Type: 'EXPENSE', 'Category Name': name });
      });
      const worksheetCategories = XLSX.utils.json_to_sheet(categoriesSheetData);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheetTxs, 'Transactions');
      XLSX.utils.book_append_sheet(workbook, worksheetAccs, 'Accounts');
      XLSX.utils.book_append_sheet(workbook, worksheetLoans, 'Loans');
      XLSX.utils.book_append_sheet(workbook, worksheetEmi, 'EMIPayments');
      XLSX.utils.book_append_sheet(workbook, worksheetSubscriptions, 'Subscriptions');
      XLSX.utils.book_append_sheet(workbook, worksheetSubPayments, 'SubscriptionPayments');
      XLSX.utils.book_append_sheet(workbook, worksheetBudgets, 'Budgets');
      XLSX.utils.book_append_sheet(workbook, worksheetCategories, 'Categories');

      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const filename = `Gainbase_Money_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Export Money Manager Data',
          UTI: 'com.microsoft.excel.xlsx',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Money Export Error:', error);
      Alert.alert('Export Failed', 'An error occurred while exporting money data.');
    }
  };

  const handleBackupMoney = async () => {
    if (moneyTransactions.length === 0 && moneyAccounts.length === 0) {
      Alert.alert('No Data', 'There is no data to backup.');
      return;
    }

    try {
      const accountMap = new Map(moneyAccounts.map((a) => [a.id, a.name]));

      // 1. Transactions
      const txsSheetData = moneyTransactions.map((tx) => ({
        Date: tx.date.split('T')[0],
        Type: tx.type.toUpperCase(),
        Amount: tx.amount,
        Category: tx.category,
        Account: accountMap.get(tx.accountId) || 'Unknown Account',
        'To Account (Transfers only)': tx.toAccountId ? accountMap.get(tx.toAccountId) || 'Unknown Account' : '',
        Note: tx.note || '',
      }));
      const worksheetTxs = XLSX.utils.json_to_sheet(txsSheetData);

      // 2. Accounts
      const accsSheetData = moneyAccounts.map((a) => ({
        'Account Name': a.name,
        Type: a.type,
        Balance: a.balance,
        Icon: a.icon || 'wallet',
        Color: a.color || '#007AFF',
        Institution: a.institution || '',
        'Account Number': a.accountNumber || '',
        'Credit Limit': a.creditLimit || 0,
        'Interest Rate': a.interestRate || 0,
        'Include In Assets': a.includeInAssets !== false ? 'YES' : 'NO',
        'Linked Broker': a.linkedBroker || '',
      }));
      const worksheetAccs = XLSX.utils.json_to_sheet(accsSheetData);

      // 3. Loans
      const loansSheetData = moneyLoans.map((l) => ({
        'Loan Name': l.name,
        'Lender Name': l.lenderName,
        Principal: l.principalAmount,
        Outstanding: l.outstandingAmount,
        'Interest Rate': l.interestRate,
        'EMI Amount': l.emiAmount,
        'Tenure Months': l.tenureMonths,
        'Start Date': l.startDate.split('T')[0],
        'End Date': l.endDate.split('T')[0],
        'Linked Account': l.linkedAccountId ? accountMap.get(l.linkedAccountId) || '' : '',
        Type: l.type,
        'Is Active': l.isActive ? 'YES' : 'NO',
      }));
      const worksheetLoans = XLSX.utils.json_to_sheet(loansSheetData);

      // 4. EMI Payments
      const loanMap = new Map(moneyLoans.map((l) => [l.id, l.name]));
      const emiSheetData = moneyEmiPayments.map((p) => ({
        'Loan Name': loanMap.get(p.loanId) || 'Unknown Loan',
        Amount: p.amount,
        'Principal Portion': p.principalPortion,
        'Interest Portion': p.interestPortion,
        Date: p.date.split('T')[0],
        Status: p.status.toUpperCase(),
      }));
      const worksheetEmi = XLSX.utils.json_to_sheet(emiSheetData);

      // 5. Subscriptions
      const subscriptionsSheetData = subscriptions.map((s: Subscription) => ({
        Name: s.name,
        Provider: s.provider || '',
        Amount: s.amount,
        'Billing Cycle': s.billingCycle,
        'Next Payment Date': s.nextPaymentDate ? s.nextPaymentDate.split('T')[0] : '',
        Color: s.color || '#00C9A7',
        Logo: s.logo || s.icon || '',
        'Linked Account': s.linkedAccountId ? accountMap.get(s.linkedAccountId) || '' : '',
        Category: s.category || '',
        'Is Active': s.isActive ? 'YES' : 'NO',
      }));
      const worksheetSubscriptions = XLSX.utils.json_to_sheet(subscriptionsSheetData);

      // 6. Subscription Payments
      const subMap = new Map(subscriptions.map((s: Subscription) => [s.id, s.name]));
      const subPaymentsSheetData = subscriptionPayments.map((p: SubscriptionPayment) => ({
        'Subscription Name': subMap.get(p.subscriptionId) || 'Unknown Subscription',
        Amount: p.amount,
        Date: p.date.split('T')[0],
        Status: p.status.toUpperCase(),
      }));
      const worksheetSubPayments = XLSX.utils.json_to_sheet(subPaymentsSheetData);

      // 7. Budgets
      const budgetsSheetData: any[] = [];
      moneyBudgets.forEach((b) => {
        if (b.categories.length === 0) {
          budgetsSheetData.push({
            'Budget Name': b.name,
            Period: b.period,
            'Start Date': b.startDate.split('T')[0],
            'End Date': b.endDate.split('T')[0],
            'Total Limit': b.totalLimit,
            'Category Name': '',
            'Category Icon': '',
            'Category Color': '',
            'Category Limit': 0,
            'Category Spent': 0,
            'Is Active': b.isActive ? 'YES' : 'NO',
          });
        } else {
          b.categories.forEach((cat) => {
            budgetsSheetData.push({
              'Budget Name': b.name,
              Period: b.period,
              'Start Date': b.startDate.split('T')[0],
              'End Date': b.endDate.split('T')[0],
              'Total Limit': b.totalLimit,
              'Category Name': cat.name,
              'Category Icon': cat.icon,
              'Category Color': cat.color,
              'Category Limit': cat.limit,
              'Category Spent': cat.spent,
              'Is Active': b.isActive ? 'YES' : 'NO',
            });
          });
        }
      });
      const worksheetBudgets = XLSX.utils.json_to_sheet(budgetsSheetData);

      // 8. Categories
      const categoriesSheetData: any[] = [];
      (storeCategories.income || []).forEach((name) => {
        categoriesSheetData.push({ Type: 'INCOME', 'Category Name': name });
      });
      (storeCategories.expense || []).forEach((name) => {
        categoriesSheetData.push({ Type: 'EXPENSE', 'Category Name': name });
      });
      const worksheetCategories = XLSX.utils.json_to_sheet(categoriesSheetData);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheetTxs, 'Transactions');
      XLSX.utils.book_append_sheet(workbook, worksheetAccs, 'Accounts');
      XLSX.utils.book_append_sheet(workbook, worksheetLoans, 'Loans');
      XLSX.utils.book_append_sheet(workbook, worksheetEmi, 'EMIPayments');
      XLSX.utils.book_append_sheet(workbook, worksheetSubscriptions, 'Subscriptions');
      XLSX.utils.book_append_sheet(workbook, worksheetSubPayments, 'SubscriptionPayments');
      XLSX.utils.book_append_sheet(workbook, worksheetBudgets, 'Budgets');
      XLSX.utils.book_append_sheet(workbook, worksheetCategories, 'Categories');

      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const filename = `Gainbase_Money_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Backup Money Manager Data',
          UTI: 'com.microsoft.excel.xlsx',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Money Backup Error:', error);
      Alert.alert('Backup Failed', 'An error occurred while creating the backup.');
    }
  };

  const handleImportMoney = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/comma-separated-values',
          'application/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name.toLowerCase();
      const isCsv = fileName.endsWith('.csv');

      let accountsDataList: any[] = [];
      let transactionsDataList: any[] = [];
      let loansDataList: any[] = [];
      let budgetsDataList: any[] = [];
      let categoriesDataList: any[] = [];
      let emiDataList: any[] = [];
      let subscriptionsDataList: any[] = [];
      let subPaymentsDataList: any[] = [];

      if (!isCsv) {
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const workbook = XLSX.read(fileContent, { type: 'base64' });

        const getSheetData = (sheetNameSub: string) => {
          const sheetName = workbook.SheetNames.find(
            (name) => name.toLowerCase().includes(sheetNameSub.toLowerCase())
          );
          if (sheetName) {
            return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) || [];
          }
          return [];
        };

        transactionsDataList = getSheetData('transaction') || getSheetData('cashflow') || XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) || [];
        accountsDataList = getSheetData('account');
        loansDataList = getSheetData('loan');
        budgetsDataList = getSheetData('budget');
        categoriesDataList = getSheetData('categor');
        emiDataList = getSheetData('emi');
        subscriptionsDataList = getSheetData('subscription');
        subPaymentsDataList = getSheetData('subscriptionpayment');
      } else {
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const workbook = XLSX.read(fileContent, { type: 'string' });
        transactionsDataList = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) || [];
      }

      if (transactionsDataList.length === 0 && accountsDataList.length === 0 && loansDataList.length === 0 && subscriptionsDataList.length === 0) {
        Alert.alert('Empty File', 'The imported file contains no data.');
        return;
      }

      const ensureISOString = (val: any) => {
        if (!val) return new Date().toISOString();
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'number') {
          const date = new Date((val - 25569) * 86400 * 1000);
          return date.toISOString();
        }
        if (typeof val === 'string') {
          if (!isNaN(Number(val)) && val.trim() !== '') {
            const date = new Date((Number(val) - 25569) * 86400 * 1000);
            return date.toISOString();
          }
          const d = new Date(val);
          if (!isNaN(d.getTime())) return d.toISOString();
        }
        return new Date().toISOString();
      };

      const newCategories: { income: string[]; expense: string[] } = { income: [], expense: [] };
      if (categoriesDataList.length > 0) {
        categoriesDataList.forEach((row: any) => {
          const type = String(row.Type || row.type || '').trim().toLowerCase();
          const catName = String(row['Category Name'] || row.name || '').trim();
          if (catName) {
            if (type.includes('income') || type === 'in') {
              if (!newCategories.income.includes(catName)) newCategories.income.push(catName);
            } else {
              if (!newCategories.expense.includes(catName)) newCategories.expense.push(catName);
            }
          }
        });
      } else {
        newCategories.income = [...storeCategories.income];
        newCategories.expense = [...storeCategories.expense];
      }

      const newAccounts: Account[] = [];
      const accountNameToIdMap = new Map<string, string>();

      if (accountsDataList.length > 0) {
        accountsDataList.forEach((row: any) => {
          const name = String(row['Account Name'] || row.name || row.Account || '').trim();
          const rawType = String(row.Type || row.type || 'wallet').trim().toLowerCase();
          const balance = Number(row.Balance || row.balance || 0);
          const icon = String(row.Icon || row.icon || 'wallet').trim();
          const color = String(row.Color || row.color || '#007AFF').trim();
          const institution = row.Institution || row.institution || undefined;
          const accountNumber = row['Account Number'] || row.accountNumber || undefined;
          const creditLimit = row['Credit Limit'] !== undefined ? Number(row['Credit Limit']) : undefined;
          const interestRate = row['Interest Rate'] !== undefined ? Number(row['Interest Rate']) : undefined;
          const includeInAssets = row['Include In Assets'] !== undefined
            ? String(row['Include In Assets']).trim().toUpperCase() === 'YES'
            : true;
          const linkedBroker = row['Linked Broker'] || row.linkedBroker || undefined;

          if (!name) return;

          let type: AccountType = 'wallet';
          if (rawType.includes('saving')) {
            type = 'savings';
          } else if (rawType.includes('invest')) {
            type = 'investment';
          } else if (rawType.includes('credit') || rawType.includes('card')) {
            type = 'credit_card';
          } else if (rawType.includes('emergency')) {
            type = 'emergency_fund';
          } else if (rawType.includes('receivable')) {
            type = 'receivable';
          } else if (rawType.includes('payable')) {
            type = 'payable';
          } else if (['wallet', 'savings', 'investment', 'credit_card', 'emergency_fund', 'receivable', 'payable'].includes(rawType)) {
            type = rawType as AccountType;
          }

          const id = Math.random().toString(36).substring(2, 9);
          newAccounts.push({
            id,
            name,
            type,
            balance,
            icon,
            color,
            institution,
            accountNumber,
            creditLimit: type === 'credit_card' ? (creditLimit || 0) : undefined,
            interestRate: type === 'savings' ? (interestRate || 0) : undefined,
            includeInAssets,
            linkedBroker: type === 'investment' ? linkedBroker : undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isArchived: false,
          });
          accountNameToIdMap.set(name.toLowerCase(), id);
        });
      } else {
        moneyAccounts.forEach((acc) => {
          newAccounts.push({ ...acc });
          accountNameToIdMap.set(acc.name.toLowerCase(), acc.id);
        });
      }

      const newLoans: Loan[] = [];
      const loanNameToIdMap = new Map<string, string>();

      const calculateLoanEMI = (principal: number, annualRate: number, tenure: number) => {
        if (principal <= 0 || tenure <= 0) return 0;
        if (annualRate === 0) return principal / tenure;
        const r = (annualRate / 12) / 100;
        const emi = (principal * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
        return isFinite(emi) ? emi : 0;
      };

      if (loansDataList.length > 0) {
        loansDataList.forEach((row: any) => {
          const name = String(row['Loan Name'] || row.name || '').trim();
          const lenderName = String(row['Lender Name'] || row.lenderName || '').trim();
          const principal = Number(row.Principal || row.principalAmount || 0);
          const outstanding = Number(row.Outstanding || row.outstandingAmount || 0);
          const rate = Number(row['Interest Rate'] || row.interestRate || 0);
          const tenure = Number(row['Tenure Months'] || row.tenureMonths || 0);
          const emiFromRow = Number(row['EMI Amount'] || row.emiAmount || 0);
          const emiAmount = emiFromRow > 0 ? emiFromRow : calculateLoanEMI(principal, rate, tenure);
          const start = ensureISOString(row['Start Date'] || row.startDate);
          const end = ensureISOString(row['End Date'] || row.endDate);
          const linkedAccName = String(row['Linked Account'] || row.linkedAccount || '').trim();
          const rawType = String(row.Type || row.type || 'other').trim().toLowerCase();
          const isActive = String(row['Is Active'] || row.isActive || 'YES').trim().toUpperCase() === 'YES';

          if (!name) return;

          let type: 'home' | 'car' | 'personal' | 'education' | 'other' = 'other';
          if (['home', 'car', 'personal', 'education', 'other'].includes(rawType)) {
            type = rawType as any;
          }

          const linkedAccountId = linkedAccName ? accountNameToIdMap.get(linkedAccName.toLowerCase()) : undefined;
          const id = Math.random().toString(36).substring(2, 9);

          newLoans.push({
            id,
            name,
            lenderName,
            principalAmount: principal,
            outstandingAmount: outstanding,
            interestRate: rate,
            emiAmount: emiAmount,
            tenureMonths: tenure,
            startDate: start,
            endDate: end,
            linkedAccountId,
            type,
            isActive,
          });
          loanNameToIdMap.set(name.toLowerCase(), id);
        });
      } else {
        moneyLoans.forEach((l) => {
          newLoans.push({ ...l });
          loanNameToIdMap.set(l.name.toLowerCase(), l.id);
        });
      }

      const newEmiPayments: EMIPayment[] = [];
      if (emiDataList.length > 0) {
        emiDataList.forEach((row: any) => {
          const loanName = String(row['Loan Name'] || row.loanName || '').trim();
          const amount = Number(row.Amount || row.amount || 0);
          const principal = Number(row['Principal Portion'] || row.principalPortion || 0);
          const interest = Number(row['Interest Portion'] || row.interestPortion || 0);
          const date = ensureISOString(row.Date || row.date);
          const statusRaw = String(row.Status || row.status || 'paid').trim().toLowerCase();

          const loanId = loanName ? loanNameToIdMap.get(loanName.toLowerCase()) : undefined;
          if (!loanId) return;

          let status: 'paid' | 'upcoming' | 'overdue' = 'paid';
          if (['paid', 'upcoming', 'overdue'].includes(statusRaw)) {
            status = statusRaw as any;
          }

          newEmiPayments.push({
            id: Math.random().toString(36).substring(2, 9),
            loanId,
            amount,
            principalPortion: principal,
            interestPortion: interest,
            date,
            status,
          });
        });
      } else {
        moneyEmiPayments.forEach((p) => {
          newEmiPayments.push({ ...p });
        });
      }

      const newBudgets: Budget[] = [];
      if (budgetsDataList.length > 0) {
        const budgetGroups = new Map<string, any>();
        budgetsDataList.forEach((row: any) => {
          const bName = String(row['Budget Name'] || row.name || '').trim();
          if (!bName) return;
          if (!budgetGroups.has(bName)) {
            budgetGroups.set(bName, {
              name: bName,
              period: String(row.Period || row.period || 'monthly').trim().toLowerCase(),
              startDate: ensureISOString(row['Start Date'] || row.startDate),
              endDate: ensureISOString(row['End Date'] || row.endDate),
              totalLimit: Number(row['Total Limit'] || row.totalLimit || 0),
              isActive: String(row['Is Active'] || row.isActive || 'YES').trim().toUpperCase() === 'YES',
              categories: [],
            });
          }
          const group = budgetGroups.get(bName);
          const catName = String(row['Category Name'] || '').trim();
          const catIcon = String(row['Category Icon'] || '🏷️').trim();
          const catColor = String(row['Category Color'] || '#8E8E93').trim();
          const catLimit = Number(row['Category Limit'] || 0);
          const catSpent = Number(row['Category Spent'] || 0);

          if (catName && catLimit > 0) {
            group.categories.push({
              id: Math.random().toString(36).substring(2, 9),
              name: catName,
              icon: catIcon,
              color: catColor,
              limit: catLimit,
              spent: catSpent,
            });
          }
        });

        budgetGroups.forEach((val) => {
          newBudgets.push({
            id: Math.random().toString(36).substring(2, 9),
            name: val.name,
            period: val.period,
            startDate: val.startDate,
            endDate: val.endDate,
            totalLimit: val.totalLimit,
            categories: val.categories,
            isActive: val.isActive,
          });
        });
      } else {
        moneyBudgets.forEach((b) => {
          newBudgets.push({ ...b });
        });
      }

      const newTransactions: any[] = [];

      for (const row of transactionsDataList) {
        const dateStr = ensureISOString(row.Date || row.date || row.DATE);
        const rawType = (row.Type || row.type || row.TYPE || '').toLowerCase();
        const amount = Number(row.Amount || row.amount || row.AMOUNT || 0);
        const category = String(row.Category || row.category || row.CATEGORY || 'Other').trim();
        const accountName = String(row.Account || row.account || row.ACCOUNT || '').trim();
        const toAccountName = String(row['To Account (Transfers only)'] || row.toAccount || row.TO_ACCOUNT || '').trim();
        const note = String(row.Note || row.note || row.NOTE || '').trim();

        if (amount <= 0 || !accountName) continue;

        let type: 'income' | 'expense' | 'transfer' = 'expense';
        if (rawType.includes('income') || rawType === 'in') {
          type = 'income';
        } else if (rawType.includes('transfer') || rawType === 'tr') {
          type = 'transfer';
        }

        let accId = accountNameToIdMap.get(accountName.toLowerCase());
        if (!accId) {
          const newId = Math.random().toString(36).substring(2, 9);
          const newAcc: Account = {
            id: newId,
            name: accountName,
            balance: 0,
            type: 'wallet',
            icon: 'wallet',
            color: '#007AFF',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isArchived: false,
          };
          newAccounts.push(newAcc);
          accountNameToIdMap.set(accountName.toLowerCase(), newId);
          accId = newId;
        }
        const acc = newAccounts.find((a) => a.id === accId)!;

        let toAccId: string | undefined;
        if (type === 'transfer' && toAccountName) {
          toAccId = accountNameToIdMap.get(toAccountName.toLowerCase());
          if (!toAccId) {
            const newId = Math.random().toString(36).substring(2, 9);
            const newAcc: Account = {
              id: newId,
              name: toAccountName,
              balance: 0,
              type: 'wallet',
              icon: 'wallet',
              color: '#007AFF',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isArchived: false,
            };
            newAccounts.push(newAcc);
            accountNameToIdMap.set(toAccountName.toLowerCase(), newId);
            toAccId = newId;
          }
          const toAcc = newAccounts.find((a) => a.id === toAccId)!;

          if (accountsDataList.length === 0) {
            acc.balance -= amount;
            toAcc.balance += amount;
          }
        } else if (accountsDataList.length === 0) {
          if (type === 'income') {
            acc.balance += amount;
          } else {
            acc.balance -= amount;
          }
        }

        if (type !== 'transfer') {
          if (!newCategories[type].map((c) => c.toLowerCase()).includes(category.toLowerCase())) {
            newCategories[type].push(category);
          }
        }

        newTransactions.push({
          id: Math.random().toString(36).substring(2, 9),
          accountId: accId,
          toAccountId: toAccId,
          type,
          amount,
          category: type === 'transfer' ? 'Transfer' : category,
          date: dateStr,
          note: note || undefined,
        });
      }

      const newSubscriptions: Subscription[] = [];
      const subNameToIdMap = new Map<string, string>();

      if (subscriptionsDataList.length > 0) {
        subscriptionsDataList.forEach((row: any) => {
          const name = String(row.Name || row.name || '').trim();
          const amount = Number(row.Amount || row.amount || 0);
          const cycle = String(row['Billing Cycle'] || row.billingCycle || 'monthly').trim().toLowerCase();
          const nextDate = ensureISOString(row['Next Payment Date'] || row.nextPaymentDate);
          const color = String(row.Color || row.color || '#00C9A7').trim();
          const logo = String(row.Logo || row.logo || '').trim();
          const linkedAccName = String(row['Linked Account'] || row.linkedAccount || '').trim();
          const isActive = String(row['Is Active'] || row.isActive || 'YES').trim().toUpperCase() === 'YES';

          if (!name) return;

          const linkedAccountId = linkedAccName ? accountNameToIdMap.get(linkedAccName.toLowerCase()) : undefined;
          const id = Math.random().toString(36).substring(2, 9);

          newSubscriptions.push({
            id,
            name,
            provider: row.Provider || row.provider || name,
            amount,
            billingCycle: ['weekly', 'monthly', 'quarterly', 'yearly'].includes(cycle) ? cycle as any : 'monthly',
            nextPaymentDate: nextDate,
            color,
            logo: logo || undefined,
            linkedAccountId,
            category: row.Category || row.category || 'Utilities',
            isActive,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          subNameToIdMap.set(name.toLowerCase(), id);
        });
      } else {
        subscriptions.forEach((sub: Subscription) => {
          newSubscriptions.push({ ...sub });
          subNameToIdMap.set(sub.name.toLowerCase(), sub.id);
        });
      }

      const newSubscriptionPayments: SubscriptionPayment[] = [];
      if (subPaymentsDataList.length > 0) {
        subPaymentsDataList.forEach((row: any) => {
          const subName = String(row['Subscription Name'] || row.subscriptionName || '').trim();
          const amount = Number(row.Amount || row.amount || 0);
          const date = ensureISOString(row.Date || row.date);
          const statusRaw = String(row.Status || row.status || 'paid').trim().toLowerCase();

          const subscriptionId = subName ? subNameToIdMap.get(subName.toLowerCase()) : undefined;
          if (!subscriptionId) return;

          newSubscriptionPayments.push({
            id: Math.random().toString(36).substring(2, 9),
            subscriptionId,
            amount,
            date,
            status: ['paid', 'upcoming', 'missed'].includes(statusRaw) ? statusRaw as any : 'paid',
          });
        });
      } else {
        subscriptionPayments.forEach((p: SubscriptionPayment) => {
          newSubscriptionPayments.push({ ...p });
        });
      }

      if (newTransactions.length > 0 || accountsDataList.length > 0 || loansDataList.length > 0 || budgetsDataList.length > 0 || subscriptionsDataList.length > 0) {
        restoreMoneyData({
          accounts: newAccounts,
          transactions: newTransactions,
          loans: newLoans,
          emiPayments: newEmiPayments,
          budgets: newBudgets,
          categories: newCategories,
          subscriptions: newSubscriptions,
          subscriptionPayments: newSubscriptionPayments,
        });

        Alert.alert(
          'Success',
          `Successfully restored all Money Manager accounts, transactions, loans, EMIs, budgets, categories, and subscriptions.`,
        );
      } else {
        Alert.alert(
          'Error',
          'No valid configurations found in the backup file.',
        );
      }
    } catch (error) {
      console.error('Import Money Error:', error);
      Alert.alert(
        'Import Failed',
        'Ensure the file is a valid Gainbase Excel backup file.',
      );
    }
  };






  const summary = useMemo(
    () => calculateSummary(),
    [transactions, tickers, calculateSummary],
  );

  const netWorth = useMemo(() => {
    const rawNetWorth = getNetWorth();
    if (moneyAccounts.length === 0) {
      return summary.totalValue;
    }
    const hasLinkedBroker = moneyAccounts.some((a) => a.type === 'investment' && a.linkedBroker);
    if (!hasLinkedBroker && summary.totalValue > 0) {
      return rawNetWorth + summary.totalValue;
    }
    return rawNetWorth;
  }, [getNetWorth, moneyAccounts, summary.totalValue]);

  const renderGroupRow = ({
    icon,
    title,
    subtitle,
    onPress,
    isDestructive = false,
    showChevron = true,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress: () => void;
    isDestructive?: boolean;
    showChevron?: boolean;
  }) => {
    return (
      <TouchableOpacity
        key={title}
        activeOpacity={0.65}
        onPress={() => {
          handleHaptic();
          onPress();
        }}
        style={styles.groupRow}
      >
        <View style={styles.groupRowLeft}>
          <View
            style={[
              styles.groupRowIconBox,
              {
                backgroundColor: isDark ? currColors.cardSecondary : '#F2F2F7',
              },
            ]}
          >
            {icon}
          </View>
          <View style={styles.groupRowTextContainer}>
            <ThemedText
              style={[
                styles.groupRowTitle,
                { color: isDestructive ? '#DC2626' : currColors.text },
              ]}
              numberOfLines={1}
            >
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText
                style={[styles.groupRowSubtitle, { color: currColors.textSecondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
        </View>
        {showChevron && (
          <ChevronRight size={16} color={currColors.textSecondary} opacity={0.45} />
        )}
      </TouchableOpacity>
    );
  };

  const renderModalActionRow = ({
    icon,
    title,
    subtitle,
    onPress,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    onPress: () => void;
  }) => {
    return (
      <TouchableOpacity
        key={title}
        activeOpacity={0.7}
        onPress={() => {
          handleHaptic();
          onPress();
        }}
        style={styles.modalActionRow}
      >
        <View style={styles.modalActionRowLeft}>
          <View
            style={[
              styles.modalActionIconBox,
              { backgroundColor: isDark ? currColors.cardSecondary : '#F2F2F7' },
            ]}
          >
            {icon}
          </View>
          <View style={styles.modalActionTextWrap}>
            <ThemedText style={[styles.modalActionTitle, { color: currColors.text }]}>
              {title}
            </ThemedText>
            <ThemedText
              style={[styles.modalActionSubtitle, { color: currColors.textSecondary }]}
              numberOfLines={2}
            >
              {subtitle}
            </ThemedText>
          </View>
        </View>
        <ChevronRight size={16} color={currColors.textSecondary} opacity={0.45} />
      </TouchableOpacity>
    );
  };

  const handleOpenEditModal = () => {
    handleHaptic();
    setEditName(userName);
    setEditEmail(userEmail);
    setEditMobile(userMobile);
    setIsEditModalVisible(true);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'We need access to your gallery to change your profile picture.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      updateProfile({ image: result.assets[0].uri });
    }
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    updateProfile({
      name: editName.trim(),
      email: editEmail.trim(),
      mobile: editMobile.trim(),
    });
    setIsEditModalVisible(false);
  };

  const handleDeleteData = () => {
    Alert.alert(
      'Delete All Data',
      'Are you sure you want to delete all local data on this device? (Your cloud backup will remain safe and can be restored anytime by resyncing).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            clearAllMoneyData();
            Alert.alert(
              'Data Cleared',
              'All local data has been cleared from this device. You can restore your data from the cloud at any time by triggering Cloud Sync.',
            );
          },
        },
      ],
    );
  };


  const handleExport = async () => {
    if (transactions.length === 0) {
      Alert.alert('No Data', 'There are no transactions to export.');
      return;
    }

    try {
      const tickerMap = new Map(
        tickers.map((t) => [t.Tickers.toUpperCase(), t]),
      );
      const exportData = transactions.map((t) => {
        const ticker = tickerMap.get(t.symbol.toUpperCase());
        return {
          Symbol: t.symbol,
          'Company Name': ticker?.['Company Name'] || '-',
          'Asset Type': ticker?.['Asset Type'] || '-',
          Sector: ticker?.['Sector'] || '-',
          Quantity: t.quantity,
          Price: t.price,
          Date: t.date,
          Type: t.type,
          Broker: t.broker || '-',
          Currency: t.currency,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

      // Add Holdings Summary sheet if available
      try {
        const holdings = usePortfolioStore.getState().getHoldingsData();
        if (holdings && holdings.length > 0) {
          const holdingsData = holdings.map((h) => ({
            Symbol: h.symbol,
            'Company Name': h.companyName || '-',
            'Asset Type': h.assetType || '-',
            Sector: h.sector || '-',
            Broker: h.broker || '-',
            Quantity: h.quantity,
            'Avg Buy Price': h.avgPrice,
            'Current Price': h.currentPrice,
            'Invested Value': h.investedValue,
            'Current Value': h.currentValue,
            'Total P&L': h.pnl,
            'Total Return (%)': Number(h.pnlPercentage.toFixed(2)),
            'Day Change': h.dayChange,
            'Day Change (%)': Number(h.dayChangePercentage.toFixed(2)),
          }));
          const holdingsWorksheet = XLSX.utils.json_to_sheet(holdingsData);
          XLSX.utils.book_append_sheet(workbook, holdingsWorksheet, 'Holdings Summary');
        }
      } catch (e) {
        console.log('Holdings export skipped:', e);
      }

      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const filename = `Portfolio_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Export Transactions',
          UTI: 'com.microsoft.excel.xlsx',
        });
      } else {
        Alert.alert(
          'Sharing not available',
          'Sharing is not available on this device.',
        );
      }
    } catch (error) {
      console.error('Export Error:', error);
      Alert.alert(
        'Export Failed',
        'An error occurred while exporting transactions.',
      );
    }
  };

  const handleBackup = async () => {
    if (transactions.length === 0) {
      Alert.alert('No Data', 'There are no transactions to backup.');
      return;
    }

    try {
      // Map to the simple Sample format
      const backupData = transactions.map((t) => ({
        Symbol: t.symbol,
        Quantity: t.quantity,
        Price: t.price,
        Date: t.date,
        Type: t.type,
        Broker: t.broker || '',
        Currency: t.currency,
      }));

      const worksheet = XLSX.utils.json_to_sheet(backupData);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

      const filename = `Gainbase_Backup_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, csvOutput, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Backup Transactions',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert(
          'Sharing not available',
          'Sharing is not available on this device.',
        );
      }
    } catch (error) {
      console.error('Backup Error:', error);
      Alert.alert(
        'Backup Failed',
        'An error occurred while creating the backup.',
      );
    }
  };

  const handleDownloadSample = async () => {
    try {
      const sampleData = [
        {
          Symbol: 'RELIANCE',
          Quantity: 10,
          Price: 2400.5,
          Date: '2023-01-15',
          Type: 'BUY',
          Broker: 'Zerodha',
          Currency: 'INR',
        },
        {
          Symbol: 'TCS',
          Quantity: 5,
          Price: 3200.0,
          Date: '2023-02-20',
          Type: 'SELL',
          Broker: 'Upstox',
          Currency: 'INR',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const filename = `Portfolio_Sample_Template.xlsx`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Download Sample Template',
          UTI: 'com.microsoft.excel.xlsx',
        });
      } else {
        Alert.alert(
          'Sharing not available',
          'Sharing is not available on this device.',
        );
      }
    } catch (error) {
      console.error('Sample Download Error:', error);
      Alert.alert('Error', 'Failed to generate sample file.');
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/comma-separated-values',
          'application/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name.toLowerCase();
      const isCsv = fileName.endsWith('.csv');

      let jsonData;

      if (isCsv) {
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const workbook = XLSX.read(fileContent, { type: 'string' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      } else {
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const workbook = XLSX.read(fileContent, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      }

      if (!jsonData || jsonData.length === 0) {
        Alert.alert('Empty File', 'The imported file contains no data.');
        return;
      }

      const ensureISOString = (val: any) => {
        if (!val) return new Date().toISOString();
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'number') {
          // Handle Excel serial date (Excel base date is Dec 30, 1899)
          // 25569 is the number of days between Dec 30, 1899 and Jan 1, 1970
          const date = new Date((val - 25569) * 86400 * 1000);
          return date.toISOString();
        }
        if (typeof val === 'string') {
          // Try to parse if it looks like a number
          if (!isNaN(Number(val)) && val.trim() !== '') {
            const date = new Date((Number(val) - 25569) * 86400 * 1000);
            return date.toISOString();
          }
          const d = new Date(val);
          if (!isNaN(d.getTime())) return d.toISOString();
        }
        return new Date().toISOString();
      };

      const newTransactions = jsonData
        .map((row: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          symbol: row.Symbol || row.symbol || '',
          quantity: Number(row.Quantity || row.quantity || 0),
          price: Number(row.Price || row.price || 0),
          date: ensureISOString(row.Date || row.date),
          type: (row.Type?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY') as
            | 'BUY'
            | 'SELL',
          currency: row.Currency || row.currency || 'INR',
          broker: row.Broker || row.broker || '',
        }))
        .filter((t) => t.symbol && t.quantity > 0 && t.price >= 0);

      if (newTransactions.length > 0) {
        importTransactions(newTransactions);
        Alert.alert(
          'Success',
          `Successfully imported ${newTransactions.length} transactions.`,
        );
      } else {
        Alert.alert(
          'Error',
          'No valid transactions found in the file. Please use the Sample format.',
        );
      }
    } catch (error) {
      console.error('Import Error:', error);
      Alert.alert(
        'Import Failed',
        'Ensure the file matches the sample format.',
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: currColors.background }]}
        edges={['top']}
      >
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

        {/* ─── 1. Header Bar: Profile Title on Left, Support Pill on Right ─── */}
        <View style={styles.header}>
          <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
            Profile
          </ThemedText>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              handleHaptic();
              Linking.openURL('https://chat.whatsapp.com/INyTPVgPq908dEMWgFiq44?mode=gi_t');
            }}
            style={[
              styles.supportPill,
              {
                backgroundColor: isDark ? currColors.cardSecondary : '#FFFFFF',
                borderColor: currColors.border,
              },
            ]}
          >
            <MessageSquare size={14} color={currColors.text} />
            <ThemedText style={[styles.supportPillText, { color: currColors.text }]}>
              Support
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* ─── 2. Scrollable Body ─── */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* User Profile Card */}
          <View
            style={[
              styles.userCard,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenEditModal}
              style={[
                styles.avatarWrap,
                {
                  backgroundColor: isDark ? currColors.cardSecondary : '#FFFFFF',
                  borderColor: currColors.border,
                },
              ]}
            >
              <Image
                source={{
                  uri:
                    userImage ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName || 'User'}`,
                }}
                style={styles.avatarImg}
              />
            </TouchableOpacity>

            <View style={styles.userInfoWrap}>
              <ThemedText style={[styles.userName, { color: currColors.text }]} numberOfLines={1}>
                {userName || 'Gainbase User'}
              </ThemedText>
              <ThemedText style={[styles.userContact, { color: currColors.textSecondary }]} numberOfLines={1}>
                {userEmail || userMobile || 'Gainbase Member'}
              </ThemedText>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenEditModal}
              style={[
                styles.editPillBtn,
                {
                  backgroundColor: isDark ? currColors.cardSecondary : '#F2F2F7',
                  borderColor: currColors.border,
                },
              ]}
            >
              <Edit2 size={12} color={currColors.text} />
              <ThemedText style={[styles.editPillText, { color: currColors.text }]}>
                Edit
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Primary Hero Card: Investments & Net Worth */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
              },
            ]}
          >
            {/* Row 1: Investments */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                handleHaptic();
                setDataSheetType('investments');
              }}
              style={styles.summaryRow}
            >
              <View style={styles.summaryRowLeft}>
                <View
                  style={[
                    styles.summaryIconBox,
                    { backgroundColor: isDark ? currColors.cardSecondary : '#F2F2F7' },
                  ]}
                >
                  <TrendingUp size={18} color={currColors.text} />
                </View>
                <View>
                  <ThemedText style={[styles.summaryRowLabel, { color: currColors.text }]}>
                    Investments
                  </ThemedText>
                  <ThemedText style={[styles.summaryRowSub, { color: currColors.textSecondary }]}>
                    Portfolio valuation
                  </ThemedText>
                </View>
              </View>
              <View style={styles.summaryRowRight}>
                <ThemedText style={[styles.summaryRowValue, { color: currColors.text }]}>
                  {isPrivacyMode
                    ? '••••••'
                    : `${showCurrencySymbol ? '₹' : ''}${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact', compactDisplay: 'short' })}`}
                </ThemedText>
                <ChevronRight size={16} color={currColors.textSecondary} opacity={0.45} />
              </View>
            </TouchableOpacity>

            <View style={[styles.summaryDivider, { backgroundColor: currColors.border }]} />

            {/* Row 2: Net Worth */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                handleHaptic();
                togglePrivacyMode();
              }}
              style={styles.summaryRow}
            >
              <View style={styles.summaryRowLeft}>
                <View
                  style={[
                    styles.summaryIconBox,
                    { backgroundColor: isDark ? currColors.cardSecondary : '#F2F2F7' },
                  ]}
                >
                  <Wallet size={18} color={currColors.text} />
                </View>
                <View>
                  <ThemedText style={[styles.summaryRowLabel, { color: currColors.text }]}>
                    Net Worth
                  </ThemedText>
                  <ThemedText style={[styles.summaryRowSub, { color: currColors.textSecondary }]}>
                    Assets & liquid wealth
                  </ThemedText>
                </View>
              </View>
              <View style={styles.summaryRowRight}>
                <ThemedText style={[styles.summaryRowValue, { color: currColors.text }]}>
                  {isPrivacyMode
                    ? '••••••'
                    : `${showCurrencySymbol ? '₹' : ''}${netWorth.toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact', compactDisplay: 'short' })}`}
                </ThemedText>
                <ChevronRight size={16} color={currColors.textSecondary} opacity={0.45} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 1: Data & Backups */}
          <ThemedText style={[styles.sectionHeading, { color: currColors.textSecondary }]}>
            DATA & BACKUPS
          </ThemedText>
          <View
            style={[
              styles.cardGroup,
              { backgroundColor: currColors.card, borderColor: currColors.border },
            ]}
          >
            {renderGroupRow({
              icon: <TrendingUp size={18} color={currColors.text} />,
              title: 'Investments Data',
              subtitle: 'Sample templates, imports, backups & Excel export',
              onPress: () => setDataSheetType('investments'),
            })}
            <View style={[styles.rowDivider, { backgroundColor: currColors.border }]} />
            {renderGroupRow({
              icon: <Wallet size={18} color={currColors.text} />,
              title: 'Money Manager',
              subtitle: 'Manage cashflow, accounts, loans & budgets',
              onPress: () => setDataSheetType('money_manager'),
            })}
            <View style={[styles.rowDivider, { backgroundColor: currColors.border }]} />
            {renderGroupRow({
              icon: <Cloud size={18} color={currColors.text} />,
              title: 'Cloud Sync',
              subtitle: 'Google Drive backup & synchronization',
              onPress: () => router.push('/cloud-backup'),
            })}
          </View>

          {/* Section 2: Settings & Preferences */}
          <ThemedText style={[styles.sectionHeading, { color: currColors.textSecondary }]}>
            SETTINGS & PREFERENCES
          </ThemedText>
          <View
            style={[
              styles.cardGroup,
              { backgroundColor: currColors.card, borderColor: currColors.border },
            ]}
          >
            {renderGroupRow({
              icon: <Tag size={18} color={currColors.text} />,
              title: 'Manage Categories',
              subtitle: 'Organize transaction and budget categories',
              onPress: () => router.push('/manage-categories'),
            })}
            <View style={[styles.rowDivider, { backgroundColor: currColors.border }]} />
            {renderGroupRow({
              icon: <Settings size={18} color={currColors.text} />,
              title: 'Settings',
              subtitle: 'Theme, currency symbol & app preferences',
              onPress: () => router.push('/settings'),
            })}
            <View style={[styles.rowDivider, { backgroundColor: currColors.border }]} />
            {renderGroupRow({
              icon: <MessageSquare size={18} color={currColors.text} />,
              title: 'Help & Support',
              subtitle: 'Join WhatsApp community or contact team',
              onPress: () => Linking.openURL('https://chat.whatsapp.com/INyTPVgPq908dEMWgFiq44?mode=gi_t'),
            })}
          </View>

          {/* Section 3: Actions */}
          <ThemedText style={[styles.sectionHeading, { color: currColors.textSecondary }]}>
            ACTIONS
          </ThemedText>
          <View
            style={[
              styles.cardGroup,
              { backgroundColor: currColors.card, borderColor: currColors.border },
            ]}
          >
            {renderGroupRow({
              icon: <Trash2 size={18} color="#DC2626" />,
              title: 'Delete All Data',
              subtitle: 'Wipe all local portfolio and money records',
              onPress: handleDeleteData,
              isDestructive: true,
            })}
          </View>

          {/* Minimal Version & OTA Update Check Footer */}
          <VersionCheckFooter />
        </ScrollView>

        {/* Data Actions Bottom Sheet Drawer */}
        <ProfileDrawerSheet
          visible={dataSheetType !== null}
          onClose={() => setDataSheetType(null)}
          isDark={isDark}
          cardBg={currColors.card}
          borderColor={currColors.border}
          bottomPadding={Math.max(insets.bottom, 16) + 16}
        >
          <View style={styles.modalGrabHandle} />
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: currColors.border },
            ]}
          >
            <View>
              <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                {dataSheetType === 'investments' ? 'Investments Data' : 'Money Manager Data'}
              </ThemedText>
              <ThemedText style={[styles.modalSubtitle, { color: currColors.textSecondary }]}>
                {dataSheetType === 'investments'
                  ? 'Import, export or backup stock portfolio'
                  : 'Backup or restore accounts, loans and cashflow'}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => setDataSheetType(null)}
              style={[styles.closeButton, { backgroundColor: isDark ? currColors.cardSecondary : '#F2F2F7' }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={currColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalActionList}>
            {renderModalActionRow({
              icon: <FileText size={18} color={currColors.text} />,
              title: 'Download Sample Template',
              subtitle:
                dataSheetType === 'investments'
                  ? 'Stock portfolio Excel (.xlsx) template'
                  : 'Money manager Excel (.xlsx) template',
              onPress: () => {
                const type = dataSheetType;
                setDataSheetType(null);
                if (type === 'investments') {
                  handleDownloadSample();
                } else {
                  handleDownloadMoneySample();
                }
              },
            })}
            <View style={[styles.modalRowDivider, { backgroundColor: currColors.border }]} />
            {renderModalActionRow({
              icon: <Upload size={18} color={currColors.text} />,
              title: 'Import Data',
              subtitle:
                dataSheetType === 'investments'
                  ? 'Import stock trades from Excel / CSV file'
                  : 'Restore cashflow, accounts, and loans from Excel',
              onPress: () => {
                const type = dataSheetType;
                setDataSheetType(null);
                if (type === 'investments') {
                  handleImport();
                } else {
                  handleImportMoney();
                }
              },
            })}
            <View style={[styles.modalRowDivider, { backgroundColor: currColors.border }]} />
            {renderModalActionRow({
              icon: <Database size={18} color={currColors.text} />,
              title: 'Backup Data',
              subtitle:
                dataSheetType === 'investments'
                  ? 'Export trades as a clean CSV snapshot'
                  : 'Generate a multi-sheet backup workbook',
              onPress: () => {
                const type = dataSheetType;
                setDataSheetType(null);
                if (type === 'investments') {
                  handleBackup();
                } else {
                  handleBackupMoney();
                }
              },
            })}
            <View style={[styles.modalRowDivider, { backgroundColor: currColors.border }]} />
            {renderModalActionRow({
              icon: <Download size={18} color={currColors.text} />,
              title: 'Export to Excel',
              subtitle:
                dataSheetType === 'investments'
                  ? 'Export complete stock ledger to .xlsx'
                  : 'Export all accounts, EMIs, and budgets to .xlsx',
              onPress: () => {
                const type = dataSheetType;
                setDataSheetType(null);
                if (type === 'investments') {
                  handleExport();
                } else {
                  handleExportMoney();
                }
              },
            })}
          </View>
        </ProfileDrawerSheet>

        {/* Edit Profile Bottom Sheet Drawer */}
        <ProfileDrawerSheet
          visible={isEditModalVisible}
          onClose={() => setIsEditModalVisible(false)}
          isDark={isDark}
          cardBg={currColors.card}
          borderColor={currColors.border}
          bottomPadding={Math.max(insets.bottom, 16) + 16}
        >
          <View style={styles.modalGrabHandle} />
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: currColors.border },
            ]}
          >
            <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
              Edit Profile
            </ThemedText>
            <TouchableOpacity
              onPress={() => setIsEditModalVisible(false)}
              style={[styles.closeButton, { backgroundColor: isDark ? currColors.cardSecondary : '#F2F2F7' }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={currColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <TouchableOpacity
              style={styles.modalAvatarContainer}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              <Image
                source={{
                  uri:
                    userImage ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName || 'User'}`,
                }}
                style={styles.modalAvatar}
              />
            </TouchableOpacity>

            <View
              style={[
                styles.inputGroup,
                {
                  backgroundColor: isDark ? currColors.cardSecondary : currColors.background,
                  borderColor: currColors.border,
                },
              ]}
            >
              <View style={styles.inputIcon}>
                <User size={18} color={currColors.textSecondary} />
              </View>
              <TextInput
                style={[styles.modalInput, { color: currColors.text }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                placeholderTextColor={currColors.textSecondary}
              />
            </View>

            <View
              style={[
                styles.inputGroup,
                {
                  backgroundColor: isDark ? currColors.cardSecondary : currColors.background,
                  borderColor: currColors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.modalInput, { color: currColors.text }]}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Email"
                placeholderTextColor={currColors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View
              style={[
                styles.inputGroup,
                {
                  backgroundColor: isDark ? currColors.cardSecondary : currColors.background,
                  borderColor: currColors.border,
                },
              ]}
            >
              <View style={styles.inputIcon}>
                <Phone size={18} color={currColors.textSecondary} />
              </View>
              <TextInput
                style={[styles.modalInput, { color: currColors.text }]}
                value={editMobile}
                onChangeText={setEditMobile}
                placeholder="Mobile"
                placeholderTextColor={currColors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: isDark ? '#FFFFFF' : '#1C1C1E' },
              ]}
              onPress={handleSaveProfile}
              activeOpacity={0.8}
            >
              <ThemedText
                style={[
                  styles.saveButtonText,
                  { color: isDark ? '#000000' : '#FFFFFF' },
                ]}
              >
                Save Changes
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ProfileDrawerSheet>
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: -0.3,
  },
  supportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  supportPillText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  scrollContent: {
    paddingTop: 4,
  },
  // User Profile Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  userInfoWrap: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: -0.2,
  },
  userContact: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  editPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  editPillText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  // Summary Hero Card
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRowLabel: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.2,
  },
  summaryRowSub: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  summaryRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryRowValue: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  // Section Headings & Grouped Cards
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  cardGroup: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  groupRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  groupRowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupRowTextContainer: {
    flex: 1,
  },
  groupRowTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.2,
  },
  groupRowSubtitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
  },
  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  modalGrabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E8E9350',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Outfit_700Bold',
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionList: {
    paddingVertical: 6,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  modalActionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  modalActionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionTextWrap: {
    flex: 1,
  },
  modalActionTitle: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.2,
  },
  modalActionSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  modalRowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
  },
  // Edit Profile Body
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: 'center',
  },
  modalAvatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 14,
    overflow: 'hidden',
  },
  modalAvatar: {
    width: '100%',
    height: '100%',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginBottom: 10,
    width: '100%',
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
  },
  saveButton: {
    borderRadius: 14,
    height: 50,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
  },
});

