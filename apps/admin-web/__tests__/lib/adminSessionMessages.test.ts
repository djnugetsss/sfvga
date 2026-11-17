import { isTrustedAdminSessionMessage } from '@/lib/adminSessionMessages';

describe('admin session message origin', () => {
  const memberOrigin = 'https://sfvga-cabe6.web.app';
  const parent = {} as Window;
  const child = {} as Window;

  it('accepts the native WebView message only when the native bridge exists', () => {
    const message = { source: null, origin: '' };
    expect(isTrustedAdminSessionMessage(message, child, child, [memberOrigin], true)).toBe(true);
    expect(isTrustedAdminSessionMessage(message, child, child, [memberOrigin], false)).toBe(false);
  });

  it('accepts messages from the approved member app iframe parent', () => {
    expect(
      isTrustedAdminSessionMessage(
        { source: parent, origin: memberOrigin }, parent, child, [memberOrigin], false,
      ),
    ).toBe(true);
  });

  it('rejects messages from another window or origin', () => {
    expect(
      isTrustedAdminSessionMessage(
        { source: child, origin: memberOrigin }, parent, child, [memberOrigin], false,
      ),
    ).toBe(false);
    expect(
      isTrustedAdminSessionMessage(
        { source: parent, origin: 'https://unknown.example' }, parent, child, [memberOrigin], false,
      ),
    ).toBe(false);
  });
});
