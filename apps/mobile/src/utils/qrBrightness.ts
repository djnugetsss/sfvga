import { Platform } from 'react-native';
import * as Brightness from 'expo-brightness';

/** Full brightness while the QR ticket is on screen (UI/UX §7). */
export const QR_DISPLAY_BRIGHTNESS = 1;

export type QrBrightnessMode = 'in_app' | 'system' | 'skipped';

export interface QrBrightnessSession {
  mode: QrBrightnessMode;
  original: number | null;
}

export async function readCurrentBrightness(): Promise<number | null> {
  try {
    return await Brightness.getBrightnessAsync();
  } catch {
    return null;
  }
}

/**
 * Raise screen brightness for QR scanning. Tries in-app brightness first (no permission on iOS).
 * On Android, requests WRITE_SETTINGS only if in-app adjustment fails.
 */
export async function boostBrightnessForQr(): Promise<QrBrightnessSession> {
  const original = await readCurrentBrightness();

  try {
    await Brightness.setBrightnessAsync(QR_DISPLAY_BRIGHTNESS);
    return { mode: 'in_app', original };
  } catch {
    // Fall through to Android system brightness when in-app adjust is unavailable.
  }

  if (Platform.OS !== 'android') {
    return { mode: 'skipped', original };
  }

  try {
    const existing = await Brightness.getPermissionsAsync();
    if (existing.status === 'granted') {
      await Brightness.setSystemBrightnessAsync(QR_DISPLAY_BRIGHTNESS);
      return { mode: 'system', original };
    }
    if (existing.status === 'denied') {
      return { mode: 'skipped', original };
    }

    const requested = await Brightness.requestPermissionsAsync();
    if (requested.status !== 'granted') {
      return { mode: 'skipped', original };
    }

    await Brightness.setSystemBrightnessAsync(QR_DISPLAY_BRIGHTNESS);
    return { mode: 'system', original };
  } catch {
    return { mode: 'skipped', original };
  }
}

/** Restore the member's brightness after dismissing the QR view. */
export async function restoreBrightnessAfterQr(session: QrBrightnessSession): Promise<void> {
  if (session.mode === 'skipped') return;

  if (session.mode === 'in_app' && session.original !== null) {
    try {
      await Brightness.setBrightnessAsync(session.original);
    } catch {
      // QR view already closed; failing to restore must not block dismissal.
    }
    return;
  }

  if (session.mode === 'system' && Platform.OS === 'android') {
    try {
      await Brightness.restoreSystemBrightnessAsync();
    } catch {
      if (session.original !== null) {
        try {
          await Brightness.setBrightnessAsync(session.original);
        } catch {
          // ignore
        }
      }
    }
  }
}
