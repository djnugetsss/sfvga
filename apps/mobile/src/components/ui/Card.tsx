import React from 'react';
import { Platform, View, StyleSheet, type ViewProps } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  const { colors, spacing, cardBorderRadius } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderRadius: cardBorderRadius,
          padding: spacing.md,
          borderColor: colors.border,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 1px 4px rgba(74, 38, 43, 0.025)' },
      default: {
        shadowColor: '#4A262B',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.025,
        shadowRadius: 4,
        elevation: 0,
      },
    }),
  },
});
