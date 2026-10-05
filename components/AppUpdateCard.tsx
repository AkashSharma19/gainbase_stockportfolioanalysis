import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  DownloadCloud,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

// Safe check to verify ExpoUpdates native module is actually compiled into the current binary
function getExpoUpdatesModule(): any {
  try {
    const isNativeModuleRegistered = Boolean(
      typeof globalThis !== 'undefined' &&
      ((globalThis as any).expo?.modules?.ExpoUpdates || (globalThis as any).ExpoModules?.ExpoUpdates)
    );

    if (!isNativeModuleRegistered) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-updates');
  } catch {
    return null;
  }
}

export function AppUpdateCard() {
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Safe runtime channel inspection
  const channelInfo = useMemo(() => {
    try {
      const Updates = getExpoUpdatesModule();
      if (Updates && Updates.isEnabled) {
        return Updates.channel || 'Production';
      }
    } catch {
      // Native module not linked in current binary
    }
    return 'Production';
  }, []);

  const handleHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style);
    } catch {
      // Ignore haptics errors on unsupported devices
    }
  };

  const handleCheckForUpdates = async () => {
    handleHaptic();

    if (__DEV__) {
      Alert.alert(
        'Development Mode',
        'Over-The-Air (OTA) updates are enabled in release/standalone builds. In local development, Metro bundles updates directly.',
        [{ text: 'Got it' }]
      );
      return;
    }

    try {
      const Updates = getExpoUpdatesModule();
      if (!Updates || !Updates.isEnabled) {
        Alert.alert(
          'OTA Updates Ready',
          'Over-The-Air updates are active. Rebuild the standalone binary with expo-updates once to enable cloud bundle downloads.'
        );
        return;
      }

      setIsChecking(true);
      setStatusMessage('Checking for updates...');

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        handleHaptic(Haptics.ImpactFeedbackStyle.Medium);
        setIsChecking(false);
        setIsDownloading(true);
        setStatusMessage('Downloading new update...');

        await Updates.fetchUpdateAsync();
        setIsDownloading(false);
        setIsUpdateReady(true);
        setStatusMessage('Update downloaded! Ready to restart.');

        Alert.alert(
          '🎉 Update Ready',
          'A new version has been downloaded. Restart the app now to apply the latest features?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Restart Now',
              style: 'default',
              onPress: async () => {
                handleHaptic(Haptics.ImpactFeedbackStyle.Heavy);
                if (Updates && typeof Updates.reloadAsync === 'function') {
                  await Updates.reloadAsync();
                }
              },
            },
          ]
        );
      } else {
        setIsChecking(false);
        setStatusMessage('You are on the latest version.');
        Alert.alert('✨ Up to Date', 'You are already running the latest version of Gainbase.');
      }
    } catch (error: any) {
      setIsChecking(false);
      setIsDownloading(false);
      setStatusMessage(null);
      Alert.alert(
        'Update Check',
        error?.message || 'Unable to connect to the update server. Please check your internet connection.'
      );
    }
  };

  const handleRestart = async () => {
    handleHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const Updates = getExpoUpdatesModule();
      if (Updates && typeof Updates.reloadAsync === 'function') {
        await Updates.reloadAsync();
      } else {
        Alert.alert('Manual Restart', 'Please close and reopen the app to apply changes.');
      }
    } catch (e: any) {
      Alert.alert('Restart Failed', e?.message || 'Please manually close and reopen the app.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? '#00C9A718' : '#00C9A710' }]}>
          <DownloadCloud size={20} color={currColors.tintMoney} strokeWidth={2.2} />
        </View>

        <View style={styles.titleWrap}>
          <ThemedText style={[styles.title, { color: currColors.text }]}>
            Over-The-Air Updates
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: currColors.textSecondary }]}>
            {statusMessage || `Gainbase v1.0.0 • ${channelInfo}`}
          </ThemedText>
        </View>
      </View>

      {/* Action CTA */}
      {isUpdateReady ? (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: currColors.tintMoney }]}
          onPress={handleRestart}
          activeOpacity={0.85}
        >
          <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
          <ThemedText style={styles.actionBtnText}>Restart to Apply Update</ThemedText>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.actionBtnSecondary,
            {
              backgroundColor: currColors.cardSecondary,
              borderColor: currColors.border,
            },
          ]}
          onPress={handleCheckForUpdates}
          disabled={isChecking || isDownloading}
          activeOpacity={0.8}
        >
          {isChecking || isDownloading ? (
            <ActivityIndicator size="small" color={currColors.tintMoney} style={{ marginRight: 8 }} />
          ) : (
            <Sparkles size={15} color={currColors.tintMoney} style={{ marginRight: 6 }} />
          )}
          <ThemedText style={[styles.actionBtnSecondaryText, { color: currColors.text }]}>
            {isChecking
              ? 'Checking for Updates...'
              : isDownloading
              ? 'Downloading Update...'
              : 'Check for Updates'}
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    marginTop: 2,
  },
  actionBtn: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  actionBtnSecondary: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
});
