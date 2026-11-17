import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MessagesScreen from '@/screens/messages/MessagesScreen';
import { ThemeProvider } from '@/providers/ThemeProvider';

const mockRouteParams: { current: { eventId: string } | undefined } = { current: undefined };
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockRouteParams.current }),
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('@/hooks/useMyRegistrations', () => ({
  useMyRegistrations: () => ({
    data: [
      { id: 'r1', eventId: 'e1', attendees: [{ name: 'Member One' }], memberUnread: true },
      { id: 'r1', eventId: 'e2', attendees: [{ name: 'Member Two' }], memberUnread: false },
      { id: 'r3', eventId: 'e3', attendees: [{ name: 'Member Three' }], memberUnread: false },
    ],
    isLoading: false,
  }),
}));
jest.mock('@/hooks/useEventList', () => ({
  useEventList: (filter: string) => ({
    data:
      filter === 'upcoming'
        ? [
            {
              id: 'e1',
              title: 'Current Event',
              status: 'published',
              endAt: new Date(Date.now() + 60_000),
            },
            {
              id: 'e3',
              title: 'Just Ended Event',
              status: 'published',
              endAt: new Date(Date.now() - 60_000),
            },
          ]
        : [{ id: 'e2', title: 'Past Event' }],
    isLoading: false,
  }),
}));
jest.mock('@/components/events/RegistrationConversation', () => ({
  RegistrationConversation: ({ eventId }: { eventId: string }) => {
    const Text = require('react-native').Text;
    return <Text>{`Chat ${eventId}`}</Text>;
  },
}));
jest.mock('@/components/ui/AppIcon', () => ({ AppIcon: () => null }));

it('shows only current event conversations and opens a separate conversation view', () => {
  mockRouteParams.current = undefined;
  const screen = render(
    <ThemeProvider>
      <MessagesScreen />
    </ThemeProvider>,
  );
  expect(screen.getByText('Conversations for current events')).toBeTruthy();
  expect(screen.getByText('Current Event')).toBeTruthy();
  expect(screen.queryByText('Past Event')).toBeNull();
  expect(screen.queryByText('Just Ended Event')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: /Current Event messages/ }));
  expect(screen.getByText('Chat e1')).toBeTruthy();
  expect(screen.queryByText('Chat e2')).toBeNull();
  expect(screen.getByText('Private conversation with SFVGA organizers')).toBeTruthy();
  expect(screen.queryByText('Past Event')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Back to messages' }));
  expect(screen.queryByText('Chat e1')).toBeNull();
  expect(screen.getByText('Current Event')).toBeTruthy();
});

it('opens a past payment conversation only through a direct registration link', () => {
  mockRouteParams.current = { eventId: 'e2' };
  const screen = render(
    <ThemeProvider>
      <MessagesScreen />
    </ThemeProvider>,
  );
  expect(screen.getByText('Chat e2')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Back to messages' }));
  expect(screen.queryByText('Past Event')).toBeNull();
  mockRouteParams.current = undefined;
});
