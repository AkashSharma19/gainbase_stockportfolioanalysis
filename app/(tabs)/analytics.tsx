import { Text, View } from '@/components/Themed';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

const SCREEN_WIDTH = Dimensions.get('window').width;

const CHART_COLORS = [
    '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500',
    '#FFCC00', '#34C759', '#5AC8FA', '#8E8E93', '#2C2C2E'
];

type Dimension = 'Sector' | 'Company Name' | 'Asset Type' | 'Broker';

export default function AnalyticsScreen() {
    const fetchTickers = usePortfolioStore((state) => state.fetchTickers);
    const getAllocationData = usePortfolioStore((state) => state.getAllocationData);
    const transactions = usePortfolioStore((state) => state.transactions);
    const tickers = usePortfolioStore((state) => state.tickers);

    const [refreshing, setRefreshing] = useState(false);
    const [selectedDimension, setSelectedDimension] = useState<Dimension>('Sector');

    useEffect(() => {
        fetchTickers();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchTickers();
        setRefreshing(false);
    }, [fetchTickers]);

    const allocation = useMemo(() =>
        getAllocationData(selectedDimension),
        [getAllocationData, selectedDimension, transactions, tickers]
    );

    const chartData = useMemo(() => {
        return allocation.map((item, index) => ({
            value: item.percentage,
            color: CHART_COLORS[index % CHART_COLORS.length],
            text: `${item.percentage.toFixed(1)}%`,
            label: item.name,
        }));
    }, [allocation]);

    if (transactions.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No data available yet.</Text>
                    <Text style={styles.emptySubtext}>Add some transactions to see your portfolio analytics.</Text>
                </View>
            </View>
        );
    }

    const dimensions: { id: Dimension; label: string }[] = [
        { id: 'Sector', label: 'Sector' },
        { id: 'Company Name', label: 'Company' },
        { id: 'Asset Type', label: 'Asset Type' },
        { id: 'Broker', label: 'Broker' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.selectorBar}>
                {dimensions.map((dim) => (
                    <TouchableOpacity
                        key={dim.id}
                        style={[
                            styles.selectorButton,
                            selectedDimension === dim.id && styles.selectorButtonActive
                        ]}
                        onPress={() => setSelectedDimension(dim.id)}
                    >
                        <Text style={[
                            styles.selectorText,
                            selectedDimension === dim.id && styles.selectorTextActive
                        ]}>
                            {dim.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
                }
            >
                <View style={styles.chartContainer}>
                    <Text style={styles.title}>{selectedDimension} Allocation</Text>
                    <View style={styles.pieWrapper}>
                        {allocation.length > 0 ? (
                            <PieChart
                                data={chartData}
                                donut
                                showGradient
                                sectionAutoFocus
                                radius={SCREEN_WIDTH * 0.3}
                                innerRadius={SCREEN_WIDTH * 0.18}
                                innerCircleColor={'#1C1C1E'}
                                centerLabelComponent={() => (
                                    <View style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
                                        <Text style={{ fontSize: 22, color: 'white', fontWeight: 'bold' }}>
                                            {allocation.length}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#8E8E93' }}>Items</Text>
                                    </View>
                                )}
                            />
                        ) : (
                            <Text style={styles.noDataText}>Data for this dimension is unavailable</Text>
                        )}
                    </View>
                </View>

                <View style={styles.listContainer}>
                    <Text style={styles.listTitle}>Details</Text>
                    {allocation.map((item, index) => (
                        <View key={item.name} style={styles.listItem}>
                            <View style={styles.listLeft}>
                                <View
                                    style={[
                                        styles.colorDot,
                                        { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }
                                    ]}
                                />
                                <View style={styles.nameContainer}>
                                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                </View>
                            </View>
                            <View style={styles.listRight}>
                                <Text style={styles.itemValue}>₹{item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                                <Text style={styles.itemPercentage}>{item.percentage.toFixed(1)}%</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    selectorBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#1C1C1E',
        justifyContent: 'space-between',
    },
    selectorButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
        backgroundColor: '#1C1C1E',
    },
    selectorButtonActive: {
        backgroundColor: '#007AFF',
    },
    selectorText: {
        color: '#8E8E93',
        fontSize: 12,
        fontWeight: '600',
    },
    selectorTextActive: {
        color: '#FFF',
    },
    scrollContent: {
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 16,
    },
    chartContainer: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    pieWrapper: {
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        height: SCREEN_WIDTH * 0.65,
    },
    noDataText: {
        color: '#444',
        fontSize: 14,
    },
    listContainer: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 16,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 12,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
        backgroundColor: 'transparent',
    },
    listLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        backgroundColor: 'transparent',
    },
    colorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    nameContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    itemName: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    listRight: {
        alignItems: 'flex-end',
        backgroundColor: 'transparent',
        marginLeft: 10,
    },
    itemValue: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    itemPercentage: {
        color: '#8E8E93',
        fontSize: 12,
        marginTop: 2,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: 'transparent',
    },
    emptyText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtext: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
    },
});
