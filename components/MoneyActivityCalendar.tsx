import { useColorScheme } from '@/components/useColorScheme';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { MoneyTransaction } from '@/types/money';
import { format, parseISO } from 'date-fns';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { Calendar, DateData } from 'react-native-calendars';
import { Calendar as CalendarIcon } from 'lucide-react-native';

interface MoneyActivityCalendarProps {
  transactions: MoneyTransaction[];
}

export const MoneyActivityCalendar = ({ transactions }: MoneyActivityCalendarProps) => {
  const isPrivacyMode = usePortfolioStore((state) => state.isPrivacyMode);
  const theme = useColorScheme() ?? 'dark';
  const isDark = theme === 'dark';

  const palette = {
    bg: '#D1F5EC',
    text: '#064E3B',
    sub: '#047857',
    border: '#34D399',
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
            isToday && [styles.todayText, { color: '#047857' }],
            day.state === 'disabled' && {
              color: palette.sub + '55',
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
          borderColor: isDark ? 'transparent' : palette.border,
        },
      ]}
    >
      {/* Top Header Section */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <CalendarIcon size={14} color={palette.sub} />
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
            textSectionTitleColor: palette.sub,
            selectedDayBackgroundColor: 'transparent',
            selectedDayTextColor: palette.text,
            todayTextColor: palette.text,
            dayTextColor: palette.text,
            textDisabledColor: palette.sub + '55',
            dotColor: palette.text,
            selectedDotColor: palette.text,
            arrowColor: palette.sub,
            monthTextColor: palette.text,
            indicatorColor: palette.text,
            textDayFontFamily: 'Outfit_400Regular',
            textMonthFontFamily: 'Outfit_700Bold',
            textDayHeaderFontFamily: 'Outfit_700Bold',
            textDayFontSize: 14,
            textMonthFontSize: 15,
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
  calendarCard: {
    borderRadius: 22,
    borderWidth: 1.2,
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
    color: '#B91C1C',
    textAlign: 'center',
    fontFamily: 'Outfit_600SemiBold',
    lineHeight: 9.5,
  },
  incomeText: {
    fontSize: 7.8,
    color: '#047857',
    textAlign: 'center',
    fontFamily: 'Outfit_600SemiBold',
    lineHeight: 9.5,
  },
});
