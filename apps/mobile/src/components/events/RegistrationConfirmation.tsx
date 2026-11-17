import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { AppIcon } from '@/components/ui/AppIcon';
import Button from '@/components/ui/Button';

interface ConfirmationAction {
  title: string;
  onPress: () => void;
}

export function RegistrationConfirmation({
  title,
  message,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  message: string;
  primaryAction: ConfirmationAction;
  secondaryAction?: ConfirmationAction;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        width: '100%',
        maxWidth: 820,
        padding: spacing.lg,
      }}
    >
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="Registration successful"
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: colors.success,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name="checkmark" size={48} color={colors.white} />
      </View>
      <Text
        accessibilityRole="header"
        style={[
          typography.headingLarge,
          { color: colors.textPrimary, marginTop: spacing.lg, textAlign: 'center' },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          typography.bodyMedium,
          {
            color: colors.textSecondary,
            marginTop: spacing.sm,
            textAlign: 'center',
            maxWidth: 520,
          },
        ]}
      >
        {message}
      </Text>
      <View style={{ width: '100%', maxWidth: 420, marginTop: spacing.xl, gap: spacing.sm }}>
        <Button title={primaryAction.title} onPress={primaryAction.onPress} />
        {secondaryAction ? (
          <Button
            title={secondaryAction.title}
            variant="secondary"
            onPress={secondaryAction.onPress}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}
