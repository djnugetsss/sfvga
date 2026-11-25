'use client';

import Link from 'next/link';
import type { Event } from '@sfvga/shared-types';
import { Badge } from '@/components/ui/primitives';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { toDate, formatDateTime } from '@/lib/formatters';

type Tone = 'success' | 'neutral' | 'warning';
const STATUS_TONE: Record<Event['status'], Tone> = {
  published: 'success',
  draft: 'neutral',
  ended: 'warning',
};

interface EventListProps {
  events: Event[];
  onTogglePublish: (event: Event) => void;
  onDuplicate: (event: Event) => void;
  onDelete: (event: Event) => void;
  busyId?: string | null;
  canEdit?: (eventId: string) => boolean;
  canPublish?: (eventId: string) => boolean;
  canDelete?: (eventId: string) => boolean;
  canManageRegistrations?: (eventId: string) => boolean;
  canManageStaff?: (eventId: string) => boolean;
  canMessage?: (eventId: string) => boolean;
}

function eventMenuItems(
  event: Event,
  handlers: Pick<EventListProps, 'onTogglePublish' | 'onDuplicate' | 'onDelete'>,
  busy: boolean,
  permissions: {
    edit: boolean;
    publish: boolean;
    delete: boolean;
    registrations: boolean;
    staff: boolean;
    messages: boolean;
  },
): ActionMenuItem[] {
  const items: ActionMenuItem[] = [];
  if (permissions.edit) items.push({ id: 'edit', label: 'Edit', href: `/events/${event.id}` });
  if (permissions.registrations)
    items.push({
      id: 'registrations',
      label: 'Registrations',
      href: `/events/${event.id}/registrations`,
    });
  if (permissions.staff)
    items.push({ id: 'staff', label: 'Event roles', href: `/events/${event.id}/staff` });
  if (permissions.messages)
    items.push({ id: 'messages', label: 'Messages', href: `/events/${event.id}/messages` });
  if (permissions.edit)
    items.push({
      id: 'duplicate',
      label: 'Duplicate',
      onSelect: () => handlers.onDuplicate(event),
      disabled: busy,
    });

  if (event.status !== 'ended' && permissions.publish) {
    items.push({
      id: 'publish',
      label: event.status === 'published' ? 'Unpublish' : 'Publish',
      onSelect: () => handlers.onTogglePublish(event),
      disabled: busy,
    });
  }

  if (permissions.delete)
    items.push({
      id: 'delete',
      label: 'Delete',
      onSelect: () => handlers.onDelete(event),
      tone: 'danger',
      disabled: busy,
    });

  return items;
}

export function EventList({
  events,
  onTogglePublish,
  onDuplicate,
  onDelete,
  busyId,
  canEdit = () => true,
  canPublish = () => true,
  canDelete = () => true,
  canManageRegistrations = () => true,
  canManageStaff = () => true,
  canMessage = () => false,
}: EventListProps) {
  return (
    <>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface md:hidden">
        {events.map((event) => {
          const start = toDate(event.startAt);
          const busy = busyId === event.id;
          return (
            <li key={event.id} className="flex min-h-24 items-center gap-3 px-4 py-4">
              <div className="min-w-0 flex-1">
                <Link href={`/events/${event.id}`} className="block break-words text-base font-semibold leading-6 text-ink hover:text-brand">
                  {event.title}
                </Link>
                <p className="mt-1 text-sm leading-5 text-muted">{start ? formatDateTime(start) : 'Date to be announced'}</p>
                <div className="mt-2"><Badge tone={STATUS_TONE[event.status]}>{event.status}</Badge></div>
              </div>
              <ActionMenu
                label={`Actions for ${event.title}`}
                disabled={busy}
                items={eventMenuItems(event, { onTogglePublish, onDuplicate, onDelete }, busy, {
                  edit: canEdit(event.id),
                  publish: canPublish(event.id),
                  delete: canDelete(event.id),
                  registrations: canManageRegistrations(event.id),
                  staff: canManageStaff(event.id),
                  messages: canMessage(event.id),
                })}
              />
            </li>
          );
        })}
      </ul>
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surfaceMuted/55 text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Event</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="w-14 px-4 py-3 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {events.map((event) => {
            const start = toDate(event.startAt);
            const busy = busyId === event.id;
            return (
              <tr key={event.id} className="align-middle hover:bg-brandSoft/30">
                <td className="px-4 py-4">
                  <Link
                    href={`/events/${event.id}`}
                    className="font-semibold text-ink hover:text-brand"
                  >
                    {event.title}
                  </Link>
                </td>
                <td className="px-4 py-4 text-muted">{start ? formatDateTime(start) : 'TBD'}</td>
                <td className="px-4 py-4">
                  <Badge tone={STATUS_TONE[event.status]}>{event.status}</Badge>
                </td>
                <td className="px-4 py-4 text-right">
                  <ActionMenu
                    label={`Actions for ${event.title}`}
                    disabled={busy}
                    items={eventMenuItems(event, { onTogglePublish, onDuplicate, onDelete }, busy, {
                      edit: canEdit(event.id),
                      publish: canPublish(event.id),
                      delete: canDelete(event.id),
                      registrations: canManageRegistrations(event.id),
                      staff: canManageStaff(event.id),
                      messages: canMessage(event.id),
                    })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
