import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Event } from '@sfvga/shared-types';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AppIcon } from '@/components/ui/AppIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { EventCardSkeleton } from '@/components/ui/ContentSkeletons';
import { useTheme } from '@/providers/ThemeProvider';
import { formatEventDate, toDate } from '@/utils/dateFormat';

export const OrganizationScannerCard = React.memo(function OrganizationScannerCard({
  roleName,
  events,
  eventsLoading,
  onSelectEvent,
}: {
  roleName: string;
  events: Event[];
  eventsLoading: boolean;
  onSelectEvent: (event: Event) => void;
}) {
  const { colors, typography, spacing, cardBorderRadius, minTapTarget } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconTile, { backgroundColor: colors.brand }]}>
            <AppIcon name="scan-outline" size={21} color="#FFFFFF" />
          </View>
          <View style={styles.copy}>
            <Text style={[typography.headingMedium, { color: colors.deepBlue }]}>
              Ticket scanner
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              Organization-wide access · {roleName}
            </Text>
          </View>
        </View>
        <Text
          style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.md }]}
        >
          Select an upcoming event to scan check-in tickets.
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <Button
            title="Choose event to scan"
            icon="scan-outline"
            onPress={() => setPickerOpen(true)}
            variant="secondary"
          />
        </View>
      </Card>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                borderTopLeftRadius: cardBorderRadius,
                borderTopRightRadius: cardBorderRadius,
              },
            ]}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.copy}>
                <Text style={[typography.headingLarge, { color: colors.textPrimary }]}>
                  Choose event
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>
                  Your organization role can scan tickets for any listed event.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPickerOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close event picker"
                style={[styles.closeButton, { minWidth: minTapTarget, minHeight: minTapTarget }]}
              >
                <AppIcon name="close" size={23} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {eventsLoading ? (
              <View style={{ padding: spacing.md }} accessibilityLabel="Loading events to scan">
                <EventCardSkeleton />
                <EventCardSkeleton />
              </View>
            ) : events.length === 0 ? (
              <View style={{ padding: spacing.lg }}>
                <EmptyState
                  icon="calendar-outline"
                  title="No upcoming events"
                  message="There are no events available for check-in right now."
                />
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
              >
                {events.map((event) => {
                  const startsAt = toDate(event.startAt);
                  return (
                    <TouchableOpacity
                      key={event.id}
                      onPress={() => {
                        setPickerOpen(false);
                        onSelectEvent(event);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Scan tickets for ${event.title}`}
                      style={[
                        styles.eventRow,
                        {
                          minHeight: Math.max(minTapTarget, 66),
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.eventIcon, { backgroundColor: colors.brandSoft }]}>
                        <AppIcon name="calendar-outline" size={19} color={colors.deepBlue} />
                      </View>
                      <View style={styles.copy}>
                        <Text
                          numberOfLines={2}
                          style={[
                            typography.bodyMedium,
                            { color: colors.textPrimary, fontWeight: '700' },
                          ]}
                        >
                          {event.title}
                        </Text>
                        {startsAt ? (
                          <Text
                            style={[
                              typography.caption,
                              { color: colors.textSecondary, marginTop: 2 },
                            ]}
                          >
                            {formatEventDate(startsAt)}
                          </Text>
                        ) : null}
                      </View>
                      <AppIcon name="chevron-forward" size={19} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.42)' },
  sheet: { maxHeight: '78%', overflow: 'hidden' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: { alignItems: 'center', justifyContent: 'center' },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
