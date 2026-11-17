import { colors } from './colors';
import {
  typography,
  fontFamily,
  spacing,
  minTapTarget,
  primaryButtonHeight,
  cardBorderRadius,
  buttonBorderRadius,
} from './typography';

/** Respect OS font scaling while capping extreme sizes (UI/UX §0.4). */
export const textAccessibilityProps = {
  allowFontScaling: true as const,
  maxFontSizeMultiplier: 1.5,
};

export const theme = {
  colors,
  typography,
  fontFamily,
  spacing,
  minTapTarget,
  primaryButtonHeight,
  cardBorderRadius,
  buttonBorderRadius,
  textAccessibilityProps,
} as const;

export type Theme = typeof theme;
