import React, { useEffect } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import type { TicketValidateOutcome } from '@/services/functionsClient';
import { useTheme } from '@/providers/ThemeProvider';

interface ScanResultBannerProps {
  outcome: TicketValidateOutcome;
  message: string;
  visible: boolean;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 2000;

/**
 * Full-width colored banner over the viewfinder after each scan (UI/UX §8).
 * Uses success / deepBlue / warning — never error red for routine outcomes.
 */
export function ScanResultBanner({ outcome, message, visible, onDismiss }: ScanResultBannerProps) {
  const { colors, typography } = useTheme();
  const translateY = React.useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    const timer = setTimeout(() => {
      Animated.timing(translateY, { toValue: -120, duration: 200, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) onDismiss();
        },
      );
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, message, onDismiss, translateY]);

  if (!visible) return null;

  const backgroundColor =
    outcome === 'checked_in'
      ? colors.success
      : outcome === 'already_redeemed'
        ? colors.deepBlue
        : colors.warning;

  return (
    <Animated.View
      style={[styles.banner, { backgroundColor, transform: [{ translateY }] }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={[typography.bodyLarge, styles.text]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});
