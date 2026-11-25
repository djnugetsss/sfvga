import { eventDayKey } from '@/components/events/EventCalendar';

describe('event calendar dates', () => {
  it('uses the SFVGA local date across UTC and daylight-saving boundaries', () => {
    expect(eventDayKey(new Date('2026-11-01T06:30:00Z'))).toBe('2026-10-31');
    expect(eventDayKey(new Date('2026-11-01T08:30:00Z'))).toBe('2026-11-01');
  });

  it('accepts Firestore event timestamps', () => {
    expect(eventDayKey({ seconds: Date.parse('2026-07-05T02:00:00Z') / 1000, nanoseconds: 0 })).toBe('2026-07-04');
  });
});
