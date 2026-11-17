import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, SafeAreaView, View, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/providers/ThemeProvider';
import { useMyTickets, type EventTicketGroup, type TicketWithMeta } from '@/hooks/useMyTickets';
import { TicketCard } from '@/components/tickets/TicketCard';
import { TicketQrModal } from '@/components/tickets/TicketQrModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineRetryBanner } from '@/components/ui/InlineRetryBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { TicketRowSkeleton } from '@/components/ui/ContentSkeletons';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AnimatedScreen } from '@/components/ui/AnimatedScreen';
import { toDate, formatEventDate } from '@/utils/dateFormat';
import type { MainTabParamList } from '@/navigation/MainTabs';

type TicketsNav = BottomTabNavigationProp<MainTabParamList, 'Tickets'>;
type TicketFilter = 'upcoming' | 'past';

interface SelectedTicket {
  ticket: TicketWithMeta;
  eventName?: string;
}

const EMPTY_MESSAGES: Record<TicketFilter, string> = {
  upcoming: 'Approved tickets will appear here. Check your event for registration status.',
  past: 'Past event tickets will appear here.',
};

/** Keep every group, but move the focused event to the top so it appears without scrolling. */
function withFocusedEventFirst(
  groups: EventTicketGroup[],
  focusEventId?: string,
): EventTicketGroup[] {
  if (!focusEventId) return groups;
  const index = groups.findIndex((group) => group.eventId === focusEventId);
  if (index <= 0) return groups;
  const next = [...groups];
  const [focused] = next.splice(index, 1);
  return [focused, ...next];
}

export default function TicketWalletScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation<TicketsNav>();
  const route = useRoute<RouteProp<MainTabParamList, 'Tickets'>>();
  const routeRef = useRef(route);
  routeRef.current = route;

  const [filter, setFilter] = useState<TicketFilter>('upcoming');
  const [pinnedEventId, setPinnedEventId] = useState<string | undefined>();
  const [pendingFocusEventId, setPendingFocusEventId] = useState<string | undefined>();
  const { data, isLoading, isRefetching, isError, error, refetch } = useMyTickets();
  const [selected, setSelected] = useState<SelectedTicket | null>(null);
  useEffect(() => {
    if (
      selected &&
      !data?.upcoming
        .concat(data.past)
        .some((group) =>
          group.tickets.some(
            (ticket) =>
              ticket.id === selected.ticket.id &&
              ticket.registrationId === selected.ticket.registrationId &&
              ticket.eventId === selected.ticket.eventId,
          ),
        )
    ) {
      setSelected(null);
    }
  }, [data, selected]);

  // Pin the event on focus; clear only when leaving the Tickets tab (not when clearing route params).
  useFocusEffect(
    useCallback(() => {
      const focusEventId = routeRef.current.params?.focusEventId;
      if (focusEventId) {
        setPinnedEventId(focusEventId);
        setPendingFocusEventId(focusEventId);
        navigation.setParams({ focusEventId: undefined });
      }
      void refetch();
      return () => {
        setPinnedEventId(undefined);
        setPendingFocusEventId(undefined);
      };
    }, [navigation, refetch]),
  );

  // A notification chooses a tab once; later ticket refreshes must not undo a member's tap.
  useEffect(() => {
    if (!pendingFocusEventId || !data) return;
    const inUpcoming = data.upcoming.some((group) => group.eventId === pendingFocusEventId);
    const inPast = data.past.some((group) => group.eventId === pendingFocusEventId);
    if (inUpcoming || inPast) {
      setFilter(inUpcoming ? 'upcoming' : 'past');
      setPendingFocusEventId(undefined);
    }
  }, [data, pendingFocusEventId]);

  const sections = useMemo(() => data ?? { upcoming: [], past: [] }, [data]);
  const visibleGroups = useMemo(
    () => withFocusedEventFirst(sections[filter], pinnedEventId),
    [sections, filter, pinnedEventId],
  );
  const hasAnyTickets = sections.upcoming.length > 0 || sections.past.length > 0;

  const loadErrorMessage = (() => {
    const raw =
      error instanceof Error
        ? error.message
        : error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message)
          : '';
    if (/requires an index|COLLECTION_GROUP|failed-precondition/i.test(raw)) {
      return 'Tickets are still syncing (database index). Wait a minute and tap Retry.';
    }
    if (raw && !/network|offline|unavailable/i.test(raw)) {
      return raw.length > 140 ? `${raw.slice(0, 140)}…` : raw;
    }
    return "We couldn't load your tickets. Check your connection and try again.";
  })();

  const renderGroups = (groups: EventTicketGroup[]) =>
    groups.map((group) => {
      const start =
        (group.event ? toDate(group.event.startAt) : null) ??
        group.tickets.map((t) => toDate(t.eventStartAt)).find(Boolean) ??
        null;
      const eventName =
        group.event?.title?.trim() ||
        group.fallbackTitle?.trim() ||
        group.tickets.map((t) => t.eventTitle?.trim()).find(Boolean) ||
        'Untitled event';
      const pastEvent =
        group.event?.status === 'ended' ||
        (group.event ? (toDate(group.event.endAt)?.getTime() ?? Infinity) <= Date.now() : false);
      return (
        <View key={`${filter}-${group.eventId}`} style={{ marginBottom: spacing.lg }}>
          <SectionHeader title={eventName} subtitle={start ? formatEventDate(start) : undefined} />
          <View style={{ marginTop: spacing.sm }}>
            {group.tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                attendeeName={ticket.attendeeName}
                status={ticket.status}
                pastEvent={pastEvent}
                onPress={
                  ticket.status === 'revoked' ? undefined : () => setSelected({ ticket, eventName })
                }
              />
            ))}
          </View>
        </View>
      );
    });

  const renderBody = () => {
    if (isLoading) {
      return (
        <>
          <Skeleton height={24} width="55%" style={{ marginBottom: spacing.sm }} />
          <TicketRowSkeleton />
          <TicketRowSkeleton />
        </>
      );
    }

    if (isError && !hasAnyTickets) {
      return <EmptyState message={loadErrorMessage} actionLabel="Retry" onAction={refetch} />;
    }

    if (!visibleGroups.length) {
      return (
        <EmptyState
          message={EMPTY_MESSAGES[filter]}
          actionLabel={filter === 'upcoming' ? 'Browse Events' : undefined}
          onAction={
            filter === 'upcoming'
              ? () => navigation.navigate('Events', { screen: 'EventList' })
              : undefined
          }
        />
      );
    }

    return renderGroups(visibleGroups);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingHorizontal: spacing.md, paddingTop: spacing.md }]}>
        <AnimatedScreen>
          <ScreenHeader title="My tickets" />
          <View style={{ marginTop: spacing.md }}>
            <SegmentedControl<TicketFilter>
              value={filter}
              onChange={(value) => {
                setPendingFocusEventId(undefined);
                setPinnedEventId(undefined);
                setFilter(value);
              }}
              options={[
                { value: 'upcoming', label: 'Upcoming', accessibilityLabel: 'Upcoming tickets' },
                { value: 'past', label: 'Past', accessibilityLabel: 'Past tickets' },
              ]}
            />
          </View>
        </AnimatedScreen>
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
        {isError && hasAnyTickets ? <InlineRetryBanner onRetry={refetch} /> : null}
        {renderBody()}
      </ScrollView>

      <TicketQrModal
        visible={selected !== null}
        onClose={() => setSelected(null)}
        payload={selected?.ticket.qrPayloadEncrypted}
        attendeeName={selected?.ticket.attendeeName}
        eventName={selected?.eventName}
        status={selected?.ticket.status}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 940, alignSelf: 'center' },
});
