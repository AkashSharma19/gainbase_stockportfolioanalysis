import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useInsights } from '@/hooks/useInsights';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronRight, Info, Sparkles } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const InsightsSummaryCard = () => {
    const router = useRouter();
    const theme = useColorScheme() ?? 'dark';
    const currColors = Colors[theme];
    const { count } = useInsights();

    if (count === 0) return null;

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/insights');
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.8}
            style={[
                styles.container,
                {
                    backgroundColor: theme === 'dark' ? 'rgba(90, 200, 250, 0.1)' : 'rgba(0, 122, 255, 0.05)',
                    borderColor: theme === 'dark' ? 'rgba(90, 200, 250, 0.2)' : 'rgba(0, 122, 255, 0.1)',
                }
            ]}
        >
            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: '#5AC8FA' }]}>
                    {Sparkles ? <Sparkles size={16} color="#FFF" /> : <Info size={16} color="#FFF" />}
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: currColors.text }]}>
                        {count} Actionable {count === 1 ? 'Item' : 'Items'} Available
                    </Text>
                    <Text style={[styles.subtitle, { color: currColors.textSecondary }]}>
                        Data-driven insights to optimize your portfolio
                    </Text>
                </View>
                <ChevronRight size={20} color={currColors.textSecondary} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
    },
});
