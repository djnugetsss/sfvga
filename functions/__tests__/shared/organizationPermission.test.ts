import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireOrganizationPermission } from '../../src/shared/adminAccess';

jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));
jest.mock('firebase-admin/firestore', () => ({
  ...jest.requireActual('firebase-admin/firestore'),
  getFirestore: jest.fn(),
}));
jest.mock('../../src/shared/requireAuth', () => ({ requireAuth: () => 'admin-1' }));

const getAuthMock = jest.mocked(getAuth);
const getFirestoreMock = jest.mocked(getFirestore);

beforeEach(() => jest.clearAllMocks());

it('checks a current super-admin claim without scanning event grants', async () => {
  getAuthMock.mockReturnValue({
    getUser: jest.fn().mockResolvedValue({ customClaims: { superAdmin: true } }),
  } as any);
  const doc = jest.fn(() => ({ get: jest.fn().mockResolvedValue({ exists: false }) }));
  const collectionGroup = jest.fn();
  getFirestoreMock.mockReturnValue({ doc, collectionGroup } as any);

  await expect(
    requireOrganizationPermission({ auth: { token: {} } } as any, 'events.create'),
  ).resolves.toMatchObject({
    uid: 'admin-1',
    access: { isSuperAdmin: true },
  });
  expect(doc).toHaveBeenCalledWith('organizationAdminGrants/admin-1');
  expect(collectionGroup).not.toHaveBeenCalled();
});

it('allows an active organization role with the requested permission', async () => {
  getAuthMock.mockReturnValue({
    getUser: jest.fn().mockResolvedValue({ customClaims: {} }),
  } as any);
  const doc = jest.fn((path: string) => ({
    get: jest.fn().mockResolvedValue(
      path === 'organizationAdminGrants/admin-1'
        ? { exists: true, data: () => ({ roleId: 'organizer' }) }
        : {
            exists: true,
            id: 'organizer',
            data: () => ({ name: 'Organizer', active: true, permissions: ['events.create'] }),
          },
    ),
  }));
  const collectionGroup = jest.fn();
  getFirestoreMock.mockReturnValue({ doc, collectionGroup } as any);

  await expect(
    requireOrganizationPermission({ auth: { token: {} } } as any, 'events.create'),
  ).resolves.toMatchObject({
    access: { organizationRole: { id: 'organizer' } },
  });
  expect(doc).toHaveBeenCalledWith('adminRoleDefinitions/organizer');
  expect(collectionGroup).not.toHaveBeenCalled();
});

it('rejects a revoked super admin without an organization grant', async () => {
  getAuthMock.mockReturnValue({
    getUser: jest.fn().mockResolvedValue({ customClaims: {} }),
  } as any);
  getFirestoreMock.mockReturnValue({
    doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ exists: false }) })),
  } as any);

  await expect(
    requireOrganizationPermission(
      { auth: { token: { superAdmin: true } } } as any,
      'events.create',
    ),
  ).rejects.toMatchObject({ code: 'permission-denied' });
});
