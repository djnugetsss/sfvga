import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { countdownAccessibilityLabel, eventDetailCountdownLabel } from '@/utils/dateFormat';

interface CountdownTimerProps {
  startAt: Date;
  endAt: Date;
}

/**
 * Pre/during event countdown row (UI/UX §5). Hidden after the event ends. Updates every
 * minute so the label stays accurate without excessive re-renders.
 */
export function CountdownTimer({ startAt, endAt }: CountdownTimerProps) {
  const { colors, typography, textAccessibilityProps } = useTheme();
  const [label, setLabel] = useState(() => eventDetailCountdownLabel(startAt, endAt));

  useEffect(() => {
    const refresh = () => setLabel(eventDetailCountdownLabel(startAt, endAt));
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [startAt, endAt]);

  if (!label) return null;

  const a11yLabel = countdownAccessibilityLabel(startAt, endAt);

  return (
    <Text
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      style={[typography.bodyLarge, { color: colors.deepBlue, fontWeight: '600' }]}
      {...textAccessibilityProps}
    >
      {label}
    </Text>
  );
}
