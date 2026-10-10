import React, { useState, useEffect } from 'react';
import { View, StyleSheet, LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { FolderPalette, getFolderDetailsCardPath } from '@/constants/folderTheme';
import { ThemedText } from '@/components/ThemedText';
import { Category3DIcon } from '@/components/Category3DIcon';
import { useColorScheme } from '@/components/useColorScheme';

export function CircularProgress3DIcon({
  name,
  icon,
  progress = 0,
  color,
  size = 48,
  iconSize = 28,
}: {
  name: string;
  icon?: string;
  progress?: number;
  color: string;
  size?: number;
  iconSize?: number;
}) {
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0.03, Math.min(1, progress));
  const strokeDashoffset = circumference - clampedProgress * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color + '22'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <Category3DIcon name={name} icon={icon} size={iconSize} />
    </View>
  );
}

interface Props {
  palette: FolderPalette;
  headerTitle: string;
  headerSubtitle?: React.ReactNode;
  tabRightContent: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tabWidth?: number;
  tabHeight?: number;
}

export function FolderDetailsCard({
  palette,
  headerTitle,
  headerSubtitle,
  tabRightContent,
  children,
  style,
  tabWidth = 90,
  tabHeight = 26,
}: Props) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (
      Math.round(width) !== Math.round(dimensions.width) ||
      Math.round(height) !== Math.round(dimensions.height)
    ) {
      setDimensions({ width, height });
    }
  };

  const path =
    dimensions.width > 0 && dimensions.height > 0
      ? getFolderDetailsCardPath(dimensions.width, dimensions.height, tabWidth, tabHeight, 18, 24)
      : '';

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.08 : 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
        style,
      ]}
    >
      {/* ─── SVG Folder Dossier Background Shape ─── */}
      {dimensions.width > 0 && dimensions.height > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={dimensions.width} height={dimensions.height}>
            <Path
              d={path}
              fill={palette.bg}
              stroke={isDark ? 'transparent' : palette.sub + '45'}
              strokeWidth={1.2}
            />
          </Svg>
        </View>
      )}

      {/* ─── Top-Right Tab Lobe (Houses 3D Icon matching Outer Card) ─── */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 14,
          width: tabWidth - 14,
          height: 84,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        {tabRightContent}
      </View>

      {/* ─── Top-Left Header Content (Title & Subtitle matching Outer Card) ─── */}
      <View
        style={{
          position: 'absolute',
          top: tabHeight + 8,
          left: 20,
          right: tabWidth + 14,
          zIndex: 10,
        }}
      >
        <ThemedText
          style={[styles.headerTitle, { color: palette.text }]}
          numberOfLines={1}
        >
          {headerTitle}
        </ThemedText>
        {headerSubtitle ? (
          <View style={{ marginTop: 4 }}>{headerSubtitle}</View>
        ) : null}
      </View>

      {/* ─── Main Folder Dossier Body Content (Reveals below header) ─── */}
      <View
        style={{
          paddingTop: tabHeight + 68,
          paddingHorizontal: 18,
          paddingBottom: 20,
        }}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: -0.3,
  },
});

