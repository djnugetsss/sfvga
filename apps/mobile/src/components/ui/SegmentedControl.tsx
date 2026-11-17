import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { MotionPressable } from './MotionPressable';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Explicit screen-reader name (e.g. "Upcoming events" rather than just "Upcoming"). */
  accessibilityLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Simple two-or-more option segmented control (UI/UX spec §4). Large tap targets, the
 * Active segments use a quiet branded surface without competing with primary actions.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors, typography, buttonBorderRadius } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceMuted,
          borderRadius: buttonBorderRadius,
          borderColor: colors.border,
        },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <MotionPressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            pressedScale={0.97}
            style={[
              styles.segment,
              {
                borderRadius: buttonBorderRadius - 2,
                backgroundColor: selected ? colors.brandSoft : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                typography.bodyMedium,
                {
                  color: selected ? colors.brand : colors.textSecondary,
                  fontWeight: '700',
                  textAlign: 'center',
                },
              ]}
            >
              {option.label}
            </Text>
          </MotionPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: {
        elevation: 0,
      },
    }),
  },
});
