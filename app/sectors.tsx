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
                style={[styles.sectorListItem, { borderBottomColor: currColors.border }]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/sector-details/${encodeURIComponent(sName)}`);
                }}
            >
                <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                    <SectorIcon size={20} color={color} />
                </View>
                <Text style={[styles.sectorName, { color: currColors.text }]}>{sName}</Text>
                <Ionicons name="chevron-forward" size={18} color={currColors.textSecondary} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: currColors.background }]}>
            <Stack.Screen
                options={{
                    headerTitle: 'All Sectors',
                    headerTitleStyle: { fontSize: 17, fontWeight: '600' },
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: currColors.background },
                    headerTintColor: currColors.text,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ marginLeft: -8, padding: 8 }}
                        >
                            <Ionicons name="chevron-back" size={24} color={currColors.text} />
                        </TouchableOpacity>
                    ),
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
                contentContainerStyle={styles.listContent}
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
