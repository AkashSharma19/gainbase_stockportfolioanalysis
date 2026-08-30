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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAiStore, ChatMessage, ChatAction } from '@/store/useAiStore';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';
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

export default function GeminiChatScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // Gemini App Design Language Palette
  const geminiColors = {
    bg: isDark ? '#131314' : '#FFFFFF',
    headerBg: isDark ? '#131314' : '#FFFFFF',
    inputBg: isDark ? '#1E1F20' : '#F0F4F9',
    userBubble: isDark ? '#1E1F20' : '#F0F4F9',
    aiSparkleBg: isDark ? '#1A1A1C' : '#F0F4F9',
    sparkleColor: '#4B97FF', // Gemini Signature Blue
    text: isDark ? '#E3E3E3' : '#1F1F1F',
    textSecondary: isDark ? '#9E9E9E' : '#5F6368',
    border: isDark ? '#3C4043' : '#DADCE0',
    sendBtnActive: '#4B97FF',
    sendBtnInactive: isDark ? '#3C4043' : '#E3E3E3',
    cardBg: isDark ? '#1E1F20' : '#F8F9FA',
    cardBorder: isDark ? '#333538' : '#E8EAED',
    successBg: isDark ? 'rgba(52, 199, 89, 0.12)' : 'rgba(52, 199, 89, 0.1)',
    successText: '#34C759',
    warningBg: isDark ? 'rgba(255, 149, 0, 0.12)' : 'rgba(255, 149, 0, 0.1)',
    warningText: '#FF9500',
    dangerBg: isDark ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 59, 48, 0.1)',
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

    return `You are Gainbase AI, the user's institutional-grade private financial advisor & Co-pilot. You have access to their real-time ledger:

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
If the user's message indicates an intent to record a transaction, lend/borrow money, pay an EMI, pay a subscription, or create a contact/account:
You MUST return your response as a valid JSON object in this exact format:
{
  "reply": "Your conversational response with candid guidance on whether this transaction was needed, its financial implications, and confirmation details.",
  "hasAction": true,
  "action": {
    "type": "create_account_and_add_transaction" | "add_transaction" | "pay_emi" | "pay_subscription",
    "accountName": "Name of the person/account (e.g. 'Rajat', 'Cash Wallet', 'SBI Savings', 'HDFC Bank')",
    "accountType": "receivable" | "payable" | "wallet" | "savings" | "credit_card",
    "amount": 500,
    "transactionType": "income" | "expense" | "transfer",
    "category": "Receivable" | "EMI Payments" | "Food & Dining" | "Rent & Bills" | "Shopping" | "Salary" | "Subscriptions - OTT" | "Others",
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

If user asks general financial questions (e.g. "How is my portfolio?", "What is my net worth?"):
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
      let targetSub = moneySubscriptions.find(
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
        note: action.note || `${action.transactionType.toUpperCase()} via AI Co-pilot`,
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

  // Send Message handler
  const handleSend = async () => {
    if (!inputText.trim()) return;
    if (!geminiApiKey.trim()) {
      handleHaptic();
      setShowSettings(true);
      Alert.alert('API Key Required', 'Please set up your Gemini API Key in the settings panel first.');
      return;
    }

    const textToSend = inputText.trim();
    setInputText('');
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
        let rawText = data.candidates[0].content.parts[0].text.trim();
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

  // Render Interactive Action Card for financial commands
  const renderActionCard = (messageId: string, action: ChatAction) => {
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

    // Target account / icon
    const getAccountIcon = () => {
      if (isEmi) return Landmark;
      if (isSub) return Repeat;
      switch (action.accountType) {
        case 'receivable':
        case 'payable':
          return Users;
        case 'credit_card':
          return CreditCard;
        case 'savings':
          return Building2;
        default:
          return Wallet;
      }
    };
    const AccountIcon = getAccountIcon();

    // Account exists check
    const existingAccount = moneyAccounts.find(
      (a) => a.name.trim().toLowerCase() === action.accountName.trim().toLowerCase()
    );

    // Dynamic verdict styling
    const getVerdictColor = (verdict?: string) => {
      switch (verdict) {
        case 'Essential / Need':
          return geminiColors.successText;
        case 'Discretionary / Want':
          return geminiColors.warningText;
        case 'Receivable / Loan':
          return '#0A84FF';
        case 'Investment':
          return '#30D158';
        default:
          return geminiColors.textSecondary;
      }
    };

    const verdictColor = getVerdictColor(action.necessityVerdict);

    // Label texts
    let actionTitle = 'PROPOSED ACTION';
    let targetHeading = action.accountName;
    let targetSubtext = existingAccount
      ? `Existing ${action.accountType.toUpperCase()} Account`
      : `New ${action.accountType.toUpperCase()} Account to create`;

    if (isEmi) {
      actionTitle = 'PROPOSED EMI PAYMENT';
      targetHeading = action.loanName ? `Loan: ${action.loanName}` : action.accountName;
      targetSubtext = 'Reduces outstanding loan balance & logs EMI history';
    } else if (isSub) {
      actionTitle = 'PROPOSED SUBSCRIPTION PAYMENT';
      targetHeading = action.subscriptionName ? `SaaS: ${action.subscriptionName}` : action.accountName;
      targetSubtext = 'Advances recurring billing renewal cycle';
    }

    return (
      <View
        style={[
          styles.actionCardContainer,
          {
            backgroundColor: geminiColors.cardBg,
            borderColor: isConfirmed
              ? 'rgba(52, 199, 89, 0.4)'
              : isDismissed
              ? 'rgba(150, 150, 150, 0.2)'
              : geminiColors.cardBorder,
          },
        ]}
      >
        {/* Action Header */}
        <View style={styles.actionCardHeader}>
          <View style={styles.actionBadgeRow}>
            <View
              style={[
                styles.actionBadge,
                {
                  backgroundColor: isConfirmed
                    ? geminiColors.successBg
                    : isDismissed
                    ? 'rgba(150, 150, 150, 0.12)'
                    : isEmi
                    ? 'rgba(255, 149, 0, 0.12)'
                    : 'rgba(75, 151, 255, 0.12)',
                },
              ]}
            >
              <Sparkles
                size={11}
                color={
                  isConfirmed
                    ? geminiColors.successText
                    : isDismissed
                    ? geminiColors.textSecondary
                    : isEmi
                    ? '#FF9500'
                    : geminiColors.sparkleColor
                }
              />
              <ThemedText
                style={[
                  styles.actionBadgeText,
                  {
                    color: isConfirmed
                      ? geminiColors.successText
                      : isDismissed
                      ? geminiColors.textSecondary
                      : isEmi
                      ? '#FF9500'
                      : geminiColors.sparkleColor,
                  },
                ]}
              >
                {isConfirmed
                  ? 'ACTION CONFIRMED'
                  : isDismissed
                  ? 'ACTION DISMISSED'
                  : actionTitle}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Account & Amount Info Box */}
        <View style={[styles.actionMainInfo, { backgroundColor: isDark ? '#141517' : '#FFFFFF', borderColor: geminiColors.border }]}>
          <View style={styles.actionAccountRow}>
            <View
              style={[
                styles.accountIconBox,
                {
                  backgroundColor: isEmi
                    ? 'rgba(255, 149, 0, 0.12)'
                    : isSub
                    ? 'rgba(175, 82, 222, 0.12)'
                    : action.accountType === 'receivable'
                    ? 'rgba(52, 199, 89, 0.12)'
                    : action.accountType === 'payable'
                    ? 'rgba(255, 59, 48, 0.12)'
                    : 'rgba(10, 132, 255, 0.12)',
                },
              ]}
            >
              <AccountIcon
                size={16}
                color={
                  isEmi
                    ? '#FF9500'
                    : isSub
                    ? '#AF52DE'
                    : action.accountType === 'receivable'
                    ? '#34C759'
                    : action.accountType === 'payable'
                    ? '#FF3B30'
                    : '#0A84FF'
                }
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <ThemedText style={[styles.accountNameText, { color: geminiColors.text }]} numberOfLines={1}>
                {targetHeading}
              </ThemedText>
              <ThemedText style={[styles.accountSubtext, { color: geminiColors.textSecondary }]}>
                {targetSubtext}
              </ThemedText>
            </View>

            {/* Amount */}
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText
                style={[
                  styles.actionAmountText,
                  {
                    color:
                      action.transactionType === 'income' || action.accountType === 'receivable'
                        ? '#34C759'
                        : '#FF3B30',
                  },
                ]}
              >
                {action.transactionType === 'income' || action.accountType === 'receivable' ? '+' : '-'}₹
                {action.amount.toLocaleString('en-IN')}
              </ThemedText>
              <ThemedText style={[styles.actionTypeTag, { color: geminiColors.textSecondary }]}>
                {action.category || action.transactionType}
              </ThemedText>
            </View>
          </View>

          {action.note ? (
            <View style={[styles.actionNoteRow, { borderTopColor: isDark ? '#232426' : '#F0F2F5' }]}>
              <ThemedText style={[styles.actionNoteLabel, { color: geminiColors.textSecondary }]}>Note:</ThemedText>
              <ThemedText style={[styles.actionNoteText, { color: geminiColors.text }]} numberOfLines={2}>
                {action.note}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {/* Necessity Guidance Section */}
        {action.necessityVerdict ? (
          <View style={[styles.guidanceContainer, { backgroundColor: isDark ? '#161719' : '#F1F3F4' }]}>
            <View style={styles.guidanceHeaderRow}>
              <ThemedText style={styles.guidanceHeading}>SPENDING GUIDANCE</ThemedText>
              <View style={[styles.verdictBadge, { backgroundColor: `${verdictColor}18` }]}>
                <ThemedText style={[styles.verdictText, { color: verdictColor }]}>
                  {action.necessityVerdict}
                </ThemedText>
              </View>
            </View>
            {action.necessityReason ? (
              <ThemedText style={[styles.guidanceReason, { color: geminiColors.textSecondary }]}>
                {action.necessityReason}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        {/* Card Footer Actions */}
        {isPending ? (
          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              style={[styles.approveBtn, { backgroundColor: '#34C759' }]}
              onPress={() => handleApproveAction(messageId, action)}
              activeOpacity={0.8}
            >
              <Check size={16} color="#FFFFFF" />
              <ThemedText style={styles.approveBtnText}>Approve Action</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dismissBtn, { borderColor: isDark ? '#3C4043' : '#D0D4DC' }]}
              onPress={() => handleDismissAction(messageId)}
              activeOpacity={0.7}
            >
              <X size={14} color={geminiColors.textSecondary} />
              <ThemedText style={[styles.dismissBtnText, { color: geminiColors.textSecondary }]}>Dismiss</ThemedText>
            </TouchableOpacity>
          </View>
        ) : isConfirmed ? (
          <View style={styles.statusConfirmedBanner}>
            <CheckCircle2 size={15} color="#34C759" />
            <ThemedText style={styles.statusConfirmedText}>
              {isEmi
                ? `EMI payment recorded & loan balance updated`
                : isSub
                ? `Subscription payment recorded & cycle updated`
                : `Approved & recorded to ${action.accountName}`}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.statusDismissedBanner}>
            <XCircle size={14} color={geminiColors.textSecondary} />
            <ThemedText style={[styles.statusDismissedText, { color: geminiColors.textSecondary }]}>
              Action dismissed (ledger unchanged)
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  // Render individual message item in Gemini App style
  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    if (isUser) {
      // User message: Grey high-rounded pill aligned to the right
      return (
        <View style={styles.userMessageRow}>
          <View style={[styles.userBubble, { backgroundColor: geminiColors.userBubble }]}>
            {renderMessageContent(item.content)}
          </View>
        </View>
      );
    }

    // AI Message: Plain text layout with a Sparks avatar on the left + interactive action card if present
    return (
      <View style={styles.aiMessageRow}>
        <View style={[styles.aiAvatar, { backgroundColor: geminiColors.aiSparkleBg }]}>
          <Sparkles size={16} color={geminiColors.sparkleColor} />
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
        {/* Header */}
        <View style={[styles.header, { backgroundColor: geminiColors.headerBg, borderBottomColor: geminiColors.border, paddingTop: insets.top + 6 }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <ArrowLeft size={22} color={geminiColors.text} />
            </TouchableOpacity>
            <View style={{ marginLeft: 6 }}>
              <ThemedText style={{ fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: geminiColors.text }}>Gainbase Co-pilot</ThemedText>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.actionBtn, { marginRight: 8 }]}
              onPress={() => {
                handleHaptic();
                Alert.alert('Clear Chat', 'Are you sure you want to clear your conversation history?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: () => clearMessages() },
                ]);
              }}
            >
              <Trash2 size={18} color="#FF3B30" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                handleHaptic();
                setShowSettings(!showSettings);
              }}
            >
              <Settings size={18} color={showSettings ? geminiColors.sparkleColor : geminiColors.text} />
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

        {/* Messages List or Empty Greeting */}
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.sparkleIconOuter, { backgroundColor: 'rgba(75, 151, 255, 0.1)' }]}>
              <Sparkles size={32} color={geminiColors.sparkleColor} />
            </View>
            <ThemedText style={[styles.emptyTitle, { color: geminiColors.text }]}>Hello, I'm your Co-pilot</ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: geminiColors.textSecondary }]}>
              How can I help you manage your portfolio, budgets, EMIs, or savings ledger today?
            </ThemedText>
          </View>
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

        {/* Gemini Style Floating Input Pill */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: geminiColors.inputBg,
              borderColor: geminiColors.border,
              marginBottom: isKeyboardVisible ? 12 : Math.max(12, insets.bottom),
            },
          ]}
        >
          <TextInput
            style={[styles.textInput, { color: geminiColors.text }]}
            placeholder="Ask Co-pilot..."
            placeholderTextColor={geminiColors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputText.trim() ? geminiColors.sendBtnActive : 'transparent',
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Send size={15} color={inputText.trim() ? '#FFF' : geminiColors.textSecondary} />
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
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    marginTop: 100,
  },
  sparkleIconOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  userMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 8,
    width: '100%',
  },
  userBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  aiMessageRow: {
    flexDirection: 'row',
    marginVertical: 12,
    width: '100%',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  aiContent: {
    flex: 1,
    paddingRight: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 28,
    borderWidth: 0.5,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
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
  // Action Card Styles
  actionCardContainer: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    width: '100%',
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  actionBadgeText: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
  },
  actionMainInfo: {
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 12,
    marginBottom: 10,
  },
  actionAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountNameText: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
  },
  accountSubtext: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  actionAmountText: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  actionTypeTag: {
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    marginTop: 1,
  },
  actionNoteRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  actionNoteLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  actionNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 16,
  },
  // Guidance Section
  guidanceContainer: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  guidanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  guidanceHeading: {
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    color: '#8E8E93',
    letterSpacing: 0.6,
  },
  verdictBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verdictText: {
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
  },
  guidanceReason: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 17,
  },
  // Buttons
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 12,
    gap: 6,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  dismissBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  statusConfirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
  },
  statusConfirmedText: {
    color: '#34C759',
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  statusDismissedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  statusDismissedText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
});
