import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  useColorScheme,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { 
  Cloud, 
  CloudOff, 
  ArrowLeft, 
  LogOut, 
  RefreshCw, 
  Activity,
  Smartphone,
  Layers,
  Trash2,
  Chrome
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { supabase } from '../lib/supabase';
import { syncAllData, wipeCloudData } from '../utils/syncEngine';
import { useMoneyStore } from '../store/useMoneyStore';
import { usePortfolioStore } from '../store/usePortfolioStore';
import Colors from '../constants/Colors';

// Replace these with your actual OAuth Client IDs from Google Cloud Console
const GOOGLE_WEB_CLIENT_ID: string = '764532668669-scdjerdm89tamds3q2cf1ll5g1budmdl.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID: string = '764532668669-npu54g1tpop5cc1nhloua5fbmh144sb5.apps.googleusercontent.com';

export default function CloudBackupScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  // Auth states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync states
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never');

  // Local data stats
  const accountsCount = useMoneyStore((state) => state.accounts?.length || 0);
  const txsCount = useMoneyStore((state) => state.moneyTransactions?.length || 0);
  const loansCount = useMoneyStore((state) => state.loans?.length || 0);
  const subsCount = useMoneyStore((state) => state.subscriptions?.length || 0);
  const portfolioTxsCount = usePortfolioStore((state) => state.transactions?.length || 0);
  const lastSyncedAt = usePortfolioStore((state) => state.lastSyncedAt);

  useEffect(() => {
    // Configure Google Sign-In dynamically only if the native module is available
    if (NativeModules.RNGoogleSignin) {
      try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        GoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID.endsWith('YOUR_GOOGLE_WEB_CLIENT_ID') 
            ? undefined 
            : GOOGLE_WEB_CLIENT_ID,
          iosClientId: GOOGLE_IOS_CLIENT_ID.endsWith('YOUR_GOOGLE_IOS_CLIENT_ID') 
            ? undefined 
            : GOOGLE_IOS_CLIENT_ID,
          offlineAccess: true,
        });
      } catch (e) {
        console.warn('Failed to configure Google Sign-In:', e);
      }
    } else {
      console.warn('Google Sign-In native module is not registered in this binary. Ensure you run custom native builds to test Google login.');
    }

    // Check initial session
    checkSession();
  }, []);

  useEffect(() => {
    if (lastSyncedAt) {
      setLastSyncTime(new Date(lastSyncedAt).toLocaleString());
    } else {
      setLastSyncTime('Never');
    }
  }, [lastSyncedAt]);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsLoggedIn(true);
        setUserEmail(session.user.email || '');
      } else {
        setIsLoggedIn(false);
        setUserEmail('');
      }
    } catch (e) {
      console.error('Error checking supabase session:', e);
    }
  };

  const handleHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleGoogleSignIn = async () => {
    handleHaptic();
    
    if (
      GOOGLE_WEB_CLIENT_ID === 'YOUR_GOOGLE_WEB_CLIENT_ID' ||
      GOOGLE_IOS_CLIENT_ID === 'YOUR_GOOGLE_IOS_CLIENT_ID'
    ) {
      Alert.alert(
        'Setup Required',
        'Please configure your Google Client IDs in app/cloud-backup.tsx before testing Google Sign-In.'
      );
      return;
    }

    if (!NativeModules.RNGoogleSignin) {
      Alert.alert(
        'Google Sign-In Unavailable',
        'Google Sign-In native module was not found in this binary. Please compile your project using npx expo run:ios (or run:android) instead of Expo Go.'
      );
      return;
    }

    setLoading(true);
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      await GoogleSignin.hasPlayServices();
      const userInfo = (await GoogleSignin.signIn()) as any;
      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (!idToken) {
        throw new Error('Google Sign-In failed to return an ID Token.');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;

      setIsLoggedIn(true);
      setUserEmail(data.user?.email || '');
      Alert.alert('Logged In', 'Successfully signed in with Google!');

      // Trigger initial sync after login
      triggerSync();
    } catch (error: any) {
      console.error('Google Auth Error:', error);
      Alert.alert('Google Sign-In Failed', error.message || 'An error occurred during Google Sign-In.');
    } finally {
      setLoading(false);
    }
  };



  const handleLogout = async () => {
    handleHaptic();
    Alert.alert(
      'Log Out',
      'Are you sure you want to disconnect Cloud Sync? Your local data will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await supabase.auth.signOut();
            } catch (e) {
              console.warn('Network logout failed, clearing local session anyway:', e);
            } finally {
              setIsLoggedIn(false);
              setUserEmail('');
              usePortfolioStore.setState({ lastSyncedAt: null });
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleWipeCloudData = async () => {
    handleHaptic();
    Alert.alert(
      'Wipe Cloud Backup',
      'Are you sure you want to permanently delete all your data backups from the cloud? Your local device data will NOT be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Cloud Data',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await wipeCloudData();
              if (res.success) {
                Alert.alert('Wiped', 'Your cloud data backup has been completely wiped.');
                setLastSyncTime('Never');
              } else {
                Alert.alert('Error', res.message);
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'An error occurred.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const triggerSync = async (syncMode: 'default' | 'force_push' | 'force_pull' = 'default') => {
    handleHaptic();
    setSyncing(true);
    try {
      const result = await syncAllData(syncMode);
      if (result.success) {
        Alert.alert('Sync Successful', 'All your data has been successfully backed up and synced!');
      } else if (result.message === 'DEVICE_MISMATCH') {
        // Stop the loading indicator first
        setSyncing(false);
        Alert.alert(
          'Device Conflict',
          'This account is registered to another sync device. What would you like to do?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Restore Backup (Cloud to Device)',
              onPress: () => triggerSync('force_pull'),
            },
            {
              text: 'Backup Device (Device to Cloud)',
              style: 'destructive',
              onPress: () => triggerSync('force_push'),
            },
          ]
        );
      } else {
        Alert.alert('Sync Failed', result.message);
      }
    } catch (e: any) {
      Alert.alert('Sync Failed', e.message || 'Failed to complete cloud sync.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={currColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currColors.text }]}>Cloud Sync & Backup</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isLoggedIn ? (
            // LOGGED IN VIEW
            <View style={styles.cardContainer}>
              <View style={[styles.statusCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 201, 167, 0.15)' }]}>
                  <Cloud size={32} color="#00C9A7" />
                </View>
                <Text style={[styles.statusTitle, { color: currColors.text }]}>Cloud Sync Active</Text>
                <Text style={[styles.statusSubtitle, { color: currColors.textSecondary }]}>
                  Connected as: <Text style={{ color: currColors.text, fontWeight: '500' }}>{userEmail}</Text>
                </Text>
                
                <View style={[styles.syncDivider, { backgroundColor: currColors.border }]} />

                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: currColors.textSecondary }]}>Last Synced:</Text>
                  <Text style={[styles.metaValue, { color: currColors.text }]}>{lastSyncTime}</Text>
                </View>
              </View>

              {/* Data Summary Stats */}
              <View style={[styles.statsCard, { backgroundColor: currColors.card, borderColor: currColors.border }]}>
                <Text style={[styles.sectionTitle, { color: currColors.text }]}>Sync Summary</Text>
                
                <View style={styles.statLine}>
                  <View style={styles.statLineLeft}>
                    <Layers size={18} color="#007AFF" style={styles.statIcon} />
                    <Text style={[styles.statLabelText, { color: currColors.text }]}>Money Manager Accounts</Text>
                  </View>
                  <Text style={[styles.statValueText, { color: currColors.textSecondary }]}>{accountsCount}</Text>
                </View>

                <View style={styles.statLine}>
                  <View style={styles.statLineLeft}>
                    <Activity size={18} color="#AF52DE" style={styles.statIcon} />
                    <Text style={[styles.statLabelText, { color: currColors.text }]}>Transactions</Text>
                  </View>
                  <Text style={[styles.statValueText, { color: currColors.textSecondary }]}>{txsCount}</Text>
                </View>

                <View style={styles.statLine}>
                  <View style={styles.statLineLeft}>
                    <Smartphone size={18} color="#FF9500" style={styles.statIcon} />
                    <Text style={[styles.statLabelText, { color: currColors.text }]}>Loans & Subscriptions</Text>
                  </View>
                  <Text style={[styles.statValueText, { color: currColors.textSecondary }]}>{loansCount + subsCount}</Text>
                </View>

                <View style={styles.statLine}>
                  <View style={styles.statLineLeft}>
                    <Layers size={18} color="#34C759" style={styles.statIcon} />
                    <Text style={[styles.statLabelText, { color: currColors.text }]}>Investment Trades</Text>
                  </View>
                  <Text style={[styles.statValueText, { color: currColors.textSecondary }]}>{portfolioTxsCount}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: '#00C9A7' }]}
                onPress={() => triggerSync()}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <RefreshCw size={20} color="#FFFFFF" style={styles.buttonIcon} />
                    <Text style={styles.syncButtonText}>Sync Now</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.logoutButton, { borderColor: currColors.border }]}
                onPress={handleLogout}
                disabled={loading}
              >
                <LogOut size={20} color="#FF3B30" style={styles.buttonIcon} />
                <Text style={styles.logoutButtonText}>Disconnect Sync</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.wipeButton, { borderColor: '#FF3B30' }]}
                onPress={handleWipeCloudData}
                disabled={loading || syncing}
              >
                <Trash2 size={20} color="#FF3B30" style={styles.buttonIcon} />
                <Text style={styles.wipeButtonText}>Wipe Cloud Backup</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // GOOGLE SIGN IN ONLY
            <View style={styles.authContainer}>
              <View style={styles.iconContainer}>
                <CloudOff size={60} color={currColors.textSecondary} />
              </View>
              <Text style={[styles.authTitle, { color: currColors.text }]}>Cloud Sync Offline</Text>
              <Text style={[styles.authSubtitle, { color: currColors.textSecondary }]}>
                Sign in with Google to save your portfolio, accounts, and budgets safely in the cloud and sync them across devices.
              </Text>

              <TouchableOpacity
                style={[styles.googleButton, { backgroundColor: currColors.cardSecondary, borderColor: currColors.border, width: '100%', marginTop: 10 }]}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={currColors.text} size="small" />
                ) : (
                  <>
                    <Chrome size={20} color={currColors.text} style={styles.googleIcon} />
                    <Text style={[styles.googleButtonText, { color: currColors.text }]}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  cardContainer: {
    gap: 16,
  },
  statusCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    fontFamily: 'Outfit_600SemiBold',
  },
  statusSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  syncDivider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  metaLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Outfit_500Medium',
  },
  statsCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 16,
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(142, 142, 147, 0.2)',
  },
  statLineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: 10,
  },
  statLabelText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  statValueText: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  syncButton: {
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  logoutButton: {
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
  },
  wipeButton: {
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  wipeButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
  },
  authContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Outfit_400Regular',
    paddingHorizontal: 10,
    marginBottom: 30,
  },

  googleButton: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit_600SemiBold',
  },
});
