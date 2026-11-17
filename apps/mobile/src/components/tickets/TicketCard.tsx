import React from 'react';
import { Text, View } from 'react-native';
import type { TicketStatus } from '@sfvga/shared-types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon } from '@/components/ui/AppIcon';
import { MotionPressable } from '@/components/ui/MotionPressable';

interface TicketCardProps {
  attendeeName: string;
  status: TicketStatus;
  pastEvent?: boolean;
  onPress?: () => void;
}

// Map the stored ticket status to a calm, plain-language tag (UI/UX §7 — never alarming red).
const STATUS_TAG: Record<TicketStatus, { label: string; variant: 'success' | 'info' | 'neutral' }> =
  {
    valid: { label: 'Ready', variant: 'success' },
    redeemed: { label: 'Checked In', variant: 'info' },
    revoked: { label: 'No longer valid', variant: 'neutral' },
  };

export const TicketCard = React.memo(function TicketCard({
  attendeeName,
  status,
  pastEvent = false,
  onPress,
}: TicketCardProps) {
  const { colors, typography, spacing } = useTheme();
  const tag =
    pastEvent && status === 'valid'
      ? { label: 'Past event', variant: 'neutral' as const }
      : STATUS_TAG[status];
  const isRevoked = status === 'revoked';
  const canOpen = Boolean(onPress) && !isRevoked;

  const content = (
    <Card style={{ marginBottom: spacing.sm, opacity: isRevoked ? 0.72 : 1, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isRevoked ? colors.surfaceMuted : colors.accentSoft,
          }}
        >
          <AppIcon
            name={isRevoked ? 'close-circle-outline' : 'qr-code-outline'}
            size={23}
            color={isRevoked ? colors.textSecondary : colors.accentStrong}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '700' }]}
          >
            {attendeeName}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {isRevoked
              ? 'This ticket is no longer valid'
              : pastEvent
                ? 'View ticket history'
                : 'Tap to view QR'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Badge label={tag.label} variant={tag.variant} />
          {canOpen ? (
            <AppIcon name="chevron-forward" size={17} color={colors.textSecondary} />
          ) : null}
        </View>
      </View>
    </Card>
  );

  if (!canOpen) {
    return <View accessibilityLabel={`${attendeeName}, ${tag.label}`}>{content}</View>;
  }

  return (
    <MotionPressable
      onPress={onPress}
      pressedScale={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${attendeeName}, ${tag.label}, tap to view ticket`}
    >
      {content}
    </MotionPressable>
  );
});
