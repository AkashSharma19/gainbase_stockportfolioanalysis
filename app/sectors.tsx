import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { BackButton } from '@/components/BackButton';
import { ChevronRight, Search, XCircle } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Category3DIcon } from '@/components/Category3DIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SectorsScreen() {
  const tickers = usePortfolioStore((state) => state.tickers);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const currColors = Colors[colorScheme];

  const [searchQuery, setSearchQuery] = useState('');

  const uniqueSectors = useMemo(() => {
    const sectors = new Set<string>(
      tickers.map((t) => t['Sector']).filter((t): t is string => !!t),
    );
    const sorted = Array.from(sectors).sort();

    if (!searchQuery) return sorted;

    const query = searchQuery.toLowerCase();
    return sorted.filter((s) => s.toLowerCase().includes(query));
  }, [tickers, searchQuery]);

  const renderSectorItem = ({ item: sName }: { item: string }) => {
    return (
      <TouchableOpacity
        style={[
          styles.sectorListItem,
          { borderBottomColor: currColors.border },
        ]}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/sector-details/${encodeURIComponent(sName)}`);
        }}
      >
        <View style={styles.iconContainer}>
          <Category3DIcon name={sName} size={36} />
        </View>
        <ThemedText style={[styles.sectorName, { color: currColors.text }]}>
          {sName}
        </ThemedText>
        <ChevronRight
          size={18}
          color={currColors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: currColors.background }]}
      edges={['top', 'left', 'right']}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { backgroundColor: currColors.background }]}>
        <BackButton />
        <ThemedText style={[styles.headerTitle, { color: currColors.text }]}>
          All Sectors
        </ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: currColors.card, borderColor: currColors.border, borderWidth: StyleSheet.hairlineWidth }]}>
          <Search
            size={18}
            color={currColors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: currColors.text }]}
            placeholder="Search sectors..."
            placeholderTextColor={currColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSearchQuery('');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <XCircle
                size={18}
                color={currColors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={uniqueSectors}
        renderItem={renderSectorItem}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText
              style={[styles.emptyText, { color: currColors.textSecondary }]}
            >
              No sectors found
            </ThemedText>
          </View>
        }
      />
    </SafeAreaView>
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
    paddingBottom: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectorListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectorName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});
