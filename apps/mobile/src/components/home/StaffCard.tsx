import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon } from '@/components/ui/AppIcon';

interface StaffCardProps {
  eventName: string;
  roleName: string;
  /** Show the "Scan Tickets" action — only when the role can scan and the window is active. */
  canScan: boolean;
  onScan?: () => void;
  onPress?: () => void;
}

/**
 * Event-only staff card (UI/UX spec §3). Scanner assignments open the scanner from
 * either the card body or CTA; other assignments open event details.
 */
export const StaffCard = React.memo(function StaffCard({
  eventName,
  roleName,
  canScan,
  onScan,
  onPress,
}: StaffCardProps) {
  const { colors, typography, spacing } = useTheme();
  const action = canScan ? onScan : onPress;

  return (
    <Card style={{ marginBottom: spacing.md, backgroundColor: colors.brandSoft }}>
      <TouchableOpacity
        onPress={action}
        accessibilityRole="button"
        accessibilityLabel={
          canScan
            ? `Scan tickets for ${eventName}`
            : `You're on staff for ${eventName} as ${roleName}`
        }
        disabled={!action}
        activeOpacity={0.85}
      >
        <View style={styles.headerRow}>
          <View style={styles.staffLabel}>
            <View style={[styles.iconTile, { backgroundColor: colors.deepBlue }]}>
              <AppIcon name="shield-checkmark-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.staffCopy}>
              <Text style={[typography.headingMedium, { color: colors.deepBlue }]}>
                On event staff
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {roleName}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[typography.bodyLarge, { color: colors.textPrimary, marginTop: spacing.xs }]}>
          {eventName}
        </Text>
      </TouchableOpacity>

      {action ? (
        <View style={{ marginTop: spacing.md }}>
          <Button
            title={canScan ? 'Scan Tickets' : 'View event'}
            icon={canScan ? 'scan-outline' : 'arrow-forward'}
            onPress={action}
            variant="secondary"
          />
        </View>
      ) : null}
    </Card>
  );
});

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  staffLabel: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  staffCopy: { flex: 1, minWidth: 0 },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
