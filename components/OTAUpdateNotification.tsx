import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  Animated,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Sparkles, RefreshCw, Zap } from 'lucide-react-native';

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

  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
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

    // Throttle checks to once every 10 minutes
    const now = Date.now();
    if (now - lastCheckTimeRef.current < 10 * 60 * 1000) {
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
      }
    } catch (e) {
      // Silent catch so it never disrupts user experience
      console.log('OTA background check error:', e);
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    // Initial check after app finishes bootstrap (2s delay)
    const timer = setTimeout(() => {
      checkForOTAUpdates();
    }, 2000);

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

  // Slide up animation from bottom when update is ready
  useEffect(() => {
    if (isUpdateReady) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isUpdateReady]);

  const handleRestart = async () => {
    if (isReloading) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
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

  if (!isUpdateReady) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={isUpdateReady}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        // Mandatory update: do not allow back button dismiss on Android
      }}
    >
      <View style={styles.modalOverlay}>
        {/* Blurred / Darkened Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
              backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.55)',
            },
          ]}
        />

        {/* Bottom Sheet Card */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
              borderColor: currColors.border,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 28,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Top Indicator Handle */}
          <View style={[styles.handleBar, { backgroundColor: currColors.border }]} />

          {/* Hero Icon Badge */}
          <View
            style={[
              styles.heroIconBadge,
              { backgroundColor: currColors.tintMoney + '18', borderColor: currColors.tintMoney + '30' },
            ]}
          >
            <Sparkles size={28} color={currColors.tintMoney} />
          </View>

          {/* Mandatory Badge */}
          <View style={[styles.mandatoryBadge, { backgroundColor: currColors.tintMoney + '15' }]}>
            <Zap size={12} color={currColors.tintMoney} strokeWidth={2.5} />
            <ThemedText style={[styles.mandatoryText, { color: currColors.tintMoney }]}>
              MANDATORY UPDATE
            </ThemedText>
          </View>

          {/* Title & Description */}
          <ThemedText style={[styles.title, { color: currColors.text }]}>
            Update Ready to Install
          </ThemedText>
          <ThemedText style={[styles.description, { color: currColors.textSecondary }]}>
            A new update has been downloaded. Restart the app now to apply essential performance upgrades and latest features.
          </ThemedText>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.restartButton, { backgroundColor: currColors.tintMoney }]}
            onPress={handleRestart}
            activeOpacity={0.85}
            disabled={isReloading}
          >
            {isReloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.btnRow}>
                <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />
                <ThemedText style={styles.restartBtnText}>Restart App Now</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 24,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    marginBottom: 18,
  },
  heroIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  mandatoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  mandatoryText: {
    fontSize: 10.5,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 19,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13.5,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  restartButton: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restartBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.2,
  },
});
