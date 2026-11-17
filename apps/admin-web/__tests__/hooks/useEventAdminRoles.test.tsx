import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDocs } from 'firebase/firestore';
import {
  fetchEventAdminRoles,
  useEventAdminRoles,
  useEventAdminRoleMutations,
} from '@/hooks/useEventAdminRoles';
import { functionsClient } from '@/services/functionsClient';

jest.mock('@/services/functionsClient', () => ({
  functionsClient: {
    eventRoles: { assign: jest.fn() },
  },
}));
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  getDocs: jest.fn(),
}));
jest.mock('@/services/firebase', () => ({
  getFirebaseAuth: () => ({ currentUser: { uid: 'organizer-1' } }),
  getFirestoreDb: () => ({}),
}));

it('loads event role definitions and assignments directly from permission-checked Firestore reads', async () => {
  (getDocs as jest.Mock)
    .mockReset()
    .mockResolvedValueOnce({
      docs: [
        { id: 'scanner', data: () => ({ name: 'Ticket Scanner', permissions: ['tickets.scan'] }) },
      ],
    })
    .mockResolvedValueOnce({
      docs: [{ id: 'member-1', data: () => ({ userId: 'member-1', roleDefinitionId: 'scanner' }) }],
    });
  await expect(fetchEventAdminRoles('event-1')).resolves.toEqual({
    roles: [
      { id: 'scanner', eventId: 'event-1', name: 'Ticket Scanner', permissions: ['tickets.scan'] },
    ],
    grants: [
      { id: 'member-1', eventId: 'event-1', userId: 'member-1', roleDefinitionId: 'scanner' },
    ],
  });
  expect(getDocs).toHaveBeenCalledTimes(2);
});

it('finishes a staff assignment without waiting for the role list to re-download', async () => {
  (getDocs as jest.Mock).mockReset();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['admin', 'eventRoles', 'event-1'], { roles: [], grants: [] });
  (getDocs as jest.Mock).mockImplementation(() => new Promise(() => {}));
  (functionsClient.eventRoles.assign as jest.Mock).mockResolvedValue({ grantId: 'member-1' });

  const { result } = renderHook(
    () => {
      useEventAdminRoles('event-1');
      return useEventAdminRoleMutations('event-1');
    },
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );
  const input = {
    eventId: 'event-1',
    targetUid: 'member-1',
    roleId: 'scanner',
    activatesAt: '2026-11-12T12:00:00.000Z',
    expiresAt: '2026-11-13T12:00:00.000Z',
  };

  await act(async () => {
    await expect(result.current.assignRole.mutateAsync(input)).resolves.toEqual({
      grantId: 'member-1',
    });
  });
  expect(functionsClient.eventRoles.assign).toHaveBeenCalledWith(input);
  expect(
    (client.getQueryData<{ grants: { userId: string }[] }>(['admin', 'eventRoles', 'event-1'])
      ?.grants ?? [])[0]?.userId,
  ).toBe('member-1');
  // The background Firestore refresh can still be unresolved when the action is done.
  await waitFor(() => expect(getDocs).toHaveBeenCalledTimes(2));
  client.clear();
});
