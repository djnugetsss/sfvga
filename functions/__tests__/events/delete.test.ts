import { getFirestore } from 'firebase-admin/firestore';
import { requireOrganizationPermission } from '../../src/shared/adminAccess';
import { events_delete } from '../../src/events/delete';

jest.mock('firebase-admin/firestore', () => ({ getFirestore: jest.fn() }));
jest.mock('../../src/shared/adminAccess', () => ({ requireOrganizationPermission: jest.fn() }));

const permission = jest.mocked(requireOrganizationPermission);
const firestore = jest.mocked(getFirestore);

describe('events_delete', () => {
  beforeEach(() => jest.resetAllMocks());

  it('deletes only the requested event and its organization announcements', async () => {
    const eventRef = { path: 'events/event-1' };
    const announcementRef = { path: 'announcements/notice-1' };
    const commit = jest.fn().mockResolvedValue(undefined);
    const batchDelete = jest.fn();
    const get = jest
      .fn()
      .mockResolvedValueOnce({ empty: false, docs: [{ ref: announcementRef }] })
      .mockResolvedValueOnce({ empty: true, docs: [] });
    const where = jest.fn().mockReturnValue({ limit: () => ({ get }) });
    const db = {
      doc: jest.fn().mockReturnValue(eventRef),
      recursiveDelete: jest.fn().mockResolvedValue(undefined),
      collection: jest.fn().mockReturnValue({ where }),
      batch: jest.fn().mockReturnValue({ delete: batchDelete, commit }),
    };
    firestore.mockReturnValue(db as unknown as ReturnType<typeof getFirestore>);
    permission.mockResolvedValue({ uid: 'admin-1', access: {} } as any);

    await expect(events_delete.run({ data: { eventId: 'event-1' } } as any)).resolves.toEqual({
      success: true,
    });
    expect(permission).toHaveBeenCalledWith(expect.anything(), 'events.delete');
    expect(db.doc).toHaveBeenCalledWith('events/event-1');
    expect(db.recursiveDelete).toHaveBeenCalledWith(eventRef);
    expect(db.collection).toHaveBeenCalledWith('announcements');
    expect(where).toHaveBeenCalledWith('eventId', '==', 'event-1');
    expect(batchDelete).toHaveBeenCalledWith(announcementRef);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('does not access Firestore when permission is denied', async () => {
    permission.mockRejectedValue(new Error('Not allowed'));
    await expect(events_delete.run({ data: { eventId: 'event-1' } } as any)).rejects.toThrow(
      'Not allowed',
    );
    expect(firestore).not.toHaveBeenCalled();
  });

  it('rejects invalid event IDs before attempting deletion', async () => {
    await expect(events_delete.run({ data: { eventId: '../event' } } as any)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect(permission).not.toHaveBeenCalled();
  });
});
