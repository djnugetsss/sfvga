import React, { useState } from 'react';
import { Text } from 'react-native';
import type { Event } from '@sfvga/shared-types';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTheme } from '@/providers/ThemeProvider';
import { useClock } from '@/hooks/useClock';
import {
  formatPacificDate,
  openPaymentLink,
  paymentActionOpen,
  paymentDeadline,
} from '@/utils/payment';

export function PaymentInstructions({ event }: { event: Event }) {
  const { typography, colors, spacing } = useTheme();
  const now = useClock();
  const [error, setError] = useState('');
  if (!event.paymentUrl) return null;
  const open = paymentActionOpen(event, now);
  return (
    <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
      <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>
        Registration and payment
      </Text>
      <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
        Start your registration in the SFVGA app first. You’ll be directed to the payment link
        during registration. After paying, return to SFVGA and finish your registration before{' '}
        {formatPacificDate(paymentDeadline(event))}.
      </Text>
      <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
        Payment alone does not register you or provide tickets. Payments made without a completed
        registration, or after registration closes, are not eligible for tickets unless an organizer
        has approved an exception.
      </Text>
      <Button
        title={open ? 'Open payment link' : 'Registration closed'}
        variant="secondary"
        disabled={!open}
        onPress={() =>
          void openPaymentLink(event.paymentUrl!).catch((e: Error) => setError(e.message))
        }
      />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
    </Card>
  );
}
