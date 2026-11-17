import { Linking, Platform } from 'react-native';
import type { Event, Registration } from '@sfvga/shared-types';
import { toDate } from './dateFormat';

export function paymentDeadline(event: Event): number {
  return Math.min(
    toDate(event.registrationDeadline)?.getTime() ?? Infinity,
    toDate(event.endAt)?.getTime() ?? Infinity,
  );
}
export function paymentActionOpen(event: Event, now: number, registration?: Registration): boolean {
  if (registration?.signupStatus === 'expired') return false;
  return (
    event.status === 'published' &&
    (now < paymentDeadline(event) ||
      (toDate(registration?.correctionExpiresAt)?.getTime() ?? 0) > now)
  );
}
export function formatPacificDate(value: number): string {
  return Number.isFinite(value)
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(new Date(value))
    : 'the registration deadline';
}

type PaymentTab = {
  opener: unknown;
  closed?: boolean;
  close(): void;
  location: { replace(url: string): void };
  document?: { title: string; body?: { textContent: string | null } | null };
};

function browserWindow(): { open(url: string, target: string): PaymentTab | null } | undefined {
  return (
    globalThis as unknown as { window?: { open(url: string, target: string): PaymentTab | null } }
  ).window;
}

function validatePaymentUrl(url: string): void {
  if (!url.startsWith('https://'))
    throw new Error('The payment link is not available. Please contact an organizer.');
}

/** Reserve a tab during the original tap, before an asynchronous signup save. */
export function reservePaymentTab(): PaymentTab | null {
  if (Platform.OS !== 'web') return null;
  const tab = browserWindow()?.open('about:blank', '_blank') ?? null;
  if (tab) {
    tab.opener = null;
    if (tab.document) {
      tab.document.title = 'Opening payment…';
      if (tab.document.body)
        tab.document.body.textContent =
          'Saving your registration. Your payment page will open shortly. Return to SFVGA after paying.';
    }
  }
  return tab;
}

export function closePaymentTab(tab: PaymentTab | null): void {
  if (tab && !tab.closed) tab.close();
}

export async function openPaymentLink(url: string): Promise<void> {
  validatePaymentUrl(url);
  const browser = browserWindow();
  if (Platform.OS === 'web' && browser) {
    const opened = browser.open(url, '_blank');
    if (!opened)
      throw new Error(
        'Your browser blocked the payment tab. Allow pop-ups for SFVGA, then tap Open payment link again.',
      );
    opened.opener = null;
    return;
  }
  await Linking.openURL(url);
}

/** Navigate the tab reserved by the original tap after the server saves the signup. */
export async function openPaymentLinkAfterSave(
  url: string,
  tab: PaymentTab | null = null,
): Promise<void> {
  validatePaymentUrl(url);
  if (Platform.OS === 'web' && tab && !tab.closed) {
    tab.location.replace(url);
    return;
  }
  await openPaymentLink(url);
}
export function paymentRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
