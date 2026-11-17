/**
 * SFVGA design system color tokens.
 * Single source of truth — imported by mobile theme/ and admin-web.
 */
export const colors = {
  // SFVGA's editorial palette: warm paper, antique gold, and Gujarati red.
  saffron: '#C79A2B',
  gold: '#C79A2B',
  deepBlue: '#74363C',
  white: '#FFFFFF',
  warmGray50: '#FAF7EF',
  warmGray400: '#756F64',
  success: '#49705A',
  error: '#A6473D',
  warning: '#8A6419',

  // Semantic surfaces shared by the mobile app and embedded admin dashboard.
  canvas: '#FAF7EF',
  surface: '#FFFDF8',
  surfaceMuted: '#F3EDDF',
  text: '#292724',
  textMuted: '#756F64',
  border: '#E5DCCB',
  brand: '#74363C',
  brandStrong: '#55272C',
  brandSoft: '#F4E6E5',
  accent: '#C79A2B',
  accentStrong: '#84600F',
  accentSoft: '#F8EFCF',
  // Burgundy carries actions; gold remains an accent, not a button fill.
  primary: '#74363C',
  primaryHover: '#55272C',
  onPrimary: '#FFFFFF',
  successSoft: '#EAF1EA',
  warningSoft: '#F8EFCF',
  errorSoft: '#F6E7E4',
} as const;

export type ColorToken = keyof typeof colors;
