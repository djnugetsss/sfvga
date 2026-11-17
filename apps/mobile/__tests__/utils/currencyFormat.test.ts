import { formatCurrency } from '@/utils/currencyFormat';

describe('currencyFormat', () => {
  it('formats whole-dollar amounts', () => {
    expect(formatCurrency(15)).toBe('$15.00');
  });

  it('formats zero as free-eligible amount', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  // TODO: Phase 2 — expand cases once pricing edge cases are finalized.
});
