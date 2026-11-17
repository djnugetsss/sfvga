import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/providers/ThemeProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationListItem } from '@/components/notifications/NotificationListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { NotificationRowSkeleton } from '@/components/ui/ContentSkeletons';
import { InlineRetryBanner } from '@/components/ui/InlineRetryBanner';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import type { NotificationItem } from '@/utils/notifications';
import { AnimatedScreen } from '@/components/ui/AnimatedScreen';

type NotificationsNav = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

/**
 * Notifications Center: a unified feed of org-wide announcements and event reminders, with
 * on-device read/unread state (UI/UX §3). Tapping an item marks it read and opens the
 * related event, or the full Announcements list for org-wide posts.
 */
export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const compact = width < 640;
  const [unreadOnly, setUnreadOnly] = useState(false);
  const navigation = useNavigation<NotificationsNav>();
  const {
    items,
    unreadCount,
    isLoading,
    isError,
    isRefetching,
    refetch,
    markRead,
    markAllRead,
    dismiss,
  } = useNotifications();
  const visibleItems = unreadOnly ? items.filter((item) => !item.read) : items;
  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Main', { screen: 'Home' });
  };

  const onItemPress = useCallback(
    (item: NotificationItem) => {
      markRead(item.id);
      if (item.type === 'admin_registration_message') {
        navigation.navigate('AdminDashboard');
        return;
      }
      if (item.type === 'registration_confirmed' && item.eventId) {
        navigation.navigate('Main', { screen: 'Tickets', params: { focusEventId: item.eventId } });
        return;
      }
      if (item.type === 'registration_message' && item.eventId) {
        navigation.navigate('Main', { screen: 'Messages', params: { eventId: item.eventId } });
        return;
      }
      if (item.eventId) {
        navigation.navigate('Main', {
          screen: 'Events',
          params: {
            screen:
              item.type === 'payment' || item.type === 'registration_message'
                ? 'Registration'
                : 'EventDetail',
            params: { eventId: item.eventId },
            initial: false,
          },
        });
      } else {
        navigation.navigate('AnnouncementsList');
      }
    },
    [markRead, navigation],
  );

  const renderBody = () => {
    if (isLoading) {
      return (
        <>
          <NotificationRowSkeleton />
          <NotificationRowSkeleton />
          <NotificationRowSkeleton />
        </>
      );
    }

    if (!visibleItems.length) {
      if (isError) {
        return (
          <EmptyState
            message="We couldn't load your notifications. Please try again."
            actionLabel="Retry"
            onAction={refetch}
          />
        );
      }
      return (
        <EmptyState
          icon="notifications-outline"
          title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          message={
            unreadOnly
              ? 'You’re all caught up. New updates will appear here.'
              : 'Community and event updates will appear here.'
          }
        />
      );
    }

    return (
      <>
        {visibleItems.map((item, index) => (
          <AnimatedScreen key={item.id} delay={Math.min(index * 35, 200)}>
            <NotificationListItem
              key={item.id}
              type={item.type}
              title={item.title}
              body={item.body}
              eventTitle={item.eventTitle}
              timeLabel={item.timeLabel}
              read={item.read}
              onPress={() => onItemPress(item)}
              onMarkRead={() => markRead(item.id)}
              onDismiss={() => dismiss(item.id)}
            />
          </AnimatedScreen>
        ))}
      </>
    );
  };

  return (
    <View style={[styles.overlay, compact ? null : styles.centeredOverlay]}>
      {!compact ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Close notifications"
          onPress={close}
        />
      ) : null}
      <SafeAreaView
        style={[
          styles.panel,
          compact ? styles.mobilePanel : styles.desktopPanel,
          { backgroundColor: colors.surface, borderColor: colors.border },
          compact ? null : { maxHeight: height * 0.85 },
        ]}
      >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerText}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>
            Notifications
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Community updates, new events, and private registration notices.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close notifications"
          onPress={close}
          style={[styles.closeButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.smallText, { color: colors.textPrimary }]}>Close</Text>
        </Pressable>
      </View>
      <View style={styles.controls}>
        <View style={styles.filters}>
          {[false, true].map((value) => (
            <TouchableOpacity
              key={String(value)}
              onPress={() => setUnreadOnly(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: unreadOnly === value }}
              style={[
                styles.filter,
                {
                  borderColor: unreadOnly === value ? colors.brand : colors.border,
                  backgroundColor: unreadOnly === value ? colors.brandSoft : colors.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.smallText,
                  {
                    color: unreadOnly === value ? colors.brand : colors.textSecondary,
                    fontWeight: unreadOnly === value ? '700' : '400',
                  },
                ]}
              >
                {value ? 'Unread' : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={markAllRead}
          disabled={unreadCount === 0}
          accessibilityRole="button"
          accessibilityLabel={`Mark all ${unreadCount} notifications as read`}
          style={styles.markAllButton}
        >
          <Text
            style={[
              styles.smallText,
              { color: colors.brand, textDecorationLine: 'underline', opacity: unreadCount ? 1 : 0.45 },
            ]}
          >
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={compact ? styles.mobileScroll : styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />
        }
      >
        <View>
          {isError && items.length ? <InlineRetryBanner onRetry={refetch} /> : null}
          {renderBody()}
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  centeredOverlay: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  panel: { overflow: 'hidden' },
  mobilePanel: { flex: 1, width: '100%' },
  desktopPanel: { width: '100%', maxWidth: 576, borderRadius: 16, borderWidth: 1 },
  scroll: { flexShrink: 1 },
  mobileScroll: { flex: 1 },
  content: { width: '100%', paddingHorizontal: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, borderBottomWidth: 1, padding: 20 },
  headerText: { flex: 1 },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  smallText: { fontSize: 14, lineHeight: 20 },
  closeButton: {
    minHeight: 48,
    minWidth: 72,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
  },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  filters: { flexDirection: 'row', gap: 8 },
  filter: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  markAllButton: { minHeight: 48, justifyContent: 'center' },
});
