import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
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
} from 'lucide-react-native';
import { useMoneyStore } from '@/store/useMoneyStore';


import React, { useMemo, useState } from 'react';
import {
  Alert,
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

import { SafeAreaView } from 'react-native-safe-area-context';
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
  const currColors = Colors[colorScheme];

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Modal Edit State
  const [editName, setEditName] = useState(userName);
  const [editEmail, setEditEmail] = useState(userEmail);
  const [editMobile, setEditMobile] = useState(userMobile);

  // Category Management State
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('expense');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const storeCategories = useMoneyStore((state) => state.categories) || {
    income: ['Salary', 'Investments', 'Business', 'Gift', 'Refund', 'Other'],
    expense: ['Food & Dining', 'Rent & Bills', 'Shopping', 'Entertainment', 'Travel', 'Medical', 'Education', 'Other']
  };
  const addCategory = useMoneyStore((state) => state.addCategory);
  const updateCategory = useMoneyStore((state) => state.updateCategory);
  const removeCategory = useMoneyStore((state) => state.removeCategory);

  const moneyTransactions = useMoneyStore((state) => state.moneyTransactions);
  const moneyAccounts = useMoneyStore((state) => state.accounts);
  const importMoneyData = useMoneyStore((state) => state.importMoneyData);

  const handleDownloadMoneySample = async () => {
    try {
      const sampleData = [
        {
          Date: '2026-07-01',
          Type: 'EXPENSE',
          Amount: 150.0,
          Category: 'Food & Dining',
          Account: 'Savings Account',
          'To Account (Transfers only)': '',
          Note: 'Coffee and snacks at work',
        },
        {
          Date: '2026-07-02',
          Type: 'INCOME',
          Amount: 50000.0,
          Category: 'Salary',
          Account: 'Savings Account',
          'To Account (Transfers only)': '',
          Note: 'Monthly paycheck',
        },
        {
          Date: '2026-07-03',
          Type: 'TRANSFER',
          Amount: 1000.0,
          Category: 'Transfer',
          Account: 'Savings Account',
          'To Account (Transfers only)': 'Cash Wallet',
          Note: 'ATM Cash Withdrawal',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Money_Manager_Template');

      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const filename = `Money_Manager_Sample_Template.xlsx`;
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
    if (moneyTransactions.length === 0) {
      Alert.alert('No Data', 'There are no money transactions to export.');
      return;
    }

    try {
      const accountMap = new Map(moneyAccounts.map((a) => [a.id, a.name]));
      const exportData = moneyTransactions.map((tx) => ({
        Date: tx.date.split('T')[0],
        Type: tx.type.toUpperCase(),
        Amount: tx.amount,
        Category: tx.category,
        Account: accountMap.get(tx.accountId) || 'Unknown Account',
        'To Account (Transfers only)': tx.toAccountId ? accountMap.get(tx.toAccountId) || 'Unknown Account' : '',
        Note: tx.note || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cashflow');

      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const filename = `Money_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Export Money Transactions',
          UTI: 'com.microsoft.excel.xlsx',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Money Export Error:', error);
      Alert.alert('Export Failed', 'An error occurred while exporting money transactions.');
    }
  };

  const handleBackupMoney = async () => {
    if (moneyTransactions.length === 0) {
      Alert.alert('No Data', 'There are no money transactions to backup.');
      return;
    }

    try {
      const accountMap = new Map(moneyAccounts.map((a) => [a.id, a.name]));
      const backupData = moneyTransactions.map((tx) => ({
        Date: tx.date.split('T')[0],
        Type: tx.type.toUpperCase(),
        Amount: tx.amount,
        Category: tx.category,
        Account: accountMap.get(tx.accountId) || 'Unknown Account',
        'To Account (Transfers only)': tx.toAccountId ? accountMap.get(tx.toAccountId) : '',
        Note: tx.note || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(backupData);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

      const filename = `Gainbase_Money_Backup_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, csvOutput, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Backup Money Transactions',
          UTI: 'public.comma-separated-values-text',
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

      const currentAccounts = [...moneyAccounts];
      const newTransactions: any[] = [];
      const categoriesToAdd: { type: 'income' | 'expense'; name: string }[] = [];

      for (const row of jsonData) {
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

        // Find or create primary account
        let acc = currentAccounts.find((a) => a.name.toLowerCase() === accountName.toLowerCase());
        if (!acc) {
          acc = {
            id: Math.random().toString(36).substring(2, 9),
            name: accountName,
            balance: 0,
            type: 'cash',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isArchived: false,
          };
          currentAccounts.push(acc);
        }

        let toAccId: string | undefined;
        if (type === 'transfer' && toAccountName) {
          let toAcc = currentAccounts.find((a) => a.name.toLowerCase() === toAccountName.toLowerCase());
          if (!toAcc) {
            toAcc = {
              id: Math.random().toString(36).substring(2, 9),
              name: toAccountName,
              balance: 0,
              type: 'cash',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isArchived: false,
            };
            currentAccounts.push(toAcc);
          }
          toAccId = toAcc.id;

          // Adjust balances locally
          acc.balance -= amount;
          toAcc.balance += amount;
        } else if (type === 'income') {
          acc.balance += amount;
        } else {
          acc.balance -= amount;
        }

        // Check if category is registered in store, otherwise enqueue for addition
        if (type !== 'transfer') {
          const currentStoreCats = storeCategories[type];
          if (!currentStoreCats.map((c) => c.toLowerCase()).includes(category.toLowerCase())) {
            categoriesToAdd.push({ type, name: category });
          }
        }

        newTransactions.push({
          id: Math.random().toString(36).substring(2, 9),
          accountId: acc.id,
          toAccountId: toAccId,
          type,
          amount,
          category: type === 'transfer' ? 'Transfer' : category,
          date: dateStr,
          note: note || undefined,
        });
      }

      if (newTransactions.length > 0) {
        // Bulk add imported transactions and updated accounts
        importMoneyData(newTransactions, currentAccounts);

        // Dynamically add unregistered categories
        const addedNames = new Set<string>();
        categoriesToAdd.forEach(({ type, name }) => {
          const key = `${type}:${name.toLowerCase()}`;
          if (!addedNames.has(key)) {
            addCategory(type, name);
            addedNames.add(key);
          }
        });

        Alert.alert(
          'Success',
          `Successfully imported ${newTransactions.length} transactions and synchronized account balances.`,
        );
      } else {
        Alert.alert(
          'Error',
          'No valid transactions found in the file. Please check the sample format.',
        );
      }
    } catch (error) {
      console.error('Import Money Error:', error);
      Alert.alert(
        'Import Failed',
        'Ensure the file matches the money manager sample template format.',
      );
    }
  };


  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const currentList = storeCategories[categoryType];
    if (currentList.map(c => c.toLowerCase()).includes(name.toLowerCase())) {
      Alert.alert('Duplicate Category', 'This category already exists.');
      return;
    }
    addCategory(categoryType, name);
    setNewCategoryName('');
  };

  const handleStartEdit = (cat: string) => {
    setEditingCategory(cat);
    setEditCategoryName(cat);
  };

  const handleSaveEdit = (oldCat: string) => {
    const name = editCategoryName.trim();
    if (!name) return;
    if (name === oldCat) {
      setEditingCategory(null);
      return;
    }
    const currentList = storeCategories[categoryType];
    if (currentList.map(c => c.toLowerCase()).includes(name.toLowerCase())) {
      Alert.alert('Duplicate Category', 'A category with this name already exists.');
      return;
    }
    updateCategory(categoryType, oldCat, name);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (cat: string) => {
    if (cat === 'Other') {
      Alert.alert('Restricted Action', 'The "Other" category is required and cannot be deleted.');
      return;
    }
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat}"? Transactions using it will fall back to "Other".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeCategory(categoryType, cat);
          },
        },
      ]
    );
  };


  const summary = useMemo(
    () => calculateSummary(),
    [transactions, tickers, calculateSummary],
  );

  const handleOpenEditModal = () => {
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
      'Are you sure you want to delete all your data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            Alert.alert('Success', 'All data has been deleted.');
          },
        },
      ]
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
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: currColors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View
        style={[styles.container, { backgroundColor: currColors.background }]}
      >
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* Consolidated User Info & Stats Box */}
          <View
            style={[
              styles.userInfoContainer,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
              },
            ]}
          >
            <View style={styles.profileRow}>
              <View
                style={[
                  styles.avatarContainer,
                  { backgroundColor: currColors.card },
                ]}
              >
                <Image
                  source={{
                    uri:
                      userImage ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName || 'User'}`,
                  }}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.nameContainer}>
                <ThemedText style={[styles.nameText, { color: currColors.text }]}>
                  {userName || 'Set up your profile'}
                </ThemedText>
                {userEmail ? (
                  <ThemedText
                    style={[
                      styles.emailText,
                      { color: currColors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {userEmail}
                  </ThemedText>
                ) : (
                  <ThemedText
                    style={[
                      styles.emailText,
                      { color: currColors.textSecondary },
                    ]}
                  >
                    Tap the edit icon to get started
                  </ThemedText>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.mainEditIcon,
                  { backgroundColor: currColors.cardSecondary },
                ]}
                onPress={handleOpenEditModal}
              >
                <Edit2 size={20} color={currColors.tint} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: currColors.text }]}>
                  {isPrivacyMode ? '****' : transactions.length}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.statLabel,
                    { color: currColors.textSecondary },
                  ]}
                >
                  Transactions
                </ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: currColors.text }]}>
                  {isPrivacyMode
                    ? '****'
                    : `${showCurrencySymbol ? '₹' : ''}${summary.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact', compactDisplay: 'short' })}`}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.statLabel,
                    { color: currColors.textSecondary },
                  ]}
                >
                  Net assets
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Investment Portfolio Section */}
          <ThemedText style={[styles.sectionHeading, { color: currColors.textSecondary }]}>
            INVESTMENT PORTFOLIO (STOCKS)
          </ThemedText>
          <View
            style={[
              styles.actionGridContainer,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
                marginTop: 8,
              },
            ]}
          >
            <View style={styles.gridRow}>
              <TouchableOpacity
                style={styles.gridButton}
                onPress={handleDownloadSample}
              >
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: currColors.cardSecondary },
                  ]}
                >
                  <FileText size={24} color={currColors.tint} />
                </View>
                <ThemedText style={[styles.gridLabel, { color: currColors.text }]}>
                  Sample
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridButton}
                onPress={handleImport}
              >
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: currColors.cardSecondary },
                  ]}
                >
                  <Upload size={24} color={currColors.tint} />
                </View>
                <ThemedText style={[styles.gridLabel, { color: currColors.text }]}>
                  Import
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridButton}
                onPress={handleBackup}
              >
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: currColors.cardSecondary },
                  ]}
                >
                  <Database size={24} color={currColors.tint} />
                </View>
                <ThemedText style={[styles.gridLabel, { color: currColors.text }]}>
                  Backup
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridButton}
                onPress={handleExport}
              >
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: currColors.cardSecondary },
                  ]}
                >
                  <Download size={24} color={currColors.tint} />
                </View>
                <ThemedText style={[styles.gridLabel, { color: currColors.text }]}>
                  Export
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Money Manager Section */}
          <ThemedText style={[styles.sectionHeading, { color: currColors.textSecondary, marginTop: 12 }]}>
            MONEY MANAGER (CASHFLOW)
          </ThemedText>
          <View
            style={[
              styles.actionGridContainer,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
                marginTop: 8,
              },
            ]}
          >
            <View style={styles.gridRow}>
              <TouchableOpacity
                style={styles.gridButton}
                onPress={handleDownloadMoneySample}
              >
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: currColors.cardSecondary },
                  ]}
                >
                  <FileText size={24} color={currColors.tint} />
                </View>
                <ThemedText style={[styles.gridLabel, { color: currColors.text }]}>
                  Sample
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridButton}
                onPress={handleImportMoney}
              >
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: currColors.cardSecondary },
                  ]}
                >
                  <Upload size={24} color={currColors.tint} />
                </View>
                <ThemedText style={[styles.gridLabel, { color: currColors.text }]}>
                  Import
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridButton}
                onPress={handleBackupMoney}
              >
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: currColors.cardSecondary },
                  ]}
                >
                  <Database size={24} color={currColors.tint} />
                </View>
                <ThemedText style={[styles.gridLabel, { color: currColors.text }]}>
                  Backup
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridButton}
                onPress={handleExportMoney}
              >
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: currColors.cardSecondary },
                  ]}
                >
                  <Download size={24} color={currColors.tint} />
                </View>
                <ThemedText style={[styles.gridLabel, { color: currColors.text }]}>
                  Export
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings & Preferences Section */}
          <ThemedText style={[styles.sectionHeading, { color: currColors.textSecondary, marginTop: 12 }]}>
            SETTINGS & PREFERENCES
          </ThemedText>
          <View
            style={[
              styles.actionGridContainer,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
                marginTop: 8,
              },
            ]}
          >
            <View style={styles.gridRow}>
              <TouchableOpacity
                style={styles.gridButton}
                onPress={() => router.push('/settings')}
              >
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: currColors.cardSecondary },
                  ]}
                >
                  <Settings size={24} color={currColors.tint} />
                </View>
                <ThemedText style={[styles.gridLabel, { color: currColors.text }]}>
                  Settings
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridButton}
                onPress={() => setIsCategoryModalVisible(true)}
              >
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: currColors.cardSecondary },
                  ]}
                >
                  <Tag size={24} color={currColors.tint} />
                </View>
                <ThemedText style={[styles.gridLabel, { color: currColors.text }]}>
                  Categories
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridButton}
                onPress={() => {
                  Linking.openURL(
                    'https://chat.whatsapp.com/INyTPVgPq908dEMWgFiq44?mode=gi_t',
                  );
                }}
              >
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: 'rgba(37, 211, 102, 0.1)' },
                  ]}
                >
                  <MessageCircle size={24} color="#25D366" />
                </View>
                <ThemedText style={[styles.gridLabel, { color: currColors.text }]}>
                  WhatsApp
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridButton}
                onPress={handleDeleteData}
              >
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: 'rgba(255, 59, 48, 0.1)' },
                  ]}
                >
                  <Trash2 size={24} color="#FF3B30" />
                </View>
                <ThemedText style={[styles.gridLabel, { color: currColors.text }]}>
                  Delete Data
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>

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
                backgroundColor:
                  theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.4)',
              },
            ]}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: currColors.card },
              ]}
            >
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
                  style={styles.closeButton}
                >
                  <X size={24} color={currColors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <TouchableOpacity
                  style={styles.modalAvatarContainer}
                  onPress={handlePickImage}
                >
                  <Image
                    source={{
                      uri:
                        userImage ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName || 'User'}`,
                    }}
                    style={styles.modalAvatar}
                  />
                  <View style={styles.editImageOverlay}>
                    <Edit2 size={16} color="#FFF" />
                  </View>
                </TouchableOpacity>

                <View
                  style={[
                    styles.inputGroup,
                    {
                      backgroundColor: currColors.card,
                      borderColor: currColors.border,
                    },
                  ]}
                >
                  <View style={styles.inputIcon}>
                    <User size={20} color={currColors.textSecondary} />
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
                      backgroundColor: currColors.card,
                      borderColor: currColors.border,
                    },
                  ]}
                >
                  <View style={styles.inputIcon}>
                    <Mail size={20} color={currColors.textSecondary} />
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
                      backgroundColor: currColors.card,
                      borderColor: currColors.border,
                    },
                  ]}
                >
                  <View style={styles.inputIcon}>
                    <Phone size={20} color={currColors.textSecondary} />
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
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                >
                  <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Manage Categories Modal */}
        <Modal
          visible={isCategoryModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsCategoryModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[
              styles.modalOverlay,
              {
                backgroundColor:
                  theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.4)',
              },
            ]}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: currColors.card, height: '75%', paddingHorizontal: 24 },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: currColors.border, paddingHorizontal: 0 },
                ]}
              >
                <ThemedText style={[styles.modalTitle, { color: currColors.text }]}>
                  Manage Categories
                </ThemedText>
                <TouchableOpacity
                  onPress={() => {
                    setEditingCategory(null);
                    setIsCategoryModalVisible(false);
                  }}
                  style={styles.closeButton}
                >
                  <X size={24} color={currColors.text} />
                </TouchableOpacity>
              </View>

              {/* Category Type Switcher (Segmented Control) */}
              <View style={[styles.modalSegmentContainer, { backgroundColor: currColors.cardSecondary }]}>
                {(['expense', 'income'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.modalSegmentTab,
                      categoryType === t && {
                        backgroundColor: t === 'income' ? '#34C759' : '#FF3B30',
                      },
                    ]}
                    onPress={() => {
                      setEditingCategory(null);
                      setCategoryType(t);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.modalSegmentLabel,
                        {
                          color: categoryType === t ? '#FFFFFF' : currColors.textSecondary,
                          fontFamily: categoryType === t ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
                        },
                      ]}
                    >
                      {t.toUpperCase()}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView
                style={{ flex: 1, marginBottom: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {storeCategories[categoryType].map((cat) => {
                  const isEditing = editingCategory === cat;
                  return (
                    <View
                      key={cat}
                      style={[styles.categoryRow, { borderBottomColor: currColors.border }]}
                    >
                      {isEditing ? (
                        <View style={styles.editRowContainer}>
                          <TextInput
                            style={[styles.inlineInput, { color: currColors.text, borderColor: currColors.tint }]}
                            value={editCategoryName}
                            onChangeText={setEditCategoryName}
                            autoFocus
                            placeholder="Category Name"
                            placeholderTextColor={currColors.textSecondary}
                          />
                          <View style={styles.inlineActionButtons}>
                            <TouchableOpacity
                              onPress={() => handleSaveEdit(cat)}
                              style={[styles.iconButton, { backgroundColor: '#34C75920' }]}
                            >
                              <Check size={18} color="#34C759" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setEditingCategory(null)}
                              style={[styles.iconButton, { backgroundColor: '#FF3B3020' }]}
                            >
                              <X size={18} color="#FF3B30" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <>
                          <ThemedText style={{ color: currColors.text, fontSize: 16, fontFamily: 'Outfit_500Medium' }}>
                            {cat}
                          </ThemedText>
                          <View style={styles.rowActions}>
                            <TouchableOpacity
                              onPress={() => handleStartEdit(cat)}
                              style={styles.actionIcon}
                            >
                              <Edit2 size={16} color={currColors.textSecondary} />
                            </TouchableOpacity>
                            {cat !== 'Other' && (
                              <TouchableOpacity
                                onPress={() => handleDeleteCategory(cat)}
                                style={styles.actionIcon}
                              >
                                <Trash2 size={16} color="#FF3B30" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              {/* Add Category Section */}
              <View style={[styles.addCategoryContainer, { borderTopColor: currColors.border, paddingBottom: Platform.OS === 'ios' ? 20 : 10 }]}>
                <TextInput
                  style={[
                    styles.addCategoryInput,
                    {
                      backgroundColor: currColors.cardSecondary,
                      borderColor: currColors.border,
                      color: currColors.text,
                    },
                  ]}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder={`Add custom ${categoryType} category`}
                  placeholderTextColor={currColors.textSecondary}
                />
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: '#00C9A7' }]}
                  onPress={handleAddCategory}
                >
                  <Plus size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFF',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 15,
  },
  headerIconButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  userInfoContainer: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 4,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  emailText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  mainEditIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actionGridContainer: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // gap removed to let space-between handle it
  },
  gridButton: {
    alignItems: 'center',
    width: 70,
  },
  gridIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '400',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  modalAvatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 30,
    position: 'relative',
  },
  modalAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1C1C1E',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  modalInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 56,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1,
    marginLeft: 4,
    marginBottom: 4,
  },
  modalSegmentContainer: {

    flexDirection: 'row',
    height: 40,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  modalSegmentTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  modalSegmentLabel: {
    fontSize: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  editRowContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    marginRight: 10,
  },
  inlineActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    padding: 8,
    marginLeft: 8,
  },
  addCategoryContainer: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  addCategoryInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    marginRight: 12,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

