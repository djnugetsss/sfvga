import React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { BrandMark } from '@/components/ui/BrandMark';
import { AnimatedScreen } from '@/components/ui/AnimatedScreen';

interface AuthShellProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AnimatedScreen
          style={[
            styles.shell,
            {
              maxWidth: 520,
            },
          ]}
        >
          <View style={[styles.form, { padding: spacing.lg }]}>
            <BrandMark />
            {eyebrow ? (
              <Text
                style={[
                  typography.eyebrow,
                  {
                    color: colors.brand,
                    textTransform: 'uppercase',
                    marginTop: spacing.lg,
                  },
                ]}
              >
                {eyebrow}
              </Text>
            ) : null}
            <Text
              style={[
                typography.displayLarge,
                { color: colors.brand, marginTop: eyebrow ? spacing.sm : spacing.lg },
              ]}
            >
              {title}
            </Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textSecondary, marginTop: spacing.sm },
              ]}
            >
              {subtitle}
            </Text>
            <View style={{ marginTop: spacing.lg }}>{children}</View>
          </View>
        </AnimatedScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { width: '100%', flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  shell: {
    width: '100%',
    alignSelf: 'center',
  },
  form: { flex: 1, justifyContent: 'center' },
});
