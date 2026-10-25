import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TrendingUp, Wallet } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
                  backgroundColor: '#BAE6FD',
                  borderColor: '#38BDF8',
                  shadowColor: '#0284C7',
                  shadowOpacity: isDark ? 0.25 : 0.20,
                }
              : {
                  backgroundColor: isDark ? currColors.card : '#FFFFFF',
                  borderColor: isDark ? currColors.border : '#E2E8F0',
                  shadowOpacity: isDark ? 0 : 0.05,
                },
          ]}
          activeOpacity={0.8}
          onPress={() => handleSwitch('investments')}
        >
          {isInvestments && (
            <LinearGradient
              colors={['#BAE6FD', '#A5F3FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.gradientFill]}
            />
          )}

          <View style={styles.chipContent}>
            <View
              style={[
                styles.iconBadge,
                isInvestments
                  ? { backgroundColor: 'rgba(12, 74, 110, 0.12)' }
                  : { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : currColors.cardSecondary },
              ]}
            >
              <TrendingUp
                size={14}
                color={isInvestments ? '#0C4A6E' : isDark ? currColors.textSecondary : '#64748B'}
                strokeWidth={isInvestments ? 2.5 : 2}
              />
            </View>
            <ThemedText
              numberOfLines={1}
              style={[
                styles.chipLabel,
                isInvestments
                  ? { color: '#0C4A6E', fontFamily: 'Outfit_600SemiBold' }
                  : { color: isDark ? currColors.textSecondary : '#64748B', fontFamily: 'Outfit_500Medium' },
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
                  backgroundColor: '#D1F5EC',
                  borderColor: '#34D399',
                  shadowColor: '#059669',
                  shadowOpacity: isDark ? 0.25 : 0.20,
                }
              : {
                  backgroundColor: isDark ? currColors.card : '#FFFFFF',
                  borderColor: isDark ? currColors.border : '#E2E8F0',
                  shadowOpacity: isDark ? 0 : 0.05,
                },
          ]}
          activeOpacity={0.8}
          onPress={() => handleSwitch('money')}
        >
          {!isInvestments && (
            <LinearGradient
              colors={['#D1F5EC', '#A7F3D0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.gradientFill]}
            />
          )}

          <View style={styles.chipContent}>
            <View
              style={[
                styles.iconBadge,
                !isInvestments
                  ? { backgroundColor: 'rgba(6, 78, 59, 0.12)' }
                  : { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : currColors.cardSecondary },
              ]}
            >
              <Wallet
                size={14}
                color={!isInvestments ? '#064E3B' : isDark ? currColors.textSecondary : '#64748B'}
                strokeWidth={!isInvestments ? 2.5 : 2}
              />
            </View>
            <ThemedText
              numberOfLines={1}
              style={[
                styles.chipLabel,
                !isInvestments
                  ? { color: '#064E3B', fontFamily: 'Outfit_600SemiBold' }
                  : { color: isDark ? currColors.textSecondary : '#64748B', fontFamily: 'Outfit_500Medium' },
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
  gradientFill: {
    borderRadius: 20,
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
