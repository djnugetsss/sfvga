import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon, type AppIconName } from './AppIcon';

interface HeaderAction {
  icon: AppIconName;
  label: string;
  onPress: () => void;
  badge?: number;
}

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: HeaderAction;
}

export function ScreenHeader({ eyebrow, title, subtitle, action }: ScreenHeaderProps) {
  const { colors, typography, spacing, minTapTarget } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? (
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={[typography.eyebrow, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5 }]}>{eyebrow}</Text>
            <View style={{ width: 34, height: 2, backgroundColor: colors.accent, marginTop: spacing.xs }} />
          </View>
        ) : null}
        <Text
          style={[
            typography.displayLarge,
            { color: colors.brand, marginTop: eyebrow ? spacing.xs : 0 },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.xs }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            action.badge ? `${action.label}, ${action.badge} unread` : action.label
          }
          onPress={action.onPress}
          activeOpacity={0.75}
          style={[
            styles.action,
            {
              width: minTapTarget,
              height: minTapTarget,
              borderColor: colors.border,
              backgroundColor: 'transparent',
            },
          ]}
        >
          <AppIcon name={action.icon} color={colors.textPrimary} size={20} />
          {action.badge ? (
            <View style={[styles.badge, { backgroundColor: colors.brand }]}>
              <Text style={[styles.badgeText, { color: colors.white }]}>
                {action.badge > 9 ? '9+' : action.badge}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 8,
  },
  copy: { flex: 1 },
  action: {
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -3,
    top: -3,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
