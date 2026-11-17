/**
 * When the admin dashboard is opened inside the member app (WebView / iframe),
 * sign-out must close that view and return to member Home — not stay on /login.
 */
const RETURN_APP_KEY = 'sfvga_return_app';
const EMBEDDED_KEY = 'sfvga_embedded_in_app';
const DEFAULT_RETURN = 'sfvga-combined://admin-closed';
export const ADMIN_CLOSED_MESSAGE = 'sfvga-admin-closed';

export function captureAdminReturnFromQuery(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('from') === 'app') {
    sessionStorage.setItem(EMBEDDED_KEY, '1');
    const returnApp = params.get('returnApp')?.trim() || DEFAULT_RETURN;
    sessionStorage.setItem(RETURN_APP_KEY, returnApp);
  }
}

export function isEmbeddedInMemberApp(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(EMBEDDED_KEY) === '1' || !!sessionStorage.getItem(RETURN_APP_KEY);
}

export function getAdminReturnAppUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(RETURN_APP_KEY);
}

export function clearAdminReturnAppUrl(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(RETURN_APP_KEY);
  sessionStorage.removeItem(EMBEDDED_KEY);
}

/**
 * Tell the host member app to leave the admin view and show Home.
 * Uses React Native WebView postMessage, then parent iframe postMessage, then deep link.
 */
export function notifyMemberAppClosed(): boolean {
  if (!isEmbeddedInMemberApp()) return false;

  const returnApp = getAdminReturnAppUrl() || DEFAULT_RETURN;
  clearAdminReturnAppUrl();

  const payload = { type: ADMIN_CLOSED_MESSAGE };

  try {
    const rn = (
      window as unknown as { ReactNativeWebView?: { postMessage: (msg: string) => void } }
    ).ReactNativeWebView;
    if (rn?.postMessage) {
      rn.postMessage(JSON.stringify(payload));
      return true;
    }
  } catch {
    /* continue */
  }

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, '*');
      return true;
    }
  } catch {
    /* continue */
  }

  try {
    window.location.href = returnApp;
    return true;
  } catch {
    return false;
  }
}

/** @deprecated use notifyMemberAppClosed */
export function redirectToMemberAppIfEmbedded(): boolean {
  return notifyMemberAppClosed();
}
