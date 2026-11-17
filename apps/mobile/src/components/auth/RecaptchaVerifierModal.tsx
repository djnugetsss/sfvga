import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { RecaptchaVerifier, type ApplicationVerifier } from 'firebase/auth';
import { firebaseConfig, getFirebaseAuth } from '@/services/firebase';
import { useTheme } from '@/providers/ThemeProvider';

/**
 * reCAPTCHA app verifier for Firebase JS SDK phone auth.
 *
 * The Firebase JS SDK requires an ApplicationVerifier (a solved reCAPTCHA token) before it
 * will send an SMS. The strategy differs per platform:
 *   • Native (iOS/Android): there is no DOM, so we render Google/Firebase reCAPTCHA inside a
 *     WebView and hand the resulting token back to signInWithPhoneNumber. This mirrors the
 *     (now archived) expo-firebase-recaptcha approach.
 *   • Web: `react-native-webview` has no web implementation, and the browser already has a
 *     DOM, so we use the SDK's built-in invisible `RecaptchaVerifier` bound to a hidden node.
 *
 * TODO(Phase 1 — real project): phone auth needs a configured Firebase project (Phone sign-in
 * enabled, reCAPTCHA enabled, and — for web — `localhost` plus your domains added to the Auth
 * "Authorized domains" list). Native phone auth also requires a custom dev build (not Expo Go).
 */
export interface RecaptchaVerifierHandle extends ApplicationVerifier {
  type: 'recaptcha';
  verify(): Promise<string>;
  /**
   * Firebase Auth calls this after `verify()` (JS SDK phone-auth flow).
   * Our wrappers must implement it — a bare `{ type, verify }` object throws
   * "verifier._reset is not a function".
   */
  _reset(): void;
}

const WEB_CONTAINER_ID = 'sfvga-recaptcha-container';

type RecaptchaVerifierWithReset = RecaptchaVerifier & { _reset?: () => void };

function getDomDocument(): {
  getElementById: (id: string) => { innerHTML: string; remove: () => void } | null;
  createElement: (tag: string) => {
    id: string;
    style: Record<string, string>;
  };
  body: { appendChild: (node: unknown) => void };
} | null {
  return (globalThis as { document?: ReturnType<typeof getDomDocument> }).document ?? null;
}

/** Ensure a real DOM host exists — more reliable than RN-web `nativeID` for grecaptcha. */
function ensureWebRecaptchaHost(): void {
  const doc = getDomDocument();
  if (!doc) return;
  if (doc.getElementById(WEB_CONTAINER_ID)) return;

  const el = doc.createElement('div');
  el.id = WEB_CONTAINER_ID;
  // Keep the host in-document but invisible; zero-size / display:none breaks grecaptcha.
  el.style.position = 'fixed';
  el.style.left = '0';
  el.style.bottom = '0';
  el.style.width = '1px';
  el.style.height = '1px';
  el.style.opacity = '0.01';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '-1';
  el.style.overflow = 'hidden';
  doc.body.appendChild(el);
}

function removeWebRecaptchaHost(): void {
  const doc = getDomDocument();
  doc?.getElementById(WEB_CONTAINER_ID)?.remove();
}

/** Web verifier: reuse one invisible RecaptchaVerifier (do not recreate on every attempt). */
const WebRecaptchaVerifier = forwardRef<RecaptchaVerifierHandle>((_props, ref) => {
  const verifierRef = useRef<RecaptchaVerifierWithReset | null>(null);

  const disposeVerifier = () => {
    const current = verifierRef.current;
    verifierRef.current = null;
    if (current) {
      try {
        current.clear();
      } catch {
        /* widget already gone */
      }
    }
    removeWebRecaptchaHost();
  };

  useEffect(() => {
    ensureWebRecaptchaHost();
    return () => {
      disposeVerifier();
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      type: 'recaptcha' as const,
      verify: async () => {
        ensureWebRecaptchaHost();

        if (!verifierRef.current) {
          verifierRef.current = new RecaptchaVerifier(getFirebaseAuth(), WEB_CONTAINER_ID, {
            size: 'invisible',
          });
        }

        return verifierRef.current.verify();
      },
      _reset: () => {
        // Forward to the SDK widget reset — do NOT clear/recreate or grecaptcha throws
        // "reCAPTCHA has already been rendered in this element".
        const current = verifierRef.current;
        if (current && typeof current._reset === 'function') {
          current._reset();
          return;
        }
        // Fallback if the private API is unavailable: full dispose, next verify recreates.
        disposeVerifier();
        ensureWebRecaptchaHost();
      },
    }),
    [],
  );

  // DOM host is created in useEffect; nothing to render in the RN tree.
  return null;
});

WebRecaptchaVerifier.displayName = 'WebRecaptchaVerifier';

function buildRecaptchaHtml(): string {
  const config = JSON.stringify({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });
  return `<!DOCTYPE html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#F7F5F2;">
    <div id="recaptcha-container"></div>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
    <script>
      function post(msg) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(msg));
        }
      }
      try {
        firebase.initializeApp(${config});
        var verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
          size: 'normal',
          callback: function (token) { post({ type: 'token', token: token }); },
          'expired-callback': function () { post({ type: 'expired' }); },
          'error-callback': function () { post({ type: 'error' }); }
        });
        verifier.render().catch(function (error) {
          post({ type: 'error', message: String(error && error.message ? error.message : error) });
        });
      } catch (e) {
        post({ type: 'error', message: String(e && e.message ? e.message : e) });
      }
    </script>
  </body>
</html>`;
}

/** Native verifier: reCAPTCHA rendered in a WebView modal. */
const NativeRecaptchaVerifier = forwardRef<RecaptchaVerifierHandle>((_props, ref) => {
  const { colors, typography, spacing } = useTheme();
  const [visible, setVisible] = useState(false);
  const resolverRef = useRef<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  } | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      type: 'recaptcha' as const,
      verify: () =>
        new Promise<string>((resolve, reject) => {
          resolverRef.current = { resolve, reject };
          setVisible(true);
        }),
      _reset: () => {
        // Native WebView widget is recreated when the modal opens again.
      },
    }),
    [],
  );

  const finish = (token?: string, error?: Error) => {
    setVisible(false);
    const resolver = resolverRef.current;
    resolverRef.current = null;
    if (!resolver) return;
    if (token) resolver.resolve(token);
    else resolver.reject(error ?? new Error('reCAPTCHA was not completed.'));
  };

  const handleMessage = (raw: string) => {
    try {
      const data = JSON.parse(raw) as { type: string; token?: string; message?: string };
      if (data.type === 'token' && data.token) finish(data.token);
      else if (data.type === 'expired') {
        /* wait for the user to solve again */
      } else if (data.type === 'error') {
        finish(undefined, new Error(data.message ?? 'reCAPTCHA failed. Please try again.'));
      }
    } catch {
      /* ignore malformed messages */
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => finish()}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { padding: spacing.md }]}>
          <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>
            Verify you&apos;re human
          </Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => finish()}>
            <Text style={[typography.bodyLarge, { color: colors.deepBlue }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <WebView
          originWhitelist={['*']}
          // Firebase checks the page origin during phone verification. An inline
          // page without a base URL has an opaque origin and leaves iOS blank.
          source={{ html: buildRecaptchaHtml(), baseUrl: 'https://sfvga-cabe6.web.app' }}
          onMessage={(event) => handleMessage(event.nativeEvent.data)}
          onError={(event) => finish(undefined, new Error(event.nativeEvent.description))}
          javaScriptEnabled
          style={styles.webview}
        />
      </SafeAreaView>
    </Modal>
  );
});

NativeRecaptchaVerifier.displayName = 'NativeRecaptchaVerifier';

export const RecaptchaVerifierModal =
  Platform.OS === 'web' ? WebRecaptchaVerifier : NativeRecaptchaVerifier;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  webview: { flex: 1 },
});
