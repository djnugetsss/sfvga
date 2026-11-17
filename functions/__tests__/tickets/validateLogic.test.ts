import { formatRedeemedAt, buildAlreadyRedeemedMessage, buildCheckedInMessage, INVALID_SCAN_MESSAGE } from '../../src/tickets/validateLogic';

describe('validateLogic', () => {
  it('formats redeemed time as 6:42pm style', () => {
    const date = new Date(2026, 6, 14, 18, 42, 0);
    expect(formatRedeemedAt(date)).toBe('6:42pm');
  });

  it('builds the checked-in banner message', () => {
    expect(buildCheckedInMessage('John Doe')).toBe('✓ John Doe — Checked in');
  });

  it('builds the already-redeemed banner message with a time', () => {
    const date = new Date(2026, 6, 14, 18, 42, 0);
    expect(buildAlreadyRedeemedMessage(date)).toBe('Already checked in at 6:42pm.');
  });

  it('builds a generic already-redeemed message when time is missing', () => {
    expect(buildAlreadyRedeemedMessage()).toBe('Already checked in.');
  });

  it('uses the documented invalid scan copy', () => {
    expect(INVALID_SCAN_MESSAGE).toBe('Not valid — please see an organizer.');
  });
});
