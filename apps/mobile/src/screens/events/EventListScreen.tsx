import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/providers/ThemeProvider';
import { useEventList, type EventFilter } from '@/hooks/useEventList';
import { EventCard } from '@/components/events/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { EventCardSkeleton } from '@/components/ui/ContentSkeletons';
import { InlineRetryBanner } from '@/components/ui/InlineRetryBanner';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EventCalendar, eventDayKey } from '@/components/events/EventCalendar';
import { toDate, formatEventDate } from '@/utils/dateFormat';
import type { EventStackParamList } from '@/navigation/EventStack';

const EMPTY_MESSAGES: Record<EventFilter, string> = {
  upcoming: 'No upcoming events. Check back soon.',
  past: 'No past events yet.',
};

export default function EventListScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<EventStackParamList>>();
  const [filter, setFilter] = useState<EventFilter>('upcoming');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [year, month] = (eventDayKey(new Date()) ?? '').split('-').map(Number);
    return new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const { data: events, isLoading, isError, isRefetching, refetch } = useEventList(filter);

  const list = events ?? [];
  const visibleEvents = selectedDay && filter === 'upcoming'
    ? list.filter((event) => eventDayKey(event.startAt) === selectedDay)
    : list;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingHorizontal: spacing.md, paddingTop: spacing.md }]}>
        <View>
          <ScreenHeader eyebrow="Gatherings" title="Events" subtitle="Your year of gatherings, celebrations, and community." />
          <View style={{ marginTop: spacing.md }}>
            <SegmentedControl<EventFilter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'upcoming', label: 'Upcoming', accessibilityLabel: 'Upcoming events' },
                { value: 'past', label: 'Past', accessibilityLabel: 'Past events' },
              ]}
            />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { padding: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />
        }
      >
        {isError ? <InlineRetryBanner onRetry={refetch} /> : null}

        {filter === 'upcoming' ? (
          <View style={{ marginBottom: spacing.lg }}>
            <EventCalendar month={calendarMonth} selectedDay={selectedDay} events={list} onMonthChange={setCalendarMonth} onSelectDay={setSelectedDay} />
            {selectedDay ? (
              <Pressable accessibilityRole="button" onPress={() => setSelectedDay(null)} style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}>
                <Text style={[typography.label, { color: colors.brand }]}>Show all upcoming events</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={[typography.headingLarge, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
          {selectedDay && filter === 'upcoming' ? 'On this day' : filter === 'upcoming' ? 'Coming up' : 'Past gatherings'}
        </Text>

        {isLoading ? (
          <>
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </>
        ) : !visibleEvents.length && !isError ? (
          <EmptyState message={selectedDay ? 'No events on this day. Choose another day or show all upcoming events.' : EMPTY_MESSAGES[filter]} />
        ) : !visibleEvents.length ? null : (
          visibleEvents.map((event) => {
            const start = toDate(event.startAt);
            const dateLabel = start ? formatEventDate(start) : undefined;
            const locationLabel = event.location?.name;
            return (
              <View key={event.id}>
                <EventCard
                  key={event.id}
                  variant="medium"
                  bannerUrl={event.bannerUrl}
                  title={event.title}
                  dateLabel={dateLabel}
                  locationLabel={locationLabel}
                  accessibilityLabel={[event.title, dateLabel, locationLabel]
                    .filter(Boolean)
                    .join(', ')}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                />
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 940, alignSelf: 'center' },
});
