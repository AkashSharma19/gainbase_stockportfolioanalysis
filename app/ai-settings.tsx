import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line } from 'react-native-svg';
import {
  Key,
  Eye,
  EyeOff,
  Check,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { BackButton } from '@/components/BackButton';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAiStore } from '@/store/useAiStore';
import { Category3DIcon } from '@/components/Category3DIcon';
import { getTicketCardPath, getInterlockingCardPath } from '@/constants/folderTheme';

export interface AiModelItem {
  id: string;
  name: string;
  tagline: string;
  palette: {
    bg: string;
    text: string;
    sub: string;
    border: string;
  };
}

export const COMPLETE_AI_MODELS: AiModelItem[] = [
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    tagline: 'Latest • Ultra-fast frontier reasoning',
    palette: { bg: '#E9D5FF', text: '#581C87', sub: '#7E22CE', border: '#C084FC' },
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    tagline: 'Lowest latency & token efficient',
    palette: { bg: '#E0E7FF', text: '#312E81', sub: '#4338CA', border: '#818CF8' },
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    tagline: 'Recommended • Fast & intelligent',
    palette: { bg: '#D1F5EC', text: '#064E3B', sub: '#047857', border: '#34D399' },
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    tagline: 'Deep reasoning & financial math',
    palette: { bg: '#FEF08A', text: '#713F12', sub: '#854D0E', border: '#FACC15' },
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    tagline: 'High throughput generation',
    palette: { bg: '#BAE6FD', text: '#0C4A6E', sub: '#0369A1', border: '#38BDF8' },
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    tagline: 'Quota-friendly mobile lightweight',
    palette: { bg: '#DCFCE7', text: '#14532D', sub: '#15803D', border: '#4ADE80' },
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    tagline: 'Standard stable flash generation',
    palette: { bg: '#FDF4FF', text: '#701A75', sub: '#86198F', border: '#E879F9' },
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    tagline: '1M+ token context window',
    palette: { bg: '#FED7AA', text: '#7C2D12', sub: '#9A3412', border: '#FB923C' },
  },
];

export default function AiSettingsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { geminiApiKey, setGeminiApiKey, selectedModel, setSelectedModel } = useAiStore();

  const [showKey, setShowKey] = useState(false);

  const [cardWidth, setCardWidth] = useState<number>(
    Dimensions.get('window').width - 32
  );

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const activeModelObj = COMPLETE_AI_MODELS.find((m) => m.id === selectedModel);
  const activeDisplayName = activeModelObj?.name || selectedModel;

  // Minimal Ticket Hero Card (Exact EMIs aesthetic)
  const renderTicketHeroCard = () => {
    const h = 126;
    const notchY = 76;
    const notchR = 9;
    const path = getTicketCardPath(cardWidth, h, notchY, notchR, 20);

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
          shadowColor: isDark ? '#000000' : '#8B5CF6',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.08 : 0.12,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={cardWidth} height={h}>
            <Path
              d={path}
              fill="#E9D5FF"
            />
            <Line
              x1={notchR + 6}
              y1={notchY}
              x2={cardWidth - notchR - 6}
              y2={notchY}
              stroke="#7E22CE60"
              strokeWidth={1.2}
              strokeDasharray="5, 4"
            />
          </Svg>
        </View>

        {/* Upper Section */}
        <View
          style={{
            height: notchY,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <ThemedText
              style={{
                fontSize: 10,
                fontFamily: 'Outfit_700Bold',
                letterSpacing: 0.8,
                color: '#7E22CE',
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              ACTIVE AI MODEL
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 22,
                fontFamily: 'Outfit_700Bold',
                color: '#581C87',
                letterSpacing: -0.4,
              }}
              numberOfLines={1}
            >
              {activeDisplayName}
            </ThemedText>
          </View>

          <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
            <Category3DIcon name="sparkles" size={38} />
          </View>
        </View>

        {/* Lower Stub */}
        <View
          style={{
            height: h - notchY,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <ThemedText
            style={{
              fontSize: 11,
              fontFamily: 'Outfit_600SemiBold',
              color: '#7E22CE',
              letterSpacing: 0.2,
            }}
          >
            GEMINI DEVELOPER KEY
          </ThemedText>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: geminiApiKey?.trim() ? '#16A34A' : '#DC2626',
              }}
            />
            <ThemedText
              style={{
                fontSize: 12,
                fontFamily: 'Outfit_700Bold',
                color: geminiApiKey?.trim() ? '#15803D' : '#991B1B',
              }}
            >
              {geminiApiKey?.trim() ? 'Configured' : 'Not Set'}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  // Interlocking Ribbon Model Cards (Exact EMIs / Subscriptions card aesthetic)
  const renderModelCard = (item: AiModelItem, index: number, totalCount: number) => {
    const isFirst = index === 0;
    const isLast = index === totalCount - 1;
    const isSelected = selectedModel === item.id;
    const palette = item.palette;

    const hBody = 82;
    const tabH = 24;
    const tabW = 86;
    const totalH = hBody + tabH;
    const path = getInterlockingCardPath(cardWidth, hBody, tabW, tabH, 18, isFirst, isLast, 22);

    return (
      <TouchableOpacity
        key={item.id}
        style={{
          height: totalH,
          marginTop: isFirst ? 0 : -tabH,
          zIndex: totalCount - index,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1.5 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 1,
        }}
        activeOpacity={0.82}
        onPress={() => {
          handleHaptic();
          setSelectedModel(item.id);
        }}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={cardWidth} height={totalH}>
            <Path
              d={path}
              fill={palette.bg}
              stroke={isDark ? 'transparent' : palette.border}
              strokeWidth={1.2}
            />
          </Svg>
        </View>

        {/* Right Tab Lobe */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 14,
            width: tabW - 14,
            height: hBody,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isSelected && (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3.5,
                borderRadius: 12,
                backgroundColor: palette.text,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Check size={11} color="#FFFFFF" strokeWidth={3} />
              <ThemedText style={{ fontSize: 10, fontFamily: 'Outfit_700Bold', color: '#FFFFFF' }}>
                ACTIVE
              </ThemedText>
            </View>
          )}
        </View>

        {/* Left Body Content */}
        <View
          style={{
            position: 'absolute',
            top: tabH,
            left: 20,
            height: hBody,
            justifyContent: 'center',
            paddingRight: tabW + 14,
          }}
        >
          <ThemedText
            style={{
              fontSize: 16,
              fontFamily: 'Outfit_700Bold',
              color: palette.text,
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {item.name}
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 12,
              fontFamily: 'Outfit_400Regular',
              color: palette.sub,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {item.tagline}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <BackButton />

          <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
            AI Model & Keys
          </ThemedText>

          <View style={{ width: 38 }} />
        </View>

        {/* Scroll Content */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Ticket Hero Card */}
          {renderTicketHeroCard()}

          {/* Minimal Gemini API Key Input Card */}
          <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
            <View
              style={[
                styles.keyInputCard,
                {
                  backgroundColor: isDark ? currColors.card : '#FFFFFF',
                  borderColor: isDark ? currColors.border : '#E2E8F0',
                },
              ]}
            >
              <Key size={16} color={currColors.tint} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.keyInput, { color: currColors.text }]}
                value={geminiApiKey}
                onChangeText={setGeminiApiKey}
                placeholder="Paste Gemini API Key (AIzaSy...)"
                placeholderTextColor={currColors.textSecondary}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowKey(!showKey)}
                style={{ padding: 6 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showKey ? (
                  <EyeOff size={16} color={currColors.textSecondary} />
                ) : (
                  <Eye size={16} color={currColors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
              style={styles.keyHelperRow}
              activeOpacity={0.7}
            >
              <ThemedText
                style={{
                  fontSize: 11,
                  fontFamily: 'Outfit_500Medium',
                  color: currColors.tint,
                  marginRight: 3,
                }}
              >
                Get free API key from Google AI Studio
              </ThemedText>
              <ArrowUpRight size={12} color={currColors.tint} />
            </TouchableOpacity>
          </View>

          {/* Section: Select Model */}
          <ThemedText style={[styles.sectionTitle, { color: currColors.textSecondary }]}>
            SELECT GENERATIVE MODEL
          </ThemedText>

          {/* Interlocking Ribbon Cards Stack */}
          <View style={{ marginHorizontal: 16, marginTop: 4 }}>
            {COMPLETE_AI_MODELS.map((item, index) =>
              renderModelCard(item, index, COMPLETE_AI_MODELS.length)
            )}
          </View>
        </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 6,
  },
  keyInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  keyInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  keyHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
});
