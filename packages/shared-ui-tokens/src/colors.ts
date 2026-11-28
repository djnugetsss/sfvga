/**
 * SFVGA design system color tokens.
 * Single source of truth — imported by mobile theme/ and admin-web.
 */
export const colors = {
  // SFVGA's editorial palette: warm paper, antique gold, and Gujarati red.
  saffron: '#C0912F',
  gold: '#C0912F',
  deepBlue: '#6E4A34',
  white: '#FFFFFF',
  warmGray50: '#FAF6EF',
  warmGray400: '#5A5147',
  success: '#49705A',
  error: '#A6473D',
  warning: '#8A6419',

  // Semantic surfaces shared by the mobile app and embedded admin dashboard.
  canvas: '#FAF6EF',
  surface: '#FFFFFF',
  surfaceMuted: '#F6F1E7',
  text: '#17130F',
  textMuted: '#5A5147',
  border: '#EAE2D6',
  brand: '#6E4A34',
  brandStrong: '#513524',
  brandSoft: '#F3EADD',
  accent: '#C0912F',
  accentStrong: '#76551B',
  accentSoft: '#F8EFCF',
  primary: '#6E4A34',
  primaryHover: '#513524',
  onPrimary: '#FFFFFF',
  successSoft: '#EAF1EA',
  warningSoft: '#F8EFCF',
  errorSoft: '#F6E7E4',
} as const;

export type ColorToken = keyof typeof colors;
