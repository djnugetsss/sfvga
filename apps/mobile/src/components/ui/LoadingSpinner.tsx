import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Skeleton } from './Skeleton';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
}

export function LoadingSpinner({ size = 'large' }: LoadingSpinnerProps) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading content"
      accessibilityState={{ busy: true }}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Skeleton width="48%" height={size === 'small' ? 18 : 28} />
        <Skeleton width="76%" height={size === 'small' ? 12 : 16} />
        <Skeleton height={size === 'small' ? 48 : 124} radius={18} />
        {size === 'large' ? <Skeleton height={124} radius={18} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center' },
});
