import {
  typography as tokenTypography,
  fontFamily,
  spacing as tokenSpacing,
  minTapTarget,
  primaryButtonHeight,
  cardBorderRadius,
  buttonBorderRadius,
} from '@sfvga/shared-ui-tokens';

// The partner app's editorial typeface is bundled, so it is consistent on web and phones.
const editorialFont = 'Fraunces-SemiBold';

export const typography = {
  ...tokenTypography,
  displayLarge: { ...tokenTypography.displayLarge, fontSize: 40, lineHeight: 46, fontFamily: editorialFont, fontWeight: '400' as const },
  headingLarge: { ...tokenTypography.headingLarge, fontSize: 28, lineHeight: 35, fontFamily: editorialFont, fontWeight: '400' as const },
  headingMedium: { ...tokenTypography.headingMedium, fontFamily: 'Fraunces-Regular', fontWeight: '400' as const },
  bodyMedium: { ...tokenTypography.bodyMedium, fontFamily: fontFamily.regular },
  bodyLarge: { ...tokenTypography.bodyLarge, fontFamily: fontFamily.regular },
};
export { fontFamily, minTapTarget, primaryButtonHeight, cardBorderRadius, buttonBorderRadius };

export const spacing = tokenSpacing;

export type TypographyStyle = keyof typeof typography;
