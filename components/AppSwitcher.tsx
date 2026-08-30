import React from 'react';
import { StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { TrendingUp, Wallet, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppModeStore, AppMode } from '../store/useAppModeStore';
import { ThemedText } from './ThemedText';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function AppSwitcher() {
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
    setTimeout(() => {
      setIsTransitioning(false);
    }, 320);
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.chipsRow}>
        {/* --- Investments Chip --- */}
        <TouchableOpacity
          style={[
            styles.chip,
            !isInvestments && {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
          activeOpacity={0.8}
          onPress={() => handleSwitch('investments')}
        >
          {isInvestments && (
            <LinearGradient
              colors={['#0A84FF', '#005AC1']}
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
                  ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                  : { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' },
              ]}
            >
              <TrendingUp
                size={14}
                color={isInvestments ? '#FFFFFF' : currColors.textSecondary}
                strokeWidth={isInvestments ? 2.5 : 2}
              />
            </View>
            <ThemedText
              style={[
                styles.chipLabel,
                isInvestments
                  ? { color: '#FFFFFF', fontFamily: 'Outfit_600SemiBold' }
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
            isInvestments && {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
          activeOpacity={0.8}
          onPress={() => handleSwitch('money')}
        >
          {!isInvestments && (
            <LinearGradient
              colors={['#00C9A7', '#028E75']}
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
                  ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                  : { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' },
              ]}
            >
              <Wallet
                size={14}
                color={!isInvestments ? '#FFFFFF' : currColors.textSecondary}
                strokeWidth={!isInvestments ? 2.5 : 2}
              />
            </View>
            <ThemedText
              style={[
                styles.chipLabel,
                !isInvestments
                  ? { color: '#FFFFFF', fontFamily: 'Outfit_600SemiBold' }
                  : { color: currColors.textSecondary, fontFamily: 'Outfit_500Medium' },
              ]}
            >
              Money Manager
            </ThemedText>
          </View>
        </TouchableOpacity>
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
    gap: 10,
  },
  chip: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  gradientFill: {
    borderRadius: 21,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
});


