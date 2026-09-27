import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  borderColor?: string;
  backgroundColor?: string;
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

export const BackButton = ({
  onPress,
  color,
  borderColor,
  backgroundColor,
  size = 38,
  iconSize = 20,
  style,
}: BackButtonProps) => {
  const router = useRouter();
  const theme = useColorScheme() ?? 'dark';
  const c = Colors[theme];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  const dynamicRadius = Math.round(size / 2);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: dynamicRadius,
          borderColor: borderColor ?? c.border,
          backgroundColor: backgroundColor ?? c.cardSecondary,
        },
        style,
      ]}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <ArrowLeft size={iconSize} color={color ?? c.text} strokeWidth={2.2} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
