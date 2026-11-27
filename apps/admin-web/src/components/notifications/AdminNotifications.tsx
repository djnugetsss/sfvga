'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { formatNotificationDateTime, toDate } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { canReceiveAdminNotifications } from '@/lib/adminNotifications';
import type { AdminRegistrationNotification } from '@sfvga/shared-types';

function NotificationIcon({ type }: { type: AdminRegistrationNotification['type'] }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {type === 'admin_registration_message' ? (
        <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3-.6L4 20l1.6-4.7a7.5 7.5 0 1 1 14.4-3.8Z" />
      ) : type === 'admin_photo_album_reminder' ? (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4m10-4v4M3 10h18" />
        </>
      ) : (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8m-8 4h8m-8 4h5" />
        </>
      )}
    </svg>
  );
}

export function AdminNotifications() {
  const feed = useAdminNotifications();
  const { access } = useAdminAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!canReceiveAdminNotifications(access)) return null;
  const items = unreadOnly ? feed.items.filter((item) => !item.readAt) : feed.items;
  async function markRead(ids: string[]) {
    setBusy(true);
    setError('');
    try {
      await feed.markRead(ids);
    } catch {
      setError('Could not mark notifications as read. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function dismiss(id: string) {
    setBusy(true);
    setError('');
    try {
      await feed.dismiss(id);
    } catch {
      setError('Could not dismiss this notification. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        aria-label={`Admin notifications${feed.unreadCount ? `, ${feed.unreadCount} unread` : ''}`}
        className="relative flex min-h-12 min-w-12 items-center justify-center rounded-full border border-border"
        onClick={() => dialog.current?.showModal()}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {feed.unreadCount ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-brand px-1.5 text-xs font-semibold text-white">
            {feed.unreadCount > 99 ? '99+' : feed.unreadCount}
          </span>
        ) : null}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="admin-notifications-title"
        className="m-0 h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-hidden border border-border bg-surface p-0 text-ink shadow-xl backdrop:bg-black/30 sm:m-auto sm:h-auto sm:max-h-[85dvh] sm:w-[calc(100%_-_2rem)] sm:max-w-xl sm:rounded-2xl"
      >
        <div className="flex h-full max-h-[100dvh] flex-col sm:h-auto sm:max-h-[85dvh]">
          <header className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <h2 id="admin-notifications-title" className="font-sans text-xl font-semibold">
                Admin notifications
              </h2>
            </div>
            <button
              type="button"
              autoFocus
              className="min-h-12 min-w-12 shrink-0 rounded-full border border-border text-base"
              onClick={() => dialog.current?.close()}
            >
              Close
            </button>
          </header>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="flex gap-2">
              {[false, true].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={unreadOnly === value}
                  className={`min-h-12 rounded-full border px-4 text-base ${unreadOnly === value ? 'border-brand/40 bg-brandSoft font-semibold text-brand' : 'border-border text-muted'}`}
                  onClick={() => setUnreadOnly(value)}
                >
                  {value ? 'Unread' : 'All'}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={busy || !feed.unreadCount}
              className="min-h-12 text-base underline underline-offset-4 disabled:opacity-50"
              onClick={() =>
                void markRead(feed.items.filter((item) => !item.readAt).map((item) => item.id))
              }
            >
              Mark all read
            </button>
          </div>
          {error ? (
            <p role="alert" className="px-5 py-2 text-base text-error">
              {error}
            </p>
          ) : null}
          <div className="overflow-y-auto px-5 pb-5">
            {feed.isLoading ? (
              <div aria-label="Loading notifications" className="space-y-4 py-5">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex gap-3 border-b border-border pb-5">
                    <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-surfaceMuted" />
                    <div className="w-full space-y-3">
                      <div className="h-4 w-1/3 animate-pulse rounded bg-surfaceMuted" />
                      <div className="h-5 w-3/4 animate-pulse rounded bg-surfaceMuted" />
                      <div className="h-4 w-full animate-pulse rounded bg-surfaceMuted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : feed.isError ? (
              <div className="space-y-4 py-6">
                <p>Couldn’t load notifications.</p>
                <Button onClick={feed.refetch}>Retry</Button>
              </div>
            ) : !items.length ? (
              <div className="my-5 flex flex-col items-center border-y border-border px-4 py-8 text-center">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-accent text-brand"
                  aria-hidden="true"
                >
                  <svg
                    width="23"
                    height="23"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                  </svg>
                </span>
                <h3 className="mt-4 text-xl font-semibold text-ink">
                  {unreadOnly ? 'No unread notifications' : 'No admin notifications yet'}
                </h3>
                <p className="mt-2 max-w-sm text-base leading-6 text-muted">
                  {unreadOnly
                    ? 'You’re all caught up.'
                    : 'Updates for events you manage will appear here.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id} className="border-b border-border py-4 last:border-b-0">
                    <Link
                      className="flex min-h-12 gap-3 rounded-xl p-2 -m-2 hover:bg-surfaceMuted focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                      href={
                        item.type === 'admin_photo_album_reminder'
                          ? `/events/${item.eventId}`
                          : `/events/${item.eventId}/${item.type === 'admin_registration_message' ? 'messages' : 'registrations'}#registration-${item.registrationId}`
                      }
                      onClick={() => {
                        if (!item.readAt) void markRead([item.id]);
                        dialog.current?.close();
                      }}
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${item.readAt ? 'bg-surfaceMuted text-brand' : 'bg-brandSoft text-brand'}`}
                      >
                        <NotificationIcon type={item.type} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`mt-1 block text-base text-ink ${item.readAt ? 'font-semibold' : 'font-bold'}`}
                        >
                          {item.type === 'admin_registration_message' ? 'New message' : item.type === 'admin_photo_album_reminder' ? 'Add event photos' : item.title}
                        </span>
                        <span className="mt-1 block text-base leading-6 text-muted">{item.type === 'admin_registration_message' ? `A member sent you a message about ${item.eventTitle}.` : item.type === 'admin_photo_album_reminder' ? `Add the photo link for ${item.eventTitle}.` : item.title === 'Payment needs follow-up' ? `Resolve the payment issue for ${item.eventTitle}.` : `Review the member’s payment for ${item.eventTitle}.`}</span>
                        <span className="mt-1 block text-sm leading-5 text-muted">{toDate(item.createdAt) ? formatNotificationDateTime(toDate(item.createdAt)!) : ''}</span>
                        <span className="mt-2 block text-base font-semibold text-brand">
                          {item.type === 'admin_photo_album_reminder'
                            ? 'Edit event'
                            : item.type === 'admin_registration_message'
                              ? 'Open conversation'
                              : 'Open registration'}{' '}
                          →
                        </span>
                      </span>
                      {!item.readAt ? (
                        <span
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent"
                          aria-label="Unread"
                        />
                      ) : null}
                    </Link>
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      {!item.readAt ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="min-h-12 rounded-lg px-3 text-base font-semibold text-brand hover:bg-brandSoft disabled:opacity-50"
                          onClick={() => void markRead([item.id])}
                        >
                          Mark read
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        className="min-h-12 rounded-lg px-3 text-base font-semibold text-brand hover:bg-brandSoft disabled:opacity-50"
                        aria-label={`Dismiss ${item.type === 'admin_registration_message' ? 'New message' : item.type === 'admin_photo_album_reminder' ? 'Add event photos' : item.title} notification`}
                        onClick={() => void dismiss(item.id)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
