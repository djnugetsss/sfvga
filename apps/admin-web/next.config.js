const memberWebOrigin = process.env.NEXT_PUBLIC_MEMBER_WEB_ORIGIN || 'https://sfvga-cabe6.web.app';

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === 'true' ? '.next-payment-test' : '.next',
  transpilePackages: ['@sfvga/shared-types', '@sfvga/shared-ui-tokens', '@sfvga/shared-validation'],
  // Allow embedding the admin dashboard inside the member app WebView / Expo web iframe.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Member app (Expo web / native WebView) embeds this dashboard in-place.
            value: `frame-ancestors ${memberWebOrigin} http://localhost:8081`,
          },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
