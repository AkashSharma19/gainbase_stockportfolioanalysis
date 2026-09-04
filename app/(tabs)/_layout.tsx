import * as Haptics from 'expo-haptics';
import { Tabs, useRouter } from 'expo-router';
import {
  Compass,
  History,
  Plus,
  Sparkles,
  User,
  Wallet,
  CreditCard,
  PiggyBank,
  LayoutDashboard,
  Landmark,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAppModeStore } from '@/store/useAppModeStore';

function InsightsTabIcon({
  color,
  focused,
}: {
  color: any;
  focused: boolean;
}) {
  return (
    <View style={tabStyles.iconWrapper}>
      <Sparkles size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];
  const router = useRouter();
  const { activeMode } = useAppModeStore();

  const handleHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const isInvestMode = activeMode === 'investments';
  const activeColor = isInvestMode ? '#007AFF' : '#00C9A7';

  return (
    <View style={{ flex: 1, backgroundColor: currColors.background }}>
      <Tabs
          screenOptions={{
            tabBarActiveTintColor: activeColor,
            tabBarInactiveTintColor: currColors.textSecondary,
            headerShown: false,
            tabBarShowLabel: true,
            tabBarButton: (props) => {
              const { delayLongPress, ...rest } = props as any;
              return (
                <TouchableOpacity
                  {...rest}
                  delayLongPress={delayLongPress ?? undefined}
                  activeOpacity={0.7}
                  onPress={(e) => {
                    handleHaptic();
                    props.onPress?.(e);
                  }}
                />
              );
            },
            tabBarStyle: {
              backgroundColor: currColors.background,
              height: Platform.OS === 'ios' ? 92 : 78,
              borderTopWidth: 1,
              borderTopColor: currColors.border,
              elevation: 0,
              paddingBottom: Platform.OS === 'ios' ? 32 : 12,
              paddingTop: 10,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '500',
              marginTop: 4,
              marginBottom: 2,
              fontFamily: 'Outfit_500Medium',
            },
          }}
        >
          {/* Index Tab - Portfolio in Invest mode, Dashboard in Money mode */}
          <Tabs.Screen
            name="index"
            options={{
              title: isInvestMode ? 'Portfolio' : 'Dashboard',
              tabBarIcon: ({ color, focused }) =>
                isInvestMode ? (
                  <Wallet size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                ) : (
                  <LayoutDashboard size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
                ),
            }}
          />

          {/* Investment Only Tabs */}
          <Tabs.Screen
            name="insights"
            options={{
              title: 'Insights',
              href: isInvestMode ? undefined : null,
              tabBarIcon: ({ color, focused }) => (
                <InsightsTabIcon color={color} focused={focused} />
              ),
            }}
          />

          <Tabs.Screen
            name="add"
            options={{
              href: null,
            }}
          />

          <Tabs.Screen
            name="two"
            options={{
              title: 'History',
              href: isInvestMode ? undefined : null,
              tabBarIcon: ({ color, focused }) => (
                <History
                  size={24}
                  color={color}
                  strokeWidth={focused ? 2.5 : 2}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="explore"
            options={{
              title: 'Explore',
              href: isInvestMode ? undefined : null,
              tabBarIcon: ({ color, focused }) => (
                <Compass
                  size={24}
                  color={color}
                  strokeWidth={focused ? 2.5 : 2}
                />
              ),
            }}
          />

          {/* Money Manager Only Tabs */}
          <Tabs.Screen
            name="money-accounts"
            options={{
              title: 'Accounts',
              href: !isInvestMode ? undefined : null,
              tabBarIcon: ({ color, focused }) => (
                <CreditCard
                  size={24}
                  color={color}
                  strokeWidth={focused ? 2.5 : 2}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="money-budgets"
            options={{
              title: 'Budgets',
              href: !isInvestMode ? undefined : null,
              tabBarIcon: ({ color, focused }) => (
                <PiggyBank
                  size={24}
                  color={color}
                  strokeWidth={focused ? 2.5 : 2}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="money-loans"
            options={{
              title: 'EMIs',
              href: !isInvestMode ? undefined : null,
              tabBarIcon: ({ color, focused }) => (
                <Landmark
                  size={24}
                  color={color}
                  strokeWidth={focused ? 2.5 : 2}
                />
              ),
            }}
          />

          {/* Shared Profile Tab */}
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, focused }) => (
                <User size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
              ),
            }}
          />
        </Tabs>

      {/* AI Chat Floating Action Button */}
      <TouchableOpacity
        onPress={() => {
          handleHaptic();
          router.push('/ai-chat');
        }}
        activeOpacity={0.8}
        style={{
          position: 'absolute',
          right: 16,
          bottom: Platform.OS === 'ios' ? 170 : 155,
          width: 56,
          height: 56,
          borderRadius: 28,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4.65,
          elevation: 8,
        }}
      >
        <LinearGradient
          colors={isInvestMode ? ['#007AFF', '#5856D6'] : ['#00C9A7', '#059669']}
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Sparkles size={24} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => {
          handleHaptic();
          router.push(isInvestMode ? '/add-transaction' : '/add-money-transaction');
        }}
        activeOpacity={0.8}
        style={{
          position: 'absolute',
          right: 16,
          bottom: Platform.OS === 'ios' ? 100 : 85,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: activeColor,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4.65,
          elevation: 8,
        }}
      >
        <Plus size={30} color="#FFF" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

