import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { MoneyTransaction } from '@/types/money';
import { format, parseISO } from 'date-fns';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { Calendar, DateData } from 'react-native-calendars';

interface MoneyActivityCalendarProps {
  transactions: MoneyTransaction[];
}

export const MoneyActivityCalendar = ({ transactions }: MoneyActivityCalendarProps) => {
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const theme = useColorScheme() ?? 'dark';
  const currColors = Colors[theme];

  // Group transactions by date
  const dailyStats = useMemo(() => {
    const stats: Record<string, { income: number; expense: number }> = {};

    transactions.forEach((t) => {
      const rawDate = t.date;
      const dateStr = format(
        parseISO(
          typeof rawDate === 'string'
            ? rawDate
            : new Date(rawDate).toISOString(),
        ),
        'yyyy-MM-dd',
      );
      if (!stats[dateStr]) {
        stats[dateStr] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        stats[dateStr].income += t.amount;
      } else if (t.type === 'expense') {
        stats[dateStr].expense += t.amount;
      }
    });

    return stats;
  }, [transactions]);

  const formatBadgeAmount = (val: number) => {
    if (isPrivacyMode) return '**';
    if (val >= 10000000) {
      return `${(val / 10000000).toFixed(0)}Cr`;
    }
    if (val >= 100000) {
      return `${(val / 100000).toFixed(0)}L`;
    }
    if (val >= 1000) {
      return `${(val / 1000).toFixed(0)}K`;
    }
    return val.toString();
  };

  const renderDay = (day: DateData & { state?: string | undefined }) => {
    const dateStr = day.dateString;
    const stat = dailyStats[dateStr];
    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

    if (!day) return <View />;

    const incomeVal = stat?.income || 0;
    const expenseVal = stat?.expense || 0;

    return (
      <View style={styles.dayContainer}>
        {/* Top: Expense */}
        <View style={styles.statContainer}>
          {expenseVal > 0 && (
            <ThemedText style={styles.expenseText} numberOfLines={1}>
              -{formatBadgeAmount(expenseVal)}
            </ThemedText>
          )}
        </View>

        {/* Center: Date */}
        <ThemedText
          style={[
            styles.dayText,
            { color: currColors.text },
            isToday && styles.todayText,
            day.state === 'disabled' && {
              color: theme === 'dark' ? '#333' : '#D1D1D6',
            },
          ]}
        >
          {day.day}
        </ThemedText>

        {/* Bottom: Income */}
        <View style={styles.statContainer}>
          {incomeVal > 0 && (
            <ThemedText style={styles.incomeText} numberOfLines={1}>
              +{formatBadgeAmount(incomeVal)}
            </ThemedText>
          )}
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: currColors.card, borderColor: currColors.border },
      ]}
    >
      <ThemedText type="bold" style={[styles.title, { color: currColors.textSecondary }]}>
        CASHFLOW CALENDAR
      </ThemedText>
      <Calendar
        key={`money-calendar-${theme}`}
        dayComponent={({
          date,
          state,
        }: {
          date?: DateData;
          state?: string;
        }) => {
          if (!date) return <View />;
          return renderDay({ ...date, state });
        }}
        style={{
          backgroundColor: currColors.card,
          borderRadius: 24,
        }}
        theme={
          {
            backgroundColor: currColors.card,
            calendarBackground: currColors.card,
            textSectionTitleColor: currColors.textSecondary,
            selectedDayBackgroundColor: 'transparent',
            selectedDayTextColor: currColors.text,
            todayTextColor: '#00C9A7',
            dayTextColor: currColors.text,
            textDisabledColor: theme === 'dark' ? '#333' : '#D1D1D6',
            dotColor: '#00adf5',
            selectedDotColor: currColors.text,
            arrowColor: currColors.textSecondary,
            monthTextColor: currColors.text,
            indicatorColor: currColors.text,
            textDayFontFamily: 'Outfit_400Regular',
            textMonthFontFamily: 'Outfit_700Bold',
            textDayHeaderFontFamily: 'Outfit_700Bold',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 11,
          } as any
        }
        enableSwipeMonths={true}
        hideExtraDays={true}
        firstDay={1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 16,
    paddingTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 20,
  },
  dayContainer: {
    width: 36,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 0,
  },
  todayText: {
    color: '#00C9A7',
    fontFamily: 'Outfit_700Bold',
  },
  statContainer: {
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  expenseText: {
    fontSize: 7,
    color: '#FF3B30',
    textAlign: 'center',
    fontFamily: 'Outfit_400Regular',
  },
  incomeText: {
    fontSize: 7,
    color: '#34C759',
    textAlign: 'center',
    fontFamily: 'Outfit_400Regular',
  },
  title: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
});
