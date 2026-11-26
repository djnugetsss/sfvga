import type { Config } from 'tailwindcss';
import { colors } from '@sfvga/shared-ui-tokens';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        saffron: colors.saffron,
        gold: colors.gold,
        deepBlue: colors.deepBlue,
        warmGray50: colors.warmGray50,
        warmGray400: colors.warmGray400,
        success: colors.success,
        error: colors.error,
        warning: colors.warning,
        canvas: colors.canvas,
        surface: colors.surface,
        surfaceMuted: colors.surfaceMuted,
        ink: colors.text,
        muted: colors.textMuted,
        border: colors.border,
        brand: colors.brand,
        brandStrong: colors.brandStrong,
        brandSoft: colors.brandSoft,
        accent: colors.accent,
        accentStrong: colors.accentStrong,
        accentSoft: colors.accentSoft,
        primary: colors.brand,
        primaryHover: colors.brandStrong,
        onPrimary: colors.white,
        successSoft: colors.successSoft,
        warningSoft: colors.warningSoft,
        errorSoft: colors.errorSoft,
      },
    },
  },
  plugins: [],
};

export default config;
