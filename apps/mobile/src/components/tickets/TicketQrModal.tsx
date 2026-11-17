import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { TicketStatus } from '@sfvga/shared-types';
import { QrCodeDisplay } from './QrCodeDisplay';
import { Badge } from '@/components/ui/Badge';
import { useQrBrightnessBoost } from '@/hooks/useQrBrightnessBoost';
import { useTheme } from '@/providers/ThemeProvider';

interface TicketQrModalProps {
  visible: boolean;
  onClose: () => void;
  payload?: string;
  attendeeName?: string;
  eventName?: string;
  status?: TicketStatus;
}

/**
 * Full-screen QR view (UI/UX §7). Plain white background regardless of app theme so scanners
 * read the code reliably, with the attendee/event shown above and a "Done" dismiss. Screen
 * brightness is boosted while a valid QR is visible and restored on dismiss.
 */
export function TicketQrModal({
  visible,
  onClose,
  payload,
  attendeeName,
  eventName,
  status = 'valid',
}: TicketQrModalProps) {
  const { colors, typography, spacing, minTapTarget } = useTheme();
  const isRevoked = status === 'revoked';
  const shouldBoostBrightness = visible && !isRevoked && Boolean(payload);
  useQrBrightnessBoost(shouldBoostBrightness);

  // On Expo web, keep Modal out of the DOM when closed — Fast Refresh with a
  // mounted Modal can leave an invisible layer that steals all clicks.
  if (!visible) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.content}>
          {isRevoked ? (
            <View style={{ alignItems: 'center', paddingHorizontal: spacing.lg }}>
              <Badge label="No longer valid" variant="neutral" />
              <Text
                style={[
                  typography.headingMedium,
                  { color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' },
                ]}
              >
                {attendeeName}
              </Text>
              <Text
                style={[
                  typography.bodyLarge,
                  { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
                ]}
              >
                This ticket was revoked and can no longer be used for check-in. Please see an
                organizer if you need help.
              </Text>
            </View>
          ) : payload ? (
            <QrCodeDisplay payload={payload} attendeeName={attendeeName} eventName={eventName} />
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Done"
          style={[styles.doneButton, { padding: spacing.lg, minHeight: minTapTarget }]}
        >
          <Text style={[typography.bodyLarge, { color: colors.deepBlue, fontWeight: '600' }]}>
            Done
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  doneButton: {
    alignItems: 'center',
  },
});
