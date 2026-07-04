import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { TrendingUp, Wallet } from 'lucide-react-native';

import { useAppModeStore, AppMode } from '../store/useAppModeStore';
import { ThemedText } from './ThemedText';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTAINER_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
const TOGGLE_WIDTH = CONTAINER_WIDTH;
const TAB_WIDTH = TOGGLE_WIDTH / 2;

export function AppSwitcher() {
  const { activeMode, setActiveMode, setIsTransitioning } = useAppModeStore();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  // Shared value going from 0 (investments) to 1 (money)
  const transitionVal = useSharedValue(activeMode === 'investments' ? 0 : 1);

  useEffect(() => {
    transitionVal.value = withTiming(activeMode === 'investments' ? 0 : 1, {
      duration: 280,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });
  }, [activeMode]);

  const handleSwitch = (mode: AppMode) => {
    if (mode === activeMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsTransitioning(true);
    
    setActiveMode(mode);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 350);
  };

  // Slider style with smooth horizontal translation and background color interpolation
  const sliderStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      transitionVal.value,
      [0, 1],
      ['#007AFF', '#00C9A7'] // Investments = Blue, Money = Teal
    );
    return {
      transform: [
        {
          translateX: transitionVal.value * (TAB_WIDTH - 4),
        },
      ],
      backgroundColor,
    };
  });

  // Animated styles for tab text and icons to scale and fade smoothly
  const investmentsTabStyle = useAnimatedStyle(() => {
    const opacity = 1 - (transitionVal.value * 0.4); // 1.0 (active) -> 0.6 (inactive)
    const scale = 1.03 - (transitionVal.value * 0.03); // 1.03 -> 1.0
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const moneyTabStyle = useAnimatedStyle(() => {
    const opacity = 0.6 + (transitionVal.value * 0.4); // 0.6 (inactive) -> 1.0 (active)
    const scale = 1.0 + (transitionVal.value * 0.03); // 1.0 -> 1.03
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: currColors.cardSecondary,
          borderColor: currColors.border,
        },
      ]}
    >
      {/* Sliding Active Background Pill */}
      <Animated.View
        style={[
          styles.slider,
          {
            width: TAB_WIDTH - 4,
          },
          sliderStyle,
        ]}
      />

      {/* Investments Tab */}
      <TouchableOpacity
        style={styles.tab}
        activeOpacity={0.9}
        onPress={() => handleSwitch('investments')}
      >
        <Animated.View style={[styles.tabContent, investmentsTabStyle]}>
          <TrendingUp size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <ThemedText
            style={[
              styles.tabText,
              {
                color: '#FFFFFF',
                fontFamily: activeMode === 'investments' ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
              },
            ]}
          >
            Investments
          </ThemedText>
        </Animated.View>
      </TouchableOpacity>

      {/* Money Manager Tab */}
      <TouchableOpacity
        style={styles.tab}
        activeOpacity={0.9}
        onPress={() => handleSwitch('money')}
      >
        <Animated.View style={[styles.tabContent, moneyTabStyle]}>
          <Wallet size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <ThemedText
            style={[
              styles.tabText,
              {
                color: '#FFFFFF',
                fontFamily: activeMode === 'money' ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
              },
            ]}
          >
            Money Manager
          </ThemedText>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    padding: 3,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  slider: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
