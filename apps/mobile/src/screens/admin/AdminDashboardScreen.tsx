import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebView as WebViewHandle } from 'react-native-webview';
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

/**
 * iOS / Android — in-app WebView for the Next.js admin dashboard.
 * (Expo web uses AdminDashboardScreen.web.tsx with an iframe instead.)
 */
export default function AdminDashboardScreen() {
  const { colors, typography, spacing } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const sessionUrl = useMemo(() => getAdminSessionUrl(), []);
  const adminOrigin = useMemo(() => getAdminOrigin(), []);
  const webViewRef = useRef<WebViewHandle>(null);
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
        <WebView
          ref={webViewRef}
          source={{ uri: sessionUrl }}
          style={styles.webview}
          onMessage={(event) => {
            const data = event.nativeEvent.data;
            if (isAdminClosedPayload(data)) returnToMemberHome();
            if (customToken && isAdminReadyPayload(data)) {
              webViewRef.current?.postMessage(JSON.stringify({ type: ADMIN_SESSION, customToken }));
            }
          }}
          onShouldStartLoadWithRequest={(request) => {
            const url = request.url || '';
            if (url.startsWith('sfvga-combined://') || url.startsWith('sfvga://')) {
              returnToMemberHome();
              return false;
            }
            return (
              url === 'about:blank' || url === adminOrigin || url.startsWith(`${adminOrigin}/`)
            );
          }}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setLoadError(`Make sure the admin app is running at ${adminBase}`);
          }}
          onHttpError={() => {
            setLoading(false);
            setLoadError(`Make sure the admin app is running at ${adminBase}`);
          }}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          javaScriptEnabled
          domStorageEnabled
          // react-native-webview opens URLs outside this list in the system browser
          // before onShouldStartLoadWithRequest can reject them. Let our handler
          // decide every navigation so admin links never launch Safari by accident.
          originWhitelist={['*']}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
});
