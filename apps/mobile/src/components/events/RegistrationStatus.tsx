import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { Event, Registration } from '@sfvga/shared-types';
import { useTheme } from '@/providers/ThemeProvider';
import { useClock } from '@/hooks/useClock';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { functionsClient } from '@/services/functionsClient';
import {
  formatPacificDate,
  openPaymentLink,
  paymentActionOpen,
  paymentDeadline,
  paymentRequestId,
} from '@/utils/payment';
import { toDate } from '@/utils/dateFormat';
import { RegistrationConfirmation } from './RegistrationConfirmation';

export function RegistrationStatus({
  event,
  registration: reg,
  onTickets,
  onMessages,
  onSubmitted,
  initialError,
}: {
  event: Event;
  registration: Registration;
  onTickets: () => void;
  onMessages: () => void;
  onSubmitted?: () => void;
  initialError?: string | null;
}) {
  const { colors, typography, spacing } = useTheme();
  const now = useClock();
  const open = paymentActionOpen(event, now, reg);
  const eventEnded =
    event.status === 'ended' || (toDate(event.endAt)?.getTime() ?? Infinity) <= now;
  const historical = reg.workflowVersion !== 1;
  const [submittedLocally, setSubmittedLocally] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reviewRequestedLocally, setReviewRequestedLocally] = useState(false);
  const submitted = historical || reg.signupStatus === 'submitted' || submittedLocally;
  const approved = historical || reg.reviewStatus === 'approved' || reg.totalAmount === 0;
  const ready = historical || (approved && reg.ticketsReadyRevision === reg.reviewRevision);
  const rejected = reg.reviewStatus === 'rejected';
  const [payerName, setPayerName] = useState(reg.payerName ?? '');
  const [paymentNote, setPaymentNote] = useState(reg.paymentNote ?? '');
  const [error, setError] = useState(initialError ?? '');
  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(paymentRequestId());
  async function finish() {
    setBusy(true);
    setError('');
    try {
      await functionsClient.call(
        submitted ? 'registrations_requestReview' : 'registrations_finish',
        {
          eventId: event.id,
          registrationId: reg.id,
          payerName,
          paymentNote,
          requestId: requestId.current,
        },
      );
      if (submitted) setReviewRequestedLocally(true);
      else {
        setSubmittedLocally(true);
        if (onSubmitted) onSubmitted();
        else setShowConfirmation(true);
      }
      requestId.current = paymentRequestId();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  if (showConfirmation) {
    return (
      <RegistrationConfirmation
        title="Registration submitted"
        message="Thank you! Our team will verify your payment. Your event check-in QR codes will appear in Tickets once payment is approved. Verification may take some time, and we’ll notify you when your tickets are ready."
        primaryAction={{
          title: 'View registration status',
          onPress: () => setShowConfirmation(false),
        }}
      />
    );
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.md,
        maxWidth: 820,
        width: '100%',
        alignSelf: 'center',
        paddingBottom: spacing.xl,
      }}
    >
      <Text style={[typography.headingLarge, { color: colors.textPrimary }]}>{event.title}</Text>
      <Card style={{ gap: spacing.sm }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Your saved signup</Text>
        <Text style={[typography.bodyLarge, { color: colors.textPrimary }]}>
          {reg.attendees.map((a) => a.name).join(', ')}
        </Text>
        <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>
          Total: ${reg.totalAmount.toFixed(2)}
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
          Your attendees and quoted total are saved and cannot be changed during payment.
        </Text>
      </Card>
      <Card style={{ gap: spacing.md }}>
        <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>
          {historical
            ? 'Your registration'
            : submitted
              ? reviewRequestedLocally
                ? 'Payment update sent'
                : rejected
                  ? 'Payment needs attention'
                  : ready
                    ? 'Your tickets are ready'
                    : 'Registration submitted'
              : open
                ? 'One more step after payment'
                : 'Registration closed'}
        </Text>
        <Text style={[typography.bodyLarge, { color: colors.textPrimary }]}>
          {historical
            ? 'This is an existing registration. Your previously issued tickets remain available in Tickets. Contact an organizer in Messages if you need help.'
            : reviewRequestedLocally
              ? 'Your payment update was sent to the organizers for review.'
              : submitted && !rejected
                ? ready
                  ? 'Open Tickets to view your event check-in QR codes.'
                  : approved
                    ? 'Your registration is confirmed. Your event check-in QR codes are being prepared. We’ll notify you when your tickets are ready.'
                    : 'Thank you! Our team will verify your payment. Your event check-in QR codes will appear in Tickets once payment is approved. Verification may take some time, and we’ll notify you when your tickets are ready.'
                : open
                  ? `Pay $${reg.totalAmount.toFixed(2)}, then return to this page and select “${submitted ? 'I’ve updated my payment — request review' : 'I’ve paid — finish registration'}.” ${submitted ? 'Your payment will be reviewed again.' : 'Your registration is not complete until you do this.'}`
                  : submitted && rejected
                    ? eventEnded
                      ? 'This event has ended. Contact an organizer in Messages if you need help reconciling a payment you already made; please do not make a new payment for this event.'
                      : 'Registration has closed, but you can still resolve this payment issue. Contact an organizer in Messages. If another payment is needed, they can open a private correction window for you. Please wait for their instructions before paying again.'
                    : 'Registration has closed. Contact an organizer in Messages if you need help; payment alone cannot complete this signup.'}
        </Text>
        {ready ? <Button title="View Tickets" onPress={onTickets} /> : null}
      </Card>
      {open && (!submitted || (rejected && !reviewRequestedLocally)) ? (
        <Card style={{ gap: spacing.lg }}>
          <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
            Finish before{' '}
            {formatPacificDate(
              Math.max(paymentDeadline(event), (reg.correctionExpiresAt?.seconds ?? 0) * 1000),
            )}
            .
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            If the payment page doesn’t open, use Open payment link below. Before the registration
            deadline, the link is also in the event description. Return here to finish your
            registration or request another review.
          </Text>
          {event.paymentUrl ? (
            <Button
              title="Open payment link"
              onPress={() =>
                void openPaymentLink(event.paymentUrl!).catch((e: Error) => setError(e.message))
              }
            />
          ) : null}
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>
              Back from payment?
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
              Enter the name used for payment so our team can match it to your registration.
            </Text>
          </View>
          <Input
            label="Payer’s name"
            value={payerName}
            onChangeText={setPayerName}
            maxLength={150}
          />
          <Input
            label="Payment reference or note (optional)"
            value={paymentNote}
            onChangeText={setPaymentNote}
            maxLength={1000}
            multiline
          />
          <Button
            title={
              submitted
                ? 'I’ve updated my payment — request review'
                : 'I’ve paid — finish registration'
            }
            onPress={() => void finish()}
            loading={busy}
            disabled={!payerName.trim()}
          />
        </Card>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
      <Button title="Message an organizer" variant="secondary" onPress={onMessages} />
    </ScrollView>
  );
}
