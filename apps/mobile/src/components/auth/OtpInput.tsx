import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface OtpInputProps {
  digits: string[];
  onChange: (digits: string[]) => void;
  onComplete: (code: string) => void;
  error?: string;
  disabled?: boolean;
}

/** Six real inputs: large targets, screen-reader labels, SMS autofill, and paste support. */
export function OtpInput({ digits, onChange, onComplete, error, disabled }: OtpInputProps) {
  const { colors, typography, spacing } = useTheme();
  const inputs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (error) inputs.current[0]?.focus();
  }, [error]);

  const changeDigit = (index: number, text: string) => {
    const entered = text.replace(/\D/g, '');
    const next = [...digits];
    if (entered.length > 1) {
      // iOS/Android one-time-code autofill and a full clipboard paste can arrive at once.
      const start = entered.length === 6 ? 0 : index;
      entered
        .slice(0, 6 - start)
        .split('')
        .forEach((digit, offset) => {
          next[start + offset] = digit;
        });
      inputs.current[Math.min(start + entered.length, 5)]?.focus();
    } else {
      next[index] = entered;
      if (entered && index < 5) inputs.current[index + 1]?.focus();
    }
    onChange(next);
    if (next.every((digit) => digit.length === 1)) onComplete(next.join(''));
  };

  return (
    <View>
      <Text
        style={[typography.bodyMedium, { color: colors.textPrimary, marginBottom: spacing.sm }]}
      >
        Verification code
      </Text>
      <View style={[styles.row, { gap: 5 }]}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(input) => {
              inputs.current[index] = input;
            }}
            value={digit}
            onChangeText={(text) => changeDigit(index, text)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
                const next = [...digits];
                next[index - 1] = '';
                onChange(next);
                inputs.current[index - 1]?.focus();
              }
            }}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
            selectTextOnFocus
            keyboardType="number-pad"
            autoFocus={index === 0}
            textContentType={index === 0 ? 'oneTimeCode' : 'none'}
            autoComplete={index === 0 ? 'sms-otp' : 'off'}
            maxLength={12}
            editable={!disabled}
            accessibilityLabel={`Verification code digit ${index + 1} of 6`}
            accessibilityHint="Enter one digit; you can also paste the full code"
            style={[
              typography.headingMedium,
              styles.box,
              {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                borderColor: error
                  ? colors.error
                  : focusedIndex === index
                    ? colors.brand
                    : colors.border,
                borderWidth: focusedIndex === index ? 2 : 1,
              },
            ]}
          />
        ))}
      </View>
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[typography.bodyMedium, { color: colors.error, marginTop: spacing.sm }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', width: '100%' },
  box: {
    flex: 1,
    minWidth: 0,
    height: 58,
    borderRadius: 12,
    textAlign: 'center',
    paddingHorizontal: 0,
  },
});
