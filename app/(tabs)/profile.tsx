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
  Database,
  Download,
  Edit2,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Settings,
  Trash2,
  Upload,
  User,
  X,
  Tag,
  Plus,
  Check,
  Cloud,
  ArrowRightLeft,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Eye,
  EyeOff,
  Key,
  Sparkles,
} from 'lucide-react-native';
import { useAiStore } from '@/store/useAiStore';
import { useMoneyStore } from '@/store/useMoneyStore';
import { useGoalStore } from '@/store/useGoalStore';
import { AccountType, Account, Loan, EMIPayment, Budget } from '../../types/money';
import { Subscription, SubscriptionPayment } from '../../types/money';
import { FinancialGoal } from '../../types/goals';
import Svg, { Path, Line } from 'react-native-svg';
import { getTicketCardPath } from '@/constants/folderTheme';
import { Category3DIcon } from '@/components/Category3DIcon';


import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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

export default function ProfileScreen() {
  const router = useRouter();
  const transactions = usePortfolioStore((state) => state.transactions);
  const tickers = usePortfolioStore((state) => state.tickers);
  const importTransactions = usePortfolioStore(
    (state) => state.importTransactions,
  );
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
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
  const [cardWidth, setCardWidth] = useState<number>(Dimensions.get('window').width - 32);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [dataSheetType, setDataSheetType] = useState<'investments' | 'money_manager' | null>(null);

  // AI Store State
  const { geminiApiKey, selectedModel } = useAiStore();

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
  const moneyLoans = useMoneyStore((state) => state.loans);
  const moneyBudgets = useMoneyStore((state) => state.budgets);
  const moneyEmiPayments = useMoneyStore((state) => state.emiPayments);
  const subscriptions: Subscription[] = useMoneyStore((state) => state.subscriptions) || [];
  const subscriptionPayments: SubscriptionPayment[] = useMoneyStore((state) => state.subscriptionPayments) || [];
  const moneyGoals: FinancialGoal[] = useGoalStore((state) => state.goals) || [];
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

      // 9. Financial Goals Sample Sheet
      const sampleGoals = [
        {
          Name: 'Build 6-Month Liquid Reserve',
          Description: 'Ensure liquid safety net in Cash, Savings, and Emergency funds',
          Category: 'savings',
          Icon: 'ShieldCheck',
          Color: '#00C9A7',
          Formula: 'Cash + Savings + Emergency',
          'Target Value': 300000.0,
          'Targets (comma-separated)': '100000, 200000, 300000',
          Unit: 'currency',
          Operator: '>=',
          'Is Completed': 'NO',
        },
        {
          Name: '₹10 Lakh Stock Portfolio',
          Description: 'Grow equity and ETF investments',
          Category: 'investments',
          Icon: 'TrendingUp',
          Color: '#34C759',
          Formula: 'HoldingsValue',
          'Target Value': 1000000.0,
          'Targets (comma-separated)': '250000, 500000, 1000000',
          Unit: 'currency',
          Operator: '>=',
          'Is Completed': 'NO',
        },
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
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sampleGoals), 'Goals');

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

      // 9. Goals
      const goalsSheetData = moneyGoals.map((g: FinancialGoal) => ({
        Name: g.name,
        Description: g.description || '',
        Category: g.category,
        Icon: g.icon || 'ShieldCheck',
        Color: g.color || '#00C9A7',
        Formula: g.formula,
        'Target Value': g.targetValue,
        'Targets (comma-separated)': Array.isArray(g.targets) ? g.targets.join(', ') : '',
        Unit: g.unit,
        Operator: g.operator,
        'Is Completed': g.isManuallyCompleted ? 'YES' : 'NO',
      }));
      const worksheetGoals = XLSX.utils.json_to_sheet(goalsSheetData);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheetTxs, 'Transactions');
      XLSX.utils.book_append_sheet(workbook, worksheetAccs, 'Accounts');
      XLSX.utils.book_append_sheet(workbook, worksheetLoans, 'Loans');
      XLSX.utils.book_append_sheet(workbook, worksheetEmi, 'EMIPayments');
      XLSX.utils.book_append_sheet(workbook, worksheetSubscriptions, 'Subscriptions');
      XLSX.utils.book_append_sheet(workbook, worksheetSubPayments, 'SubscriptionPayments');
      XLSX.utils.book_append_sheet(workbook, worksheetBudgets, 'Budgets');
      XLSX.utils.book_append_sheet(workbook, worksheetCategories, 'Categories');
      XLSX.utils.book_append_sheet(workbook, worksheetGoals, 'Goals');

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

      // 9. Goals
      const goalsSheetData = moneyGoals.map((g: FinancialGoal) => ({
        Name: g.name,
        Description: g.description || '',
        Category: g.category,
        Icon: g.icon || 'ShieldCheck',
        Color: g.color || '#00C9A7',
        Formula: g.formula,
        'Target Value': g.targetValue,
        'Targets (comma-separated)': Array.isArray(g.targets) ? g.targets.join(', ') : '',
        Unit: g.unit,
        Operator: g.operator,
        'Is Completed': g.isManuallyCompleted ? 'YES' : 'NO',
      }));
      const worksheetGoals = XLSX.utils.json_to_sheet(goalsSheetData);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheetTxs, 'Transactions');
      XLSX.utils.book_append_sheet(workbook, worksheetAccs, 'Accounts');
      XLSX.utils.book_append_sheet(workbook, worksheetLoans, 'Loans');
      XLSX.utils.book_append_sheet(workbook, worksheetEmi, 'EMIPayments');
      XLSX.utils.book_append_sheet(workbook, worksheetSubscriptions, 'Subscriptions');
      XLSX.utils.book_append_sheet(workbook, worksheetSubPayments, 'SubscriptionPayments');
      XLSX.utils.book_append_sheet(workbook, worksheetBudgets, 'Budgets');
      XLSX.utils.book_append_sheet(workbook, worksheetCategories, 'Categories');
      XLSX.utils.book_append_sheet(workbook, worksheetGoals, 'Goals');

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
      let goalsDataList: any[] = [];

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
        goalsDataList = getSheetData('goal');
      } else {
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const workbook = XLSX.read(fileContent, { type: 'string' });
        transactionsDataList = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) || [];
      }

      if (transactionsDataList.length === 0 && accountsDataList.length === 0 && loansDataList.length === 0 && subscriptionsDataList.length === 0 && goalsDataList.length === 0) {
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

      // 9. Financial Goals
      if (goalsDataList.length > 0) {
        const newGoals: FinancialGoal[] = goalsDataList.map((row: any) => {
          const name = String(row.Name || row.name || '').trim();
          const targetVal = Number(row['Target Value'] || row.targetValue || 0);
          const rawTargets = String(row['Targets (comma-separated)'] || row.targets || `${targetVal}`);
          const targets = rawTargets.split(',').map((t: string) => Number(t.trim())).filter((n: number) => !isNaN(n) && n > 0);
          return {
            id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: name || 'Financial Milestone',
            description: row.Description || row.description || undefined,
            category: (row.Category || row.category || 'savings').toLowerCase() as any,
            icon: row.Icon || row.icon || 'ShieldCheck',
            color: row.Color || row.color || '#00C9A7',
            formula: row.Formula || row.formula || 'Cash + Savings',
            targetValue: targetVal > 0 ? targetVal : (targets[targets.length - 1] || 100000),
            targets: targets.length > 0 ? targets : [targetVal || 100000],
            unit: (row.Unit || row.unit || 'currency').toLowerCase() as any,
            operator: (row.Operator || row.operator || '>=').trim() as any,
            isManuallyCompleted: String(row['Is Completed'] || row.isCompleted || 'NO').trim().toUpperCase() === 'YES',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }).filter((g: FinancialGoal) => g.name);

        if (newGoals.length > 0) {
          useGoalStore.setState({ goals: newGoals });
        }
      }

      if (newTransactions.length > 0 || accountsDataList.length > 0 || loansDataList.length > 0 || budgetsDataList.length > 0 || subscriptionsDataList.length > 0 || goalsDataList.length > 0) {
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
          `Successfully restored all Money Manager accounts, transactions, loans, EMIs, budgets, categories, subscriptions, and financial goals.`,
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

  const renderTicketProfileCard = () => {
    const h = 156;
    const notchY = 100;
    const notchR = 9;
    const path = getTicketCardPath(cardWidth, h, notchY, notchR, 22);

    const ticketPalette = {
      bg: '#D1F5EC',
      text: '#064E3B',
      sub: '#047857',
      border: '#34D399',
    };

    return (
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - cardWidth) > 1) {
            setCardWidth(w);
          }
        }}
        style={{
          marginHorizontal: 16,
          marginBottom: 16,
          marginTop: 4,
          height: h,
          shadowColor: isDark ? '#000000' : ticketPalette.sub,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.06 : 0.12,
          shadowRadius: isDark ? 4 : 8,
          elevation: 2,
        }}
      >
        {/* SVG Ticket Shape Background */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={cardWidth} height={h}>
            <Path
              d={path}
              fill={ticketPalette.bg}
              stroke={isDark ? 'transparent' : ticketPalette.border}
              strokeWidth={1.5}
            />
            {/* Perforated dashed divider line */}
            <Line
              x1={notchR + 6}
              y1={notchY}
              x2={cardWidth - notchR - 6}
              y2={notchY}
              stroke={isDark ? ticketPalette.text + '35' : ticketPalette.sub + 'B0'}
              strokeWidth={1.5}
              strokeDasharray="5, 4"
            />
          </Svg>
        </View>

        {/* Top Ticket Section */}
        <View
          style={{
            height: notchY,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenEditModal}
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: '#FFFFFF',
                padding: 2,
                marginRight: 14,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <Image
                source={{
                  uri:
                    userImage ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName || 'User'}`,
                }}
                style={{ width: '100%', height: '100%', borderRadius: 25 }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: -1,
                  right: -1,
                  backgroundColor: ticketPalette.sub,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: '#FFFFFF',
                }}
              >
                <Edit2 size={9} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <ThemedText
                style={{
                  fontSize: 10,
                  fontFamily: 'Outfit_700Bold',
                  letterSpacing: 0.8,
                  color: ticketPalette.sub,
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
                numberOfLines={1}
              >
                INVESTOR PROFILE
              </ThemedText>
              <ThemedText
                style={{
                  fontSize: 19,
                  fontFamily: 'Outfit_700Bold',
                  color: ticketPalette.text,
                  letterSpacing: -0.3,
                }}
                numberOfLines={1}
              >
                {userName || 'Set up your profile'}
              </ThemedText>
              <ThemedText
                style={{
                  fontSize: 12,
                  fontFamily: 'Outfit_400Regular',
                  color: ticketPalette.sub,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {userEmail || userMobile || 'Tap edit to customize'}
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenEditModal}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: ticketPalette.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Edit2 size={12} color={ticketPalette.text} />
            <ThemedText
              style={{
                fontSize: 12,
                fontFamily: 'Outfit_600SemiBold',
                color: ticketPalette.text,
              }}
            >
              Edit
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Bottom Ticket Stub */}
        <View
          style={{
            height: h - notchY,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <ThemedText
              style={{
                fontSize: 9,
                fontFamily: 'Outfit_700Bold',
                letterSpacing: 0.8,
                color: ticketPalette.sub,
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              INVESTMENT TRADES
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 14,
                fontFamily: 'Outfit_600SemiBold',
                color: ticketPalette.text,
              }}
            >
              {isPrivacyMode ? '••••' : transactions.length}
            </ThemedText>
          </View>

          <View style={{ width: 1, height: 24, backgroundColor: ticketPalette.sub + '30' }} />

          <View style={{ flex: 1.2, alignItems: 'center' }}>
            <ThemedText
              style={{
                fontSize: 9,
                fontFamily: 'Outfit_700Bold',
                letterSpacing: 0.8,
                color: ticketPalette.sub,
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              NET ASSETS
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 14,
                fontFamily: 'Outfit_600SemiBold',
                color: ticketPalette.text,
              }}
            >
              {isPrivacyMode
                ? '••••••'
                : `${showCurrencySymbol ? '₹' : ''}${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact', compactDisplay: 'short' })}`}
            </ThemedText>
          </View>

          <View style={{ width: 1, height: 24, backgroundColor: ticketPalette.sub + '30' }} />

          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <ThemedText
              style={{
                fontSize: 9,
                fontFamily: 'Outfit_700Bold',
                letterSpacing: 0.8,
                color: ticketPalette.sub,
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              CASHFLOW LOGS
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 14,
                fontFamily: 'Outfit_600SemiBold',
                color: ticketPalette.text,
              }}
            >
              {isPrivacyMode ? '••••' : moneyTransactions.length}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const renderColoredGridBox = ({
    title,
    subtitle,
    icon3D,
    customIcon,
    palette,
    onPress,
  }: {
    title: string;
    subtitle: string;
    icon3D?: string;
    customIcon?: React.ReactNode;
    palette: { bg: string; text: string; sub: string; border: string };
    onPress: () => void;
  }) => {
    return (
      <TouchableOpacity
        key={title}
        activeOpacity={0.82}
        onPress={() => {
          handleHaptic();
          onPress();
        }}
        style={{
          flex: 1,
          borderRadius: 20,
          backgroundColor: palette.bg,
          borderWidth: isDark ? 0 : 1.2,
          borderColor: palette.border,
          padding: 14,
          minHeight: 120,
          justifyContent: 'space-between',
          shadowColor: isDark ? '#000000' : palette.sub,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.06 : 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {icon3D ? (
              <Category3DIcon name={icon3D} size={36} />
            ) : (
              customIcon
            )}
          </View>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: palette.text + '18',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ChevronRight size={14} color={palette.text} />
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          <ThemedText
            style={{
              fontSize: 14,
              fontFamily: 'Outfit_600SemiBold',
              color: palette.text,
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {title}
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 11,
              fontFamily: 'Outfit_400Regular',
              color: palette.sub,
              marginTop: 2,
              lineHeight: 14,
            }}
            numberOfLines={2}
          >
            {subtitle}
          </ThemedText>
        </View>
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
            useGoalStore.getState().resetToDefaults();
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

        {/* ─── 1. Header (Matching EMIs: Clean Left Title, No Back Button) ─── */}
        <View style={styles.header}>
          <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
            Profile
          </ThemedText>
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
          {/* Ticket Style Profile Hero Card */}
          {renderTicketProfileCard()}

          {/* Section: Data & Backups */}
          <ThemedText style={[styles.sectionHeading, { color: currColors.textSecondary }]}>
            DATA & BACKUPS
          </ThemedText>
          <View style={styles.gridRow}>
            {renderColoredGridBox({
              title: 'Investments',
              subtitle: 'Sample, import & export',
              icon3D: 'investments',
              palette: {
                bg: '#D1F5EC',
                text: '#064E3B',
                sub: '#047857',
                border: '#34D399',
              },
              onPress: () => setDataSheetType('investments'),
            })}

            {renderColoredGridBox({
              title: 'Money Manager',
              subtitle: 'Cashflow, ledgers & sample',
              icon3D: 'wallet',
              palette: {
                bg: '#BAE6FD',
                text: '#0C4A6E',
                sub: '#0369A1',
                border: '#38BDF8',
              },
              onPress: () => setDataSheetType('money_manager'),
            })}
          </View>

          {/* Section: Settings & Preferences */}
          <ThemedText style={[styles.sectionHeading, { color: currColors.textSecondary, marginTop: 14 }]}>
            SETTINGS & PREFERENCES
          </ThemedText>
          <View style={styles.gridRow}>
            {renderColoredGridBox({
              title: 'Settings',
              subtitle: 'Preferences & PIN',
              icon3D: 'laptop',
              palette: {
                bg: '#E9D5FF',
                text: '#581C87',
                sub: '#7E22CE',
                border: '#C084FC',
              },
              onPress: () => router.push('/settings'),
            })}

            {renderColoredGridBox({
              title: 'Cloud Sync',
              subtitle: 'Auto-sync portfolios',
              icon3D: 'cloud',
              palette: {
                bg: '#E0E7FF',
                text: '#312E81',
                sub: '#4338CA',
                border: '#818CF8',
              },
              onPress: () => router.push('/cloud-backup'),
            })}
          </View>

          <View style={styles.gridRow}>
            {renderColoredGridBox({
              title: 'Categories',
              subtitle: 'Expense & income tags',
              icon3D: 'package',
              palette: {
                bg: '#FEF08A',
                text: '#713F12',
                sub: '#854D0E',
                border: '#FACC15',
              },
              onPress: () => router.push('/manage-categories'),
            })}

            {renderColoredGridBox({
              title: 'Community',
              subtitle: 'WhatsApp discussion group',
              customIcon: (
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: '#25D366',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <MessageCircle size={18} color="#FFFFFF" />
                </View>
              ),
              palette: {
                bg: '#DCFCE7',
                text: '#14532D',
                sub: '#15803D',
                border: '#4ADE80',
              },
              onPress: () => Linking.openURL('https://chat.whatsapp.com/INyTPVgPq908dEMWgFiq44?mode=gi_t'),
            })}
          </View>

          {/* Section: AI & Actions */}
          <ThemedText style={[styles.sectionHeading, { color: currColors.textSecondary, marginTop: 14 }]}>
            AI & ACTIONS
          </ThemedText>
          <View style={styles.gridRow}>
            {renderColoredGridBox({
              title: 'AI Model & Keys',
              subtitle: geminiApiKey ? selectedModel.replace('gemini-', '') : 'Configure Gemini Key',
              icon3D: 'sparkles',
              palette: {
                bg: '#FDF4FF',
                text: '#701A75',
                sub: '#86198F',
                border: '#E879F9',
              },
              onPress: () => router.push('/ai-settings'),
            })}

            {renderColoredGridBox({
              title: 'Delete Data',
              subtitle: 'Reset local data & trades',
              customIcon: (
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: '#DC2626',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Trash2 size={18} color="#FFFFFF" />
                </View>
              ),
              palette: {
                bg: '#FFE4E6',
                text: '#9F1239',
                sub: '#BE123C',
                border: '#FDA4AF',
              },
              onPress: handleDeleteData,
            })}
          </View>

          {/* Minimal Version & OTA Update Check Footer */}
          <VersionCheckFooter />
        </ScrollView>

        {/* Data Actions Bottom Sheet Modal */}
        <Modal
          visible={dataSheetType !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setDataSheetType(null)}
        >
          <View
            style={[
              styles.modalOverlay,
              {
                backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.45)',
              },
            ]}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: currColors.card },
              ]}
            >
              <View style={styles.modalGrabHandle} />
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: isDark ? currColors.border : '#F1F5F9' },
                ]}
              >
                <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                  {dataSheetType === 'investments' ? 'Investments Data' : 'Money Manager Data'}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setDataSheetType(null)}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={currColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ padding: 16 }}>
                <View style={styles.modalGridRow}>
                  {renderColoredGridBox({
                    title: 'Download Sample',
                    subtitle: dataSheetType === 'investments'
                      ? 'Stock template (.xlsx)'
                      : 'Cashflow template (.xlsx)',
                    customIcon: (
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: '#FFFFFF90',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <FileText size={18} color="#064E3B" />
                      </View>
                    ),
                    palette: {
                      bg: '#D1F5EC',
                      text: '#064E3B',
                      sub: '#047857',
                      border: '#34D399',
                    },
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

                  {renderColoredGridBox({
                    title: 'Import Data',
                    subtitle: dataSheetType === 'investments'
                      ? 'Bulk stock trades (.xlsx)'
                      : 'Cashflow records (.xlsx)',
                    customIcon: (
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: '#FFFFFF90',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Upload size={18} color="#0C4A6E" />
                      </View>
                    ),
                    palette: {
                      bg: '#BAE6FD',
                      text: '#0C4A6E',
                      sub: '#0369A1',
                      border: '#38BDF8',
                    },
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
                </View>

                <View style={[styles.modalGridRow, { marginTop: 10 }]}>
                  {renderColoredGridBox({
                    title: 'Backup Data',
                    subtitle: dataSheetType === 'investments'
                      ? 'Portfolio snapshot (.json)'
                      : 'Cashflow & loans (.json)',
                    customIcon: (
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: '#FFFFFF90',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Database size={18} color="#581C87" />
                      </View>
                    ),
                    palette: {
                      bg: '#E9D5FF',
                      text: '#581C87',
                      sub: '#7E22CE',
                      border: '#C084FC',
                    },
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

                  {renderColoredGridBox({
                    title: 'Export Excel',
                    subtitle: dataSheetType === 'investments'
                      ? 'Complete stock ledger (.xlsx)'
                      : 'Accounts & cashflow (.xlsx)',
                    customIcon: (
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: '#FFFFFF90',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Download size={18} color="#713F12" />
                      </View>
                    ),
                    palette: {
                      bg: '#FEF08A',
                      text: '#713F12',
                      sub: '#854D0E',
                      border: '#FACC15',
                    },
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
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Profile Modal */}
        <Modal
          visible={isEditModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[
              styles.modalOverlay,
              {
                backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.45)',
              },
            ]}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: currColors.card },
              ]}
            >
              <View style={styles.modalGrabHandle} />
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: isDark ? currColors.border : '#F1F5F9' },
                ]}
              >
                <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                  Edit Profile
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setIsEditModalVisible(false)}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={currColors.textSecondary} />
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
                  <View style={[styles.editImageOverlay, { borderColor: currColors.card }]}>
                    <Edit2 size={14} color="#FFF" />
                  </View>
                </TouchableOpacity>

                <View
                  style={[
                    styles.inputGroup,
                    {
                      backgroundColor: isDark ? currColors.cardSecondary : '#F8FAFC',
                      borderColor: isDark ? currColors.border : '#E2E8F0',
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
                      backgroundColor: isDark ? currColors.cardSecondary : '#F8FAFC',
                      borderColor: isDark ? currColors.border : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.inputIcon}>
                    <Mail size={18} color={currColors.textSecondary} />
                  </View>
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
                      backgroundColor: isDark ? currColors.cardSecondary : '#F8FAFC',
                      borderColor: isDark ? currColors.border : '#E2E8F0',
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
                  style={[styles.saveButton, { backgroundColor: currColors.tint }]}
                  onPress={handleSaveProfile}
                  activeOpacity={0.8}
                >
                  <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeftAction: {
    width: 38,
    alignItems: 'flex-start',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenterTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headerBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  headerBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
  },
  headerRightAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 4,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  modalGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  settingsCardContainer: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingsTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  settingsTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  settingsSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },
  modalAvatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 24,
    position: 'relative',
  },
  modalAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginBottom: 14,
    width: '100%',
    paddingHorizontal: 16,
    height: 52,
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
    height: 52,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
});

