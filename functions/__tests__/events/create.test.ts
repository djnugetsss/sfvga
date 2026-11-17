import { getFirestore } from 'firebase-admin/firestore';
import { requireOrganizationPermission } from '../../src/shared/adminAccess';
import { events_create } from '../../src/events/create';

jest.mock('firebase-admin/firestore', () => ({
  ...jest.requireActual('firebase-admin/firestore'),
  getFirestore: jest.fn(),
}));
jest.mock('../../src/shared/adminAccess', () => ({ requireOrganizationPermission: jest.fn() }));

it('creates the event and its scanner role together, before returning the event ID', async () => {
  const roleRef = { id: 'ticket-scanner' };
  const eventRef = {
    id: 'event-1',
    collection: jest.fn(() => ({ doc: jest.fn(() => roleRef) })),
  };
  const set = jest.fn();
  const commit = jest.fn().mockResolvedValue(undefined);
  jest.mocked(getFirestore).mockReturnValue({
    collection: jest.fn(() => ({ doc: jest.fn(() => eventRef) })),
    batch: jest.fn(() => ({ set, commit })),
  } as unknown as ReturnType<typeof getFirestore>);
  jest.mocked(requireOrganizationPermission).mockResolvedValue({ uid: 'admin-1' } as any);

  const input = {
    title: 'Community Day',
    description: 'An event',
    startAt: '2026-12-01T18:00:00.000Z',
    endAt: '2026-12-01T20:00:00.000Z',
    location: { name: 'Hall', address: '123 Main St', lat: 34, lng: -118 },
    pricing: { member: 0, guest: 0 },
  };
  await expect(events_create.run({ data: input } as any)).resolves.toEqual({ eventId: 'event-1' });
  expect(set).toHaveBeenCalledWith(
    eventRef,
    expect.objectContaining({ title: input.title, status: 'draft' }),
  );
  expect(set).toHaveBeenCalledWith(
    roleRef,
    expect.objectContaining({
      name: 'Ticket Scanner',
      permissions: ['tickets.scan'],
      eventId: 'event-1',
    }),
  );
  expect(commit).toHaveBeenCalledTimes(1);
});

it('prepares the create callable without writing an event', async () => {
  const collection = jest.fn();
  const batch = jest.fn();
  jest
    .mocked(getFirestore)
    .mockReturnValue({ collection, batch } as unknown as ReturnType<typeof getFirestore>);
  jest.mocked(requireOrganizationPermission).mockResolvedValue({ uid: 'admin-1' } as any);

  await expect(events_create.run({ data: { prepare: true } } as any)).resolves.toEqual({
    ready: true,
  });
  expect(requireOrganizationPermission).toHaveBeenCalledWith(expect.anything(), 'events.create');
  expect(collection).not.toHaveBeenCalled();
  expect(batch).not.toHaveBeenCalled();
});
