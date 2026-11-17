import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@/providers/ThemeProvider';
import { getQrRenderProps } from '@/services/qrRenderer';

interface QrCodeDisplayProps {
  payload: string;
  attendeeName?: string;
  eventName?: string;
}

/**
 * Renders a scannable QR from the opaque encrypted payload string. Display only — the client
 * never decrypts; it just draws the string it was given (tech design §8).
 */
export function QrCodeDisplay({ payload, attendeeName, eventName }: QrCodeDisplayProps) {
  const { colors, typography, spacing } = useTheme();
  const qrProps = getQrRenderProps(payload);

  return (
    <View style={[styles.container, { backgroundColor: colors.white, padding: spacing.lg }]}>
      {attendeeName ? (
        <Text
          style={[typography.headingMedium, { color: colors.textPrimary, textAlign: 'center' }]}
        >
          {attendeeName}
        </Text>
      ) : null}
      {eventName ? (
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
          ]}
        >
          {eventName}
        </Text>
      ) : null}
      <View
        accessible
        accessibilityLabel={`Ticket for ${attendeeName ?? 'attendee'}, ${eventName ?? 'event'}`}
        style={[styles.qrWrap, { marginTop: spacing.md }]}
      >
        <QRCode
          value={qrProps.value}
          size={qrProps.size}
          backgroundColor={qrProps.backgroundColor}
          color={qrProps.color}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  qrWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
