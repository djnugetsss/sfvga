import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { mergeSeason, season } from '@/content/community/season';
import { useEventList } from '@/hooks/useEventList';
import { useMyRegistrations } from '@/hooks/useMyRegistrations';
import { useActiveStaffRoles } from '@/hooks/useActiveStaffRoles';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useNotifications } from '@/hooks/useNotifications';
import { useDelayedSkeleton } from '@/hooks/useDelayedSkeleton';
import { EventCard } from '@/components/events/EventCard';
import { StaffCard } from '@/components/home/StaffCard';
import { OrganizationScannerCard } from '@/components/home/OrganizationScannerCard';
import { AnnouncementListItem } from '@/components/announcements/AnnouncementListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { AnnouncementRowSkeleton, EventCardSkeleton } from '@/components/ui/ContentSkeletons';
import { InlineRetryBanner } from '@/components/ui/InlineRetryBanner';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AnimatedScreen } from '@/components/ui/AnimatedScreen';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { AppIcon } from '@/components/ui/AppIcon';
import { toDate, formatEventDate, eventCountdownLabel, formatRelative } from '@/utils/dateFormat';
import type { MainTabParamList } from '@/navigation/MainTabs';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { scannerPath } from '@/navigation/linking';
import { formatUnreadBadge } from '@/utils/notifications';
import { canShowEventScanAction, hasPermanentScannerAccess } from '@/utils/scannerAccess';

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const ANNOUNCEMENT_PREVIEW_COUNT = 3;

export default function HomeScreen() {
  const { colors, typography, spacing, minTapTarget } = useTheme();
  const navigation = useNavigation<HomeNavigationProp>();
  const { userProfile } = useAuthContext();

  const eventsQuery = useEventList('upcoming');
  const registrationsQuery = useMyRegistrations();
  const staffQuery = useActiveStaffRoles();
  const adminAccessQuery = useAdminAccess();
  const announcementsQuery = useAnnouncements(ANNOUNCEMENT_PREVIEW_COUNT);
  const { unreadCount } = useNotifications();
  const showEventSkeleton = useDelayedSkeleton(eventsQuery.isLoading, 450);
  const showNotesSkeleton = useDelayedSkeleton(announcementsQuery.isLoading, 450);
  const unreadBadge = formatUnreadBadge(unreadCount);

  const firstName = userProfile?.displayName?.trim().split(' ')[0] || 'there';

  const upcomingEvents = eventsQuery.data ?? [];
  const whatsNext = upcomingEvents[0];
  const registrations = registrationsQuery.data ?? [];
  const nextRegistration = whatsNext
    ? registrations.find((r) => r.eventId === whatsNext.id)
    : undefined;
  const hasReadyTickets = Boolean(
    nextRegistration &&
    (nextRegistration.workflowVersion !== 1 ||
      (nextRegistration.signupStatus === 'submitted' &&
        (nextRegistration.reviewStatus === 'approved' || nextRegistration.totalAmount === 0) &&
        nextRegistration.ticketsReadyRevision === nextRegistration.reviewRevision)),
  );
  const staffRoles = staffQuery.data ?? [];
  const permanentScannerAccess = hasPermanentScannerAccess(adminAccessQuery.data);
  const permanentScannerRole = adminAccessQuery.data?.isSuperAdmin
    ? adminAccessQuery.data.superAdminRoleName || 'Super Admin'
    : (adminAccessQuery.data?.organizationRole?.name ?? 'Organization admin');
  const announcements = announcementsQuery.data ?? [];
  const featured = season.find(event => event.isFeatured);

  const hasError =
    eventsQuery.isError ||
    registrationsQuery.isError ||
    staffQuery.isError ||
    adminAccessQuery.isError ||
    announcementsQuery.isError;
  const isRefreshing =
    eventsQuery.isRefetching ||
    registrationsQuery.isRefetching ||
    staffQuery.isRefetching ||
    adminAccessQuery.isRefetching ||
    announcementsQuery.isRefetching;

  const onRefresh = useCallback(() => {
    eventsQuery.refetch();
    registrationsQuery.refetch();
    staffQuery.refetch();
    adminAccessQuery.refetch();
    announcementsQuery.refetch();
  }, [eventsQuery, registrationsQuery, staffQuery, adminAccessQuery, announcementsQuery]);

  const openEventDetail = useCallback(
    (eventId: string) =>
      navigation.navigate('Events', { screen: 'EventDetail', params: { eventId } }),
    [navigation],
  );

  const openScanner = useCallback(
    (eventId: string, eventName: string) => {
      const browserLocation = (globalThis as { location?: { assign: (url: string) => void } })
        .location;
      if (Platform.OS === 'web' && browserLocation) {
        browserLocation.assign(scannerPath(eventId, eventName));
      } else {
        navigation.navigate('Scanner', { eventId, eventName });
      }
    },
    [navigation],
  );

  const renderWhatsNext = () => {
    if (eventsQuery.isLoading) {
      return showEventSkeleton ? <EventCardSkeleton variant="large" /> : <View style={{ height: 350 }} />;
    }
    if (eventsQuery.isError && !whatsNext) {
      return (
        <EmptyState
          message="Couldn't load upcoming events."
          actionLabel="Retry"
          onAction={onRefresh}
        />
      );
    }
    const next = mergeSeason(upcomingEvents, 'upcoming')[0];
    if (next?.program) {
      const open = () => navigation.navigate('Events', { screen: 'SeasonDetail', params: { eventId: next.id } });
      return <EventCard variant="large" title={next.title} dateLabel={formatEventDate(new Date(next.day + 'T12:00:00'))} onPress={open} ctaLabel="View event" onCtaPress={open} />;
    }
    if (!whatsNext) {
      return (
        <EmptyState
          title="No events scheduled"
          message="New gatherings will appear here when they're announced."
        />
      );
    }

    const start = toDate(whatsNext.startAt);
    const end = toDate(whatsNext.endAt);
    const dateLabel = start ? formatEventDate(start) : undefined;
    const countdownLabel = start && end ? eventCountdownLabel(start, end) : undefined;
    const ctaLabel = hasReadyTickets
      ? 'View tickets'
      : nextRegistration
        ? 'Registration status'
        : 'View event';

    return (
      <EventCard
        variant="large"
        title={whatsNext.title}
        bannerUrl={whatsNext.bannerUrl}
        dateLabel={dateLabel}
        locationLabel={whatsNext.location?.name}
        countdownLabel={countdownLabel}
        ctaLabel={ctaLabel}
        onPress={() => openEventDetail(whatsNext.id)}
        onCtaPress={() =>
          hasReadyTickets
            ? navigation.navigate('Tickets')
            : nextRegistration
              ? navigation.navigate('Events', {
                  screen: 'Registration',
                  params: { eventId: whatsNext.id },
                })
              : openEventDetail(whatsNext.id)
        }
        accessibilityLabel={`${whatsNext.title}${countdownLabel ? `, ${countdownLabel}` : ''}, ${
          hasReadyTickets
            ? 'view tickets'
            : nextRegistration
              ? 'view registration status'
              : 'view and register'
        }`}
      />
    );
  };

  const renderAnnouncements = () => {
    if (announcementsQuery.isLoading) {
      if (!showNotesSkeleton) return <View style={{ height: 160 }} />;
      return (
        <>
          <AnnouncementRowSkeleton />
          <AnnouncementRowSkeleton />
        </>
      );
    }
    if (!announcements.length) {
      return <EmptyState title="No community notes yet" message="Updates will appear here." />;
    }
    return (
      <>
        {announcements.map((a) => {
          const created = toDate(a.createdAt);
          return (
            <AnnouncementListItem
              key={a.id}
              title={a.title}
              body={a.body}
              timestampLabel={created ? formatRelative(created) : undefined}
              onPress={() => navigation.navigate('AnnouncementsList')}
            />
          );
        })}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.md, paddingBottom: spacing.xl }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
      >
        <AnimatedScreen style={styles.intro}>
          <View style={styles.heroTopRow}>
            <View style={styles.organizationName}>
              <Text style={[typography.eyebrow, { color: colors.textSecondary }]}>
                San Fernando Valley Gujarati Association
              </Text>
            </View>
            <MotionPressable
              onPress={() => navigation.navigate('Notifications')}
              accessibilityRole="button"
              accessibilityLabel={
                unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'
              }
              style={[
                styles.notificationButton,
                { width: minTapTarget, height: minTapTarget, borderColor: colors.border },
              ]}
            >
              <AppIcon
                name={unreadCount ? 'notifications' : 'notifications-outline'}
                size={21}
                color={colors.textPrimary}
              />
              {unreadBadge ? (
                <View style={[styles.notificationBadge, { backgroundColor: colors.brand }]}>
                  <Text style={[styles.notificationBadgeText, { color: colors.white }]}>
                    {unreadBadge}
                  </Text>
                </View>
              ) : null}
            </MotionPressable>
          </View>
          <Text style={[typography.displayLarge, { color: colors.textPrimary, marginTop: spacing.md }]}>
            Welcome home, {firstName}.
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.xs, maxWidth: 520 }]}>
            A place for the gatherings, people, and traditions that bring our community together.
          </Text>
          <View style={[styles.goldRule, { backgroundColor: colors.accent }]} />
        </AnimatedScreen>

        <Image
          source={require('../../../assets/partner/sfvgabanner.jpg')}
          resizeMode="cover"
          accessibilityLabel="SFVGA community gathering"
          style={[styles.communityBanner, { backgroundColor: colors.surfaceMuted }]}
        />

        <MotionPressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Profile', { screen: 'CommunityHub', initial: false })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>Explore SFVGA</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Board, youth, membership and more</Text>
          </View>
          <AppIcon name="chevron-forward" size={20} color={colors.accentStrong} />
        </MotionPressable>

        {hasError ? (
          <View style={{ marginTop: spacing.md }}>
            <InlineRetryBanner onRetry={onRefresh} />
          </View>
        ) : null}

        <AnimatedScreen delay={80} style={{ marginTop: spacing.lg }}>
          <SectionHeader title="Next gathering" />
          <View style={{ marginTop: spacing.sm }}>{renderWhatsNext()}</View>
        </AnimatedScreen>

        {featured && (
          <MotionPressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Events', { screen: 'SeasonDetail', params: { eventId: featured.id } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.border }}
          >
            <Image source={require('../../../assets/partner/dance4.jpg')} style={{ width: 84, height: 76, borderRadius: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.eyebrow, { color: colors.textSecondary }]}>CULTURAL SPOTLIGHT</Text>
              <Text style={[typography.headingLarge, { color: colors.textPrimary }]}>{featured.title}</Text>
              <Text style={[typography.caption, { color: colors.brand }]}>View celebration photos</Text>
            </View>
          </MotionPressable>
        )}
        {staffRoles.length ? (
          <AnimatedScreen delay={140} style={{ marginTop: spacing.md }}>
            {staffRoles.map((role) => (
              <StaffCard
                key={role.grantId}
                eventName={role.eventName}
                roleName={role.roleName}
                canScan={canShowEventScanAction(role, permanentScannerAccess)}
                onPress={() => openEventDetail(role.eventId)}
                onScan={() => openScanner(role.eventId, role.eventName)}
              />
            ))}
          </AnimatedScreen>
        ) : null}

        {permanentScannerAccess ? (
          <AnimatedScreen delay={165} style={{ marginTop: spacing.md }}>
            <OrganizationScannerCard
              roleName={permanentScannerRole}
              events={upcomingEvents}
              eventsLoading={eventsQuery.isLoading}
              onSelectEvent={(event) => openScanner(event.id, event.title)}
            />
          </AnimatedScreen>
        ) : null}

        <AnimatedScreen delay={190} style={{ marginTop: spacing.md }}>
          <SectionHeader
            title="Community notes"
            actionLabel="See all"
            onAction={() => navigation.navigate('AnnouncementsList')}
          />
          <View style={{ marginTop: spacing.sm }}>{renderAnnouncements()}</View>
        </AnimatedScreen>


      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 740, alignSelf: 'center' },
  intro: { paddingTop: 4 },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  organizationName: { flex: 1, paddingRight: 16 },
  notificationButton: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  notificationBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: { fontSize: 10, fontWeight: '800' },
  goldRule: { width: 42, height: 2, marginTop: 18 },
  communityBanner: { width: '100%', height: 160, borderRadius: 16, marginTop: 22 },
  exploreList: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  exploreRow: { minHeight: 90, flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 12 },
  exploreIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  allCommunityLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, marginTop: 8 },
});
