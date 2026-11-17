// Plain-language price breakdown (UI/UX §6): stacked line items with a gold-divided total.
// Updates live as the Registration screen recomputes lines from the current selection.

import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { formatCurrency } from '@/utils/currencyFormat';

interface PriceLine {
  label: string;
  count: number;
  unitPrice: number;
}

interface PriceBreakdownProps {
  lines: PriceLine[];
  total: number;
}

export function PriceBreakdown({ lines, total }: PriceBreakdownProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View>
      {lines.map((line) => (
        <Text
          key={line.label}
          style={[typography.bodyLarge, { color: colors.textPrimary, marginBottom: spacing.xs }]}
        >
          {line.count} {line.label} × {formatCurrency(line.unitPrice)} ={' '}
          {formatCurrency(line.count * line.unitPrice)}
        </Text>
      ))}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.gold,
          marginTop: spacing.sm,
          paddingTop: spacing.sm,
        }}
      >
        <Text style={[typography.headingMedium, { color: colors.textPrimary }]}>
          Total: {formatCurrency(total)}
        </Text>
      </View>
    </View>
  );
}
