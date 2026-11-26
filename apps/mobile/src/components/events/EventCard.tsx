import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon } from '@/components/ui/AppIcon';
import { MotionPressable } from '@/components/ui/MotionPressable';

interface EventCardProps {
  title: string;
  dateLabel?: string;
  locationLabel?: string;
  bannerUrl?: string;
  photo?: number;
  /** One-line countdown shown on the large ("What's Next") variant, e.g. "in 5 days". */
  countdownLabel?: string;
  variant?: 'large' | 'medium';
  onPress?: () => void;
  /** Primary CTA rendered inside the large variant (e.g. "View & Register" / "View Tickets"). */
  ctaLabel?: string;
  onCtaPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * Event card used both in the events list (medium) and as the Home "What's Next" hero
 * (large). The large variant keeps the CTA as a separate button to avoid nested touchables.
 */
export const EventCard = React.memo(function EventCard({
  title,
  dateLabel,
  locationLabel,
  bannerUrl,
  photo,
  countdownLabel,
  variant = 'medium',
  onPress,
  ctaLabel,
  onCtaPress,
  accessibilityLabel,
}: EventCardProps) {
  const { colors, typography, spacing, cardBorderRadius } = useTheme();
  const isLarge = variant === 'large';
  const bannerHeight = isLarge ? 184 : 140;
  const bannerRadius = {
    borderTopLeftRadius: cardBorderRadius,
    borderTopRightRadius: cardBorderRadius,
  };
  const hasSeparateCta = isLarge && Boolean(ctaLabel && onCtaPress);

  const source = bannerUrl ? { uri: bannerUrl } : photo;
  const initials = title.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('');
  const largeBody = (
    <>
      {source ? (
        <Image accessible={false} source={source} resizeMode="cover" style={[{ width: '100%', height: bannerHeight }, bannerRadius]} />
      ) : (
        <View style={[styles.largePlaceholder, bannerRadius, { height: bannerHeight, backgroundColor: colors.surfaceMuted }]}>
          <Text style={[typography.headingLarge, { color: colors.brand }]}>{initials}</Text>
        </View>
      )}
      <View style={{ padding: spacing.md, gap: spacing.xs }}>
        {dateLabel && <Text style={[typography.eyebrow, { textTransform: 'uppercase', color: colors.textSecondary }]}>{dateLabel}</Text>}
        <Text style={[isLarge ? typography.headingLarge : typography.headingMedium, { color: colors.textPrimary }]}>{title}</Text>
        {countdownLabel && <Text style={[typography.label, { color: colors.accentStrong }]}>{countdownLabel}</Text>}
        {locationLabel && <Text style={[typography.caption, { color: colors.textSecondary }]}>{locationLabel}</Text>}
      </View>
    </>
  );

  if (hasSeparateCta) {
    return (
      <Card style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }}>
        <MotionPressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? title}
          disabled={!onPress}
          pressedScale={0.99}
        >
          {largeBody}
        </MotionPressable>
        <MotionPressable
          onPress={onCtaPress}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          style={[styles.heroAction, { borderTopColor: colors.border }]}
        >
          <Text style={[typography.label, { color: colors.brand }]}>{ctaLabel}</Text>
          <AppIcon name="arrow-forward" size={20} color={colors.brand} />
        </MotionPressable>
      </Card>
    );
  }

  return (
    <MotionPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={!onPress}
      pressedScale={0.985}
    >
      <Card style={{ marginBottom: spacing.md, padding: 0, overflow: 'hidden' }}>{largeBody}</Card>
    </MotionPressable>
  );
});

const styles = StyleSheet.create({
  countdownRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mediumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderWidth: 1,
    borderRadius: 16,
  },
  thumbnail: { width: 112, height: 112, borderRadius: 10 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  largePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  mediumCopy: { minWidth: 0, flex: 1 },
  compactMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroAction: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingHorizontal: 16 },
});
