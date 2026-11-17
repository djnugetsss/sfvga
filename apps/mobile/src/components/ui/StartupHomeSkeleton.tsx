import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { AnnouncementRowSkeleton, EventCardSkeleton } from './ContentSkeletons';
import { Skeleton } from './Skeleton';

/** Mirrors the member Home screen while the signed-in profile is still loading. */
export function StartupHomeSkeleton() {
  const { colors, spacing, minTapTarget } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} accessibilityLabel="Loading home">
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 940, alignSelf: 'center', padding: spacing.md, paddingBottom: spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Skeleton width="67%" height={13} radius={4} style={{ marginBottom: 0 }} />
          <Skeleton width={minTapTarget} height={minTapTarget} radius={minTapTarget / 2} style={{ marginBottom: 0 }} />
        </View>
        <Skeleton width="46%" height={35} radius={6} style={{ marginTop: spacing.sm, marginBottom: spacing.md }} />
        <Skeleton width="36%" height={24} radius={6} style={{ marginBottom: spacing.sm }} />
        <EventCardSkeleton variant="large" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.sm }}>
          <Skeleton width="48%" height={24} radius={6} style={{ marginBottom: 0 }} />
          <Skeleton width="15%" height={18} radius={5} style={{ marginBottom: 0 }} />
        </View>
        <AnnouncementRowSkeleton />
        <AnnouncementRowSkeleton />
      </ScrollView>
      <View style={{ height: 76 + insets.bottom, paddingBottom: insets.bottom, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
        {[0, 1, 2, 3, 4].map((item) => (
          <View key={item} style={{ flex: 1, alignItems: 'center', gap: 7 }}>
            <Skeleton width={25} height={25} radius={7} style={{ marginBottom: 0 }} />
            <Skeleton width={37} height={12} radius={4} style={{ marginBottom: 0 }} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}
