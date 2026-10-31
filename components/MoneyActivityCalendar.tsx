import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
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
  const isDark = theme === 'dark';

  const neutralSlate = isDark ? '#9CA3AF' : '#4B5563';
  const disabledDayColor = isDark ? '#4B5563' : '#D1D5DB';

  const palette = {
    bg: currColors.card,
    text: currColors.text,
    sub: currColors.textSecondary,
    border: currColors.border,
  };

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
    if (isPrivacyMode) return '••';
    if (val >= 10000000) {
      const cr = val / 10000000;
      return cr >= 10 ? `${cr.toFixed(0)}Cr` : `${cr.toFixed(1)}Cr`;
    }
    if (val >= 100000) {
      const l = val / 100000;
      return l >= 10 ? `${l.toFixed(0)}L` : `${l.toFixed(1)}L`;
    }
    if (val >= 1000) {
      const k = val / 1000;
      return k >= 10 ? `${k.toFixed(0)}K` : `${k.toFixed(1)}K`;
    }
    return val.toFixed(0);
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
          {expenseVal > 0 ? (
            <ThemedText style={styles.expenseText} numberOfLines={1}>
              -{formatBadgeAmount(expenseVal)}
            </ThemedText>
          ) : null}
        </View>

        {/* Center: Date */}
        <ThemedText
          style={[
            styles.dayText,
            { color: palette.text },
            isToday && [styles.todayText, { color: currColors.tintMoney }],
            day.state === 'disabled' && {
              color: disabledDayColor,
            },
          ]}
        >
          {day.day}
        </ThemedText>

        {/* Bottom: Income */}
        <View style={styles.statContainer}>
          {incomeVal > 0 ? (
            <ThemedText style={styles.incomeText} numberOfLines={1}>
              +{formatBadgeAmount(incomeVal)}
            </ThemedText>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.calendarCard,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: 1,
        },
      ]}
    >
      {/* Top Header Section */}
      <View style={styles.headerRow}>
        <ThemedText
          style={{
            fontSize: 10,
            fontFamily: 'Outfit_700Bold',
            letterSpacing: 0.8,
            color: palette.sub,
            textTransform: 'uppercase',
          }}
        >
          CASHFLOW CALENDAR
        </ThemedText>
      </View>

      {/* Calendar Component */}
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
          backgroundColor: 'transparent',
        }}
        theme={
          {
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            textSectionTitleColor: neutralSlate,
            selectedDayBackgroundColor: 'transparent',
            selectedDayTextColor: palette.text,
            todayTextColor: currColors.tintMoney,
            dayTextColor: palette.text,
            textDisabledColor: disabledDayColor,
            dotColor: currColors.tintMoney,
            selectedDotColor: currColors.tintMoney,
            arrowColor: palette.text,
            monthTextColor: palette.text,
            indicatorColor: currColors.tintMoney,
            textDayFontFamily: 'Outfit_400Regular',
            textMonthFontFamily: 'Outfit_700Bold',
            textDayHeaderFontFamily: 'Outfit_600SemiBold',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 11,
            'stylesheet.calendar.header': {
              dayHeader: {
                marginTop: 2,
                marginBottom: 7,
                width: 36,
                textAlign: 'center',
                fontSize: 11,
                fontFamily: 'Outfit_600SemiBold',
                color: neutralSlate,
              },
            },
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
  calendarCard: {
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  dayContainer: {
    width: 36,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    marginBottom: 0,
  },
  todayText: {
    fontFamily: 'Outfit_700Bold',
  },
  statContainer: {
    height: 9.5,
    minHeight: 9.5,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  expenseText: {
    fontSize: 7.8,
    color: '#FF3B30',
    textAlign: 'center',
    fontFamily: 'Outfit_600SemiBold',
    lineHeight: 9.5,
  },
  incomeText: {
    fontSize: 7.8,
    color: '#34C759',
    textAlign: 'center',
    fontFamily: 'Outfit_600SemiBold',
    lineHeight: 9.5,
  },
});
