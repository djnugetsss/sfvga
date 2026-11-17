import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface InlineRetryBannerProps {
  message?: string;
  onRetry: () => void;
}

/**
 * Non-blocking "couldn't refresh" banner with a Retry link, used across list screens
 * (UI/UX spec §3 / §4). Uses warning amber, never error red, per the design system rule
 * that routine states aren't alarming.
 */
export function InlineRetryBanner({
  message = "Couldn't refresh — showing your last saved info.",
  onRetry,
}: InlineRetryBannerProps) {
  const { colors, typography, spacing, minTapTarget } = useTheme();

  return (
    <View
      style={[styles.banner, { backgroundColor: `${colors.warning}20`, marginBottom: spacing.md }]}
      accessibilityRole="alert"
    >
      <Text
        style={[typography.bodyMedium, { color: colors.textPrimary, flex: 1 }]}
        accessibilityLiveRegion="polite"
      >
        {message}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={{ minHeight: minTapTarget, justifyContent: 'center', paddingHorizontal: spacing.sm }}
      >
        <Text style={[typography.bodyMedium, { color: colors.accentStrong, fontWeight: '600' }]}>
          Retry
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
});
