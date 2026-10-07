import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { RotateCw, Check } from 'lucide-react-native';

import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getAppVersionInfo } from '@/utils/version';

function getExpoUpdatesModule(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-updates');
  } catch {
    return null;
  }
}

export function VersionCheckFooter() {
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [justChecked, setJustChecked] = useState(false);

  const versionInfo = useMemo(() => {
    return getAppVersionInfo();
  }, [justChecked]);

  const handleHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style);
    } catch {
      // Ignore haptics error on unsupported devices
    }
  };

  const handleCheckForUpdates = async () => {
    if (isChecking || isDownloading) return;
    handleHaptic();

    if (__DEV__) {
      Alert.alert(
        'Development Mode',
        `Running Gainbase ${versionInfo.formattedString} in local Metro dev mode. Updates are served directly from Metro.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const Updates = getExpoUpdatesModule();
      if (!Updates || !Updates.isEnabled) {
        Alert.alert(
          'App Version',
          `Gainbase ${versionInfo.formattedString}\nRuntime: ${versionInfo.runtimeVersion}`
        );
        return;
      }

      setIsChecking(true);
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        handleHaptic(Haptics.ImpactFeedbackStyle.Medium);
        setIsChecking(false);
        setIsDownloading(true);

        await Updates.fetchUpdateAsync();
        setIsDownloading(false);
        setJustChecked(true);

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
                try {
                  await Updates.reloadAsync();
                } catch {
                  // Fallback
                }
              },
            },
          ]
        );
      } else {
        setIsChecking(false);
        setJustChecked(true);
        handleHaptic(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert('Up to Date', `Gainbase ${versionInfo.formattedString} is the latest available version.`);
        setTimeout(() => setJustChecked(false), 4000);
      }
    } catch (error: any) {
      setIsChecking(false);
      setIsDownloading(false);
      Alert.alert('Check Failed', error?.message || 'Could not reach update servers. Please check your internet connection.');
    }
  };

  return (
    <View style={styles.footerContainer}>
      <TouchableOpacity
        style={styles.versionRow}
        onPress={handleCheckForUpdates}
        activeOpacity={0.7}
        disabled={isChecking || isDownloading}
      >
        <ThemedText style={[styles.versionText, { color: currColors.textSecondary }]}>
          Gainbase {versionInfo.formattedString}
        </ThemedText>

        <View style={[styles.refreshIconWrap, { backgroundColor: currColors.cardSecondary }]}>
          {isChecking || isDownloading ? (
            <ActivityIndicator size="small" color={currColors.tint} style={{ transform: [{ scale: 0.65 }] }} />
          ) : justChecked ? (
            <Check size={11} color="#34C759" strokeWidth={2.5} />
          ) : (
            <RotateCw size={11} color={currColors.textSecondary} strokeWidth={2.2} />
          )}
        </View>
      </TouchableOpacity>

      <ThemedText style={[styles.runtimeMetaText, { color: currColors.textSecondary }]}>
        Channel: {versionInfo.channel} • Runtime: {versionInfo.runtimeVersion}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingBottom: 36,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  versionText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 0.2,
  },
  refreshIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  runtimeMetaText: {
    fontSize: 10,
    fontFamily: 'Outfit_400Regular',
    marginTop: 4,
    opacity: 0.7,
  },
});
