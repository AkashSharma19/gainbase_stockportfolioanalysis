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

  // Reanimated shared values
  const transitionVal = useSharedValue(activeMode === 'investments' ? 0 : 1);

  useEffect(() => {
    transitionVal.value = withTiming(activeMode === 'investments' ? 0 : 1, {
      duration: 250,
      easing: Easing.bezier(0.25, 1, 0.5, 1), // matches dashboard smooth slide
    });
  }, [activeMode]);

  const handleSwitch = (mode: AppMode) => {
    if (mode === activeMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsTransitioning(true);
    
    // Switch the mode state
    setActiveMode(mode);
    
    // Wait for the fade out to start/finish before resetting isTransitioning (handled in screens or root view)
    setTimeout(() => {
      setIsTransitioning(false);
    }, 350);
  };

  // Animated slider style
  const sliderStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: transitionVal.value * (TAB_WIDTH - 2), // accounts for inner margin/border
        },
      ],
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
            backgroundColor: activeMode === 'investments' ? '#007AFF' : '#00C9A7',
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
        <ThemedText
          style={[
            styles.tabText,
            {
              color: activeMode === 'investments' ? '#FFFFFF' : currColors.textSecondary,
              fontFamily: activeMode === 'investments' ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
            },
          ]}
        >
          📈 Investments
        </ThemedText>
      </TouchableOpacity>

      {/* Money Manager Tab */}
      <TouchableOpacity
        style={styles.tab}
        activeOpacity={0.9}
        onPress={() => handleSwitch('money')}
      >
        <ThemedText
          style={[
            styles.tabText,
            {
              color: activeMode === 'money' ? '#FFFFFF' : currColors.textSecondary,
              fontFamily: activeMode === 'money' ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
            },
          ]}
        >
          💰 Money Manager
        </ThemedText>
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
  },
  slider: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabText: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
