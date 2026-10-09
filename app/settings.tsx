import React from 'react';
import {
  Platform,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { Moon, Smartphone, Sun } from 'lucide-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { BackButton } from '@/components/BackButton';
import { ThemedText } from '@/components/ThemedText';
import { VersionCheckFooter } from '@/components/VersionCheckFooter';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = usePortfolioStore((state) => state.theme);
  const setTheme = usePortfolioStore((state) => state.setTheme);
  const showCurrencySymbol = usePortfolioStore(
    (state) => state.showCurrencySymbol,
  );
  const toggleCurrencySymbol = usePortfolioStore(
    (state) => state.toggleCurrencySymbol,
  );

  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const headerTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 56 : 24);

  return (
    <View style={[styles.container, { backgroundColor: currColors.background, paddingTop: headerTopPadding }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        <BackButton />
        <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
          Settings
        </ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
        showsVerticalScrollIndicator={false}
      >


          <View
            style={[
              styles.section,
              {
                backgroundColor: currColors.card,
                borderColor: currColors.border,
              },
            ]}
          >
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.settingTitle, { color: currColors.text }]}>
                  Appearance
                </ThemedText>
                <ThemedText
                  style={[
                    styles.settingDescription,
                    { color: currColors.textSecondary },
                  ]}
                >
                  Choose how the app looks to you
                </ThemedText>
              </View>
            </View>

            <View
              style={[
                styles.themeSelector,
                { backgroundColor: currColors.cardSecondary },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  theme === 'light' && {
                    backgroundColor: currColors.card,
                    borderColor: currColors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTheme('light');
                }}
              >
                <Sun
                  size={16}
                  color={
                    theme === 'light'
                      ? currColors.tintMoney
                      : currColors.textSecondary
                  }
                />
                <ThemedText
                  style={[
                    styles.themeText,
                    {
                      color:
                        theme === 'light'
                          ? currColors.text
                          : currColors.textSecondary,
                    },
                  ]}
                >
                  Light
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOption,
                  theme === 'dark' && {
                    backgroundColor: currColors.card,
                    borderColor: currColors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTheme('dark');
                }}
              >
                <Moon
                  size={16}
                  color={
                    theme === 'dark'
                      ? currColors.tintMoney
                      : currColors.textSecondary
                  }
                />
                <ThemedText
                  style={[
                    styles.themeText,
                    {
                      color:
                        theme === 'dark'
                          ? currColors.text
                          : currColors.textSecondary,
                    },
                  ]}
                >
                  Dark
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOption,
                  theme === 'system' && {
                    backgroundColor: currColors.card,
                    borderColor: currColors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTheme('system');
                }}
              >
                <Smartphone
                  size={16}
                  color={
                    theme === 'system'
                      ? currColors.tintMoney
                      : currColors.textSecondary
                  }
                />
                <ThemedText
                  style={[
                    styles.themeText,
                    {
                      color:
                        theme === 'system'
                          ? currColors.text
                          : currColors.textSecondary,
                    },
                  ]}
                >
                  System
                </ThemedText>
              </TouchableOpacity>
            </View>

            <View
              style={[styles.separator, { backgroundColor: currColors.border }]}
            />

            <View style={styles.settingRow}>
              <View>
                <ThemedText style={[styles.settingTitle, { color: currColors.text }]}>
                  Show Currency Symbol
                </ThemedText>
                <ThemedText
                  style={[
                    styles.settingDescription,
                    { color: currColors.textSecondary },
                  ]}
                >
                  Display symbols like ₹ in portfolios
                </ThemedText>
              </View>
              <Switch
                value={showCurrencySymbol}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleCurrencySymbol();
                }}
                trackColor={{ false: '#767577', true: currColors.tintMoney }}
                thumbColor={
                  Platform.OS === 'ios'
                    ? '#FFFFFF'
                    : showCurrencySymbol
                      ? '#FFFFFF'
                      : '#f4f3f4'
                }
              />
            </View>
          </View>

          {/* Version & Build Info Footer with Refresh check button */}
          <VersionCheckFooter />
        </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTitle: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
  separator: {
    height: 1,
    marginVertical: 16,
  },
  themeSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginTop: 16,
    gap: 4,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  themeText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  footerVersionWrap: {
    marginTop: 36,
    alignItems: 'center',
    gap: 4,
  },
  footerVersionText: {
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  footerBuildMetaText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    opacity: 0.7,
  },
});
