import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { hasPermission, resolveAdminAccess } from '../../src/shared/adminAccess';

jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));
jest.mock('firebase-admin/firestore', () => {
  const actual = jest.requireActual('firebase-admin/firestore');
  return { ...actual, getFirestore: jest.fn() };
});

const getUser = jest.fn();

beforeEach(() => {
  getUser.mockReset();
  (getAuth as jest.Mock).mockReturnValue({ getUser });
  (getFirestore as jest.Mock).mockReturnValue({
    doc: (path: string) => ({
      get: async () =>
        path === 'adminRoleDefinitions/super-admin'
          ? { data: () => ({ name: 'Community Lead' }) }
          : { exists: false },
    }),
    collectionGroup: () => ({ where: () => ({ get: async () => ({ docs: [] }) }) }),
  });
});

it('recognizes a newly granted Super Admin before their ID token refreshes', async () => {
  getUser.mockResolvedValue({ customClaims: { superAdmin: true } });
  const access = await resolveAdminAccess('member-1', {});
  expect(access.isSuperAdmin).toBe(true);
  expect(access.superAdminRoleName).toBe('Community Lead');
  expect(hasPermission(access, 'payments.refund')).toBe(true);
});

it('rejects a revoked Super Admin even while their ID token has the old claim', async () => {
  getUser.mockResolvedValue({ customClaims: {} });
  const access = await resolveAdminAccess('member-1', { superAdmin: true });
  expect(access.isSuperAdmin).toBe(false);
  expect(hasPermission(access, 'payments.refund')).toBe(false);
});

it('starts independent permission reads while the Auth claim lookup is in flight', async () => {
  let finishAuth!: (value: { customClaims: Record<string, unknown> }) => void;
  getUser.mockReturnValue(
    new Promise((resolve) => {
      finishAuth = resolve;
    }),
  );
  const readGrant = jest.fn().mockResolvedValue({ exists: false });
  const readRoles = jest.fn().mockResolvedValue({ docs: [] });
  (getFirestore as jest.Mock).mockReturnValue({
    doc: () => ({ get: readGrant }),
    collectionGroup: () => ({ where: () => ({ get: readRoles }) }),
  });

  const accessPromise = resolveAdminAccess('member-1', {});
  expect(readGrant).toHaveBeenCalledTimes(1);
  expect(readRoles).toHaveBeenCalledTimes(1);
  finishAuth({ customClaims: {} });
  await expect(accessPromise).resolves.toMatchObject({ isSuperAdmin: false, eventAccess: [] });
});
