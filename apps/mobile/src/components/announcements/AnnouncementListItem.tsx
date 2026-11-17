import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon } from '@/components/ui/AppIcon';
import { MotionPressable } from '@/components/ui/MotionPressable';

interface AnnouncementListItemProps {
  title: string;
  body: string;
  timestampLabel?: string;
  onPress?: () => void;
}

/**
 * A single announcement row (UI/UX spec §3): title, first line of the body, and a
 * timestamp. Reused by the Home feed and the full Announcements list screen.
 */
export const AnnouncementListItem = React.memo(function AnnouncementListItem({
  title,
  body,
  timestampLabel,
  onPress,
}: AnnouncementListItemProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <MotionPressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${title}. ${body}`}
      disabled={!onPress}
      pressedScale={0.985}
    >
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={[styles.icon, { backgroundColor: colors.brandSoft }]}>
          <AppIcon name="megaphone-outline" size={18} color={colors.deepBlue} />
        </View>
        <View style={{ minWidth: 0, flex: 1 }}>
          <Text
            style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '700' }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.xs }]}
            numberOfLines={2}
          >
            {body}
          </Text>
          {timestampLabel ? (
            <Text
              style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}
            >
              {timestampLabel}
            </Text>
          ) : null}
        </View>
        {onPress ? <AppIcon name="chevron-forward" size={16} color={colors.textSecondary} /> : null}
      </View>
    </MotionPressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
