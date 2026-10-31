import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TrendingUp, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useAppModeStore, AppMode } from '../store/useAppModeStore';
import { ThemedText } from './ThemedText';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';
import { GeminiAiButton } from './GeminiAiButton';

export function AppSwitcher() {
  const router = useRouter();
  const { activeMode, setActiveMode, setIsTransitioning } = useAppModeStore();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];

  const isInvestments = activeMode === 'investments';

  const handleSwitch = (mode: AppMode) => {
    if (mode === activeMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsTransitioning(true);
    setActiveMode(mode);
    try {
      router.replace('/(tabs)');
    } catch {
      // ignore
    }
    setTimeout(() => {
      setIsTransitioning(false);
    }, 320);
  };

  const handleOpenAi = () => {
    router.push('/ai-chat');
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.chipsRow}>
        {/* --- Investments Chip --- */}
        <TouchableOpacity
          style={[
            styles.chip,
            isInvestments
              ? {
                  backgroundColor: isDark ? currColors.cardSecondary : '#FFFFFF',
                  borderColor: isDark ? '#3A3A3C' : currColors.border,
                  shadowColor: '#000000',
                  shadowOpacity: isDark ? 0.25 : 0.08,
                }
              : {
                  backgroundColor: isDark ? currColors.card : '#F2F2F7',
                  borderColor: isDark ? currColors.border : 'transparent',
                  shadowOpacity: 0,
                  elevation: 0,
                },
          ]}
          activeOpacity={0.8}
          onPress={() => handleSwitch('investments')}
        >
          <View style={styles.chipContent}>
            <View
              style={[
                styles.iconBadge,
                isInvestments
                  ? {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.10)'
                        : 'rgba(10, 132, 255, 0.12)',
                    }
                  : { backgroundColor: 'transparent' },
              ]}
            >
              <TrendingUp
                size={14}
                color={
                  isInvestments
                    ? isDark
                      ? '#FFFFFF'
                      : '#0A84FF'
                    : currColors.textSecondary
                }
                strokeWidth={isInvestments ? 2.5 : 2}
              />
            </View>
            <ThemedText
              numberOfLines={1}
              style={[
                styles.chipLabel,
                isInvestments
                  ? { color: currColors.text, fontFamily: 'Outfit_600SemiBold' }
                  : { color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' },
              ]}
            >
              Investments
            </ThemedText>
          </View>
        </TouchableOpacity>

        {/* --- Money Manager Chip --- */}
        <TouchableOpacity
          style={[
            styles.chip,
            !isInvestments
              ? {
                  backgroundColor: isDark ? currColors.cardSecondary : '#FFFFFF',
                  borderColor: isDark ? '#3A3A3C' : currColors.border,
                  shadowColor: '#000000',
                  shadowOpacity: isDark ? 0.25 : 0.08,
                }
              : {
                  backgroundColor: isDark ? currColors.card : '#F2F2F7',
                  borderColor: isDark ? currColors.border : 'transparent',
                  shadowOpacity: 0,
                  elevation: 0,
                },
          ]}
          activeOpacity={0.8}
          onPress={() => handleSwitch('money')}
        >
          <View style={styles.chipContent}>
            <View
              style={[
                styles.iconBadge,
                !isInvestments
                  ? {
                      backgroundColor: isDark
                        ? 'rgba(0, 201, 167, 0.15)'
                        : 'rgba(0, 135, 110, 0.12)',
                    }
                  : { backgroundColor: 'transparent' },
              ]}
            >
              <Wallet
                size={14}
                color={!isInvestments ? currColors.tintMoney : currColors.textSecondary}
                strokeWidth={!isInvestments ? 2.5 : 2}
              />
            </View>
            <ThemedText
              numberOfLines={1}
              style={[
                styles.chipLabel,
                !isInvestments
                  ? { color: currColors.text, fontFamily: 'Outfit_600SemiBold' }
                  : { color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' },
              ]}
            >
              Money Manager
            </ThemedText>
          </View>
        </TouchableOpacity>

        {/* --- Gemini AI Button --- */}
        <GeminiAiButton onPress={handleOpenAi} size={40} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  iconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
});
