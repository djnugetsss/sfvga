import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Card } from './Card';
import { Skeleton } from './Skeleton';

/** Placeholders share the dimensions and structure of the content they replace. */
export function EventCardSkeleton({ variant = 'medium' }: { variant?: 'large' | 'medium' }) {
  const { colors, spacing } = useTheme();
  if (variant === 'medium') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, marginBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Skeleton width={84} height={76} radius={10} style={{ marginBottom: 0 }} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="75%" height={20} radius={6} style={{ marginBottom: 0 }} />
          <Skeleton width="55%" height={15} radius={5} style={{ marginBottom: 0 }} />
          <Skeleton width="65%" height={15} radius={5} style={{ marginBottom: 0 }} />
        </View>
        <Skeleton width={16} height={16} radius={8} style={{ marginBottom: 0 }} />
      </View>
    );
  }
  return (
    <Card style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }}>
      <Skeleton height={164} radius={0} style={{ marginBottom: 0 }} />
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        <Skeleton width="32%" height={17} radius={6} style={{ marginBottom: 0 }} />
        <Skeleton width="76%" height={26} radius={6} style={{ marginBottom: 0 }} />
        <Skeleton width="55%" height={18} radius={6} style={{ marginTop: spacing.xs, marginBottom: 0 }} />
        <Skeleton width="68%" height={18} radius={6} style={{ marginBottom: 0 }} />
      </View>
      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
        <Skeleton height={48} radius={12} style={{ marginBottom: 0 }} />
      </View>
    </Card>
  );
}

export function AnnouncementRowSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Skeleton width={38} height={38} radius={19} style={{ marginBottom: 0 }} />
      <View style={{ flex: 1, gap: 7 }}>
        <Skeleton width="65%" height={19} radius={5} style={{ marginBottom: 0 }} />
        <Skeleton width="90%" height={16} radius={5} style={{ marginBottom: 0 }} />
        <Skeleton width="38%" height={13} radius={5} style={{ marginBottom: 0 }} />
      </View>
    </View>
  );
}

export function ConversationRowSkeleton() {
  const { colors, spacing } = useTheme();
  return (
    <Card style={{ minHeight: 88, padding: spacing.md, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm }}>
      <Skeleton width={44} height={44} radius={13} style={{ marginBottom: 0 }} />
      <View style={{ flex: 1, gap: 7 }}>
        <Skeleton width="75%" height={20} radius={5} style={{ marginBottom: 0 }} />
        <Skeleton width="52%" height={15} radius={5} style={{ marginBottom: 0 }} />
      </View>
      <Skeleton width={16} height={16} radius={8} style={{ marginBottom: 0 }} />
    </Card>
  );
}

export function TicketRowSkeleton() {
  const { spacing } = useTheme();
  return (
    <Card style={{ marginBottom: spacing.sm, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={46} height={46} radius={15} style={{ marginBottom: 0 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="70%" height={19} radius={5} style={{ marginBottom: 0 }} />
          <Skeleton width="48%" height={14} radius={5} style={{ marginBottom: 0 }} />
        </View>
        <Skeleton width={55} height={24} radius={12} style={{ marginBottom: 0 }} />
      </View>
    </Card>
  );
}

export function NotificationRowSkeleton() {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Skeleton width={44} height={44} radius={22} style={{ marginBottom: 0 }} />
      <View style={{ flex: 1, gap: 9 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton width="32%" height={14} radius={5} style={{ marginBottom: 0 }} />
          <Skeleton width="29%" height={14} radius={5} style={{ marginBottom: 0 }} />
        </View>
        <Skeleton width="70%" height={20} radius={5} style={{ marginBottom: 0 }} />
        <Skeleton width="95%" height={16} radius={5} style={{ marginBottom: 0 }} />
        <Skeleton width="46%" height={16} radius={5} style={{ marginBottom: 0 }} />
        <Skeleton width="48%" height={16} radius={5} style={{ marginBottom: 0 }} />
      </View>
    </View>
  );
}
