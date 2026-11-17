import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { hasPermission, requireAdminPermission } from '../../src/shared/adminAccess';
import { adminMembers_count, adminMembers_list } from '../../src/auth/adminMembers';

jest.mock('firebase-admin/firestore', () => ({ getFirestore: jest.fn() }));
jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));
jest.mock('../../src/shared/adminAccess', () => ({
  hasPermission: jest.fn(),
  requireAdminPermission: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

it('loads only active event staff choices without fetching organization grants', async () => {
  jest.mocked(requireAdminPermission).mockResolvedValue({ uid: 'admin-1', access: {} } as any);
  jest.mocked(hasPermission).mockReturnValue(true);
  const usersGet = jest.fn().mockResolvedValue({
    docs: [
      { id: 'member-1', data: () => ({ displayName: 'Member One', phone: '+15555550123' }) },
      { id: 'deleted-1', data: () => ({ displayName: 'Deleted Member' }) },
    ],
  });
  const listUsers = jest.fn().mockResolvedValue({ users: [{ uid: 'member-1' }], pageToken: undefined });
  jest.mocked(getAuth).mockReturnValue({ listUsers } as any);
  const collection = jest.fn((path: string) => {
    if (path === 'users') return { get: usersGet };
    throw new Error(`Unexpected collection read: ${path}`);
  });
  jest
    .mocked(getFirestore)
    .mockReturnValue({ collection } as unknown as ReturnType<typeof getFirestore>);

  await expect(adminMembers_list.run({ data: { eventId: 'event-1' } } as any)).resolves.toEqual([
    {
      uid: 'member-1',
      displayName: 'Member One',
      phone: '+15555550123',
      email: undefined,
      organizationRoleId: null,
      isSuperAdmin: false,
    },
  ]);
  expect(requireAdminPermission).toHaveBeenCalledWith(expect.anything(), 'staff.view', 'event-1');
  expect(listUsers).toHaveBeenCalledWith(1000, undefined);
  expect(collection).toHaveBeenCalledTimes(1);
});

it('counts only profiles with active Auth accounts', async () => {
  jest.mocked(requireAdminPermission).mockResolvedValue({ uid: 'admin-1', access: {} } as any);
  jest.mocked(getAuth).mockReturnValue({
    listUsers: jest.fn().mockResolvedValue({ users: [{ uid: 'member-1' }], pageToken: undefined }),
  } as any);
  const get = jest.fn().mockResolvedValue({ docs: [{ id: 'member-1' }, { id: 'deleted-1' }] });
  const select = jest.fn().mockReturnValue({ get });
  jest.mocked(getFirestore).mockReturnValue({
    collection: jest.fn().mockReturnValue({ select }),
  } as any);

  await expect(adminMembers_count.run({ data: {} } as any)).resolves.toEqual({ count: 1 });
  expect(requireAdminPermission).toHaveBeenCalledWith(expect.anything(), 'members.view');
  expect(select).toHaveBeenCalledWith();
});
