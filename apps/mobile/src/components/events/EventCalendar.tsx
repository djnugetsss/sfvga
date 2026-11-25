import React, { useMemo } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import type { Event } from '@sfvga/shared-types';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon } from '@/components/ui/AppIcon';
import { toDate } from '@/utils/dateFormat';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const zone = 'America/Los_Angeles';

export function eventDayKey(value: Event['startAt'] | Date): string | null {
  const date = value instanceof Date ? value : toDate(value);
  if (!date) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function EventCalendar({
  month,
  selectedDay,
  events,
  onMonthChange,
  onSelectDay,
}: {
  month: Date;
  selectedDay: string | null;
  events: Event[];
  onMonthChange: (month: Date) => void;
  onSelectDay: (day: string | null) => void;
}) {
  const { colors, typography } = useTheme();
  const year = month.getFullYear();
  const monthNumber = month.getMonth();
  const firstWeekday = new Date(year, monthNumber, 1).getDay();
  const numberOfDays = new Date(year, monthNumber + 1, 0).getDate();
  const eventDays = useMemo(() => new Set(events.map((event) => eventDayKey(event.startAt)).filter(Boolean)), [events]);
  const today = eventDayKey(new Date());
  const cells = Array.from({ length: Math.ceil((firstWeekday + numberOfDays) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= numberOfDays ? day : null;
  });
  const label = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(month);
  const changeMonth = (offset: number) => {
    onMonthChange(new Date(year, monthNumber + offset, 1));
    onSelectDay(null);
  };

  return (
    <View style={[styles.calendar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.monthRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => changeMonth(-1)} style={styles.monthButton}>
          <AppIcon name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[typography.headingLarge, { color: colors.textPrimary, fontSize: 22 }]}>{label}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => changeMonth(1)} style={styles.monthButton}>
          <AppIcon name="chevron-forward" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {DAYS.map((day) => <Text key={day} style={[styles.dayName, { color: colors.textSecondary }]}>{day}</Text>)}
        {cells.map((day, index) => {
          if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;
          const key = `${year}-${String(monthNumber + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const hasEvent = eventDays.has(key);
          const selected = selectedDay === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(month)} ${day}${hasEvent ? ', event scheduled' : ''}`}
              accessibilityState={{ selected }}
              onPress={() => onSelectDay(selected ? null : key)}
              style={styles.dayCell}
            >
              <View style={[styles.dayCircle, selected ? { backgroundColor: colors.accent } : today === key ? { borderWidth: 1, borderColor: colors.accent } : null]}>
                <Text style={[typography.bodyMedium, { color: selected ? colors.white : colors.textPrimary, fontWeight: hasEvent ? '700' : '400' }]}>{day}</Text>
              </View>
              {hasEvent ? <View style={[styles.dot, { backgroundColor: selected ? colors.white : colors.accentStrong }]} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 16 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayName: { width: '14.2857%', textAlign: 'center', fontSize: 13, fontWeight: '600', paddingVertical: 7 },
  dayCell: { width: '14.2857%', height: 48, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 37, height: 37, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: -1 },
});
