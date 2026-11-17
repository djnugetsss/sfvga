import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface ScanTargetOverlayProps {
  validating?: boolean;
}

/** Rounded square scan target overlay centered on the camera viewfinder (UI/UX §8). */
export function ScanTargetOverlay({ validating }: ScanTargetOverlayProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.target}>
        {validating ? (
          <View
            style={[styles.validationPlaceholder, { backgroundColor: colors.surfaceMuted }]}
            accessibilityLabel="Checking ticket"
            accessibilityState={{ busy: true }}
          >
            <View style={[styles.validationLine, { backgroundColor: colors.surface }]} />
            <View style={[styles.validationLineShort, { backgroundColor: colors.surface }]} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const TARGET = 240;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  target: {
    width: TARGET,
    height: TARGET,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationPlaceholder: { width: 150, padding: 14, borderRadius: 12, gap: 8 },
  validationLine: { height: 12, width: '100%', borderRadius: 6 },
  validationLineShort: { height: 12, width: '65%', borderRadius: 6 },
});
