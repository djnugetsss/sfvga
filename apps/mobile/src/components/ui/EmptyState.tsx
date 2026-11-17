import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import Button from './Button';
import { AppIcon, type AppIconName } from './AppIcon';

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  title?: string;
  icon?: AppIconName;
}

export function EmptyState({
  message,
  actionLabel,
  onAction,
  title = 'Nothing here yet',
  icon = 'information-circle-outline',
}: EmptyStateProps) {
  const { colors, typography, spacing, textAccessibilityProps } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          padding: spacing.lg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.iconTile, { borderColor: colors.gold }]}>
        <AppIcon name={icon} size={24} color={colors.accentStrong} />
      </View>
      <Text
        style={[
          typography.headingMedium,
          { color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md },
        ]}
        {...textAccessibilityProps}
      >
        {title}
      </Text>
      <Text
        accessible
        accessibilityRole="text"
        style={[
          typography.bodyMedium,
          { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
        ]}
        {...textAccessibilityProps}
      >
        {message}
      </Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.md }}>
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
