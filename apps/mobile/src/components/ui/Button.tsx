import React from 'react';
import {
  Text,
  StyleSheet,
  Platform,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon, type AppIconName } from './AppIcon';
import { MotionPressable } from './MotionPressable';

type ButtonVariant = 'primary' | 'secondary' | 'text';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: AppIconName;
  style?: StyleProp<ViewStyle>;
}

export default function Button({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  icon,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const {
    colors,
    typography,
    primaryButtonHeight,
    buttonBorderRadius,
    minTapTarget,
    textAccessibilityProps,
  } = useTheme();

  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const height = isPrimary ? primaryButtonHeight : minTapTarget;

  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          minHeight: height,
          borderRadius: buttonBorderRadius,
          backgroundColor: isPrimary ? colors.primary : 'transparent',
          borderWidth: isSecondary ? 1 : 0,
          borderColor: isSecondary ? colors.brand : undefined,
          opacity: disabled || loading ? 0.6 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          ...(isPrimary
            ? Platform.select({
                web: { boxShadow: '0 2px 5px rgba(74, 38, 43, 0.1)' },
                default: {
                  shadowColor: colors.brand,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 5,
                  elevation: 1,
                },
              })
            : undefined),
        },
        style,
      ]}
      {...props}
    >
      <>
        {icon ? (
          <AppIcon name={icon} color={isPrimary ? colors.onPrimary : colors.brand} size={19} />
        ) : null}
        <Text
          style={[
            typography.bodyMedium,
            {
              color:
                variant === 'text' ? colors.brand : isPrimary ? colors.onPrimary : colors.brand,
              fontWeight: '600',
              letterSpacing: 0.15,
              textAlign: 'center',
              flexShrink: 1,
            },
          ]}
          {...textAccessibilityProps}
        >
          {loading ? `${title}…` : title}
        </Text>
      </>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
