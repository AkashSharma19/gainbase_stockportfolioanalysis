import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Sparkles, RefreshCw, X } from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

function getExpoUpdatesModule(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-updates');
  } catch {
    return null;
  }
}

export function OTAUpdateNotification() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const slideAnim = useRef(new Animated.Value(-120)).current;
  const lastCheckTimeRef = useRef<number>(0);
  const isCheckingRef = useRef<boolean>(false);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style);
    } catch {
      // Ignore on unsupported platforms
    }
  };

  const checkForOTAUpdates = async () => {
    if (__DEV__ || isCheckingRef.current || isUpdateReady) return;

    // Throttle checks to once every 15 minutes
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 15 * 60 * 1000) {
      return;
    }

    try {
      const Updates = getExpoUpdatesModule();
      if (!Updates || !Updates.isEnabled) return;

      isCheckingRef.current = true;
      lastCheckTimeRef.current = now;

      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        // Fetch the update in background
        await Updates.fetchUpdateAsync();
        setIsUpdateReady(true);
        setIsDismissed(false);
      }
    } catch (e) {
      // Silent catch so it never disturbs user experience
      console.log('OTA background check error:', e);
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    // Initial check after app finishes bootstrap (3s delay)
    const timer = setTimeout(() => {
      checkForOTAUpdates();
    }, 3000);

    // Check on app resume from background
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkForOTAUpdates();
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  // Slide animation
  useEffect(() => {
    if (isUpdateReady && !isDismissed) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -140,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isUpdateReady, isDismissed]);

  const handleRestart = async () => {
    if (isReloading) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setIsReloading(true);

    try {
      const Updates = getExpoUpdatesModule();
      if (Updates) {
        await Updates.reloadAsync();
      }
    } catch {
      setIsReloading(false);
    }
  };

  const handleDismiss = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setIsDismissed(true);
  };

  if (!isUpdateReady || isDismissed) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: insets.top > 0 ? insets.top + 6 : 16,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
            borderColor: currColors.border,
            shadowColor: colorScheme === 'dark' ? '#000000' : '#8E8E93',
          },
        ]}
      >
        {/* Left Icon Badge */}
        <View style={[styles.iconBadge, { backgroundColor: currColors.tintMoney + '18' }]}>
          <Sparkles size={16} color={currColors.tintMoney} />
        </View>

        {/* Content */}
        <View style={styles.textContainer}>
          <ThemedText style={[styles.title, { color: currColors.text }]}>
            Update Ready
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: currColors.textSecondary }]} numberOfLines={1}>
            Restart now to apply the latest version.
          </ThemedText>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.restartButton, { backgroundColor: currColors.tintMoney }]}
            onPress={handleRestart}
            activeOpacity={0.8}
            disabled={isReloading}
          >
            {isReloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ transform: [{ scale: 0.7 }] }} />
            ) : (
              <View style={styles.btnRow}>
                <RefreshCw size={12} color="#FFFFFF" strokeWidth={2.5} />
                <ThemedText style={styles.restartBtnText}>Restart</ThemedText>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dismissButton, { backgroundColor: currColors.cardSecondary }]}
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={13} color={currColors.textSecondary} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    lineHeight: 16,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restartButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 28,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restartBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: 'Outfit_600SemiBold',
  },
  dismissButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
