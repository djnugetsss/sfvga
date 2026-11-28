import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { colors, typography } = useTheme();
  const size = compact ? 42 : 54;
  return (
    <View style={styles.row} accessibilityLabel="SFVGA">
      <Image source={require('../../../assets/images/logo.png')} resizeMode="contain" accessibilityLabel="SFVGA logo" style={{ width: size, height: size }} />
      <View>
        <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>SFVGA</Text>
        {!compact ? (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Gujarati Association
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
