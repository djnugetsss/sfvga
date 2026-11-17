import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Network from 'expo-network';
import { useTheme } from '@/providers/ThemeProvider';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScanTargetOverlay } from '@/components/scanner/ScanTargetOverlay';
import { ScanResultBanner } from '@/components/scanner/ScanResultBanner';
import { useActiveStaffRoles } from '@/hooks/useActiveStaffRoles';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useEventCheckInCount } from '@/hooks/useEventCheckInCount';
import { functionsClient, type TicketValidateResponse } from '@/services/functionsClient';
import { pulseForScanOutcome } from '@/utils/scanHaptics';
import { isNetworkFailure } from '@/utils/errors';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useQueryClient } from '@tanstack/react-query';
import { AppIcon } from '@/components/ui/AppIcon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { hasPermanentScannerAccess } from '@/utils/scannerAccess';

type ScannerRoute = RouteProp<RootStackParamList, 'Scanner'>;

/**
 * Check-in scanner (UI/UX §8). Access comes from either a permanent organization permission or
 * an event assignment during its active window. Every scan is still authorized and validated
 * server-side via tickets_validate; the client never decrypts QR payloads locally.
 */
export default function ScannerScreen() {
  const { colors, typography, spacing } = useTheme();
  const route = useRoute<ScannerRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { eventId, eventName } = route.params;

  const queryClient = useQueryClient();
  const { data: staffRoles, isLoading: staffLoading } = useActiveStaffRoles();
  const adminAccessQuery = useAdminAccess();
  const { data: checkedInCount = 0 } = useEventCheckInCount(eventId);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [torchOn, setTorchOn] = useState(false);
  const [validating, setValidating] = useState(false);
  const [offline, setOffline] = useState(false);
  const [banner, setBanner] = useState<TicketValidateResponse | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  const processingRef = useRef(false);
  const lastScanRef = useRef<string | null>(null);

  const canScan = useMemo(
    () =>
      hasPermanentScannerAccess(adminAccessQuery.data) ||
      (staffRoles?.some((role) => role.eventId === eventId && role.canScan) ?? false),
    [adminAccessQuery.data, staffRoles, eventId],
  );

  const refreshConnectivity = useCallback(async () => {
    const state = await Network.getNetworkStateAsync();
    const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
    setOffline(!connected);
    return connected;
  }, []);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    setBanner(null);
    lastScanRef.current = null;
  }, []);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (processingRef.current || offline || showBanner) return;
      if (!data || lastScanRef.current === data) return;

      processingRef.current = true;
      lastScanRef.current = data;
      setValidating(true);

      try {
        const online = await refreshConnectivity();
        if (!online) return;

        const result = await functionsClient.tickets.validate({ scannedString: data, eventId });
        setBanner(result);
        setShowBanner(true);
        pulseForScanOutcome(result.outcome);
        if (result.outcome === 'checked_in') {
          // Optimistic bump so the top-bar counter moves immediately, then reconcile.
          queryClient.setQueryData<number>(['checkInCount', eventId], (prev) => (prev ?? 0) + 1);
          void queryClient.invalidateQueries({ queryKey: ['checkInCount', eventId] });
        }
      } catch (error) {
        if (isNetworkFailure(error)) {
          setOffline(true);
        } else {
          const fallback: TicketValidateResponse = {
            outcome: 'invalid',
            message: 'Not valid — please see an organizer.',
          };
          setBanner(fallback);
          setShowBanner(true);
          pulseForScanOutcome('invalid');
        }
      } finally {
        setValidating(false);
        processingRef.current = false;
      }
    },
    [eventId, offline, queryClient, refreshConnectivity, showBanner],
  );

  if (staffLoading || adminAccessQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (!canScan) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background, padding: spacing.lg }]}
      >
        <EmptyState
          icon="shield-outline"
          title="Scanner unavailable"
          message="You don't have permission to scan tickets for this event, or your shift hasn't started yet."
        />
        <Button
          title="Go back"
          icon="arrow-back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing.lg }}
        />
      </SafeAreaView>
    );
  }

  if (!cameraPermission) {
    return <LoadingSpinner />;
  }

  if (!cameraPermission.granted) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background, padding: spacing.lg }]}
      >
        <EmptyState
          icon="camera-outline"
          title="Camera access needed"
          message="SFVGA needs your camera to scan event tickets at check-in."
        />
        <Button
          title="Allow camera"
          icon="camera-outline"
          onPress={() => requestCameraPermission()}
          style={{ marginTop: spacing.lg }}
        />
        {!cameraPermission.canAskAgain ? (
          <TouchableOpacity
            onPress={() => Linking.openSettings()}
            style={{ marginTop: spacing.md, minHeight: 44, justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Open Settings to enable camera access"
          >
            <Text style={[typography.bodyLarge, { color: colors.accentStrong }]}>
              Open Settings
            </Text>
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={offline || validating || showBanner ? undefined : handleBarcodeScanned}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.topRow}>
            <View style={styles.eventCopy}>
              <Text style={[typography.eyebrow, styles.topEyebrow]}>CHECK-IN SCANNER</Text>
              <Text style={[typography.bodyLarge, styles.topTitle]} numberOfLines={1}>
                {eventName}
              </Text>
            </View>
            <View style={styles.countPill}>
              <Text style={[typography.bodyMedium, styles.counter]}>{checkedInCount}</Text>
              <Text style={[typography.bodyMedium, styles.countLabel]}>checked in</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScanTargetOverlay validating={validating} />

      {offline ? (
        <View style={styles.offlineOverlay}>
          <Text style={[typography.headingMedium, styles.offlineTitle]}>No connection</Text>
          <Text style={[typography.bodyLarge, styles.offlineBody]}>
            Scanning is paused. Try moving closer to the entrance or check your wifi.
          </Text>
          <Button
            title="Retry"
            onPress={() => void refreshConnectivity()}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      ) : null}

      {banner && showBanner ? (
        <ScanResultBanner
          outcome={banner.outcome}
          message={banner.message}
          visible={showBanner}
          onDismiss={dismissBanner}
        />
      ) : null}

      <SafeAreaView style={styles.bottomBar} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => setTorchOn((on) => !on)}
          style={styles.flashButton}
          accessibilityRole="button"
          accessibilityLabel={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
        >
          <AppIcon name={torchOn ? 'flash' : 'flash-outline'} size={20} color="#FFFFFF" />
          <Text style={[typography.bodyMedium, styles.flashLabel]}>
            {torchOn ? 'Flashlight on' : 'Flashlight'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventCopy: { flex: 1 },
  topEyebrow: { color: 'rgba(255,255,255,0.7)', marginBottom: 3 },
  topTitle: { color: '#FFFFFF', fontWeight: '700' },
  countPill: {
    minWidth: 84,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  counter: { color: '#FFFFFF', fontWeight: '800' },
  countLabel: { color: 'rgba(255,255,255,0.75)' },
  offlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 15,
  },
  offlineTitle: { color: '#FFFFFF', textAlign: 'center' },
  offlineBody: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 12 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  flashButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flashLabel: { color: '#FFFFFF', fontWeight: '600' },
});
