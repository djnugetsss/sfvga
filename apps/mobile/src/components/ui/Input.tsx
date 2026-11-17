import React from 'react';
import { View, TextInput, Text, StyleSheet, type TextInputProps } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const { colors, typography, spacing, minTapTarget } = useTheme();

  return (
    <View style={styles.container}>
      {label ? (
        <Text
          accessibilityElementsHidden={false}
          style={[typography.bodyMedium, { color: colors.textPrimary, marginBottom: spacing.xs }]}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={label ?? props.placeholder}
        placeholderTextColor={colors.textSecondary}
        style={[
          typography.bodyLarge,
          styles.input,
          {
            minHeight: props.multiline ? 112 : minTapTarget,
            textAlignVertical: props.multiline ? 'top' : 'center',
            borderColor: error ? colors.error : colors.border,
            color: colors.textPrimary,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.md,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text style={[typography.caption, { color: colors.error, marginTop: spacing.xs }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
  },
});
