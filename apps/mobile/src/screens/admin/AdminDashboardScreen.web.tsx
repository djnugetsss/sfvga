import React, { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/providers/ThemeProvider';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { functionsClient } from '@/services/functionsClient';
import { AdminDashboardSkeleton } from '@/components/ui/AdminDashboardSkeleton';
import {
  ADMIN_SESSION,
  getAdminOrigin,
  getAdminSessionUrl,
  isAdminClosedPayload,
  isAdminReadyPayload,
} from './adminEmbedShared';

type BrowserMessageEvent = {
  data: unknown;
  origin: string;
  source: { postMessage: (message: unknown, targetOrigin: string) => void } | null;
};
type BrowserWindow = {
  addEventListener: (type: 'message', listener: (event: BrowserMessageEvent) => void) => void;
  removeEventListener: (type: 'message', listener: (event: BrowserMessageEvent) => void) => void;
};

/**
 * Expo web build — react-native-webview is unsupported here.
 * Embed the Next.js admin dashboard in an iframe in the same screen.
 */
export default function AdminDashboardScreen() {
  const { colors, typography, spacing } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const sessionUrl = useMemo(() => getAdminSessionUrl(), []);
  const adminOrigin = useMemo(() => getAdminOrigin(), []);
  const [customToken, setCustomToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const adminBase = adminOrigin;

  const returnToMemberHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Main',
          state: {
            index: 0,
            routes: [{ name: 'Home' }],
          },
        },
      ],
    });
  }, [navigation]);

  useEffect(() => {
    functionsClient.auth
      .createAdminSession()
      .then((result) => setCustomToken(result.customToken))
      .catch(() => {
        setLoading(false);
        setLoadError('Your account does not currently have admin access.');
      });
  }, []);

  useEffect(() => {
    const onMessage = (event: BrowserMessageEvent) => {
      if (event.origin !== adminOrigin) return;
      if (isAdminClosedPayload(event.data)) returnToMemberHome();
      if (customToken && isAdminReadyPayload(event.data)) {
        event.source?.postMessage({ type: ADMIN_SESSION, customToken }, adminOrigin);
      }
    };
    const w = globalThis as unknown as BrowserWindow;
    w.addEventListener('message', onMessage);
    return () => w.removeEventListener('message', onMessage);
  }, [adminOrigin, customToken, returnToMemberHome]);

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.centered, { padding: spacing.lg }]}>
          <Text
            style={[typography.headingMedium, { color: colors.textPrimary, textAlign: 'center' }]}
          >
            Couldn&apos;t open the admin dashboard
          </Text>
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
            ]}
          >
            {loadError}
          </Text>
          <Text
            onPress={returnToMemberHome}
            style={[
              typography.bodyLarge,
              { color: colors.accentStrong, marginTop: spacing.lg, textAlign: 'center' },
            ]}
            accessibilityRole="button"
          >
            Back to Home
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.fill}>
        {loading ? (
          <View
            style={[styles.loadingOverlay, { backgroundColor: colors.background }]}
            pointerEvents="none"
            accessibilityLabel="Loading admin dashboard"
            accessibilityState={{ busy: true }}
          >
            <AdminDashboardSkeleton />
          </View>
        ) : null}
        {createElement('iframe', {
          src: sessionUrl,
          title: 'SFVGA Admin dashboard',
          onLoad: () => setLoading(false),
          onError: () => {
            setLoading(false);
            setLoadError(`Make sure the admin app is running at ${adminBase}`);
          },
          allow: 'clipboard-read; clipboard-write',
          style: {
            border: 'none',
            width: '100%',
            height: '100%',
            display: 'block',
            flex: 1,
            backgroundColor: '#fff',
          },
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
});
