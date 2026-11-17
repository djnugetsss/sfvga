import React from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface SkeletonProps {
  height: number;
  width?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Soft gray placeholder block for skeleton loading states (UI/UX spec: "skeleton shapes
 * that match the eventual content's layout"). Compose several to mimic cards.
 */
export function Skeleton({ height, width = '100%', radius = 16, style }: SkeletonProps) {
  const { colors, spacing } = useTheme();
  return (
    <View
      accessibilityLabel="Loading"
      style={[
        {
          height,
          width,
          borderRadius: radius,
          marginBottom: spacing.md,
          backgroundColor: colors.surfaceMuted,
        },
        style,
      ]}
    />
  );
}
