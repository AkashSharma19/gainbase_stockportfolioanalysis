import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getSectorIcon } from '@/constants/Sectors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SectorsScreen() {
    const tickers = usePortfolioStore((state) => state.tickers);
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'dark';
    const currColors = Colors[colorScheme];

    const [searchQuery, setSearchQuery] = useState('');

    const uniqueSectors = useMemo(() => {
        const sectors = new Set<string>(tickers.map(t => t['Sector']).filter((t): t is string => !!t));
        const sorted = Array.from(sectors).sort();

        if (!searchQuery) return sorted;

        const query = searchQuery.toLowerCase();
        return sorted.filter(s => s.toLowerCase().includes(query));
    }, [tickers, searchQuery]);

    const renderSectorItem = ({ item: sName }: { item: string }) => {
        const { icon: SectorIcon, color } = getSectorIcon(sName);
        return (
            <TouchableOpacity
                style={styles.sectorCard}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/sector-details/${encodeURIComponent(sName)}`);
                }}
            >
                <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                    <SectorIcon size={24} color={color} />
                </View>
                <Text style={[styles.sectorName, { color: currColors.text }]} numberOfLines={1}>{sName}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: currColors.background }]}>
            <Stack.Screen
                options={{
                    headerTitle: 'All Sectors',
                    headerLargeTitle: true,
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: currColors.background },
                    headerTintColor: currColors.text,
                }}
            />

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: currColors.card }]}>
                    <Ionicons name="search" size={20} color={currColors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: currColors.text }]}
                        placeholder="Search sectors..."
                        placeholderTextColor={currColors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={currColors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={uniqueSectors}
                renderItem={renderSectorItem}
                keyExtractor={(item) => item}
                numColumns={3}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: currColors.textSecondary }]}>No sectors found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    columnWrapper: {
        justifyContent: 'flex-start',
        gap: 12,
        marginBottom: 20,
    },
    sectorCard: {
        width: (SCREEN_WIDTH - 32 - 24) / 3, // 3 columns
        alignItems: 'center',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    sectorName: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        fontSize: 16,
    },
});
