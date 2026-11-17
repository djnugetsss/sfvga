import {
  typography as tokenTypography,
  fontFamily,
  spacing as tokenSpacing,
  minTapTarget,
  primaryButtonHeight,
  cardBorderRadius,
  buttonBorderRadius,
} from '@sfvga/shared-ui-tokens';
import { Platform } from 'react-native';

const editorialFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, Times New Roman, serif',
  default: 'serif',
});

export const typography = {
  ...tokenTypography,
  displayLarge: { ...tokenTypography.displayLarge, fontFamily: editorialFont },
  headingLarge: { ...tokenTypography.headingLarge, fontFamily: editorialFont },
  headingMedium: { ...tokenTypography.headingMedium },
};
export { fontFamily, minTapTarget, primaryButtonHeight, cardBorderRadius, buttonBorderRadius };

export const spacing = tokenSpacing;

export type TypographyStyle = keyof typeof typography;
