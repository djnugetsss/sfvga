import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EventMessagesPage from '@/app/events/[eventId]/messages/page';

jest.mock('next/navigation', () => ({ useParams: () => ({ eventId: 'e' }) }));

jest.mock('@/hooks/useEvent', () => ({ useEvent: () => ({ data: { title: 'Test event' } }) }));
jest.mock('@/hooks/useRegistrations', () => ({
  useRegistrations: () => ({
    data: [
      { id: 'one', attendees: [{ name: 'First member' }], adminUnread: false },
      { id: 'two', attendees: [{ name: 'Second member' }], adminUnread: true },
    ],
  }),
}));
jest.mock('@/components/RequireEventPermission', () => ({
  RequireEventPermission: ({ children }: any) => children,
}));
jest.mock('@/components/events/EventNavigation', () => ({ EventNavigation: () => null }));
jest.mock('@/components/registrations/RegistrationConversation', () => ({
  RegistrationConversation: ({ registration }: any) => (
    <div>Conversation for {registration.id}</div>
  ),
}));

it('opens a deep-linked conversation and switches conversations without a registration dropdown', () => {
  window.history.replaceState(null, '', '/events/e/messages#registration-two');
  render(<EventMessagesPage />);
  expect(screen.getByText('Conversation for two')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /First member/ }));
  expect(screen.getByText('Conversation for one')).toBeTruthy();
  expect(screen.queryByText('Conversation for two')).toBeNull();
  expect(window.location.hash).toBe('#registration-one');
  fireEvent.click(screen.getByRole('button', { name: /First member/ }));
  expect(screen.queryByText('Conversation for one')).toBeNull();
  expect(window.location.hash).toBe('');
  fireEvent.change(screen.getByRole('textbox', { name: 'Search conversations' }), {
    target: { value: 'Second' },
  });
  expect(screen.queryByRole('button', { name: /First member/ })).toBeNull();
});
