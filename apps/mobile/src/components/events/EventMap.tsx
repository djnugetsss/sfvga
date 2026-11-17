import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface EventMapProps {
  lat: number;
  lng: number;
  venueName: string;
  address?: string;
}

function buildMapsUrl(lat: number, lng: number, venueName: string): string {
  const label = encodeURIComponent(venueName);
  if (Platform.OS === 'ios') {
    return `maps:0,0?q=${label}@${lat},${lng}`;
  }
  if (Platform.OS === 'android') {
    return `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Map thumbnail that opens native Maps for directions (UI/UX §5). Uses a simple placeholder
 * tile until a map SDK is added — the tap target and deep link match the documented behavior.
 */
export function EventMap({ lat, lng, venueName, address }: EventMapProps) {
  const { colors, typography, spacing, minTapTarget } = useTheme();

  const openDirections = useCallback(() => {
    void Linking.openURL(buildMapsUrl(lat, lng, venueName));
  }, [lat, lng, venueName]);

  return (
    <TouchableOpacity
      onPress={openDirections}
      accessibilityRole="button"
      accessibilityLabel={`Open directions to ${venueName}`}
      accessibilityHint="Opens your maps app"
      style={[styles.placeholder, { backgroundColor: colors.warmGray50, minHeight: minTapTarget }]}
    >
      <View style={{ padding: spacing.md, alignItems: 'center' }}>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
          Tap for directions
        </Text>
        <Text
          style={[
            typography.bodyLarge,
            { color: colors.textPrimary, marginTop: spacing.xs, textAlign: 'center' },
          ]}
        >
          {venueName}
        </Text>
        {address ? (
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
            ]}
          >
            {address}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: 12,
    justifyContent: 'center',
  },
});
