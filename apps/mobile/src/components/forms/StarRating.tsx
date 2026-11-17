// Large tappable star row for the feedback prompt (UI/UX §13). Each star is an independent
// tap target with its own accessible label ("1 star" … "5 stars").

import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  max?: number;
}

export function StarRating({ value, onChange, max = 5 }: StarRatingProps) {
  const { colors, typography, spacing, minTapTarget } = useTheme();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange(star)}
          accessibilityRole="button"
          accessibilityLabel={`${star} star${star !== 1 ? 's' : ''}`}
          style={{
            minWidth: minTapTarget,
            minHeight: minTapTarget,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={[
              typography.displayLarge,
              { color: star <= value ? colors.gold : colors.warmGray400 },
            ]}
          >
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
