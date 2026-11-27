import { protectPresident } from '../../src/auth/adminRoles';

describe('President protection', () => {
  it('blocks a delegated manager from modifying President', () => {
    expect(() => protectPresident(false, true)).toThrow();
  });
  it('allows Presidents to edit President and managers to edit ordinary roles', () => {
    expect(() => protectPresident(true, true)).not.toThrow();
    expect(() => protectPresident(false, false)).not.toThrow();
  });
});
