'use client';

import React, { useEffect, useState } from 'react';
import type { CreateAnnouncementInput } from '@/hooks/useAnnouncements';
import { Card, Field, Input, Textarea, Select, ErrorBanner } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';

export interface ComposerEventOption {
  id: string;
  title: string;
}

interface AnnouncementComposerProps {
  events: ComposerEventOption[];
  submitting?: boolean;
  onSubmit: (input: CreateAnnouncementInput) => void;
  allowOrganizationWide?: boolean;
}

/**
 * Compose and "send now" an announcement (Architecture §16). Org-wide by default, or scoped to a
 * single event. Scheduling and emergency priority are deferred (later phase).
 */
export function AnnouncementComposer({
  events,
  submitting,
  onSubmit,
  allowOrganizationWide = true,
}: AnnouncementComposerProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [eventId, setEventId] = useState(allowOrganizationWide ? '' : (events[0]?.id ?? ''));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowOrganizationWide && !eventId && events[0]) setEventId(events[0].id);
  }, [allowOrganizationWide, eventId, events]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('A title and message are both required.');
      return;
    }
    if (!allowOrganizationWide && !eventId) {
      setError('Choose the event for this announcement.');
      return;
    }
    setError(null);
    onSubmit({ title: title.trim(), body: body.trim(), eventId: eventId || undefined });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        {error ? <ErrorBanner message={error} /> : null}
        <div className="flex flex-col gap-4">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label="Message">
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <Field label="Audience" hint="Event-scoped announcements appear on that event only.">
            <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {allowOrganizationWide ? (
                <option value="">Everyone (organization-wide)</option>
              ) : null}
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={submitting}>
              Send announcement
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
