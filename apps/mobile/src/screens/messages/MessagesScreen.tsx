import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/providers/ThemeProvider';
import { useMyRegistrations } from '@/hooks/useMyRegistrations';
import { useEventList } from '@/hooks/useEventList';
import { toDate } from '@/utils/dateFormat';
import { RegistrationConversation } from '@/components/events/RegistrationConversation';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AnimatedScreen } from '@/components/ui/AnimatedScreen';
import { ConversationRowSkeleton } from '@/components/ui/ContentSkeletons';
import Button from '@/components/ui/Button';
import type { MainTabParamList } from '@/navigation/MainTabs';

export default function MessagesScreen() {
  const { colors, typography, spacing } = useTheme();
  const route = useRoute<RouteProp<MainTabParamList, 'Messages'>>();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { data: registrations = [], isLoading: loadingRegistrations } = useMyRegistrations();
  const { data: upcoming = [], isLoading: loadingUpcoming } = useEventList('upcoming');
  const [selected, setSelected] = useState<string | null>(route.params?.eventId ?? null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const eventNames = useMemo(
    () =>
      new Map(
        upcoming
          .filter((event) => {
            const end = toDate(event.endAt);
            return event.status !== 'ended' && (!end || end.getTime() >= now);
          })
          .map((event) => [event.id, event.title]),
      ),
    [upcoming, now],
  );
  useEffect(() => {
    if (route.params?.eventId) setSelected(route.params.eventId);
  }, [route.params?.eventId]);
  const conversations = [...registrations]
    .filter((registration) => eventNames.has(registration.eventId))
    .sort(
      (a, b) =>
        Number(Boolean(b.lastMessageAt)) - Number(Boolean(a.lastMessageAt)) ||
        Number(Boolean(b.memberUnread)) - Number(Boolean(a.memberUnread)) ||
        (toDate(b.lastMessageAt)?.getTime() ?? 0) - (toDate(a.lastMessageAt)?.getTime() ?? 0),
    );
  // Past events stay out of the inbox, but a direct link from an existing
  // registration can still open its payment conversation for reconciliation.
  const active = registrations.find((registration) => registration.eventId === selected);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          width: '100%',
          maxWidth: 940,
          alignSelf: 'center',
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
        }}
      >
        <AnimatedScreen>
          <ScreenHeader
            title={active ? (eventNames.get(active.eventId) ?? 'Conversation') : 'Messages'}
            subtitle={
              active
                ? 'Private conversation with SFVGA organizers'
                : 'Conversations for current events'
            }
          />
        </AnimatedScreen>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          width: '100%',
          maxWidth: 940,
          alignSelf: 'center',
          padding: spacing.md,
          paddingBottom: spacing.xl,
          flexGrow: 1,
        }}
      >
        {active ? (
          <View style={{ gap: spacing.md }}>
            <View style={{ alignSelf: 'flex-start' }}>
              <Button title="Back to messages" variant="text" onPress={() => setSelected(null)} />
            </View>
            <RegistrationConversation
              key={`${active.eventId}:${active.id}`}
              eventId={active.eventId}
              registrationId={active.id}
              showIntro={false}
            />
            <Button
              title={active.totalAmount > 0 ? 'View registration & payment' : 'View registration'}
              variant="secondary"
              onPress={() =>
                navigation.navigate('Events', {
                  screen: 'Registration',
                  params: { eventId: active.eventId },
                })
              }
            />
          </View>
        ) : loadingRegistrations || loadingUpcoming ? (
          <View accessibilityLabel="Loading conversations">
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
          </View>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="No current conversations"
            message="Messages about your current registrations will appear here."
          />
        ) : (
          conversations.map((registration, index) => {
            const hasMessages = Boolean(registration.lastMessageAt);
            const sectionStart =
              index === 0 || Boolean(conversations[index - 1].lastMessageAt) !== hasMessages;
            return (
              <AnimatedScreen
                key={`${registration.eventId}:${registration.id}`}
                delay={Math.min(index * 45, 220)}
                style={{ marginBottom: spacing.sm }}
              >
                {sectionStart ? (
                  <Text
                    style={[
                      typography.headingMedium,
                      {
                        color: colors.textPrimary,
                        marginTop: index ? spacing.lg : 0,
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    {hasMessages ? 'Recent conversations' : 'Ask about a registration'}
                  </Text>
                ) : null}
                <MotionPressable
                  onPress={() => setSelected(registration.eventId)}
                  accessibilityRole="button"
                  accessibilityLabel={`${eventNames.get(registration.eventId)} messages${registration.memberUnread ? ', unread' : ''}`}
                  pressedScale={0.985}
                >
                  <Card
                    style={{
                      minHeight: 88,
                      padding: spacing.md,
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 13,
                        backgroundColor: colors.brandSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AppIcon name="chatbubbles-outline" size={22} color={colors.brand} />
                    </View>
                    <View style={{ minWidth: 0, flex: 1 }}>
                      <Text
                        numberOfLines={2}
                        style={[typography.headingMedium, { color: colors.textPrimary }]}
                      >
                        {eventNames.get(registration.eventId)}
                      </Text>
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: registration.memberUnread ? colors.brand : colors.textSecondary,
                            marginTop: 4,
                          },
                        ]}
                      >
                        {registration.memberUnread
                          ? 'New message'
                          : hasMessages
                            ? 'Open conversation'
                            : 'Message an organizer'}
                      </Text>
                    </View>
                    <AppIcon name="chevron-forward" size={17} color={colors.textSecondary} />
                  </Card>
                </MotionPressable>
              </AnimatedScreen>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
