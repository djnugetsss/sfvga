import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  StyleSheet,
  SafeAreaView,
  View,
  Image,
  Modal,
  Pressable,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/providers/ThemeProvider';
import { useEvent } from '@/hooks/useEvent';
import { useClock } from '@/hooks/useClock';
import { paymentActionOpen } from '@/utils/payment';
import { PaymentInstructions } from '@/components/events/PaymentInstructions';
import { useMyRegistrations } from '@/hooks/useMyRegistrations';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { CountdownTimer } from '@/components/events/CountdownTimer';
import { EventMap } from '@/components/events/EventMap';
import { FaqList } from '@/components/events/FaqList';
import { AnnouncementListItem } from '@/components/announcements/AnnouncementListItem';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineRetryBanner } from '@/components/ui/InlineRetryBanner';
import Button from '@/components/ui/Button';
import { ExternalLinkConfirmModal } from '@/components/ui/ExternalLinkConfirmModal';
import { AppIcon } from '@/components/ui/AppIcon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { toDate, formatEventDateTime, formatRelative } from '@/utils/dateFormat';
import type { EventStackParamList } from '@/navigation/EventStack';
import type { MainTabParamList } from '@/navigation/MainTabs';
import type { RootStackParamList } from '@/navigation/RootNavigator';

type EventDetailNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<EventStackParamList, 'EventDetail'>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url) || url.toLowerCase().includes('application%2Fpdf');
}

function EventDetailSkeleton() {
  const { colors, spacing } = useTheme();
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Skeleton height={200} radius={14} style={{ margin: spacing.md, marginBottom: 12, width: 'auto' }} />
      <View style={{ padding: spacing.md, width: '100%', maxWidth: 940, alignSelf: 'center' }}>
        <Skeleton height={34} width="82%" radius={6} style={{ marginBottom: spacing.sm }} />
        <Skeleton height={20} width="42%" radius={6} style={{ marginBottom: spacing.md }} />
        <Skeleton height={48} radius={12} style={{ marginBottom: spacing.lg }} />
        <Skeleton height={18} width="94%" radius={5} style={{ marginBottom: spacing.sm }} />
        <Skeleton height={18} width="70%" radius={5} style={{ marginBottom: spacing.lg }} />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Skeleton height={38} width={38} radius={12} style={{ marginBottom: 0 }} />
            <Skeleton height={22} width="48%" radius={5} style={{ marginBottom: 0 }} />
          </View>
          <Skeleton height={18} width="66%" radius={5} style={{ marginTop: spacing.sm, marginBottom: spacing.md }} />
          <Skeleton height={150} radius={10} style={{ marginBottom: 0, backgroundColor: colors.surfaceMuted }} />
        </Card>
      </View>
    </ScrollView>
  );
}

export default function EventDetailScreen() {
  const { colors, typography, spacing, textAccessibilityProps } = useTheme();
  const route = useRoute<RouteProp<EventStackParamList, 'EventDetail'>>();
  const navigation = useNavigation<EventDetailNavigation>();
  const eventId = route.params.eventId;
  const { height: windowHeight } = useWindowDimensions();
  const [flyerOpen, setFlyerOpen] = useState(false);
  const [albumConfirmOpen, setAlbumConfirmOpen] = useState(false);

  const { data: event, isLoading, isError, refetch } = useEvent(eventId);
  const { data: registrations } = useMyRegistrations();
  const announcementsQuery = useAnnouncements();

  const start = toDate(event?.startAt);
  const end = toDate(event?.endAt);
  const now = useClock();
  const isHappening = start && end ? now >= start.getTime() && now <= end.getTime() : false;
  const isEnded = end ? now > end.getTime() : false;
  const isRegistered = (registrations ?? []).some(
    (r) => r.eventId === eventId && (r.paymentStatus === 'free' || r.paymentStatus === 'paid'),
  );
  const needsPayment = (registrations ?? []).some(
    (r) => r.eventId === eventId && r.paymentStatus === 'unpaid',
  );
  const hasWorkflowSignup = (registrations ?? []).some((r) => r.eventId === eventId);
  const photoAlbumUrl = event?.photoAlbumUrl?.trim() || undefined;

  const eventAnnouncements = useMemo(
    () => (announcementsQuery.data ?? []).filter((a) => a.eventId === eventId).slice(0, 5),
    [announcementsQuery.data, eventId],
  );

  const cta = useMemo(() => {
    if (!event) return null;
    if (hasWorkflowSignup)
      return {
        title: 'Registration status',
        action: () => navigation.navigate('Registration', { eventId }),
      };
    if (isEnded) {
      // After the event, the album button (below) is the main photos entry when available.
      if (photoAlbumUrl) return null;
      if (isRegistered) {
        return {
          title: 'View tickets',
          // Same idea as post-registration: full wallet, this event's tickets pinned on top.
          action: () => navigation.navigate('Tickets', { focusEventId: eventId }),
        };
      }
      return null;
    }
    if (isRegistered) {
      const title = isHappening ? 'Show tickets' : 'View tickets';
      return {
        title,
        action: () => navigation.navigate('Tickets', { focusEventId: eventId }),
        emphasized: isHappening,
      };
    }
    if (needsPayment) {
      return {
        title: 'Complete payment',
        action: () => navigation.navigate('Registration', { eventId }),
      };
    }
    if (!paymentActionOpen(event, now)) return null;
    return {
      title: event.paymentUrl ? 'Register and pay' : 'Register',
      action: () => navigation.navigate('Registration', { eventId }),
    };
  }, [
    event,
    eventId,
    isEnded,
    isHappening,
    isRegistered,
    needsPayment,
    navigation,
    photoAlbumUrl,
    hasWorkflowSignup,
    now,
  ]);

  const openFlyer = async () => {
    const url = event?.flyerUrl;
    if (!url) return;
    // PDFs (http links) open externally; image flyers (including free-plan data URLs) open in-app.
    if (isPdfUrl(url)) {
      await Linking.openURL(url);
      return;
    }
    setFlyerOpen(true);
  };

  const openPhotoAlbum = async () => {
    if (!photoAlbumUrl) return;
    setAlbumConfirmOpen(false);
    const canOpen = await Linking.canOpenURL(photoAlbumUrl);
    if (!canOpen) return;
    await Linking.openURL(photoAlbumUrl);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EventDetailSkeleton />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.md }}>
          <InlineRetryBanner onRetry={refetch} message="Couldn't load this event." />
        </View>
        <EmptyState
          message="We couldn't find this event."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          message="We couldn't find this event."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.heroFrame}>
          <View style={StyleSheet.absoluteFill}>
            {event.bannerUrl ? (
              <Image
                accessible={false}
                source={{ uri: event.bannerUrl }}
                resizeMode="cover"
                style={styles.heroImage}
              />
            ) : (
              <View style={[styles.heroFallback, { backgroundColor: colors.surfaceMuted }]}>
                <View style={[styles.heroMark, { borderColor: colors.gold }]}>
                  <Text style={[typography.headingLarge, { color: colors.brand }]}>SFVGA</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={{ padding: spacing.md, width: '100%', maxWidth: 940, alignSelf: 'center' }}>
          <Text
            style={[typography.displayLarge, { color: colors.brand }]}
            {...textAccessibilityProps}
          >
            {event.title}
          </Text>

          {start && end ? (
            <View style={{ marginTop: spacing.sm }}>
              <CountdownTimer startAt={start} endAt={end} />
            </View>
          ) : null}

          {cta ? (
            <>
              <Button
                title={cta.title}
                icon={isRegistered ? 'ticket-outline' : 'arrow-forward-circle-outline'}
                onPress={cta.action}
                style={{ marginTop: spacing.md }}
              />
            </>
          ) : null}

          {photoAlbumUrl ? (
            <Button
              title="View photo gallery"
              icon="images-outline"
              variant={isEnded && !cta ? 'primary' : 'secondary'}
              onPress={() => setAlbumConfirmOpen(true)}
              style={{ marginTop: spacing.sm, ...(cta ? {} : { marginTop: spacing.md }) }}
            />
          ) : null}

          {event.flyerUrl ? (
            <Button
              title="View flyer"
              icon="document-text-outline"
              variant="secondary"
              onPress={() => {
                void openFlyer();
              }}
              style={{ marginTop: spacing.sm }}
            />
          ) : null}

          {event.description ? (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={[typography.headingMedium, { color: colors.textPrimary, marginBottom: spacing.sm }]}>About this event</Text>
              <Text style={[typography.bodyLarge, { color: colors.textPrimary }]} {...textAccessibilityProps}>
                {event.description}
              </Text>
            </View>
          ) : null}

          <PaymentInstructions event={event} />

          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.cardHeading}>
              <View style={[styles.iconTile, { backgroundColor: colors.brandSoft }]}>
                <AppIcon name="calendar-outline" size={20} color={colors.deepBlue} />
              </View>
              <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>
                When & where
              </Text>
            </View>
            {start ? (
              <Text
                style={[
                  typography.bodyLarge,
                  { color: colors.textSecondary, marginTop: spacing.xs },
                ]}
                {...textAccessibilityProps}
              >
                {formatEventDateTime(start)}
              </Text>
            ) : null}
            <View style={{ marginTop: spacing.md }}>
              <EventMap
                lat={event.location.lat}
                lng={event.location.lng}
                venueName={event.location.name}
                address={event.location.address}
              />
            </View>
            {event.parkingNote ? (
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.textSecondary, marginTop: spacing.sm },
                ]}
                {...textAccessibilityProps}
              >
                {event.parkingNote}
              </Text>
            ) : null}
          </Card>

          {event.whatToBring ? (
            <View style={[styles.detailSection, { borderTopColor: colors.border }]}>
              <View style={styles.cardHeading}>
                <AppIcon name="bag-handle-outline" size={21} color={colors.brand} />
                <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>
                  What to bring
                </Text>
              </View>
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.textSecondary, marginTop: spacing.xs },
                ]}
                {...textAccessibilityProps}
              >
                {event.whatToBring}
              </Text>
            </View>
          ) : null}

          {event.schedule ? (
            <View style={[styles.detailSection, { borderTopColor: colors.border }]}>
              <View style={styles.cardHeading}>
                <AppIcon name="time-outline" size={21} color={colors.brand} />
                <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>
                  Schedule
                </Text>
              </View>
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.textSecondary, marginTop: spacing.xs },
                ]}
                {...textAccessibilityProps}
              >
                {event.schedule}
              </Text>
            </View>
          ) : null}

          {event.faqs?.length ? (
            <View style={[styles.detailSection, { borderTopColor: colors.border }]}>
              <FaqList faqs={event.faqs} />
            </View>
          ) : null}

          {eventAnnouncements.length ? (
            <View style={{ marginTop: spacing.lg }}>
              <SectionHeader title="Event updates" />
              {eventAnnouncements.map((a) => {
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
            </View>
          ) : null}
        </View>
      </ScrollView>

      <ExternalLinkConfirmModal
        visible={albumConfirmOpen}
        title="Open photo gallery?"
        message="This opens the shared album (Google Photos, OneDrive, etc.) in your browser or photos app."
        confirmLabel="Open gallery"
        onCancel={() => setAlbumConfirmOpen(false)}
        onConfirm={() => {
          void openPhotoAlbum();
        }}
      />

      {flyerOpen && event.flyerUrl && !isPdfUrl(event.flyerUrl) ? (
        <Modal visible animationType="fade" onRequestClose={() => setFlyerOpen(false)}>
          <SafeAreaView style={[styles.flyerModal, { backgroundColor: colors.background }]}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close flyer"
                onPress={() => setFlyerOpen(false)}
                hitSlop={12}
              >
                <Text style={[typography.headingMedium, { color: colors.accentStrong }]}>
                  Close
                </Text>
              </Pressable>
            </View>
            <ScrollView
              maximumZoomScale={3}
              minimumZoomScale={1}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'center',
                padding: spacing.md,
              }}
            >
              <Image
                source={{ uri: event.flyerUrl }}
                resizeMode="contain"
                accessibilityLabel={`${event.title} flyer`}
                style={{ width: '100%', height: Math.max(320, windowHeight * 0.75) }}
              />
            </ScrollView>
            <View style={{ padding: spacing.md }}>
              <Button title="Close" variant="secondary" onPress={() => setFlyerOpen(false)} />
            </View>
          </SafeAreaView>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flyerModal: { flex: 1 },
  heroFrame: { height: 200, overflow: 'hidden', margin: 16, marginBottom: 12, borderRadius: 14 },
  heroImage: { width: '100%', height: 200 },
  heroFallback: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  heroMark: {
    width: 76,
    height: 76,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailSection: { marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
