import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { RegistrationMessage } from '@sfvga/shared-types';
import { getFirestoreDb } from '@/services/firebase';
import { functionsClient } from '@/services/functionsClient';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { toDate, formatRelative } from '@/utils/dateFormat';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/providers/ThemeProvider';
import { paymentRequestId } from '@/utils/payment';

export function RegistrationConversation({
  eventId,
  registrationId,
  showIntro = true,
}: {
  eventId: string;
  registrationId: string;
  showIntro?: boolean;
}) {
  const { typography, colors, spacing } = useTheme();
  const [messages, setMessages] = useState<RegistrationMessage[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showEarlier, setShowEarlier] = useState(false);
  const [loading, setLoading] = useState(true);
  const [outgoing, setOutgoing] = useState<{
    body: string;
    requestId: string;
    sent: boolean;
  } | null>(null);
  const pending = useRef<{ body: string; requestId: string }>();
  useEffect(() => {
    // Warm the authenticated message endpoint while the member reads the thread.
    void functionsClient
      .call('registrations_sendMessage', {
        prepare: true,
        senderRole: 'member',
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
                eventId,
                registrationId,
                requestId: paymentRequestId(),
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
  async function send() {
    if (!body.trim() || busy) return;
    if (pending.current?.body !== body.trim())
      pending.current = { body: body.trim(), requestId: paymentRequestId() };
    const draft = pending.current;
    setBusy(true);
    setError('');
    setOutgoing({ ...draft, sent: false });
    try {
      await functionsClient.call('registrations_sendMessage', {
        senderRole: 'member',
        eventId,
        registrationId,
        ...draft,
      });
      setBody('');
      setOutgoing((current) =>
        current?.requestId === draft.requestId ? { ...current, sent: true } : current,
      );
      pending.current = undefined;
    } catch (e) {
      setOutgoing(null);
      setError(e instanceof Error ? e.message : 'Could not send. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card style={{ gap: spacing.md, marginTop: showIntro ? spacing.sm : 0 }}>
      {showIntro ? (
        <>
          <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>
            Message an organizer
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
            Private messages about your registration.
          </Text>
        </>
      ) : null}
      {loading ? (
        <View accessibilityLabel="Loading messages" style={{ gap: spacing.sm }}>
          <Skeleton height={64} width="76%" />
          <Skeleton height={64} width="68%" style={{ alignSelf: 'flex-end' }} />
        </View>
      ) : !messages.length && !outgoing ? (
        <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
          Have a question about your registration? Send a message below.
        </Text>
      ) : null}
      {messages.length > 8 ? (
        <Button
          title={
            showEarlier ? 'Show recent messages' : `Show ${messages.length - 8} earlier messages`
          }
          variant="text"
          onPress={() => setShowEarlier(!showEarlier)}
        />
      ) : null}
      {(showEarlier ? messages : messages.slice(-8)).map((message) => (
        <View
          key={message.id}
          style={{
            padding: spacing.md,
            gap: spacing.xs,
            maxWidth: message.senderRole === 'system' ? '100%' : '86%',
            alignSelf:
              message.senderRole === 'system'
                ? 'center'
                : message.senderRole === 'member'
                  ? 'flex-end'
                  : 'flex-start',
            borderRadius: 16,
            borderBottomRightRadius: message.senderRole === 'member' ? 4 : 16,
            borderBottomLeftRadius: message.senderRole === 'organizer' ? 4 : 16,
            backgroundColor:
              message.senderRole === 'member' ? colors.accentSoft : colors.surfaceMuted,
          }}
        >
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {message.senderRole === 'member'
              ? 'You'
              : message.senderRole === 'system'
                ? 'Registration update'
                : 'SFVGA organizer'}
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{message.body}</Text>
          {toDate(message.createdAt) ? (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {formatRelative(toDate(message.createdAt)!)}
            </Text>
          ) : null}
        </View>
      ))}
      {outgoing && !messages.some((message) => message.id === outgoing.requestId) ? (
        <View
          style={{
            alignSelf: 'flex-end',
            maxWidth: '86%',
            backgroundColor: colors.accentSoft,
            borderRadius: 16,
            borderBottomRightRadius: 4,
            padding: spacing.md,
            gap: spacing.xs,
          }}
        >
          <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
            {outgoing.body}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {outgoing.sent ? 'Sent' : 'Sending…'}
          </Text>
        </View>
      ) : null}
      <Input
        label="Your message"
        placeholder="How can we help?"
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={2000}
        editable={!busy}
        style={{ minHeight: 80 }}
      />
      <View style={{ alignSelf: 'flex-end', minWidth: 112 }}>
        <Button
          title="Send message"
          onPress={() => void send()}
          loading={busy}
          disabled={!body.trim()}
        />
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
    </Card>
  );
}
