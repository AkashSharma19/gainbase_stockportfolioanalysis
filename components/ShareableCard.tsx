import { Activity, Award } from 'lucide-react-native';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

interface ShareableCardProps {
    data: {
        totalValue: number;
        profitAmount: number;
        profitPercentage: number;
        dayChange: number;
        dayChangePercentage: number;
        xirr: number;
        topWinners: {
            symbol: string;
            profit: number;
        }[];
        userName?: string;
    };
}

export default function ShareableCard({ data }: ShareableCardProps) {
    const isProfit = data.profitAmount >= 0;
    const isDayProfit = data.dayChange >= 0;

    const formatCompactCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(Math.abs(val));
    };

    return (
        <View style={styles.captureContainer}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.brandName}>GAINBASE</Text>
                        <Text style={styles.userName}>{data.userName || 'PORTFOLIO PERFORMANCE'}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Activity size={20} color="#007AFF" />
                    </View>
                </View>

                {/* Main Value Card (Hero Design) */}
                <View style={styles.heroCard}>
                    <Text style={styles.heroLabel}>TOTAL PORTFOLIO VALUE</Text>
                    <Text style={styles.heroValue}>
                        {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0,
                        }).format(data.totalValue)}
                    </Text>

                    <View style={styles.dashedDivider} />

                    <View style={styles.heroMetricRow}>
                        <View style={styles.metricItem}>
                            <Text style={styles.miniLabel}>TOTAL RETURN</Text>
                            <Text style={[styles.miniValue, { color: isProfit ? '#30D158' : '#FF453A' }]}>
                                {isProfit ? '+' : ''}{data.profitPercentage.toFixed(2)}%
                            </Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.metricItem}>
                            <Text style={styles.miniLabel}>XIRR</Text>
                            <Text style={styles.miniValueWhite}>{data.xirr.toFixed(2)}%</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.metricItem}>
                            <Text style={styles.miniLabel}>1D CHANGE</Text>
                            <Text style={[styles.miniValue, { color: isDayProfit ? '#30D158' : '#FF453A' }]}>
                                {isDayProfit ? '+' : ''}{data.dayChangePercentage.toFixed(2)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Top Winners Section */}
                <View style={styles.winnersContainer}>
                    <View style={styles.winnersHeader}>
                        <Award size={14} color="#8E8E93" />
                        <Text style={styles.winnersTitle}>TOP 5 WINNERS (ABS. RETURN)</Text>
                    </View>

                    <View style={styles.winnersList}>
                        {data.topWinners.slice(0, 5).map((winner, index) => (
                            <View key={winner.symbol} style={styles.winnerRow}>
                                <View style={styles.winnerInfo}>
                                    <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#007AFF' : '#2C2C2E' }]}>
                                        <Text style={styles.rankText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.winnerSymbol}>{winner.symbol}</Text>
                                </View>
                                <Text style={styles.winnerProfit}>
                                    +{formatCompactCurrency(winner.profit)}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerLine} />
                    <Text style={styles.footerText}>MADE WITH GAINBASE</Text>
                    <View style={styles.footerLine} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    captureContainer: {
        width: width,
        aspectRatio: 0.8,
        backgroundColor: '#000',
        padding: 20,
    },
    container: {
        flex: 1,
        backgroundColor: '#1C1C1E',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        padding: 24,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    headerRight: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandName: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    },
    userName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        marginTop: 2,
    },
    heroCard: {
        backgroundColor: '#2C2C2E',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    heroLabel: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
    },
    heroValue: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
        marginVertical: 12,
    },
    dashedDivider: {
        height: 1,
        borderWidth: 1,
        borderColor: '#3C3C3E',
        borderStyle: 'dashed',
        marginVertical: 16,
    },
    heroMetricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metricItem: {
        alignItems: 'center',
        flex: 1,
    },
    verticalDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#3C3C3E',
    },
    miniLabel: {
        color: '#8E8E93',
        fontSize: 8,
        fontWeight: '700',
        marginBottom: 4,
        textAlign: 'center',
    },
    miniValue: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
    },
    miniValueWhite: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
    },
    winnersContainer: {
        flex: 1,
    },
    winnersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    winnersTitle: {
        color: '#8E8E93',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    winnersList: {
        gap: 12,
    },
    winnerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    winnerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rankBadge: {
        width: 20,
        height: 20,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
    winnerSymbol: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    winnerProfit: {
        color: '#30D158',
        fontSize: 14,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 20,
    },
    footerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#2C2C2E',
    },
    footerText: {
        color: '#48484A',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 1,
    },
});
