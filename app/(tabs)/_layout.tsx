import React from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Tabs, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Compass,
  Sparkles,
  User,
  Wallet,
  CreditCard,
  LayoutDashboard,
  Landmark,
  Plus,
} from 'lucide-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAppModeStore } from '@/store/useAppModeStore';

interface TabDefinition {
  name: string;
  label: string;
  icon: (props: { color: string; focused: boolean }) => React.ReactNode;
  isCenterAdd?: boolean;
}

function CustomFloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const currColors = Colors[colorScheme];
  const { activeMode } = useAppModeStore();
  const isInvestMode = activeMode === 'investments';

  const activeColor = isInvestMode ? '#0A84FF' : '#00C9A7';
  const activeGradient = isInvestMode
    ? (['#0A84FF', '#005AC1'] as const)
    : (['#00C9A7', '#028E75'] as const);

  const investTabs: TabDefinition[] = [
    {
      name: 'index',
      label: 'Portfolio',
      icon: ({ color, focused }) => (
        <Wallet size={19} color={color} strokeWidth={focused ? 2.4 : 1.8} />
      ),
    },
    {
      name: 'insights',
      label: 'Insights',
      icon: ({ color, focused }) => (
        <Sparkles size={19} color={color} strokeWidth={focused ? 2.4 : 1.8} />
      ),
    },
    {
      name: 'add',
      label: 'Add',
      isCenterAdd: true,
      icon: () => <Plus size={22} color="#FFFFFF" strokeWidth={2.6} />,
    },
    {
      name: 'explore',
      label: 'Explore',
      icon: ({ color, focused }) => (
        <Compass size={19} color={color} strokeWidth={focused ? 2.4 : 1.8} />
      ),
    },
    {
      name: 'profile',
      label: 'Profile',
      icon: ({ color, focused }) => (
        <User size={19} color={color} strokeWidth={focused ? 2.4 : 1.8} />
      ),
    },
  ];

  const moneyTabs: TabDefinition[] = [
    {
      name: 'index',
      label: 'Dashboard',
      icon: ({ color, focused }) => (
        <LayoutDashboard size={19} color={color} strokeWidth={focused ? 2.4 : 1.8} />
      ),
    },
    {
      name: 'money-accounts',
      label: 'Accounts',
      icon: ({ color, focused }) => (
        <CreditCard size={19} color={color} strokeWidth={focused ? 2.4 : 1.8} />
      ),
    },
    {
      name: 'add',
      label: 'Add',
      isCenterAdd: true,
      icon: () => <Plus size={22} color="#FFFFFF" strokeWidth={2.6} />,
    },
    {
      name: 'money-loans',
      label: 'EMIs',
      icon: ({ color, focused }) => (
        <Landmark size={19} color={color} strokeWidth={focused ? 2.4 : 1.8} />
      ),
    },
    {
      name: 'profile',
      label: 'Profile',
      icon: ({ color, focused }) => (
        <User size={19} color={color} strokeWidth={focused ? 2.4 : 1.8} />
      ),
    },
  ];

  const currentTabs = isInvestMode ? investTabs : moneyTabs;
  const currentRoute = state.routes[state.index];

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dockWrapper,
        {
          bottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) + 2 : 16,
        },
      ]}
    >
      <View
        style={[
          styles.dockContainer,
          {
            backgroundColor: currColors.card,
            borderColor: currColors.border,
            shadowColor: '#000',
            shadowOpacity: isDark ? 0.38 : 0.12,
          },
        ]}
      >
        {currentTabs.map((tab) => {
          if (tab.isCenterAdd) {
            return (
              <TouchableOpacity
                key="center-add-button"
                activeOpacity={0.82}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (isInvestMode) {
                    router.push('/add-transaction');
                  } else {
                    router.push('/add-money-transaction');
                  }
                }}
                style={[styles.centerAddPill, { shadowColor: activeColor }]}
              >
                <LinearGradient
                  colors={activeGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.centerAddGradient}
                >
                  <Plus size={22} color="#FFFFFF" strokeWidth={2.6} />
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          const isFocused = currentRoute?.name === tab.name;
          const iconColor = isFocused ? activeColor : currColors.textSecondary;

          return (
            <TouchableOpacity
              key={tab.name}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const route = state.routes.find((r: any) => r.name === tab.name);
                if (route) {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }
              }}
              style={[
                styles.tabButton,
                isFocused && {
                  backgroundColor: isInvestMode
                    ? isDark
                      ? 'rgba(10, 132, 255, 0.16)'
                      : 'rgba(10, 132, 255, 0.10)'
                    : isDark
                      ? 'rgba(0, 201, 167, 0.16)'
                      : 'rgba(0, 201, 167, 0.10)',
                },
              ]}
            >
              {tab.icon({ color: iconColor, focused: isFocused })}
              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  {
                    color: iconColor,
                    fontFamily: isFocused ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  return (
    <View style={{ flex: 1, backgroundColor: currColors.background }}>
      <Tabs
        tabBar={(props) => <CustomFloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="insights" />
        <Tabs.Screen name="money-accounts" />
        <Tabs.Screen name="add" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="money-loans" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="two" />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  dockContainer: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    paddingVertical: 3,
    gap: 2,
  },
  tabLabel: {
    fontSize: 9.5,
    letterSpacing: 0.1,
  },
  centerAddPill: {
    width: 58,
    height: 44,
    borderRadius: 22,
    marginHorizontal: 4,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.32,
    shadowRadius: 6,
    elevation: 5,
  },
  centerAddGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
