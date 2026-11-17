import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon } from './AppIcon';
import { MotionPressable } from './MotionPressable';

interface NavigationBackButtonProps {
  onPress: () => void;
  label?: string;
}

/** A consistent back control that can also provide a safe fallback for direct links. */
export function NavigationBackButton({ onPress, label = 'Go back' }: NavigationBackButtonProps) {
  const { colors, minTapTarget } = useTheme();

  return (
    <MotionPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      pressedScale={0.9}
      style={[styles.button, { width: minTapTarget, height: minTapTarget }]}
    >
      <AppIcon name="arrow-back" size={23} color={colors.textPrimary} />
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    borderRadius: 999,
  },
});
