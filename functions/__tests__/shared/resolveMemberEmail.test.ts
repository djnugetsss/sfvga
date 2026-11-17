import { pickMemberEmail } from '../../src/shared/resolveMemberEmail';

describe('pickMemberEmail', () => {
  it('prefers the Firestore profile email', () => {
    expect(pickMemberEmail('member@example.com', 'auth@example.com')).toBe('member@example.com');
  });

  it('falls back to Firebase Auth email', () => {
    expect(pickMemberEmail(undefined, 'auth@example.com')).toBe('auth@example.com');
  });

  it('trims whitespace and returns null when empty', () => {
    expect(pickMemberEmail('  ', '')).toBeNull();
    expect(pickMemberEmail(undefined, undefined)).toBeNull();
  });
});
