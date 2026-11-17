import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotifications } from '@/hooks/useNotifications';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('@/providers/AuthProvider', () => ({
  useAuthContext: () => ({ firebaseUser: { uid: 'member-1' } }),
}));
jest.mock('@/hooks/useMemberNotices', () => ({
  useMemberNotices: () => ({
    data: [
      {
        id: 'payment-1',
        type: 'payment',
        title: 'Payment update',
        body: 'Private details',
        createdAt: { seconds: 100 },
      },
    ],
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/hooks/useAnnouncements', () => ({
  useAnnouncements: () => ({
    data: [],
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/hooks/useMyTickets', () => ({
  useMyTickets: () => ({
    data: { upcoming: [], past: [] },
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  }),
}));

it('hides a dismissed notification and saves the choice on this device', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const screen = renderHook(() => useNotifications(), { wrapper });
  await waitFor(() => expect(screen.result.current.items).toHaveLength(1));
  expect(screen.result.current.unreadCount).toBe(1);
  act(() => screen.result.current.dismiss('notice:payment-1'));
  await waitFor(() => expect(screen.result.current.items).toHaveLength(0));
  expect(screen.result.current.unreadCount).toBe(0);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    'sfvga:notif:dismissed:member-1',
    JSON.stringify(['notice:payment-1']),
  );
});
