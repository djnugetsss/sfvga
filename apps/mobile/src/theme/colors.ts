import { colors as tokenColors } from '@sfvga/shared-ui-tokens';

/** Re-export shared color tokens; mobile-specific overrides can be added here. */
export const colors = {
  ...tokenColors,
  background: tokenColors.canvas,
  textPrimary: tokenColors.text,
  textSecondary: tokenColors.textMuted,
  cardBackground: tokenColors.surface,
} as const;

export type AppColors = typeof colors;
