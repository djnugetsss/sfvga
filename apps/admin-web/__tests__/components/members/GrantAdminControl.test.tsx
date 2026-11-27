const mockAccess = { isSuperAdmin: true };
jest.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ access: mockAccess }) }));
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GrantAdminControl } from '@/components/members/GrantAdminControl';
import { functionsClient } from '@/services/functionsClient';

const mockInvalidate = jest.fn().mockResolvedValue(undefined);

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock('@/services/functionsClient', () => ({
  functionsClient: {
    adminRoles: {
      assign: jest.fn().mockResolvedValue({ success: true }),
      revoke: jest.fn().mockResolvedValue({ success: true }),
      grantSuperAdmin: jest.fn().mockResolvedValue({ success: true }),
      revokeSuperAdmin: jest.fn().mockResolvedValue({ success: true }),
    },
  },
}));

const mockAssign = functionsClient.adminRoles.assign as jest.Mock;
const mockGrantSuper = functionsClient.adminRoles.grantSuperAdmin as jest.Mock;
const mockRevokeSuper = functionsClient.adminRoles.revokeSuperAdmin as jest.Mock;

const roles = [
  {
    id: 'events-admin',
    name: 'Events Admin',
    active: true,
    system: false,
    permissions: [],
    createdBy: 'owner',
    createdAt: { seconds: 1, nanoseconds: 0 },
    updatedAt: { seconds: 1, nanoseconds: 0 },
  },
];

beforeEach(() => {
  mockAccess.isSuperAdmin = true;
  jest.clearAllMocks();
});

it('offers President in the same role dropdown and confirms the grant', async () => {
  render(
    <GrantAdminControl uid="member-1" currentRoleId={null} roles={roles} isSuperAdmin={false} />,
  );
  expect(screen.queryByRole('button', { name: 'Make President' })).toBeNull();
  fireEvent.change(screen.getByRole('combobox', { name: 'Admin role' }), {
    target: { value: '__super_admin__' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Grant' }));
  expect(mockGrantSuper).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Grant President' }));
  await waitFor(() => expect(mockGrantSuper).toHaveBeenCalledWith('member-1'));
});

it('can change President to a regular role without leaving elevated access behind', async () => {
  render(<GrantAdminControl uid="member-2" currentRoleId={null} roles={roles} isSuperAdmin />);
  expect((screen.getByRole('combobox', { name: 'Admin role' }) as HTMLSelectElement).value).toBe(
    '__super_admin__',
  );
  fireEvent.change(screen.getByRole('combobox', { name: 'Admin role' }), {
    target: { value: 'events-admin' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Change' }));
  expect(mockAssign).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Change role' }));
  await waitFor(() => expect(mockRevokeSuper).toHaveBeenCalledWith('member-2'));
  expect(mockAssign).toHaveBeenCalledWith({ targetUid: 'member-2', roleId: 'events-admin' });
  expect(mockAssign.mock.invocationCallOrder[0]).toBeLessThan(
    mockRevokeSuper.mock.invocationCallOrder[0],
  );
});

it('confirms revoking another member’s President access', async () => {
  render(
    <GrantAdminControl
      uid="member-2"
      viewerUid="owner"
      currentRoleId={null}
      roles={roles}
      isSuperAdmin
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
  expect(mockRevokeSuper).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Revoke access' }));
  await waitFor(() => expect(mockRevokeSuper).toHaveBeenCalledWith('member-2'));
});

it('does not let a President remove their own access', () => {
  render(
    <GrantAdminControl
      uid="owner"
      viewerUid="owner"
      currentRoleId={null}
      roles={roles}
      isSuperAdmin
    />,
  );
  expect((screen.getByRole('button', { name: 'Revoke' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: 'Change' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText(/Another President must change your access/)).toBeTruthy();
});

it('locks a President member for a delegated manager', () => { mockAccess.isSuperAdmin = false; render(<GrantAdminControl uid="president" currentRoleId={null} roles={roles} isSuperAdmin />); expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(true); expect((screen.getByRole('button', {name: 'Revoke'}) as HTMLButtonElement).disabled).toBe(true); });
