import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon } from '@/components/ui/AppIcon';
import { MotionPressable } from '@/components/ui/MotionPressable';

interface EventCardProps {
  title: string;
  dateLabel?: string;
  locationLabel?: string;
  bannerUrl?: string;
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
  countdownLabel,
  variant = 'medium',
  onPress,
  ctaLabel,
  onCtaPress,
  accessibilityLabel,
}: EventCardProps) {
  const { colors, typography, spacing, cardBorderRadius } = useTheme();
  const isLarge = variant === 'large';
  const bannerHeight = 164;
  const bannerRadius = {
    borderTopLeftRadius: cardBorderRadius,
    borderTopRightRadius: cardBorderRadius,
  };
  const hasSeparateCta = isLarge && Boolean(ctaLabel && onCtaPress);

  const largeBanner = bannerUrl ? (
    <Image
      accessible={false}
      source={{ uri: bannerUrl }}
      resizeMode="cover"
      style={[{ width: '100%', height: bannerHeight }, bannerRadius]}
    />
  ) : (
    <View
      accessible={false}
      style={[
        styles.largePlaceholder,
        { width: '100%', height: bannerHeight, backgroundColor: colors.surfaceMuted },
        bannerRadius,
      ]}
    >
      <Text style={[typography.headingLarge, { color: colors.brand }]}>SFVGA</Text>
    </View>
  );

  const largeBody = (
    <>
      {largeBanner}
      <View style={{ padding: spacing.md }}>
        {isLarge && countdownLabel ? (
          <View style={styles.countdownRow}>
            <AppIcon name="time-outline" size={16} color={colors.brand} />
            <Text style={[typography.label, { color: colors.brand }]}>{countdownLabel}</Text>
          </View>
        ) : null}

        <Text
          numberOfLines={2}
          style={[
            typography.headingLarge,
            { color: colors.textPrimary, marginTop: countdownLabel ? spacing.sm : 0 },
          ]}
        >
          {title}
        </Text>

        {dateLabel ? (
          <View style={[styles.metaRow, { marginTop: spacing.md }]}>
            <AppIcon name="calendar-outline" size={16} color={colors.brand} />
            <Text
              numberOfLines={1}
              style={[typography.bodyMedium, { color: colors.textSecondary, flex: 1 }]}
            >
              {dateLabel}
            </Text>
          </View>
        ) : null}

        {locationLabel ? (
          <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
            <AppIcon name="location-outline" size={16} color={colors.textSecondary} />
            <Text
              numberOfLines={1}
              style={[typography.bodyMedium, { color: colors.textSecondary, flex: 1 }]}
            >
              {locationLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );

  if (!isLarge) {
    const thumbnail = bannerUrl ? (
      <Image
        source={{ uri: bannerUrl }}
        resizeMode="cover"
        style={styles.thumbnail}
        accessible={false}
      />
    ) : (
      <View
        style={[styles.thumbnail, styles.placeholder, { backgroundColor: colors.surfaceMuted }]}
      >
        <Text style={[typography.headingMedium, { color: colors.deepBlue }]}>SF</Text>
      </View>
    );
    return (
      <MotionPressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        disabled={!onPress}
        pressedScale={0.985}
      >
        <View
          style={[
            styles.mediumCard,
            { marginBottom: spacing.xs, borderBottomColor: colors.border },
          ]}
        >
          {thumbnail}
          <View style={styles.mediumCopy}>
            <Text
              numberOfLines={2}
              style={[typography.headingMedium, { color: colors.textPrimary }]}
            >
              {title}
            </Text>
            {dateLabel ? (
              <View style={[styles.compactMeta, { marginTop: spacing.sm }]}>
                <AppIcon name="calendar-outline" size={15} color={colors.brand} />
                <Text
                  numberOfLines={1}
                  style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}
                >
                  {dateLabel}
                </Text>
              </View>
            ) : null}
            {locationLabel ? (
              <View style={[styles.compactMeta, { marginTop: 5 }]}>
                <AppIcon name="location-outline" size={15} color={colors.textSecondary} />
                <Text
                  numberOfLines={1}
                  style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}
                >
                  {locationLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <AppIcon name="chevron-forward" size={17} color={colors.textSecondary} />
        </View>
      </MotionPressable>
    );
  }

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
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          <Button title={ctaLabel!} onPress={onCtaPress!} icon="arrow-forward" />
        </View>
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
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbnail: { width: 84, height: 76, borderRadius: 10 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  largePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  mediumCopy: { minWidth: 0, flex: 1 },
  compactMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
