import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Skeleton } from './Skeleton';

/** Mirrors the embedded admin header, dashboard counts, event list, and review queue. */
export function AdminDashboardSkeleton() {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Skeleton width={40} height={40} radius={12} style={{ marginBottom: 0 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="64%" height={17} radius={5} style={{ marginBottom: 0 }} />
          <Skeleton width="35%" height={12} radius={5} style={{ marginBottom: 0 }} />
        </View>
        <Skeleton width={36} height={36} radius={18} style={{ marginBottom: 0 }} />
      </View>
      <View style={{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', padding: spacing.md }}>
        <Skeleton width="45%" height={28} radius={6} style={{ marginBottom: spacing.lg }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, rowGap: spacing.md }}>
          {[0, 1, 2, 3].map((item) => (
            <View key={item} style={{ width: '50%', gap: 7 }}>
              <Skeleton width="60%" height={13} radius={5} style={{ marginBottom: 0 }} />
              <Skeleton width="35%" height={27} radius={5} style={{ marginBottom: 0 }} />
            </View>
          ))}
        </View>
        <Skeleton width="55%" height={22} radius={5} style={{ marginTop: spacing.lg, marginBottom: spacing.md }} />
        {[0, 1, 2].map((item) => (
          <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Skeleton width={56} height={58} radius={8} style={{ marginBottom: 0 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="72%" height={17} radius={5} style={{ marginBottom: 0 }} />
              <Skeleton width="58%" height={14} radius={5} style={{ marginBottom: 0 }} />
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border }}>
        {[0, 1, 2, 3, 4].map((item) => (
          <View key={item} style={{ alignItems: 'center', gap: 6 }}>
            <Skeleton width={25} height={25} radius={7} style={{ marginBottom: 0 }} />
            <Skeleton width={38} height={11} radius={4} style={{ marginBottom: 0 }} />
          </View>
        ))}
      </View>
    </View>
  );
}
