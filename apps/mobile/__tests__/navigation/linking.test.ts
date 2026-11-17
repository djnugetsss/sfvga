import { linking, scannerPath } from '@/navigation/linking';

describe('scanner web link', () => {
  it('keeps the event details when opening the scanner', () => {
    const path = linking.getPathFromState!(
      {
        index: 1,
        routes: [
          { name: 'Main' },
          { name: 'Scanner', params: { eventId: 'event-1', eventName: 'Test event' } },
        ],
      } as never,
      linking.config,
    );

    expect(path).toContain('scan/event-1');
    const restored = linking.getStateFromPath!(path, linking.config);
    expect(restored?.routes.find((route) => route.name === 'Scanner')?.params).toMatchObject({
      eventId: 'event-1',
      eventName: 'Test event',
    });
  });

  it('encodes the event in the scanner shortcut URL', () => {
    expect(scannerPath('event/1', 'Dance & Dinner')).toBe(
      '/scan/event%2F1?eventName=Dance%20%26%20Dinner',
    );
  });
});
