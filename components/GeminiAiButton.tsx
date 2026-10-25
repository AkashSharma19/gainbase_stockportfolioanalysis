import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Path,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useColorScheme } from './useColorScheme';

interface GeminiAiButtonProps {
  onPress: () => void;
  size?: number;
}

export function GeminiAiButton({ onPress, size = 40 }: GeminiAiButtonProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';

  const pulse = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // Gentle breathing pulse
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.96, { duration: 2400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Subtle micro-rotation for dynamic feel
    rotate.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
        withTiming(-5, { duration: 2800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulse, rotate]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulse.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const starSize = 18;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#E9D5FF',
          borderColor: '#C084FC',
          shadowColor: '#9333EA',
          shadowOpacity: isDark ? 0.30 : 0.22,
        },
      ]}
    >
      <LinearGradient
        colors={['#E9D5FF', '#DDD6FE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
      <Animated.View style={animatedIconStyle}>
        <Svg
          width={starSize}
          height={starSize}
          viewBox="0 0 24 24"
        >
          <Defs>
            <SvgLinearGradient id="geminiGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#6B21A8" />
              <Stop offset="50%" stopColor="#9333EA" />
              <Stop offset="100%" stopColor="#4F46E5" />
            </SvgLinearGradient>
          </Defs>
          <Path
            d="M 12 2 C 12 7.52 7.52 12 2 12 C 7.52 12 12 16.48 12 22 C 12 16.48 16.48 12 22 12 C 16.48 12 12 7.52 12 2 Z"
            fill="url(#geminiGrad)"
          />
        </Svg>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1.5 },
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
});

