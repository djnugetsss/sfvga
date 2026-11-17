import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import type { NotificationType } from '@/utils/notifications';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { MotionPressable } from '@/components/ui/MotionPressable';

interface NotificationListItemProps {
  type: NotificationType;
  title: string;
  body: string;
  eventTitle?: string;
  timeLabel?: string;
  read: boolean;
  onPress?: () => void;
  onMarkRead?: () => void;
  onDismiss?: () => void;
}

const TYPE_LABEL: Record<NotificationType, string> = {
  announcement: 'Announcement',
  reminder: 'Event reminder',
  payment: 'Payment update',
  registration_message: 'Private message',
  registration_confirmed: 'Tickets ready',
  admin_registration_message: 'Member message',
  event_published: 'New event',
};

const TYPE_ICON: Record<NotificationType, AppIconName> = {
  announcement: 'megaphone-outline',
  reminder: 'alarm-outline',
  payment: 'ticket-outline',
  registration_message: 'chatbubble-outline',
  registration_confirmed: 'ticket-outline',
  admin_registration_message: 'chatbubble-outline',
  event_published: 'calendar-outline',
};

const TYPE_ACTION: Record<NotificationType, string> = {
  announcement: 'View announcement',
  reminder: 'View event',
  payment: 'Open registration',
  registration_message: 'Open conversation',
  registration_confirmed: 'View tickets',
  admin_registration_message: 'Open admin messages',
  event_published: 'View event',
};

/**
 * A single row in the Notifications Center. Unread items show a saffron dot and a bolder
 * title (UI/UX: calm, low-alarm styling — never error red for routine states).
 */
export const NotificationListItem = React.memo(function NotificationListItem({
  type,
  title,
  body,
  eventTitle,
  timeLabel,
  read,
  onPress,
  onMarkRead,
  onDismiss,
}: NotificationListItemProps) {
  const { colors } = useTheme();
  const tag = TYPE_LABEL[type];
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  return (
    <View
      style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
      onTouchStart={(event) => {
        const touch = event.nativeEvent.touches[0];
        touchStart.current = touch ? { x: touch.pageX, y: touch.pageY } : null;
        swiped.current = false;
      }}
      onTouchEnd={(event) => {
        const touch = event.nativeEvent.changedTouches[0];
        const start = touchStart.current;
        touchStart.current = null;
        if (!onDismiss || !touch || !start) return;
        const dx = touch.pageX - start.x;
        const dy = touch.pageY - start.y;
        if (dx < -80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          swiped.current = true;
          onDismiss();
        }
      }}
    >
      <MotionPressable
        onPress={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          onPress?.();
        }}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={`${read ? '' : 'Unread. '}${tag}. ${title}. ${eventTitle ? `${eventTitle}. ` : ''}${body}. ${TYPE_ACTION[type]}`}
        accessibilityHint={
          onDismiss ? 'Swipe left to dismiss, or use the Dismiss button.' : undefined
        }
        disabled={!onPress}
        pressedScale={0.985}
      >
        <View
          style={[
            styles.row,
            {
              backgroundColor: 'transparent',
            },
          ]}
        >
          <View
            style={[
              styles.iconTile,
              { backgroundColor: read ? colors.surfaceMuted : colors.brandSoft },
            ]}
          >
            <AppIcon
              name={TYPE_ICON[type]}
              size={20}
              color={colors.brand}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.headerRow}>
              <Text
                style={[styles.meta, { color: colors.textSecondary, fontWeight: '700' }]}
              >
                {tag}
              </Text>
              {timeLabel ? (
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {timeLabel}
                </Text>
              ) : null}
            </View>
            <Text
              style={[
                styles.title,
                {
                  color: colors.textPrimary,
                  fontWeight: read ? '600' : '700',
                },
              ]}
            >
              {title}
            </Text>
            {eventTitle && !title.includes(eventTitle) ? (
              <Text
                style={[
                  styles.eventTitle,
                  { color: colors.textSecondary },
                ]}
              >
                {eventTitle}
              </Text>
            ) : null}
            <Text
              style={[
                styles.body,
                { color: colors.textSecondary },
              ]}
            >
              {body}
            </Text>
            {onPress ? (
              <Text
                style={[
                  styles.actionLabel,
                  { color: colors.brand },
                ]}
              >
                {TYPE_ACTION[type]} →
              </Text>
            ) : null}
          </View>
          {!read ? <View style={[styles.dot, { backgroundColor: colors.saffron }]} /> : null}
        </View>
      </MotionPressable>
      {onDismiss ? (
        <View style={styles.actions}>
          {!read && onMarkRead ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mark ${title} as read`}
              onPress={onMarkRead}
              style={styles.actionButton}
            >
              <Text style={[styles.actionText, { color: colors.brand }]}>
                Mark read
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Dismiss ${title} notification`}
            onPress={onDismiss}
            style={styles.actionButton}
          >
            <Text style={[styles.actionText, { color: colors.brand }]}>
              Dismiss
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  meta: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 16, lineHeight: 24, marginTop: 4 },
  eventTitle: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  body: { fontSize: 14, lineHeight: 24, marginTop: 8 },
  actionLabel: { fontSize: 14, lineHeight: 20, marginTop: 8, fontWeight: '700' },
  actionText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingHorizontal: 0,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
  actionButton: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' },
});
