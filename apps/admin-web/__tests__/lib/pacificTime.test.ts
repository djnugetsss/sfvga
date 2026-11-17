import { pacificInputToIso, toDateTimeLocalValue, formatDateTime, toDate } from '@/lib/formatters';

describe('Pacific registration deadlines', () => {
  it('converts summer and winter dates independently of machine timezone', () => {
    expect(pacificInputToIso('2026-07-01T17:00')).toBe('2026-07-02T00:00:00.000Z');
    expect(pacificInputToIso('2026-12-01T17:00')).toBe('2026-12-02T01:00:00.000Z');
  });
  it('round trips saved instants and displays the timezone', () => {
    const date = new Date('2026-07-02T00:00:00.000Z');
    expect(toDateTimeLocalValue(date)).toBe('2026-07-01T17:00');
    expect(formatDateTime(date)).toContain('PDT');
  });
  it('rejects nonexistent DST-gap time rather than silently moving the deadline', () => {
    expect(pacificInputToIso('2026-03-08T02:30')).toBeUndefined();
  });
  it('reads Firestore Admin timestamps returned by callables', () => {
    expect(toDate({ _seconds: 1794441600, _nanoseconds: 0 })?.toISOString()).toBe(
      '2026-11-12T00:00:00.000Z',
    );
  });
});
