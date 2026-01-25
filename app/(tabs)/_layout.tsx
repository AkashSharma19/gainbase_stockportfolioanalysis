import { Tabs, useRouter } from 'expo-router';
import { Briefcase, History, Plus, TrendingUp, User } from 'lucide-react-native';
import React from 'react';
import { Platform, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
// No longer using TabBarIcon, using Lucide directly in the config

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1C1C1E',
          height: Platform.OS === 'ios' ? 88 : 70,
          borderTopWidth: 1,
          borderTopColor: '#2C2C2E',
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color }) => <Briefcase color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <TrendingUp color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#007AFF',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#007AFF',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              <Plus size={20} color="#FFF" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/add-transaction');
          },
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <History color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={20} />,
        }}
      />
    </Tabs>
  );
}
