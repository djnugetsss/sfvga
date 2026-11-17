import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RoleListEditor } from '@/components/roles/RoleListEditor';
import { useAdminRoles, useAdminRoleMutations } from '@/hooks/useAdminRoles';

jest.mock('@/hooks/useAdminRoles', () => ({
  useAdminRoles: jest.fn(),
  useAdminRoleMutations: jest.fn(),
}));

const mockUpdate = jest.fn().mockResolvedValue({ success: true });

beforeEach(() => {
  mockUpdate.mockClear();
  (useAdminRoles as jest.Mock).mockReturnValue({
    data: [
      {
        id: 'super-admin',
        name: 'Super Admin',
        description: 'Full access',
        system: true,
        active: true,
        permissions: ['members.view', 'events.view'],
      },
    ],
    isLoading: false,
    isError: false,
  });
  (useAdminRoleMutations as jest.Mock).mockReturnValue({
    seedDefaults: { isPending: false, mutate: jest.fn() },
    deleteRole: { isPending: false, mutateAsync: jest.fn() },
    createRole: { isPending: false, mutateAsync: jest.fn() },
    updateRole: { isPending: false, mutateAsync: mockUpdate },
  });
});

it('confirms edits to the protected role name and displayed permissions without allowing deletion', async () => {
  render(<RoleListEditor />);
  const edit = screen.getByRole('button', { name: 'Edit' }) as HTMLButtonElement;
  const deleteButton = screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement;
  expect(edit.disabled).toBe(false);
  expect(deleteButton.disabled).toBe(true);

  fireEvent.click(edit);
  expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  expect(screen.getByText(/always has full access/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Manage Super Admins' })).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: 'Role name' }), {
    target: { value: 'Community Lead' },
  });
  fireEvent.click(screen.getByRole('checkbox', { name: 'View member directory' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save role' }));
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(screen.getByText(/will still have full access/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm changes' }));

  await waitFor(() =>
    expect(mockUpdate).toHaveBeenCalledWith({
      roleId: 'super-admin',
      name: 'Community Lead',
      description: 'Full access',
      permissions: ['events.view'],
    }),
  );
});

it('links every role to the member access controls', () => {
  (useAdminRoles as jest.Mock).mockReturnValue({
    data: [
      {
        id: 'super-admin',
        name: 'Super Admin',
        description: 'Full access',
        system: true,
        active: true,
        permissions: ['members.view'],
      },
      {
        id: 'event-manager',
        name: 'Event Manager',
        description: 'Manage events',
        system: false,
        active: true,
        permissions: ['events.view'],
      },
    ],
    isLoading: false,
    isError: false,
  });

  render(<RoleListEditor />);
  const links = screen.getAllByRole('link', { name: 'Manage access' });
  expect(links).toHaveLength(2);
  links.forEach((link) => expect(link.getAttribute('href')).toBe('/members'));
});
