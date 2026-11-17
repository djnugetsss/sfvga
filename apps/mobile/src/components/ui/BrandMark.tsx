import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { colors, typography } = useTheme();
  const size = compact ? 42 : 54;
  return (
    <View style={styles.row} accessibilityLabel="SFVGA">
      <View
        style={[
          styles.mark,
          {
            width: size,
            height: size,
            borderRadius: compact ? 14 : 18,
            backgroundColor: colors.accentSoft,
          },
        ]}
      >
        <Text
          style={[
            typography.headingMedium,
            { color: colors.accentStrong, fontSize: compact ? 16 : 19 },
          ]}
        >
          SF
        </Text>
      </View>
      <View>
        <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>SFVGA</Text>
        {!compact ? (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Community since 1978
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: { alignItems: 'center', justifyContent: 'center' },
});
