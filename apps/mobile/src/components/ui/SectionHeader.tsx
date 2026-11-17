import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon } from './AppIcon';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) {
  const { colors, typography, spacing, minTapTarget } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={[typography.headingMedium, { color: colors.brand }]}>{title}</Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={[styles.action, { minHeight: minTapTarget, paddingLeft: spacing.md }]}
        >
          <Text style={[typography.label, { color: colors.brand }]}>{actionLabel}</Text>
          <AppIcon name="arrow-forward" size={15} color={colors.brand} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  copy: { flex: 1 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
