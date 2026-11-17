import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDocs, onSnapshot } from 'firebase/firestore';
import { useEvents } from '@/hooks/useEvents';

jest.mock('@/services/firebase', () => ({ getFirestoreDb: jest.fn(() => ({})) }));
jest.mock('@/hooks/useAdminAuth', () => {
  const access = { isSuperAdmin: true };
  return { useAdminAuth: () => ({ access }) };
});
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
}));

const readEvents = getDocs as jest.Mock;
const listen = onSnapshot as jest.Mock;
const eventDoc = (status: string) => ({ id: 'event', data: () => ({ title: 'Festival', status }) });

it('updates an event status from the live snapshot without a second full fetch', async () => {
  readEvents.mockResolvedValue({ docs: [eventDoc('draft')] });
  let receive!: (snapshot: { docs: ReturnType<typeof eventDoc>[] }) => void;
  listen.mockImplementation((_query, callback) => {
    receive = callback;
    return jest.fn();
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { result } = renderHook(() => useEvents(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  await waitFor(() => expect(result.current.data?.[0]?.status).toBe('draft'));
  act(() => receive({ docs: [eventDoc('published')] }));
  await waitFor(() => expect(result.current.data?.[0]?.status).toBe('published'));
  expect(readEvents).toHaveBeenCalledTimes(1);
});
