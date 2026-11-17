import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import type { Timestamp } from 'firebase-admin/firestore';
import { encryptPayload } from '../shared/qrCrypto';
import { sendPushToTokens } from '../shared/pushNotifications';
import { resolveMemberEmail } from '../shared/resolveMemberEmail';
import { sendTicketConfirmationEmail } from '../shared/emailService';
import { buildTicketPdf, formatEventDateLabel, ticketPdfFilename } from './ticketPdf';
import { notice, workflowEligible } from '../shared/paymentWorkflow';

const qrSigningKey = defineSecret('QR_SIGNING_KEY');

// Grace window after an event ends during which the QR still validates (late arrivals,
// clock skew) before the payload's exp is considered expired.
const EXP_GRACE_MS = 12 * 60 * 60 * 1000;
const FALLBACK_TTL_MS = 365 * 24 * 60 * 60 * 1000;

interface RegistrationAttendee {
  familyMemberId: string;
  name: string;
  ageGroup: 'adult' | 'child' | 'senior';
}

interface TicketSnapshot {
  attendeeName: string;
  qrPayloadEncrypted: string;
}

interface TicketIssue {
  tickets: TicketSnapshot[];
  generation: number;
  confirmationEmailSent?: boolean;
  confirmationEmailGeneration?: number;
  confirmationPushSent?: boolean;
}

/**
 * tickets_onRegistrationConfirmed — Firestore trigger. When a registration is "paid" or
 * "free", generates one Ticket (encrypted QR) per attendee (tech design §6, §8), sends a
 * confirmation push, and emails a PDF ticket backup (tech design §11).
 *
 * Uses onDocumentWritten (not onDocumentUpdated) because free registrations are created
 * directly with paymentStatus "free", so there is no separate update to react to. Ticket
 * generation is idempotent within the current QR generation. Reapproval after a dispute
 * creates replacement codes for unused tickets. The PDF email can be resent for a new
 * generation; email failures are logged and do not block ticket generation or notices.
 */
export const tickets_onRegistrationConfirmed = onDocumentWritten(
  {
    document: 'events/{eventId}/registrations/{registrationId}',
    secrets: [qrSigningKey],
    retry: true,
  },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const registration = after.data() as {
      userId?: string;
      attendees?: RegistrationAttendee[];
      paymentStatus?: string;
    };
    if (!workflowEligible(after.data()!)) return;
    if (registration.paymentStatus !== 'free' && registration.paymentStatus !== 'paid') {
      return;
    }

    const attendees = registration.attendees ?? [];
    if (attendees.length === 0) return;

    const { eventId, registrationId } = event.params;
    const db = getFirestore();
    const ticketsRef = db.collection(`events/${eventId}/registrations/${registrationId}/tickets`);

    const eventSnap = await db.doc(`events/${eventId}`).get();
    const eventTitle = (eventSnap.get('title') as string | undefined) ?? 'Your event';
    const startAt = eventSnap.get('startAt') as Timestamp | undefined;
    const locationName = (eventSnap.get('location') as { name?: string } | undefined)?.name;

    const issue = await db.runTransaction(async (tx): Promise<TicketIssue | null> => {
      const [current, allTickets] = await Promise.all([tx.get(after.ref), tx.get(ticketsRef)]);
      const data = current.data();
      if (!data || !workflowEligible(data) || !['paid', 'free'].includes(data.paymentStatus))
        return null;
      const generation = data.ticketGeneration ?? 0;
      const snapshots: TicketSnapshot[] = allTickets.docs
        .filter((doc) => data.workflowVersion !== 1 || (doc.get('generation') ?? 0) === generation)
        .filter((doc) => !['revoked', 'redeemed'].includes(doc.get('status')))
        .map((doc) => ({
          attendeeName: doc.get('attendeeName'),
          qrPayloadEncrypted: doc.get('qrPayloadEncrypted'),
        }));
      // Historical tickets keep their IDs and QR payloads. A payment dispute advances
      // the generation, permanently retiring the prior QR without erasing check-in history.
      const legacy = data.workflowVersion !== 1;
      const endAt = eventSnap.get('endAt') as Timestamp | undefined;
      const exp = endAt ? endAt.toMillis() + EXP_GRACE_MS : Date.now() + FALLBACK_TTL_MS;
      const secret = qrSigningKey.value();
      (data.attendees as RegistrationAttendee[]).forEach((attendee, index) => {
        if (legacy && !allTickets.empty) return;
        const ticketRef = ticketsRef.doc(
          generation === 0 ? `attendee-${index}` : `attendee-${index}-g${generation}`,
        );
        if (allTickets.docs.some((doc) => doc.id === ticketRef.id)) return;
        if (!legacy && generation > 0) {
          const latestPrior = allTickets.docs
            .filter(
              (doc) =>
                (doc.get('attendeeIndex') ?? Number(/^attendee-(\d+)/.exec(doc.id)?.[1])) ===
                  index && (doc.get('generation') ?? 0) < generation,
            )
            .sort((a, b) => (b.get('generation') ?? 0) - (a.get('generation') ?? 0))[0];
          if (latestPrior && (latestPrior.get('status') ?? 'valid') !== 'valid') return;
        }
        const qrPayloadEncrypted = encryptPayload(
          {
            ticketId: ticketRef.id,
            eventId,
            registrationId,
            attendeeName: attendee.name,
            exp,
          },
          secret,
        );
        snapshots.push({
          attendeeName: attendee.name,
          qrPayloadEncrypted,
        });
        tx.create(ticketRef, {
          id: ticketRef.id,
          eventId,
          attendeeName: attendee.name,
          ageGroup: attendee.ageGroup,
          attendeeIndex: index,
          generation,
          qrPayloadEncrypted,
          status: 'valid',
          eventTitle,
          ...(startAt ? { eventStartAt: startAt } : {}),
        });
      });

      if (!legacy && snapshots.length > 0 && data.ticketsReadyRevision !== data.reviewRevision) {
        notice(
          tx,
          after.ref,
          data,
          `tickets-${data.reviewRevision}`,
          'Your tickets are ready',
          `Your tickets for ${eventTitle} are ready. Open Tickets in the SFVGA app to view your check-in QR codes.`,
          'registration_confirmed',
          data.reviewRevision,
        );
        tx.update(after.ref, { ticketsReadyRevision: data.reviewRevision });
      }
      return {
        tickets: snapshots,
        generation,
        confirmationEmailSent: data.confirmationEmailSent,
        confirmationEmailGeneration: data.confirmationEmailGeneration,
        confirmationPushSent: data.confirmationPushSent,
      };
    });
    if (!issue) return;
    const ticketSnapshots = issue.tickets;

    const registrationUpdates: Record<string, boolean | number> = {};

    // Registration confirmation push (tech design §11) — once, when tickets are ready.
    if (
      after.get('workflowVersion') !== 1 &&
      ticketSnapshots.length > 0 &&
      !issue.confirmationPushSent &&
      registration.userId
    ) {
      const userSnap = await db.doc(`users/${registration.userId}`).get();
      const expoPushTokens = (userSnap.data()?.expoPushTokens as string[] | undefined) ?? [];
      const fcmTokens = (userSnap.data()?.fcmTokens as string[] | undefined) ?? [];
      const tokens = [...new Set([...expoPushTokens, ...fcmTokens])];

      if (tokens.length > 0) {
        await sendPushToTokens(tokens, {
          title: "You're registered!",
          body: `Your tickets for ${eventTitle} are ready.`,
          data: { type: 'registration_confirmed', eventId },
        });
      }

      registrationUpdates.confirmationPushSent = true;
    }

    // PDF ticket email backup (tech design §6 step 7, §11) — once per registration.
    const generation = issue.generation;
    const emailDue =
      generation === 0
        ? !issue.confirmationEmailSent
        : issue.confirmationEmailGeneration !== generation;
    if (emailDue && registration.userId && ticketSnapshots.length > 0) {
      const memberEmail = await resolveMemberEmail(registration.userId);
      if (!memberEmail) {
        console.info(`Ticket email skipped: no email on file for user ${registration.userId}`);
        registrationUpdates.confirmationEmailSent = true;
        registrationUpdates.confirmationEmailGeneration = generation;
      } else {
        try {
          const eventDateLabel = startAt
            ? formatEventDateLabel(startAt.toDate())
            : 'See the SFVGA app for event details';
          const pdfBuffer = await buildTicketPdf({
            eventTitle,
            eventDateLabel,
            locationName,
            tickets: ticketSnapshots,
          });
          const emailResult = await sendTicketConfirmationEmail({
            to: memberEmail,
            eventTitle,
            pdfBuffer,
            filename: ticketPdfFilename(eventTitle),
          });

          if (emailResult === 'sent' || emailResult === 'skipped_not_configured') {
            registrationUpdates.confirmationEmailSent = true;
            registrationUpdates.confirmationEmailGeneration = generation;
          }
        } catch (error) {
          console.error('Ticket PDF/email pipeline failed', error);
        }
      }
    }

    if (Object.keys(registrationUpdates).length > 0) {
      await after.ref.update(registrationUpdates);
    }
  },
);
