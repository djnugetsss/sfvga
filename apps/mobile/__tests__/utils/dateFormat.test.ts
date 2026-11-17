import { formatNotificationDateTime } from '@/utils/dateFormat';

it('formats notification dates in Pacific time without seconds', () => {
  expect(formatNotificationDateTime(new Date('2026-11-12T18:04:59Z'))).toBe(
    'Nov 12, 2026, 10:04 AM',
  );
});
