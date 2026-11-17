import { Platform } from 'react-native';

export const ADMIN_CLOSED = 'sfvga-admin-closed';
export const ADMIN_READY = 'sfvga-admin-ready';
export const ADMIN_SESSION = 'sfvga-admin-session';
const PRODUCTION_ADMIN_ORIGIN = 'https://sfvga-app-admin-web-omega.vercel.app';

function getRuntimeHostname(): string | undefined {
  return (globalThis as unknown as { location?: { hostname?: string } }).location?.hostname;
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

export function resolveAdminOrigin(
  configuredBase: string,
  platform: string,
  runtimeHostname?: string,
): string {
  let configuredHostname: string;
  try {
    configuredHostname = new URL(configuredBase).hostname;
  } catch {
    return PRODUCTION_ADMIN_ORIGIN;
  }
  // A bundled native app cannot reach a server on the Mac through localhost.
  // Production web builds must not inherit a developer's local admin URL either.
  if (
    isLocalHostname(configuredHostname) &&
    (platform !== 'web' || (runtimeHostname && !isLocalHostname(runtimeHostname)))
  ) {
    return PRODUCTION_ADMIN_ORIGIN;
  }
  return configuredBase;
}

export function getAdminSessionUrl(): string {
  const configuredBase = (process.env.EXPO_PUBLIC_ADMIN_WEB_URL || PRODUCTION_ADMIN_ORIGIN).replace(
    /\/$/,
    '',
  );
  const base = resolveAdminOrigin(configuredBase, Platform.OS, getRuntimeHostname());
  return `${base}/session?from=app`;
}

export function getAdminOrigin(): string {
  return new URL(getAdminSessionUrl()).origin;
}

export function isAdminClosedPayload(raw: unknown): boolean {
  if (raw == null) return false;
  if (typeof raw === 'string') {
    if (raw === ADMIN_CLOSED) return true;
    try {
      const parsed = JSON.parse(raw) as { type?: string };
      return parsed?.type === ADMIN_CLOSED;
    } catch {
      return raw.includes(ADMIN_CLOSED);
    }
  }
  if (typeof raw === 'object' && raw !== null && 'type' in raw) {
    return (raw as { type?: string }).type === ADMIN_CLOSED;
  }
  return false;
}

export function isAdminReadyPayload(raw: unknown): boolean {
  if (typeof raw === 'string') {
    if (raw === ADMIN_READY) return true;
    try {
      return (JSON.parse(raw) as { type?: string }).type === ADMIN_READY;
    } catch {
      return false;
    }
  }
  return Boolean(
    raw &&
    typeof raw === 'object' &&
    'type' in raw &&
    (raw as { type?: string }).type === ADMIN_READY,
  );
}
