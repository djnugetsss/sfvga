import { useEffect, useRef } from 'react';
import {
  boostBrightnessForQr,
  restoreBrightnessAfterQr,
  type QrBrightnessSession,
} from '@/utils/qrBrightness';

/**
 * Boosts screen brightness while a QR ticket is visible (UI/UX §7), then restores the
 * previous level on dismiss. Permission is requested only when Android needs system
 * brightness; denial is handled silently — the QR still displays normally.
 */
export function useQrBrightnessBoost(active: boolean): void {
  const sessionRef = useRef<QrBrightnessSession | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    void (async () => {
      const session = await boostBrightnessForQr();
      if (!cancelled) {
        sessionRef.current = session;
      } else if (session.mode !== 'skipped') {
        await restoreBrightnessAfterQr(session);
      }
    })();

    return () => {
      cancelled = true;
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) {
        void restoreBrightnessAfterQr(session);
      }
    };
  }, [active]);
}
