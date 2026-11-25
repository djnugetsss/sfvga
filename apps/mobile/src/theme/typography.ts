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
  displayLarge: { ...tokenTypography.displayLarge, fontFamily: editorialFont, fontWeight: '400' as const },
  headingLarge: { ...tokenTypography.headingLarge, fontFamily: editorialFont, fontWeight: '400' as const },
  headingMedium: { ...tokenTypography.headingMedium },
};
export { fontFamily, minTapTarget, primaryButtonHeight, cardBorderRadius, buttonBorderRadius };

export const spacing = tokenSpacing;

export type TypographyStyle = keyof typeof typography;
