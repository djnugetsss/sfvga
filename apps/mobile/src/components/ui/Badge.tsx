import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

type BadgeVariant = 'success' | 'warning' | 'neutral' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const { colors, typography, spacing } = useTheme();

  const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
    success: { bg: colors.successSoft, text: colors.success },
    warning: { bg: colors.warningSoft, text: colors.warning },
    neutral: { bg: colors.surfaceMuted, text: colors.textSecondary },
    info: { bg: colors.brandSoft, text: colors.deepBlue },
  };

  const { bg, text } = variantColors[variant];

  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.badge,
        { backgroundColor: bg, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
      ]}
    >
      <Text style={[typography.caption, { color: text, fontWeight: '700' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
});
