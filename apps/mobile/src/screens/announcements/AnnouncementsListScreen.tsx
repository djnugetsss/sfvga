import React from 'react';
import { ScrollView, StyleSheet, SafeAreaView, RefreshControl, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { AnnouncementListItem } from '@/components/announcements/AnnouncementListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineRetryBanner } from '@/components/ui/InlineRetryBanner';
import { AnnouncementRowSkeleton } from '@/components/ui/ContentSkeletons';
import { toDate, formatRelative } from '@/utils/dateFormat';
import { AnimatedScreen } from '@/components/ui/AnimatedScreen';

/**
 * The Home "See all" destination (UI/UX spec §3): the same announcements feed, un-truncated.
 * Reuses the useAnnouncements hook and AnnouncementListItem component.
 */
export default function AnnouncementsListScreen() {
  const { colors, spacing } = useTheme();
  const { data: announcements, isLoading, isRefetching, isError, refetch } = useAnnouncements();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { padding: spacing.md, paddingBottom: spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />
        }
      >
        <View>
          {isError && announcements?.length ? <InlineRetryBanner onRetry={refetch} /> : null}
          {isLoading ? (
            <>
              <AnnouncementRowSkeleton />
              <AnnouncementRowSkeleton />
              <AnnouncementRowSkeleton />
            </>
          ) : !announcements?.length ? (
            isError ? (
              <EmptyState
                message="We couldn't load announcements. Check your connection and try again."
                actionLabel="Retry"
                onAction={refetch}
              />
            ) : (
              <EmptyState message="No announcements yet." />
            )
          ) : (
            announcements.map((a, index) => {
              const created = toDate(a.createdAt);
              return (
                <AnimatedScreen key={a.id} delay={Math.min(index * 35, 200)}>
                  <AnnouncementListItem
                    key={a.id}
                    title={a.title}
                    body={a.body}
                    timestampLabel={created ? formatRelative(created) : undefined}
                  />
                </AnimatedScreen>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 820, alignSelf: 'center' },
});
