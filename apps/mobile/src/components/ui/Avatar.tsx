import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface AvatarProps {
  name?: string;
  photoUrl?: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Circular profile avatar (UI/UX §11). Shows the member's photo when available, otherwise
 * falls back to the first initial of their name on a deep-blue circle.
 */
export function Avatar({ name, photoUrl, size = 88, backgroundColor, textColor }: AvatarProps) {
  const { colors, typography } = useTheme();
  const initial = name?.trim().charAt(0).toUpperCase() || '?';
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        accessibilityLabel={name ? `${name}'s profile photo` : 'Profile photo'}
        style={[dimensions, { backgroundColor: colors.warmGray50 }]}
      />
    );
  }

  return (
    <View
      accessibilityLabel={name ? `${name}'s profile initial` : 'Profile'}
      style={[styles.fallback, dimensions, { backgroundColor: backgroundColor ?? colors.deepBlue }]}
    >
      <Text
        style={[
          typography.displayLarge,
          { color: textColor ?? colors.white, fontSize: size / 2.4 },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
