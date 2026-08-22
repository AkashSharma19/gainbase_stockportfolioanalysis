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
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAiStore, ChatMessage } from '@/store/useAiStore';
import { useMoneyStore } from '@/store/useMoneyStore';
import { usePortfolioStore } from '@/store/usePortfolioStore';

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
  };

  // Stores state
  const { geminiApiKey, selectedModel, messages, setGeminiApiKey, setSelectedModel, addMessage, clearMessages } = useAiStore();
  const moneyAccounts = useMoneyStore((state) => state.accounts);
  const moneyLoans = useMoneyStore((state) => state.loans);
  const moneyBudgets = useMoneyStore((state) => state.budgets);
  const moneyTransactions = useMoneyStore((state) => state.moneyTransactions);
  const moneySubscriptions = useMoneyStore((state) => state.subscriptions);

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

    return `You are Gainbase AI, the user's private financial advisor. You have access to their real-time ledger:

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

Instructions:
1. Provide highly direct, mathematically accurate, and practical personal finance analysis.
2. If asked about their spending, budgets, debts, subscriptions, or investments, refer directly to the live parameters above.
3. Keep responses conversational, concise, and professional. Use Indian Rupees formatting (₹) where relevant.
4. Maintain strict privacy and never recommend external risky financial actions.`;
  }, [moneyAccounts, moneyLoans, moneyBudgets, moneyTransactions, moneySubscriptions, getHoldingsData, watchlist, calculateSummary]);

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
        const reply = data.candidates[0].content.parts[0].text;
        addMessage('model', reply);
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

    // AI Message: Plain text layout with a Sparks avatar on the left
    return (
      <View style={styles.aiMessageRow}>
        <View style={[styles.aiAvatar, { backgroundColor: geminiColors.aiSparkleBg }]}>
          <Sparkles size={16} color={geminiColors.sparkleColor} />
        </View>
        <View style={styles.aiContent}>
          {renderMessageContent(item.content)}
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
});
