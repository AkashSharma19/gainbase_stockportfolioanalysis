import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowLeft,
  Settings,
  Send,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  ChevronDown,
  Check,
  X,
  CheckCircle2,
  XCircle,
  Wallet,
  Users,
  CreditCard,
  Building2,
  Landmark,
  Repeat,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ArrowUp,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackButton } from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Category3DIcon } from '@/components/Category3DIcon';
import { findBest3DIconForText } from '@/constants/Category3DIcons';
import { FolderPalette, getInterlockingCardPath } from '@/constants/folderTheme';
import { useAiStore, ChatMessage, ChatAction } from '@/store/useAiStore';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { useAppModeStore } from '@/store/useAppModeStore';
import { Account, AccountType, MoneyTransaction, EMIPayment, SubscriptionPayment } from '@/types/money';

const MODEL_PRESETS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

interface StarterSuggestion {
  id: string;
  title: string;
  subtitle: string;
  palette: FolderPalette;
  prompt: string;
}

const STARTER_SUGGESTIONS: StarterSuggestion[] = [
  {
    id: 'expense',
    title: 'Log Daily Expense',
    subtitle: 'Spent ₹350 on coffee & snacks',
    palette: { bg: '#FEF3C7', text: '#78350F', sub: '#92400E' },
    prompt: 'I spent ₹350 on coffee and snacks with friends from my wallet. Record this expense and tell me if it was needed.',
  },
  {
    id: 'investments',
    title: 'Portfolio Snapshot',
    subtitle: 'View stock returns, value & holdings',
    palette: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
    prompt: 'Show my stock investments portfolio performance, holdings, and return summary.',
  },
  {
    id: 'loan',
    title: 'Pay Loan EMI',
    subtitle: 'Record ₹15,000 Home Loan payment',
    palette: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
    prompt: 'I just paid ₹15,000 for my Home Loan EMI. Update my loan and record the transaction.',
  },
  {
    id: 'subscription',
    title: 'Track Subscription',
    subtitle: 'Paid ₹649 for Netflix renewal',
    palette: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' },
    prompt: 'I paid ₹649 for my Netflix subscription renewal. Record it and advance my cycle.',
  },
  {
    id: 'peer',
    title: 'Peer Lending / Given',
    subtitle: 'Lent ₹2,500 to a friend',
    palette: { bg: '#BAE6FD', text: '#0C4A6E', sub: '#0369A1' },
    prompt: 'I gave ₹2,500 to Rahul as a loan from my bank account. Record it as a receivable.',
  },
  {
    id: 'burn_rate',
    title: 'Burn Rate & Runway',
    subtitle: 'Analyze spending velocity & runway',
    palette: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
    prompt: 'Analyze my monthly spending burn rate, daily velocity, and financial runway.',
  },
];

interface QuickChip {
  label: string;
  palette: FolderPalette;
  prompt: string;
}

const QUICK_CHIPS: QuickChip[] = [
  {
    label: 'My Portfolio',
    palette: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' },
    prompt: 'Show my stock investments portfolio snapshot and returns',
  },
  {
    label: 'Active Loans',
    palette: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' },
    prompt: 'Show my active loans and debt summary',
  },
  {
    label: 'Subscriptions',
    palette: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' },
    prompt: 'Show my active subscriptions and monthly recurring burn',
  },
  {
    label: 'Log Expense',
    palette: { bg: '#FEF3C7', text: '#78350F', sub: '#92400E' },
    prompt: 'I spent ₹350 on lunch. Record this expense.',
  },
  {
    label: 'Burn Rate',
    palette: { bg: '#FCE7F3', text: '#831843', sub: '#9D174D' },
    prompt: 'What is my current monthly burn rate and runway?',
  },
];

export default function GeminiChatScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 32);
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const [cardWidth, setCardWidth] = useState(SCREEN_WIDTH - 32);

  const currColors = Colors[colorScheme];
  // Unified Gainbase App Design System Palette
  const geminiColors = {
    bg: currColors.background, // Pure pitch-black #000000 in dark, #F2F2F7 in light
    headerBg: currColors.background,
    inputBg: isDark ? '#1C1C1E' : '#FFFFFF',
    inputBorder: currColors.border,
    userBubble: isDark ? '#2C2C2E' : '#E5E5EA',
    userBubbleText: isDark ? '#FFFFFF' : '#000000',
    aiSparkleBg: isDark ? '#1C1C1E' : '#E8F0FE',
    sparkleColor: isDark ? '#FFFFFF' : '#0A84FF',
    text: currColors.text,
    textSecondary: currColors.textSecondary,
    border: currColors.border,
    sendBtnActive: isDark ? '#FFFFFF' : '#000000',
    sendBtnInactive: isDark ? '#3A3A3C' : '#C7C7CC',
    cardBg: isDark ? '#1C1C1E' : '#FFFFFF',
    cardBorder: currColors.border,
    successBg: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)',
    successText: '#34C759',
    warningBg: isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.1)',
    warningText: '#FF9500',
    dangerBg: isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)',
    dangerText: '#FF3B30',
  };

  // Stores state
  const {
    geminiApiKey,
    selectedModel,
    messages,
    setGeminiApiKey,
    setSelectedModel,
    addMessage,
    updateMessageAction,
    clearMessages,
  } = useAiStore();
  const moneyAccounts = useMoneyStore((state) => state.accounts);
  const addAccount = useMoneyStore((state) => state.addAccount);
  const addMoneyTransaction = useMoneyStore((state) => state.addMoneyTransaction);
  const moneyLoans = useMoneyStore((state) => state.loans);
  const addEMIPayment = useMoneyStore((state) => state.addEMIPayment);
  const moneyBudgets = useMoneyStore((state) => state.budgets);
  const moneyTransactions = useMoneyStore((state) => state.moneyTransactions);
  const moneySubscriptions = useMoneyStore((state) => state.subscriptions);
  const addSubscriptionPayment = useMoneyStore((state) => state.addSubscriptionPayment);

  const getHoldingsData = usePortfolioStore((state) => state.getHoldingsData);
  const watchlist = usePortfolioStore((state) => state.watchlist);
  const calculateSummary = usePortfolioStore((state) => state.calculateSummary);
  const setActiveMode = useAppModeStore((state) => state.setActiveMode);

  // Local state
  const [inputText, setInputText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(!MODEL_PRESETS.includes(selectedModel));
  const [customModelInput, setCustomModelInput] = useState(isCustomModel ? selectedModel : '');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Sync keyboard visibility status for fluid shifting offsets
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Auto-scroll to bottom of inverted list ONLY when the user sends a message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'user') {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 80);
      }
    }
  }, [messages]);

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Compile local financial status as System Context
  const systemContext = useMemo(() => {
    const accountsText = moneyAccounts
      .filter((a) => !a.isArchived)
      .map((a) => `- ${a.name} (${a.type}): Balance ${a.balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`)
      .join('\n');

    const loansText = moneyLoans
      .filter((l) => l.isActive)
      .map((l) => `- ${l.name}: Principal Owed = ${l.outstandingAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}, EMI = ${l.emiAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}/mo`)
      .join('\n');

    const budgetsText = moneyBudgets
      .filter((b) => b.isActive)
      .map((b) => {
        const catsText = b.categories
          .map((c) => `  * ${c.name}: limit = ${c.limit.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}, spent = ${c.spent.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`)
          .join('\n');
        return `- Budget "${b.name}" (${b.period}):\n${catsText}`;
      })
      .join('\n');

    // SaaS Subscriptions
    const subscriptionsText = moneySubscriptions
      .filter((s) => s.isActive)
      .map((s) => `- ${s.name}: ${s.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}/${s.billingCycle}, Next Renewal: ${new Date(s.nextPaymentDate).toLocaleDateString()}`)
      .join('\n');

    // Money Transactions from the last 90 days for comprehensive cashflow analysis
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const recentTxText = moneyTransactions
      .filter((t) => new Date(t.date) >= ninetyDaysAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((t) => `- [${new Date(t.date).toLocaleDateString()}] ${t.type.toUpperCase()}: ${t.note || t.category} = ${t.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} (${t.category})`)
      .join('\n');

    // Stock holdings summary
    const holdings = getHoldingsData();
    const holdingsText = holdings
      .map((h: any) => `- ${h.symbol}: qty = ${h.quantity}, avgPrice = ${h.avgPrice.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`)
      .join('\n');

    // Portfolio overall performance figures
    const summary = calculateSummary();
    const portfolioSummaryText = `- Total Cost: ${summary.totalCost.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
- Current Value: ${summary.totalValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
- Unrealized Gain/Loss: ${summary.unrealizedReturn.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} (${summary.profitPercentage.toFixed(2)}%)
- Day Gain/Loss: ${summary.dayChange.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} (${summary.dayChangePercentage.toFixed(2)}%)
- XIRR: ${summary.xirr ? (summary.xirr * 100).toFixed(2) + '%' : 'N/A'}`;

    // Watchlist symbols
    const watchlistText = watchlist.length > 0 ? watchlist.join(', ') : 'None';

    return `You are Gainbase AI, the user's institutional-grade private financial advisor. You have access to their real-time ledger:

[ACTIVE MONETARY ACCOUNTS]
${accountsText || 'No accounts added'}

[ACTIVE LOANS & EMIS]
${loansText || 'No active loans'}

[MONTHLY BUDGET LIMITS]
${budgetsText || 'No active budgets'}

[ACTIVE RECURRING SUBSCRIPTIONS]
${subscriptionsText || 'No active SaaS subscriptions'}

[RECENT TRANSACTIONS LOG]
${recentTxText || 'No transaction history'}

[STOCK PORTFOLIO HOLDINGS]
${holdingsText || 'No holdings tracked'}

[STOCK PORTFOLIO SUMMARY]
${portfolioSummaryText}

[WATCHLISTED STOCKS]
${watchlistText}

CRITICAL INSTRUCTIONS FOR RESPONSES AND ACTIONS:

1. SPENDING & TRANSACTION GUIDANCE ("WAS IT NEEDED OR NOT?"):
Whenever the user mentions an expense, spending, lending money, giving money, paying an EMI/subscription, or receiving money:
- Always include direct, candid guidance in your response evaluating whether this transaction was an "Essential Need", "Discretionary Want", "Receivable / Loan", or "Investment".
- Comment on the necessity and impact on their financial health or budget.
- For money given/lent to friends/contacts (e.g. "I gave 500rs to Rajat"): explain that this is a receivable (an asset to collect later), remind them to track repayment, and advise on prudent peer-lending limits.
- For EMI payments (e.g. "Paid 15000 home loan EMI"): emphasize the importance of paying EMIs on time to maintain credit score and reduce loan interest burden.

2. STRUCTURED LEDGER ACTIONS:
If the user's message indicates an intent to record a transaction, lend/borrow money, pay an EMI, pay a subscription, create a contact/account, or VIEW interactive snapshots of investments, loans, or subscriptions:
You MUST return your response as a valid JSON object in this exact format:
{
  "reply": "Your conversational response with candid guidance on whether this transaction was needed, its financial implications, and confirmation details.",
  "hasAction": true,
  "action": {
    "type": "create_account_and_add_transaction" | "add_transaction" | "pay_emi" | "pay_subscription" | "show_investments" | "show_loans" | "show_subscriptions",
    "accountName": "Name of the person/account (e.g. 'Rajat', 'Cash Wallet', 'SBI Savings', 'HDFC Bank', 'Portfolio')",
    "accountType": "receivable" | "payable" | "wallet" | "savings" | "credit_card" | "investment",
    "amount": 500,
    "transactionType": "income" | "expense" | "transfer",
    "category": "Receivable" | "EMI Payments" | "Food & Dining" | "Rent & Bills" | "Shopping" | "Salary" | "Subscriptions - OTT" | "Investments" | "Others",
    "note": "Given to Rajat / EMI payment for Home Loan",
    "necessityVerdict": "Receivable / Loan" | "Essential / Need" | "Discretionary / Want" | "Investment" | "Neutral",
    "necessityReason": "1 punchy sentence evaluating whether it was needed or what it represents financially.",
    "loanName": "Home Loan",
    "subscriptionName": "Netflix"
  }
}

Special rules:
- For Peer Lending / Giving Money ("I gave X to [Person]"):
  Set accountName="[Person]", accountType="receivable", transactionType="income" (receivable balance increases), category="Receivable", necessityVerdict="Receivable / Loan".
- For EMI / Loan Payments ("Paid X EMI", "Paid car loan EMI of X", "Home loan EMI paid"):
  Set type="pay_emi", category="EMI Payments", transactionType="expense", loanName="Exact matching loan name from [ACTIVE LOANS & EMIS]", necessityVerdict="Essential / Need".
- For Subscriptions ("Paid Netflix", "Spotify subscription paid"):
  Set type="pay_subscription", category="Subscriptions - OTT", transactionType="expense", subscriptionName="Exact matching subscription name from [ACTIVE RECURRING SUBSCRIPTIONS]", necessityVerdict="Discretionary / Want".
- For Investment / Portfolio inquiries ("Show my portfolio", "Portfolio snapshot", "How are my investments?"):
  Set type="show_investments", category="Investments", necessityVerdict="Investment", necessityReason="Live portfolio valuation & returns summary.".
- For Loans / Debt list inquiries ("Show my loans", "What loans do I have?", "Active loans"):
  Set type="show_loans", category="EMI Payments", necessityVerdict="Essential / Need", necessityReason="Summary of active loan obligations and monthly EMI commitment.".
- For Subscriptions inquiries ("Show my subscriptions", "Active subscriptions", "OTT services"):
  Set type="show_subscriptions", category="Subscriptions - OTT", necessityVerdict="Discretionary / Want", necessityReason="Summary of recurring SaaS & memberships burn rate.".

If user asks general financial questions (e.g. "What is inflation?", "How to budget?"):
Return JSON:
{
  "reply": "Your markdown formatted advice...",
  "hasAction": false
}`;
  }, [moneyAccounts, moneyLoans, moneyBudgets, moneyTransactions, moneySubscriptions, getHoldingsData, watchlist, calculateSummary]);

  // Approve Proposed Action
  const handleApproveAction = (messageId: string, action: ChatAction) => {
    handleHaptic();

    const noteAndName = `${action.note || ''} ${action.loanName || ''} ${action.accountName || ''} ${action.category || ''}`.toLowerCase();
    const isEmiAction =
      action.type === 'pay_emi' ||
      action.category === 'EMI Payments' ||
      noteAndName.includes('emi') ||
      noteAndName.includes('loan') ||
      action.loanName !== undefined;

    const isSubAction =
      action.type === 'pay_subscription' ||
      action.category?.toLowerCase().includes('subscription') ||
      action.subscriptionName !== undefined;

    // --- CASE 1: EMI PAYMENT ---
    if (isEmiAction) {
      // Find matching loan in moneyLoans
      let targetLoan = moneyLoans.find(
        (l) =>
          (action.loanName && (
            l.name.trim().toLowerCase().includes(action.loanName.trim().toLowerCase()) ||
            l.lenderName.trim().toLowerCase().includes(action.loanName.trim().toLowerCase())
          )) ||
          (action.note && (
            l.name.trim().toLowerCase().includes(action.note.trim().toLowerCase()) ||
            action.note.trim().toLowerCase().includes(l.name.trim().toLowerCase())
          ))
      );

      // Fallback matching if not found
      if (!targetLoan) {
        const activeLoansList = moneyLoans.filter((l) => l.isActive);
        if (activeLoansList.length === 1) {
          targetLoan = activeLoansList[0];
        } else if (activeLoansList.length > 1) {
          targetLoan = activeLoansList.find((l) =>
            noteAndName.includes(l.name.toLowerCase()) ||
            noteAndName.includes(l.type.toLowerCase()) ||
            noteAndName.includes(l.lenderName.toLowerCase())
          ) || activeLoansList[0];
        }
      }

      const txId = Math.random().toString(36).substring(2, 9);

      if (targetLoan) {
        const rate = (targetLoan.interestRate / 12) / 100;
        const interestPortion = Math.min(targetLoan.outstandingAmount * rate, action.amount);
        const principalPortion = Math.min(targetLoan.outstandingAmount, action.amount - interestPortion);

        const payment: EMIPayment = {
          id: Math.random().toString(36).substring(2, 9),
          loanId: targetLoan.id,
          amount: action.amount,
          principalPortion,
          interestPortion,
          date: new Date().toISOString(),
          status: 'paid',
          transactionId: txId,
        };
        addEMIPayment(payment);
      }

      // Find source account
      let sourceAcc = moneyAccounts.find(
        (a) => a.name.trim().toLowerCase() === action.accountName.trim().toLowerCase()
      );
      if (!sourceAcc && targetLoan?.linkedAccountId) {
        sourceAcc = moneyAccounts.find((a) => a.id === targetLoan!.linkedAccountId);
      }
      if (!sourceAcc) {
        sourceAcc = moneyAccounts.find((a) => !a.isArchived && a.type !== 'credit_card') || moneyAccounts[0];
      }

      if (sourceAcc) {
        const newTx: MoneyTransaction = {
          id: txId,
          type: 'expense',
          amount: action.amount,
          category: 'EMI Payments',
          accountId: sourceAcc.id,
          date: new Date().toISOString(),
          note: action.note || `EMI payment for ${targetLoan?.name || 'Loan'}`,
          isRecurring: false,
        };
        addMoneyTransaction(newTx);
      }

      updateMessageAction(messageId, { status: 'confirmed' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    // --- CASE 2: SUBSCRIPTION PAYMENT ---
    if (isSubAction) {
      const targetSub = moneySubscriptions.find(
        (s) =>
          (action.subscriptionName && s.name.trim().toLowerCase().includes(action.subscriptionName.trim().toLowerCase())) ||
          (action.note && (
            s.name.trim().toLowerCase().includes(action.note.trim().toLowerCase()) ||
            action.note.trim().toLowerCase().includes(s.name.trim().toLowerCase())
          ))
      );

      const txId = Math.random().toString(36).substring(2, 9);

      if (targetSub) {
        const payment: SubscriptionPayment = {
          id: Math.random().toString(36).substring(2, 9),
          subscriptionId: targetSub.id,
          amount: action.amount || targetSub.amount,
          date: new Date().toISOString(),
          status: 'paid',
          transactionId: txId,
        };
        addSubscriptionPayment(payment);
      }

      let sourceAcc = moneyAccounts.find(
        (a) => a.name.trim().toLowerCase() === action.accountName.trim().toLowerCase()
      );
      if (!sourceAcc && targetSub?.linkedAccountId) {
        sourceAcc = moneyAccounts.find((a) => a.id === targetSub!.linkedAccountId);
      }
      if (!sourceAcc) {
        sourceAcc = moneyAccounts.find((a) => !a.isArchived && a.type !== 'credit_card') || moneyAccounts[0];
      }

      if (sourceAcc) {
        const newTx: MoneyTransaction = {
          id: txId,
          type: 'expense',
          amount: action.amount,
          category: targetSub?.category || 'Subscriptions - OTT',
          accountId: sourceAcc.id,
          date: new Date().toISOString(),
          note: action.note || `Subscription payment for ${targetSub?.name || 'Subscription'}`,
          isRecurring: false,
        };
        addMoneyTransaction(newTx);
      }

      updateMessageAction(messageId, { status: 'confirmed' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    // --- CASE 3: GENERAL TRANSACTION & ACCOUNT CREATION ---
    const existingAccount = moneyAccounts.find(
      (a) => a.name.trim().toLowerCase() === action.accountName.trim().toLowerCase()
    );

    let targetAccountId = existingAccount?.id;

    if (!existingAccount) {
      // Create new account
      const newAccountId = `acc-${Date.now()}`;
      const newAccount: Account = {
        id: newAccountId,
        name: action.accountName.trim(),
        type: action.accountType || 'receivable',
        balance: 0,
        icon: action.accountType === 'receivable' || action.accountType === 'payable' ? 'Users' : 'Wallet',
        color: action.accountType === 'receivable' ? '#34C759' : action.accountType === 'payable' ? '#FF3B30' : '#0A84FF',
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addAccount(newAccount);
      targetAccountId = newAccountId;
    }

    // Add transaction
    if (targetAccountId && action.amount > 0) {
      const newTx: MoneyTransaction = {
        id: `tx-${Date.now()}`,
        type: action.transactionType,
        amount: action.amount,
        category: action.category || 'General',
        accountId: targetAccountId,
        date: new Date().toISOString(),
        note: action.note || `${action.transactionType.toUpperCase()} via Gainbase AI`,
        isRecurring: false,
      };
      addMoneyTransaction(newTx);
    }

    // Mark action as confirmed
    updateMessageAction(messageId, { status: 'confirmed' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Dismiss Proposed Action
  const handleDismissAction = (messageId: string) => {
    handleHaptic();
    updateMessageAction(messageId, { status: 'dismissed' });
  };

  // Send Message handler (supports tapping suggestion pills & direct input)
  const handleSend = async (overridePrompt?: string) => {
    const textToSend = (overridePrompt ?? inputText).trim();
    if (!textToSend) return;

    if (!geminiApiKey.trim()) {
      handleHaptic();
      setShowSettings(true);
      Alert.alert('API Key Required', 'Please set up your Gemini API Key in the settings panel first.');
      return;
    }

    if (!overridePrompt) {
      setInputText('');
    }
    Keyboard.dismiss();
    handleHaptic();

    addMessage('user', textToSend);
    setIsSending(true);

    try {
      const formattedHistory = messages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              ...formattedHistory,
              {
                role: 'user',
                parts: [{ text: textToSend }],
              },
            ],
            systemInstruction: {
              parts: [{ text: systemContext }],
            },
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text.trim();
        let replyText = rawText;
        let actionPayload: ChatAction | undefined = undefined;

        try {
          // Strip markdown code fences if present
          let cleanJson = rawText;
          if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          const parsed = JSON.parse(cleanJson);
          if (parsed && typeof parsed === 'object') {
            if (parsed.reply) {
              replyText = parsed.reply;
            }
            if (parsed.hasAction && parsed.action) {
              actionPayload = {
                id: `action-${Date.now()}`,
                type: parsed.action.type || 'add_transaction',
                accountName: parsed.action.accountName || 'Cash Wallet',
                accountType: parsed.action.accountType || 'receivable',
                amount: Number(parsed.action.amount) || 0,
                transactionType: parsed.action.transactionType || 'expense',
                category: parsed.action.category || 'Other',
                note: parsed.action.note || '',
                status: 'pending',
                necessityVerdict: parsed.action.necessityVerdict,
                necessityReason: parsed.action.necessityReason,
                loanName: parsed.action.loanName,
                subscriptionName: parsed.action.subscriptionName,
              };
            }
          }
        } catch (e) {
          // If not JSON, replyText remains raw text
        }

        // Intelligent Fallback: If no action payload was formed, detect intent from prompt
        if (!actionPayload) {
          const lowerPrompt = textToSend.toLowerCase();
          if (
            lowerPrompt.includes('portfolio') ||
            lowerPrompt.includes('investment') ||
            lowerPrompt.includes('stock') ||
            lowerPrompt.includes('holdings')
          ) {
            actionPayload = {
              id: `action-${Date.now()}`,
              type: 'show_investments',
              accountName: 'Stock Portfolio',
              accountType: 'investment',
              amount: 0,
              transactionType: 'transfer',
              category: 'Investments',
              status: 'confirmed',
              necessityVerdict: 'Investment',
              necessityReason: 'Current valuation & allocation snapshot of tracked equities.',
            };
          } else if (
            lowerPrompt.includes('show loan') ||
            lowerPrompt.includes('my loan') ||
            lowerPrompt.includes('active loan') ||
            lowerPrompt.includes('debt summary')
          ) {
            actionPayload = {
              id: `action-${Date.now()}`,
              type: 'show_loans',
              accountName: 'Loans & EMIs',
              accountType: 'payable',
              amount: 0,
              transactionType: 'expense',
              category: 'Loans & EMIs',
              status: 'confirmed',
              necessityVerdict: 'Essential / Need',
              necessityReason: 'Summary of active loan obligations and monthly EMI commitment.',
            };
          } else if (
            lowerPrompt.includes('show subscription') ||
            lowerPrompt.includes('my subscription') ||
            lowerPrompt.includes('active subscription') ||
            lowerPrompt.includes('recurring burn')
          ) {
            actionPayload = {
              id: `action-${Date.now()}`,
              type: 'show_subscriptions',
              accountName: 'Recurring Subscriptions',
              accountType: 'payable',
              amount: 0,
              transactionType: 'expense',
              category: 'Subscriptions',
              status: 'confirmed',
              necessityVerdict: 'Discretionary / Want',
              necessityReason: 'Monthly digital services and recurring memberships burn rate.',
            };
          }
        }

        addMessage('model', replyText, actionPayload);
      } else {
        const errorMsg = data.error?.message || 'Failed to fetch response. Verify your API key or model settings.';
        addMessage('model', `⚠️ Error: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error(error);
      addMessage('model', `⚠️ Error: Request failed. Check your network connection.`);
    } finally {
      setIsSending(false);
    }
  };

  // Custom text formatter matching Gemini plain-text typography with Markdown headers and bolding
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let content = line.trim();
      
      // 1. Detect markdown headings (###, ##, #)
      const headingMatch = content.match(/^(#{1,3})\s+(.*)$/);
      if (headingMatch) {
        const headingText = headingMatch[2].replace(/\*\*/g, '');
        const headingLevel = headingMatch[1].length; // 1, 2, or 3
        
        return (
          <ThemedText
            key={idx}
            style={{
              fontSize: headingLevel === 1 ? 19 : headingLevel === 2 ? 17 : 16,
              fontFamily: 'Outfit_700Bold',
              lineHeight: 24,
              color: geminiColors.text,
              marginTop: 12,
              marginBottom: 4,
            }}
          >
            {headingText}
          </ThemedText>
        );
      }

      // 2. Detect bullet points
      const isBullet = content.startsWith('* ') || content.startsWith('• ') || content.startsWith('- ');
      if (isBullet) {
        content = `• ${content.substring(2)}`;
      }

      // 3. Split bold parts (**bold**)
      const parts = content.split('**');
      const textElements = parts.map((part, pIdx) => {
        const isBold = pIdx % 2 === 1;
        return (
          <ThemedText
            key={pIdx}
            style={{
              fontSize: 15,
              fontFamily: isBold ? 'Outfit_700Bold' : 'Outfit_400Regular',
              lineHeight: 22,
              color: geminiColors.text,
            }}
          >
            {part}
          </ThemedText>
        );
      });

      return (
        <ThemedText key={idx} style={{ marginVertical: 3, fontSize: 15, lineHeight: 22, color: geminiColors.text }}>
          {textElements}
        </ThemedText>
      );
    });
  };

  // Render Interactive Action Card with Gainbase Pastel Card Architecture
  const renderActionCard = (messageId: string, action: ChatAction) => {
    // 1. Show Investments Card
    if (action.type === 'show_investments') {
      const summary = calculateSummary();
      const holdings = getHoldingsData();
      const isPositive = summary.profitPercentage >= 0;
      const isDayPositive = summary.dayChange >= 0;
      const palette = { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' };

      return (
        <View style={[styles.pastelActionCard, { backgroundColor: palette.bg }]}>
          <View style={styles.pastelCardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Category3DIcon name="Investments" icon="investments" size={26} />
              <ThemedText style={{ fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: palette.text }}>
                Total Portfolio Value
              </ThemedText>
            </View>
            <View style={[styles.pnlPill, { backgroundColor: isPositive ? 'rgba(6, 78, 59, 0.15)' : 'rgba(255, 59, 48, 0.15)' }]}>
              {isPositive ? <TrendingUp size={12} color="#064E3B" /> : <TrendingDown size={12} color="#FF3B30" />}
              <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: isPositive ? '#064E3B' : '#FF3B30', marginLeft: 3 }}>
                {isPositive ? '+' : ''}{summary.profitPercentage.toFixed(2)}%
              </ThemedText>
            </View>
          </View>

          <ThemedText style={{ fontSize: 26, fontFamily: 'Outfit_700Bold', color: palette.text, marginTop: 10, marginBottom: 10 }}>
            ₹{summary.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </ThemedText>

          <View style={[styles.pastelMetricGrid, { borderColor: palette.sub + '25' }]}>
            <View style={styles.pastelMetricCol}>
              <ThemedText style={{ fontSize: 9, fontFamily: 'Outfit_700Bold', color: palette.sub, letterSpacing: 0.5 }}>INVESTED</ThemedText>
              <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: palette.text, marginTop: 2 }}>
                ₹{summary.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </ThemedText>
            </View>
            <View style={styles.pastelMetricCol}>
              <ThemedText style={{ fontSize: 9, fontFamily: 'Outfit_700Bold', color: palette.sub, letterSpacing: 0.5 }}>TOTAL RETURNS</ThemedText>
              <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: isPositive ? '#064E3B' : '#FF3B30', marginTop: 2 }}>
                {isPositive ? '+' : ''}₹{Math.abs(summary.unrealizedReturn).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </ThemedText>
            </View>
            <View style={styles.pastelMetricCol}>
              <ThemedText style={{ fontSize: 9, fontFamily: 'Outfit_700Bold', color: palette.sub, letterSpacing: 0.5 }}>DAY P&L</ThemedText>
              <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: isDayPositive ? '#064E3B' : '#FF3B30', marginTop: 2 }}>
                {isDayPositive ? '+' : ''}₹{summary.dayChange.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </ThemedText>
            </View>
            <View style={styles.pastelMetricCol}>
              <ThemedText style={{ fontSize: 9, fontFamily: 'Outfit_700Bold', color: palette.sub, letterSpacing: 0.5 }}>XIRR</ThemedText>
              <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: palette.text, marginTop: 2 }}>
                {summary.xirr ? `${(summary.xirr * 100).toFixed(1)}%` : 'N/A'}
              </ThemedText>
            </View>
          </View>

          {holdings.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {holdings.slice(0, 5).map((h: any, i: number) => (
                  <View key={i} style={[styles.pastelHoldingPill, { backgroundColor: palette.text + '15' }]}>
                    <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: palette.text }}>
                      {h.symbol} <ThemedText style={{ color: palette.sub }}>({h.quantity})</ThemedText>
                    </ThemedText>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            style={[styles.pastelCtaBtn, { backgroundColor: palette.text }]}
            onPress={() => {
              handleHaptic();
              setActiveMode('investments');
              router.push('/(tabs)');
            }}
            activeOpacity={0.82}
          >
            <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#FFFFFF' }}>
              Open Portfolio Dashboard
            </ThemedText>
            <ArrowUpRight size={15} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      );
    }

    // 2. Show Loans Card
    if (action.type === 'show_loans') {
      const activeLoans = moneyLoans.filter((l) => l.isActive);
      const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);
      const totalEmi = activeLoans.reduce((sum, l) => sum + (l.emiAmount || 0), 0);
      const palette = { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' };

      return (
        <View style={[styles.pastelActionCard, { backgroundColor: palette.bg }]}>
          <View style={styles.pastelCardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Category3DIcon name="Loans" icon="loan" size={26} />
              <ThemedText style={{ fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: palette.text }}>
                Total Debt Outstanding
              </ThemedText>
            </View>
            <View style={[styles.pnlPill, { backgroundColor: palette.text + '15' }]}>
              <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: palette.text }}>
                {activeLoans.length} active
              </ThemedText>
            </View>
          </View>

          <ThemedText style={{ fontSize: 26, fontFamily: 'Outfit_700Bold', color: palette.text, marginTop: 10, marginBottom: 10 }}>
            ₹{totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </ThemedText>

          <View style={[styles.pastelMetricGrid, { borderColor: palette.sub + '25' }]}>
            <View style={[styles.pastelMetricCol, { flex: 1.2 }]}>
              <ThemedText style={{ fontSize: 9, fontFamily: 'Outfit_700Bold', color: palette.sub, letterSpacing: 0.5 }}>MONTHLY EMI BURDEN</ThemedText>
              <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: palette.text, marginTop: 2 }}>
                ₹{totalEmi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo
              </ThemedText>
            </View>
            <View style={styles.pastelMetricCol}>
              <ThemedText style={{ fontSize: 9, fontFamily: 'Outfit_700Bold', color: palette.sub, letterSpacing: 0.5 }}>ACTIVE FACILITIES</ThemedText>
              <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: palette.text, marginTop: 2 }}>
                {activeLoans.length} Tracked
              </ThemedText>
            </View>
          </View>

          {activeLoans.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {activeLoans.map((l, i) => (
                  <View key={i} style={[styles.pastelHoldingPill, { backgroundColor: palette.text + '15' }]}>
                    <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: palette.text }}>
                      {l.name} <ThemedText style={{ color: palette.sub }}>(₹{l.emiAmount.toLocaleString('en-IN')})</ThemedText>
                    </ThemedText>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            style={[styles.pastelCtaBtn, { backgroundColor: palette.text }]}
            onPress={() => {
              handleHaptic();
              setActiveMode('money');
              router.push('/(tabs)/money-loans');
            }}
            activeOpacity={0.82}
          >
            <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#FFFFFF' }}>
              Open Loan & EMI Tracker
            </ThemedText>
            <ArrowUpRight size={15} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      );
    }

    // 3. Show Subscriptions Card
    if (action.type === 'show_subscriptions') {
      const activeSubs = moneySubscriptions.filter((s) => s.isActive);
      const totalMonthlyBurn = activeSubs.reduce((sum, s) => {
        const monthlyCost = s.billingCycle === 'yearly' ? s.amount / 12 : s.billingCycle === 'quarterly' ? s.amount / 3 : s.amount;
        return sum + monthlyCost;
      }, 0);
      const sortedByRenewal = [...activeSubs].sort(
        (a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime()
      );
      const nextSub = sortedByRenewal[0];
      const palette = { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' };

      return (
        <View style={[styles.pastelActionCard, { backgroundColor: palette.bg }]}>
          <View style={styles.pastelCardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Category3DIcon name="Subscriptions" icon="tv" size={26} />
              <ThemedText style={{ fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: palette.text }}>
                Monthly Recurring Burn
              </ThemedText>
            </View>
            <View style={[styles.pnlPill, { backgroundColor: palette.text + '15' }]}>
              <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: palette.text }}>
                {activeSubs.length} active
              </ThemedText>
            </View>
          </View>

          <ThemedText style={{ fontSize: 26, fontFamily: 'Outfit_700Bold', color: palette.text, marginTop: 10, marginBottom: 10 }}>
            ₹{totalMonthlyBurn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/mo
          </ThemedText>

          <View style={[styles.pastelMetricGrid, { borderColor: palette.sub + '25' }]}>
            <View style={styles.pastelMetricCol}>
              <ThemedText style={{ fontSize: 9, fontFamily: 'Outfit_700Bold', color: palette.sub, letterSpacing: 0.5 }}>ACTIVE SERVICES</ThemedText>
              <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: palette.text, marginTop: 2 }}>
                {activeSubs.length} Tracked
              </ThemedText>
            </View>
            <View style={[styles.pastelMetricCol, { flex: 1.3 }]}>
              <ThemedText style={{ fontSize: 9, fontFamily: 'Outfit_700Bold', color: palette.sub, letterSpacing: 0.5 }}>NEXT RENEWAL</ThemedText>
              <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: palette.text, marginTop: 2 }} numberOfLines={1}>
                {nextSub ? `${nextSub.name} (${new Date(nextSub.nextPaymentDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })})` : 'None'}
              </ThemedText>
            </View>
          </View>

          {activeSubs.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {activeSubs.map((s, i) => (
                  <View key={i} style={[styles.pastelHoldingPill, { backgroundColor: palette.text + '15' }]}>
                    <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: palette.text }}>
                      {s.name} <ThemedText style={{ color: palette.sub }}>(₹{s.amount})</ThemedText>
                    </ThemedText>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            style={[styles.pastelCtaBtn, { backgroundColor: palette.text }]}
            onPress={() => {
              handleHaptic();
              setActiveMode('money');
              router.push('/(tabs)/money-loans');
            }}
            activeOpacity={0.82}
          >
            <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#FFFFFF' }}>
              Manage Subscriptions & Billing
            </ThemedText>
            <ArrowUpRight size={15} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      );
    }

    // 4. Interactive Ledger Actions (Add Transaction, Pay EMI, Pay Subscription)
    const isPending = action.status === 'pending';
    const isConfirmed = action.status === 'confirmed';
    const isDismissed = action.status === 'dismissed';

    const noteAndName = `${action.note || ''} ${action.loanName || ''} ${action.accountName || ''} ${action.category || ''}`.toLowerCase();
    const isEmi =
      action.type === 'pay_emi' ||
      action.category === 'EMI Payments' ||
      noteAndName.includes('emi') ||
      noteAndName.includes('loan') ||
      action.loanName !== undefined;

    const isSub =
      action.type === 'pay_subscription' ||
      action.category?.toLowerCase().includes('subscription') ||
      action.subscriptionName !== undefined;

    const isIncome = action.transactionType === 'income' || action.accountType === 'receivable';

    const palette = isEmi
      ? { bg: '#FEF08A', text: '#713F12', sub: '#854D0E' }
      : isSub
      ? { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE' }
      : isIncome
      ? { bg: '#D1F5EC', text: '#064E3B', sub: '#047857' }
      : { bg: '#FFE4E6', text: '#9F1239', sub: '#BE123C' };

    const icon3DId = isEmi
      ? 'loan'
      : isSub
      ? findBest3DIconForText(action.subscriptionName || action.category || 'tv')
      : findBest3DIconForText(action.category || action.accountName || 'wallet');

    let targetHeading = action.accountName;
    if (isEmi) {
      targetHeading = action.loanName ? `Loan: ${action.loanName}` : action.accountName;
    } else if (isSub) {
      targetHeading = action.subscriptionName ? `SaaS: ${action.subscriptionName}` : action.accountName;
    }

    return (
      <View style={[styles.pastelActionCard, { backgroundColor: palette.bg }]}>
        <View style={styles.pastelCardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
            <Category3DIcon name={targetHeading} icon={icon3DId} size={26} />
            <ThemedText style={{ fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: palette.text }} numberOfLines={1}>
              {targetHeading}
            </ThemedText>
          </View>
          <View style={[styles.pnlPill, { backgroundColor: palette.text + '15' }]}>
            <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_700Bold', color: palette.text }}>
              {action.category || (isIncome ? 'Income' : 'Expense')}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={{ fontSize: 28, fontFamily: 'Outfit_700Bold', color: palette.text, marginTop: 10, marginBottom: 6 }}>
          {isIncome ? '+' : '-'}₹{action.amount.toLocaleString('en-IN')}
        </ThemedText>

        {action.note ? (
          <View style={[styles.pastelHoldingPill, { backgroundColor: palette.text + '12', alignSelf: 'flex-start', marginVertical: 4 }]}>
            <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_400Regular', color: palette.text }}>
              {action.note}
            </ThemedText>
          </View>
        ) : null}

        {action.necessityVerdict ? (
          <View style={{ marginTop: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: palette.text + '12', alignSelf: 'flex-start' }}>
            <ThemedText style={{ fontSize: 11, fontFamily: 'Outfit_600SemiBold', color: palette.text }}>
              Guidance: {action.necessityVerdict} {action.necessityReason ? `• ${action.necessityReason}` : ''}
            </ThemedText>
          </View>
        ) : null}

        {/* Action Controls */}
        {isPending ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <TouchableOpacity
              style={[styles.pastelCtaBtn, { flex: 1, backgroundColor: palette.text, marginTop: 0 }]}
              onPress={() => handleApproveAction(messageId, action)}
              activeOpacity={0.82}
            >
              <Check size={16} color="#FFFFFF" strokeWidth={2.4} />
              <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: '#FFFFFF' }}>
                Approve & Record
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 16,
                backgroundColor: 'rgba(0,0,0,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => handleDismissAction(messageId)}
              activeOpacity={0.7}
            >
              <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_500Medium', color: palette.sub }}>
                Dismiss
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : isConfirmed ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: palette.sub + '22' }}>
            <CheckCircle2 size={15} color={palette.text} />
            <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_600SemiBold', color: palette.text }}>
              {isEmi ? 'Recorded & loan balance updated' : isSub ? 'Recorded & cycle advanced' : 'Recorded to account'}
            </ThemedText>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: palette.sub + '22' }}>
            <XCircle size={15} color={palette.sub} />
            <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_500Medium', color: palette.sub }}>
              Dismissed (ledger unchanged)
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  // Render individual message item in Gainbase style
  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    if (isUser) {
      return (
        <View style={styles.userMessageRow}>
          <View style={[styles.userBubble, { backgroundColor: geminiColors.userBubble }]}>
            <ThemedText style={[styles.userBubbleText, { color: geminiColors.userBubbleText }]}>
              {item.content}
            </ThemedText>
          </View>
        </View>
      );
    }

    // AI Message
    return (
      <View style={styles.aiMessageRow}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.aiDot} />
          <ThemedText style={[styles.aiSenderLabel, { color: geminiColors.textSecondary }]}>
            Gainbase AI
          </ThemedText>
        </View>
        <View style={styles.aiContent}>
          {renderMessageContent(item.content)}
          {item.action && renderActionCard(item.id, item.action)}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: geminiColors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header (Matching EMIs page UI) */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: currColors.background,
              paddingTop: headerTopPadding,
              paddingBottom: 12,
            },
          ]}
        >
          <BackButton />

          <View style={styles.headerCenterTitle}>
            <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
              Gainbase AI
            </ThemedText>
          </View>

          {/* Joined Action Capsule matching Loan & EMI details */}
          <View
            style={[
              styles.actionCapsule,
              {
                backgroundColor: currColors.cardSecondary,
                borderColor: currColors.border,
              },
            ]}
          >
            {messages.length > 0 && (
              <>
                <TouchableOpacity
                  style={styles.capsuleBtn}
                  onPress={() => {
                    handleHaptic();
                    Alert.alert('Clear Chat', 'Are you sure you want to clear your conversation history?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive', onPress: () => clearMessages() },
                    ]);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
                >
                  <Trash2 size={16} color="#FF3B30" strokeWidth={2.2} />
                </TouchableOpacity>

                <View style={[styles.capsuleDivider, { backgroundColor: currColors.border }]} />
              </>
            )}

            <TouchableOpacity
              style={[styles.capsuleBtn, messages.length === 0 && { width: 34 }]}
              onPress={() => {
                handleHaptic();
                setShowSettings(!showSettings);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: messages.length > 0 ? 4 : 6, right: 6 }}
            >
              <Settings
                size={16}
                color={showSettings ? (isDark ? '#FFFFFF' : '#000000') : currColors.text}
                strokeWidth={2.2}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Card Panel */}
        {showSettings && (
          <View style={[styles.settingsPanel, { backgroundColor: geminiColors.inputBg, borderColor: geminiColors.border }]}>
            <View style={styles.settingsHeader}>
              <Sparkles size={14} color={geminiColors.sparkleColor} />
              <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_600SemiBold', marginLeft: 6, color: geminiColors.text }}>AI CONFIGURATION</ThemedText>
            </View>

            {/* API Key Input */}
            <ThemedText style={[styles.inputLabel, { color: geminiColors.textSecondary }]}>Gemini Developer API Key</ThemedText>
            <View style={[styles.apiKeyContainer, { backgroundColor: geminiColors.bg, borderColor: geminiColors.border }]}>
              <TextInput
                style={[styles.apiKeyInput, { color: geminiColors.text }]}
                placeholder="Paste your Gemini API Key here"
                placeholderTextColor={geminiColors.textSecondary}
                value={geminiApiKey}
                onChangeText={setGeminiApiKey}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowApiKey(!showApiKey)} style={styles.eyeBtn}>
                {showApiKey ? (
                  <EyeOff size={15} color={geminiColors.textSecondary} />
                ) : (
                  <Eye size={15} color={geminiColors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {/* Model Selector Dropdown */}
            <ThemedText style={[styles.inputLabel, { color: geminiColors.textSecondary, marginTop: 14 }]}>Active Gemini Model</ThemedText>
            <TouchableOpacity
              style={[styles.dropdownButton, { backgroundColor: geminiColors.bg, borderColor: geminiColors.border }]}
              onPress={() => setShowModelPicker(!showModelPicker)}
            >
              <ThemedText style={{ fontSize: 13, fontFamily: 'Outfit_500Medium', color: geminiColors.text }}>{selectedModel}</ThemedText>
              <ChevronDown size={15} color={geminiColors.textSecondary} />
            </TouchableOpacity>

            {showModelPicker && (
              <View style={[styles.modelPickerList, { backgroundColor: geminiColors.bg, borderColor: geminiColors.border }]}>
                {MODEL_PRESETS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={styles.modelPickerItem}
                    onPress={() => {
                      setSelectedModel(m);
                      setIsCustomModel(false);
                      setShowModelPicker(false);
                    }}
                  >
                    <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_400Regular', color: geminiColors.text }}>{m}</ThemedText>
                    {selectedModel === m && <Check size={14} color={geminiColors.sparkleColor} />}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.modelPickerItem}
                  onPress={() => {
                    setIsCustomModel(true);
                    setShowModelPicker(false);
                  }}
                >
                  <ThemedText style={{ fontSize: 12, fontFamily: 'Outfit_400Regular', color: geminiColors.text }}>Use Custom Model ID</ThemedText>
                  {isCustomModel && <Check size={14} color={geminiColors.sparkleColor} />}
                </TouchableOpacity>
              </View>
            )}

            {isCustomModel && (
              <View style={{ marginTop: 8 }}>
                <TextInput
                  style={[styles.customModelInput, { color: geminiColors.text, backgroundColor: geminiColors.bg, borderColor: geminiColors.border }]}
                  placeholder="Enter custom model ID (e.g. gemini-2.0-pro-exp)"
                  placeholderTextColor={geminiColors.textSecondary}
                  value={customModelInput}
                  onChangeText={(val) => {
                    setCustomModelInput(val);
                    setSelectedModel(val);
                  }}
                  autoCapitalize="none"
                />
              </View>
            )}
          </View>
        )}

        {/* Messages List or Empty Suggestions Screen */}
        {messages.length === 0 ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.emptyScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Minimalist Empty Greeting Header */}
            <View style={styles.emptyGreetingWrapper}>
              <ThemedText style={[styles.emptyGreetingTitle, { color: geminiColors.text }]}>
                How can I help{'\n'}you today?
              </ThemedText>
            </View>

            {/* Suggestions Interlocking Cards (Loans List Style) */}
            <View
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && Math.abs(w - cardWidth) > 1) {
                  setCardWidth(w);
                }
              }}
              style={{ width: '100%', marginBottom: 30 }}
            >
              {STARTER_SUGGESTIONS.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === STARTER_SUGGESTIONS.length - 1;
                const hBody = 86;
                const tabH = 26;
                const tabW = 86;
                const totalH = hBody + tabH;
                const path = getInterlockingCardPath(cardWidth, hBody, tabW, tabH, 18, isFirst, isLast, 24);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      height: totalH,
                      marginTop: isFirst ? 0 : -tabH,
                      zIndex: STARTER_SUGGESTIONS.length - index,
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1.5 },
                      shadowOpacity: isDark ? 0.08 : 0.05,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                    onPress={() => handleSend(item.prompt)}
                    activeOpacity={0.82}
                  >
                    {/* SVG Interlocking Card Background */}
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                      <Svg width={cardWidth} height={totalH}>
                        <Path
                          d={path}
                          fill={item.palette.bg}
                          stroke={isDark ? 'transparent' : item.palette.sub + '55'}
                          strokeWidth={1.2}
                        />
                      </Svg>
                    </View>

                    {/* Right Tab Lobe: Dark Circular Arrow Button (matching image) */}
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 14,
                        width: tabW - 14,
                        height: hBody,
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: item.palette.text,
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#000000',
                          shadowOffset: { width: 0, height: 1.5 },
                          shadowOpacity: 0.18,
                          shadowRadius: 2.5,
                          elevation: 2,
                        }}
                      >
                        <ArrowUpRight size={18} color="#FFFFFF" strokeWidth={2.4} />
                      </View>
                    </View>

                    {/* Left Body Content */}
                    <View
                      style={{
                        position: 'absolute',
                        top: tabH,
                        left: 20,
                        height: hBody,
                        justifyContent: 'center',
                        paddingRight: tabW + 12,
                      }}
                    >
                      <ThemedText
                        style={{
                          fontSize: 16,
                          fontFamily: 'Outfit_600SemiBold',
                          color: item.palette.text,
                          letterSpacing: -0.3,
                        }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </ThemedText>
                      <ThemedText
                        style={{
                          fontSize: 13,
                          fontFamily: 'Outfit_400Regular',
                          color: item.palette.sub,
                          marginTop: 3,
                        }}
                        numberOfLines={1}
                      >
                        {item.subtitle}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...messages].reverse()}
            inverted
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
          />
        )}

        {/* Quick Suggestion Pills Carousel (when conversation is active) */}
        {messages.length > 0 && !isKeyboardVisible && (
          <View style={styles.quickPillsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPillsScroll}
              keyboardShouldPersistTaps="handled"
            >
              {QUICK_CHIPS.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.quickPill,
                    {
                      backgroundColor: chip.palette.bg,
                      borderColor: isDark ? 'transparent' : chip.palette.sub + '44',
                    },
                  ]}
                  onPress={() => handleSend(chip.prompt)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.quickPillText, { color: chip.palette.text }]}>
                    {chip.label}
                  </ThemedText>
                  <View style={[styles.quickPillArrowCircle, { backgroundColor: chip.palette.text }]}>
                    <ArrowUpRight size={11} color="#FFFFFF" strokeWidth={2.4} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Gainbase Style Elevated Floating Input Pill */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: currColors.border,
              marginBottom: isKeyboardVisible ? 12 : Math.max(12, insets.bottom),
            },
          ]}
        >
          <TextInput
            style={[styles.textInput, { color: currColors.text }]}
            placeholder="Ask Gainbase AI..."
            placeholderTextColor={currColors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputText.trim()
                  ? (isDark ? '#FFFFFF' : '#000000')
                  : (isDark ? '#2C2C2E' : '#EFEFF4'),
              },
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={isDark ? '#000000' : '#FFFFFF'} />
            ) : (
              <ArrowUp
                size={16}
                color={inputText.trim() ? (isDark ? '#000000' : '#FFFFFF') : currColors.textSecondary}
                strokeWidth={2.4}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerCenterTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerBadgeText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  actionCapsule: {
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  capsuleBtn: {
    width: 36,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsuleDivider: {
    width: 1,
    height: 16,
    opacity: 0.8,
  },
  settingsPanel: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  apiKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
  },
  apiKeyInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  eyeBtn: {
    padding: 6,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  modelPickerList: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modelPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  customModelInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyGreetingWrapper: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  emptyGreetingTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  suggestionsGrid: {
    gap: 10,
  },
  suggestionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  suggestionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  suggestionIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  suggestionBadgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.4,
  },
  suggestionTitle: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 4,
  },
  suggestionPromptPreview: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  suggestionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 3,
  },
  suggestionTryText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  quickPillsWrapper: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  quickPillsScroll: {
    gap: 8,
    paddingRight: 12,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickPillText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  quickPillArrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  liveText: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
  },
  pnlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metricGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricGridItem: {
    flex: 1,
  },
  metricGridLabel: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metricGridValue: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  holdingsChipsRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  holdingsChipsLabel: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  holdingChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  holdingChipText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  fullWidthCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    marginTop: 8,
    gap: 6,
  },
  fullWidthCtaText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  userMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 6,
    width: '100%',
  },
  userBubble: {
    maxWidth: '82%',
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  userBubbleText: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 22,
  },
  aiMessageRow: {
    marginVertical: 10,
    width: '100%',
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  aiSenderLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.2,
  },
  aiContent: {
    flex: 1,
    paddingHorizontal: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    paddingVertical: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  // Gainbase Pastel Action Card Styles
  pastelActionCard: {
    borderRadius: 22,
    padding: 16,
    marginTop: 10,
    marginBottom: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  pastelCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pastelMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  pastelMetricCol: {
    flex: 1,
    minWidth: 100,
  },
  pastelHoldingPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pastelCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
});
