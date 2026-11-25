'use client';

import { useEffect, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth } from '@/services/firebase';
import { captureAdminReturnFromQuery } from '@/lib/adminAppReturn';
import { isTrustedAdminSessionMessage } from '@/lib/adminSessionMessages';

const ADMIN_READY = 'sfvga-admin-ready';
const ADMIN_SESSION = 'sfvga-admin-session';
const MEMBER_ORIGIN = process.env.NEXT_PUBLIC_MEMBER_WEB_ORIGIN || 'https://sfvga-cabe6.web.app';
const MEMBER_ORIGINS = Array.from(
  new Set([MEMBER_ORIGIN, 'http://localhost:8081']),
);

type NativeBridgeWindow = Window & {
  ReactNativeWebView?: { postMessage: (message: string) => void };
};

export default function AdminSessionPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Waiting for the SFVGA member app…');

  useEffect(() => {
    let used = false;
    captureAdminReturnFromQuery();
    const announceReady = () => {
      const payload = JSON.stringify({ type: ADMIN_READY });
      if (window.parent !== window) {
        MEMBER_ORIGINS.forEach((origin) =>
          window.parent.postMessage({ type: ADMIN_READY }, origin),
        );
      }
      (window as NativeBridgeWindow).ReactNativeWebView?.postMessage(payload);
    };

    const receiveToken = async (data: unknown) => {
      if (used) return;
      const payload =
        typeof data === 'string'
          ? (() => {
              try {
                return JSON.parse(data) as { type?: string; customToken?: string };
              } catch {
                return null;
              }
            })()
          : (data as { type?: string; customToken?: string } | null);
      if (payload?.type !== ADMIN_SESSION || !payload.customToken) return;

      used = true;
      setMessage('Opening the admin dashboard…');
      try {
        await signInWithCustomToken(getFirebaseAuth(), payload.customToken);
        router.replace('/dashboard');
      } catch {
        used = false;
        setMessage('Admin access could not be verified. Return to the member app and try again.');
      }
    };
    const receiveWindow = (event: MessageEvent) => {
      if (
        !isTrustedAdminSessionMessage(
          event,
          window.parent,
          window,
          MEMBER_ORIGINS,
          Boolean((window as NativeBridgeWindow).ReactNativeWebView),
        )
      ) return;
      void receiveToken(event.data);
    };
    const receiveDocument: EventListener = (event) => {
      if (
        event instanceof MessageEvent &&
        (window as NativeBridgeWindow).ReactNativeWebView &&
        event.source === null &&
        event.origin === ''
      ) void receiveToken(event.data);
    };

    window.addEventListener('message', receiveWindow);
    document.addEventListener('message', receiveDocument);
    announceReady();
    const timer = window.setInterval(announceReady, 1000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('message', receiveWindow);
      document.removeEventListener('message', receiveDocument);
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-warmGray50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-deepBlue">SFVGA Admin</h1>
        <p className="mt-3 text-sm text-warmGray400">{message}</p>
        <p className="mt-6 text-sm text-warmGray400">
          Admin access opens securely from Profile in the SFVGA member app.
        </p>
      </div>
    </main>
  );
}
