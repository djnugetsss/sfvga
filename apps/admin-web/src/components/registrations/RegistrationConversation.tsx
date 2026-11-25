'use client';
import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Event, RegistrationMessage, Registration } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';
import { functionsClient } from '@/services/functionsClient';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea, ErrorBanner } from '@/components/ui/primitives';
import { formatDateTime, toDate, pacificInputToIso } from '@/lib/formatters';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export function RegistrationConversation({
  eventId,
  event,
  registration,
}: {
  eventId: string;
  event?: Event;
  registration: Registration;
}) {
  const registrationId = registration.id;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const eventEnded =
    event?.status === 'ended' || (toDate(event?.endAt)?.getTime() ?? Infinity) <= now;
  const registrationClosed =
    Math.min(
      toDate(event?.registrationDeadline)?.getTime() ?? Infinity,
      toDate(event?.endAt)?.getTime() ?? Infinity,
    ) <= now;
  const { firebaseUser } = useAdminAuth();
  const [showEarlier, setShowEarlier] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<RegistrationMessage[]>([]);
  const [outgoing, setOutgoing] = useState<{
    body: string;
    requestId: string;
    sent: boolean;
  } | null>(null);
  const [body, setBody] = useState('');
  const [expiry, setExpiry] = useState('');
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ payload: string; requestId: string }>();
  useEffect(() => {
    // Prepare the endpoint before the organizer presses Send. This is read-only.
    void functionsClient
      .call('registrations_sendMessage', {
        prepare: true,
        senderRole: 'organizer',
        eventId,
        registrationId,
      })
      .catch(() => undefined);
  }, [eventId, registrationId]);
  useEffect(
    () =>
      onSnapshot(
        query(
          collection(
            getFirestoreDb(),
            'events',
            eventId,
            'registrations',
            registrationId,
            'messages',
          ),
          orderBy('createdAt'),
        ),
        (snap) => {
          setLoading(false);
          setMessages(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as RegistrationMessage));
          setOutgoing((current) =>
            current && snap.docs.some((doc) => doc.id === current.requestId) ? null : current,
          );
          if (snap.docs.length)
            void functionsClient
              .call('registrations_markMessagesRead', {
                audience: 'admin',
                eventId,
                registrationId,
                requestId: crypto.randomUUID(),
                lastMessageId: snap.docs[snap.docs.length - 1].id,
              })
              .catch(() =>
                setError('Could not mark messages as read. Reopen this conversation to retry.'),
              );
        },
        (e) => {
          setLoading(false);
          setError(e.message);
        },
      ),
    [eventId, registrationId],
  );
  async function submit(exception: boolean) {
    if (busy || (!exception && !body.trim())) return;
    setBusy(true);
    setError('');
    try {
      const details = exception
        ? { expiresAt: pacificInputToIso(expiry), explanation: explanation.trim() }
        : { body: body.trim(), senderRole: 'organizer' as const };
      const payload = JSON.stringify(details);
      if (pending.current?.payload !== payload)
        pending.current = { payload, requestId: crypto.randomUUID() };
      const requestId = pending.current.requestId;
      if (!exception) setOutgoing({ body: body.trim(), requestId, sent: false });
      await functionsClient.call(
        exception ? 'registrations_grantCorrection' : 'registrations_sendMessage',
        {
          eventId,
          registrationId,
          ...details,
          requestId,
        },
      );
      if (exception) {
        setExplanation('');
        setExpiry('');
      } else {
        setBody('');
        setOutgoing((current) =>
          current?.requestId === requestId ? { ...current, sent: true } : current,
        );
      }
      pending.current = undefined;
    } catch (e) {
      if (!exception) setOutgoing(null);
      setError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-ink">Private messages</h3>
      <p className="text-sm leading-6 text-muted">
        Only this member and registration organizers can read these messages.
      </p>
      {registration.workflowVersion === 1 &&
      registration.reviewStatus === 'rejected' &&
      registrationClosed ? (
        <div className="rounded-xl border border-border bg-surfaceMuted/55 p-4 text-sm leading-6 text-ink">
          <p className="font-semibold">Resolving payment after registration closes</p>
          <p className="mt-1 text-muted">
            This completed signup stays in your review queue. Ask the member for their payer name or
            payment reference here.{' '}
            {eventEnded
              ? 'The event has ended, so do not request a new payment or grant a correction window. You can still reconcile a payment already made and update the review decision.'
              : 'If another payment is needed after the deadline, grant a time-limited exception below. It reopens payment for this signup only, without adding attendees. The member can then request another review; confirm Paid? Yes once verified.'}
          </p>
        </div>
      ) : null}
      {loading ? (
        <div aria-label="Loading messages" className="space-y-3 py-3">
          <div className="h-14 w-3/4 animate-pulse rounded-xl bg-surfaceMuted" />
          <div className="ml-auto h-14 w-2/3 animate-pulse rounded-xl bg-surfaceMuted" />
        </div>
      ) : !messages.length && !outgoing ? (
        <p className="p-4 text-sm text-muted">
          No messages yet. Contact this member about their registration below.
        </p>
      ) : null}
      {messages.length > 8 ? (
        <button
          type="button"
          className="min-h-12 w-full text-sm underline underline-offset-4"
          onClick={() => setShowEarlier(!showEarlier)}
        >
          {showEarlier ? 'Show recent messages' : `Show ${messages.length - 8} earlier messages`}
        </button>
      ) : null}
      <div className="flex flex-col gap-4" aria-label="Registration conversation">
        {(showEarlier ? messages : messages.slice(-8)).map((m) => (
          <div
            key={m.id}
            className={`max-w-[86%] rounded-2xl px-4 py-3 ${m.senderRole === 'system' ? 'self-center max-w-full border border-border bg-surfaceMuted/50' : m.senderRole === 'organizer' ? 'self-end rounded-br-sm bg-accentSoft' : 'self-start rounded-bl-sm bg-surfaceMuted'}`}
          >
            <p className="mb-1 text-sm font-semibold text-muted">
              {m.senderRole === 'member'
                ? 'Member'
                : m.senderRole === 'system'
                  ? 'Registration update'
                  : m.senderId === firebaseUser?.uid
                    ? 'You'
                    : 'SFVGA organizer'}
            </p>
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-base leading-6 text-ink">
              {m.body}
            </p>
            <p className="mt-2 text-sm text-muted">
              {toDate(m.createdAt) ? formatDateTime(toDate(m.createdAt)!) : ''}
            </p>
          </div>
        ))}
        {outgoing && !messages.some((message) => message.id === outgoing.requestId) ? (
          <div className="max-w-[86%] self-end rounded-2xl rounded-br-sm bg-accentSoft px-4 py-3">
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-base leading-6 text-ink">
              {outgoing.body}
            </p>
            <p className="mt-2 text-sm text-muted">{outgoing.sent ? 'Sent' : 'Sending…'}</p>
          </div>
        ) : null}
      </div>
      <div className="space-y-3 border-t border-border pt-4">
        <Field label="Your message">
          <Textarea
            className="min-h-20"
            placeholder="Write a private reply…"
            disabled={busy}
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        <div className="flex justify-end">
          <Button loading={busy} onClick={() => void submit(false)} disabled={!body.trim() || busy}>
            Send message
          </Button>
        </div>
      </div>
      {registration.workflowVersion === 1 &&
      registration.reviewStatus !== 'approved' &&
      event?.status === 'published' &&
      !eventEnded ? (
        <details className="space-y-4 border-t border-border pt-2 [&>label]:mt-4 [&>button]:mt-4">
          <summary className="cursor-pointer py-3 font-semibold">
            Grant a payment-correction exception
          </summary>
          <p className="text-sm leading-6 text-muted">
            Give this member extra time to finish or correct payment. Their attendees and total stay
            the same. The window must end before the event ends. If a member started but did not
            finish registering before closing, their reserved places were released and must still be
            available. A completed registration keeps its places while payment is reviewed.
          </p>
          <Field label="Exception expires (America/Los_Angeles)">
            <Input
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </Field>
          <Field label="Explanation sent privately to member">
            <Textarea
              value={explanation}
              maxLength={2000}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </Field>
          <Button
            disabled={!expiry || !explanation.trim() || busy}
            onClick={() => void submit(true)}
          >
            Grant exception and notify member
          </Button>
        </details>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
    </section>
  );
}
