import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Platform,
  BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { FolderPalette } from '@/constants/folderTheme';
import { useColorScheme } from '@/components/useColorScheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  isOpen: boolean;
  origin: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  palette: FolderPalette;
  cardPreview: React.ReactNode;
  children: (onClose: () => void) => React.ReactNode;
  onClose: () => void;
}

export function ExpandedFolderContainer({
  isOpen,
  origin,
  palette,
  cardPreview,
  children,
  onClose,
}: Props) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const progress = useSharedValue(0);
  const isClosingRef = useRef(false);
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isExpanded, setIsExpanded] = useState(false);

  const triggerClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsExpanded(false);
    progress.value = withTiming(
      0,
      {
        duration: 360,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
      (finished) => {
        if (finished) {
          runOnJS(handleClosed)();
        }
      }
    );
  };

  const handleClosed = () => {
    setIsExpanded(false);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsExpanded(false);
      isClosingRef.current = false;
      progress.value = 0;
      progress.value = withTiming(
        1,
        {
          duration: 420,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(setIsExpanded)(true);
          }
        }
      );
    } else {
      setIsRendered(false);
      setIsExpanded(false);
    }
  }, [isOpen]);

  // Handle hardware back on Android
  useEffect(() => {
    if (Platform.OS === 'android' && isRendered) {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        triggerClose();
        return true;
      });
      return () => sub.remove();
    }
  }, [isRendered]);

  const targetBg = isDark ? '#000000' : '#F2F2F7';

  const ox = origin?.x ?? 16;
  const oy = origin?.y ?? 200;
  const ow = origin?.width ?? SCREEN_WIDTH - 32;
  const oh = origin?.height ?? 118;

  // Backdrop dimming as folder expands
  const backdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0, isDark ? 0.65 : 0.4]);
    return {
      opacity,
    };
  });

  // Morphing container: expands from card geometry to full screen, collapses back
  const containerStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const top = interpolate(p, [0, 1], [oy, 0]);
    const left = interpolate(p, [0, 1], [ox, 0]);
    const width = interpolate(p, [0, 1], [ow, SCREEN_WIDTH]);
    const height = interpolate(p, [0, 1], [oh, SCREEN_HEIGHT]);
    const borderRadius = interpolate(p, [0, 0.6, 1], [0, 16, 0]);

    return {
      position: 'absolute',
      top,
      left,
      width,
      height,
      borderRadius,
      overflow: p > 0.05 ? 'hidden' : 'visible',
      zIndex: 99999,
      backgroundColor: 'transparent',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: interpolate(p, [0, 0.4, 1], [0, 0.25, 0]),
      shadowRadius: 16,
      elevation: 12,
    };
  });

  // Full page content unfolds in - anchored to window top-left so it never slides down
  const pageContentStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const top = interpolate(p, [0, 1], [oy, 0]);
    const left = interpolate(p, [0, 1], [ox, 0]);
    const opacity = interpolate(p, [0.08, 0.35], [0, 1]);
    return {
      opacity,
      transform: [
        { translateY: -top },
        { translateX: -left },
      ],
    };
  });

  if (!isRendered) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 99999,
          elevation: 99,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Backdrop dimming */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#000000' },
          backdropStyle,
        ]}
        pointerEvents="none"
      />

      {/* Morphing Folder Window Container */}
      <Animated.View style={containerStyle}>
        {/* Full Page Content (reveals as folder expands, masked by container window) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            pageContentStyle,
            { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: targetBg },
          ]}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          {children(triggerClose)}
        </Animated.View>
      </Animated.View>
    </View>
  );
}
