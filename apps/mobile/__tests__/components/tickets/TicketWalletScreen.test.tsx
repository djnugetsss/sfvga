import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TicketWalletScreen from '@/screens/tickets/TicketWalletScreen';
import { ThemeProvider } from '@/providers/ThemeProvider';

const mockNavigation = { navigate: jest.fn(), setParams: jest.fn() };
const mockRoute = { params: { focusEventId: 'past-event' as string | undefined } };
const mockRefetch = jest.fn();
let mockTicketData = {
  upcoming: [{ eventId: 'upcoming-event', event: null, tickets: [] }],
  past: [{ eventId: 'past-event', event: null, tickets: [] }],
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
  useFocusEffect: (callback: () => () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/hooks/useMyTickets', () => ({
  useMyTickets: () => ({
    data: mockTicketData,
    isLoading: false,
    isRefetching: false,
    isError: false,
    refetch: mockRefetch,
  }),
}));
jest.mock('@/components/tickets/TicketCard', () => ({ TicketCard: () => null }));
jest.mock('@/components/tickets/TicketQrModal', () => ({ TicketQrModal: () => null }));
jest.mock('@/components/ui/AnimatedScreen', () => ({ AnimatedScreen: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/components/ui/SectionHeader', () => ({
  SectionHeader: ({ title }: { title: string }) => {
    const Text = require('react-native').Text;
    return <Text>{title}</Text>;
  },
}));

it('lets a member switch ticket tabs after a notification focuses a past event', () => {
  const screen = render(
    <ThemeProvider>
      <TicketWalletScreen />
    </ThemeProvider>,
  );
  expect(screen.getByRole('button', { name: 'Past tickets' }).props.accessibilityState.selected).toBe(true);

  fireEvent.press(screen.getByRole('button', { name: 'Upcoming tickets' }));
  expect(screen.getByRole('button', { name: 'Upcoming tickets' }).props.accessibilityState.selected).toBe(true);

  // A ticket listener refresh must not take the member back to Past.
  mockTicketData = { upcoming: [...mockTicketData.upcoming], past: [...mockTicketData.past] };
  screen.rerender(
    <ThemeProvider>
      <TicketWalletScreen />
    </ThemeProvider>,
  );
  expect(screen.getByRole('button', { name: 'Upcoming tickets' }).props.accessibilityState.selected).toBe(true);
});
