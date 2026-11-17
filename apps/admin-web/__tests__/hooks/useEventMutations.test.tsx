import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Event } from '@sfvga/shared-types';
import type { EventCreateInput } from '@sfvga/shared-validation';
import { getDoc } from 'firebase/firestore';
import { useEventMutations } from '@/hooks/useEventMutations';
import { functionsClient } from '@/services/functionsClient';

jest.mock('@/services/functionsClient', () => ({ functionsClient: { call: jest.fn() } }));
jest.mock('@/providers/AuthProvider', () => ({
  useAuthContext: () => ({ firebaseUser: { uid: 'organizer' } }),
}));
jest.mock('@/services/firebase', () => ({ getFirestoreDb: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  Timestamp: class Timestamp {},
  getDoc: jest.fn(),
  doc: jest.fn(),
}));

const call = functionsClient.call as jest.Mock;
const readEvent = getDoc as jest.Mock;
const input = { title: 'Community event', photoAlbumUrl: undefined } as EventCreateInput;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const hook = renderHook(() => useEventMutations(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { client, ...hook };
}

beforeEach(() => jest.clearAllMocks());

it('saves ordinary event edits without a pre-read or unchanged image uploads', async () => {
  call.mockResolvedValue({ eventId: 'event' });
  const { result } = setup();
  await act(async () => {
    await result.current.updateEvent.mutateAsync({ eventId: 'event', input });
  });
  expect(readEvent).not.toHaveBeenCalled();
  expect(call).toHaveBeenCalledWith(
    'events_update',
    expect.not.objectContaining({ bannerUrl: expect.anything() }),
  );
  expect(call).toHaveBeenCalledWith(
    'events_update',
    expect.not.objectContaining({ flyerUrl: expect.anything() }),
  );
});

it('shows a publish decision immediately and restores the old status if the server rejects it', async () => {
  let rejectCall: (error: Error) => void = () => {};
  call.mockReturnValue(
    new Promise((_resolve, reject) => {
      rejectCall = reject;
    }),
  );
  const { client, result } = setup();
  const draft = { id: 'event', status: 'draft', title: 'Community event' } as Event;
  client.setQueryData(['admin', 'events', 'all'], [draft]);
  client.setQueryData(['admin', 'event', 'event'], draft);

  let pending!: Promise<void>;
  act(() => {
    pending = result.current.setEventStatus.mutateAsync({ eventId: 'event', status: 'published' });
  });
  await waitFor(() =>
    expect(client.getQueryData<Event>(['admin', 'event', 'event'])?.status).toBe('published'),
  );
  await act(async () => {
    rejectCall(new Error('Publishing requirements not met'));
    await expect(pending).rejects.toThrow('Publishing requirements not met');
  });
  expect(client.getQueryData<Event>(['admin', 'event', 'event'])?.status).toBe('draft');
  expect(client.getQueryData<Event[]>(['admin', 'events', 'all'])?.[0]?.status).toBe('draft');
});
