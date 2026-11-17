import { resolveAdminOrigin } from '@/screens/admin/adminEmbedShared';

const production = 'https://sfvga-app-admin-web-omega.vercel.app';

describe('admin dashboard origin', () => {
  it('uses the hosted admin app for native builds with a local Mac setting', () => {
    expect(resolveAdminOrigin('http://localhost:3000', 'ios')).toBe(production);
    expect(resolveAdminOrigin('http://127.0.0.1:3000', 'android')).toBe(production);
  });

  it('keeps localhost only for local web development', () => {
    expect(resolveAdminOrigin('http://localhost:3000', 'web', 'localhost')).toBe(
      'http://localhost:3000',
    );
    expect(resolveAdminOrigin('http://localhost:3000', 'web', 'sfvga-cabe6.web.app')).toBe(
      production,
    );
  });

  it('keeps an explicit hosted admin URL', () => {
    expect(resolveAdminOrigin(production, 'ios')).toBe(production);
  });
});
