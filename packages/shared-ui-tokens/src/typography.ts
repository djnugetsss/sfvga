/**
 * Typography tokens — sizes in sp/pt, weights as React Native / CSS compatible values.
 * Font family is configured per-platform in each app's theme setup.
 */
export const typography = {
  displayLarge: { fontSize: 29, fontWeight: '700' as const, lineHeight: 36, letterSpacing: -0.5 },
  headingLarge: { fontSize: 25, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.3 },
  headingMedium: { fontSize: 20, fontWeight: '600' as const, lineHeight: 27, letterSpacing: -0.15 },
  bodyLarge: { fontSize: 17, fontWeight: '400' as const, lineHeight: 26 },
  bodyMedium: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0.15 },
  eyebrow: { fontSize: 11, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 1.1 },
} as const;

export type TypographyToken = keyof typeof typography;

/** Default font family — Inter loaded via expo-font in mobile app. */
export const fontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  compact: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type SpacingToken = keyof typeof spacing;

/** Minimum tap target per UI/UX spec */
export const minTapTarget = 48;

/** Primary button height per UI/UX spec */
export const primaryButtonHeight = 56;

/** Card corner radius per UI/UX spec */
export const cardBorderRadius = 14;

/** Button corner radius per UI/UX spec */
export const buttonBorderRadius = 12;
