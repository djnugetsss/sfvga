import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
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
import { toDate, formatEventDate } from '@/utils/dateFormat';
import type { EventStackParamList } from '@/navigation/EventStack';

const EMPTY_MESSAGES: Record<EventFilter, string> = {
  upcoming: 'No upcoming events. Check back soon.',
  past: 'No past events yet.',
};

export default function EventListScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<EventStackParamList>>();
  const [filter, setFilter] = useState<EventFilter>('upcoming');
  const { data: events, isLoading, isError, isRefetching, refetch } = useEventList(filter);

  const list = events ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingHorizontal: spacing.md, paddingTop: spacing.md }]}>
        <View>
          <ScreenHeader title="Events" />
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

        {isLoading ? (
          <>
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </>
        ) : !list.length && !isError ? (
          <EmptyState message={EMPTY_MESSAGES[filter]} />
        ) : !list.length ? null : (
          list.map((event) => {
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
