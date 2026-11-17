import React from 'react';
import { render, screen, within } from '@testing-library/react';
import EventDetailPage from '@/app/events/[eventId]/page';

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ prefetchQuery: jest.fn() }),
}));
jest.mock('next/navigation', () => ({ usePathname: () => '/events/e', useParams: () => ({ eventId: 'e' }) }));
jest.mock('@/hooks/useAdminAuth', () => ({
  useAdminAuth: () => ({ access: { isSuperAdmin: true } }),
}));
jest.mock('@/hooks/useEvent', () => ({
  useEvent: () => ({ data: { id: 'e', title: 'Event', status: 'published' } }),
}));
jest.mock('@/hooks/useEventMutations', () => ({
  useEventMutations: () => ({ updateEvent: {}, setEventStatus: {} }),
}));
jest.mock('@/components/RequireEventPermission', () => ({
  RequireEventPermission: ({ children }: any) => children,
}));
jest.mock('@/components/events/EventForm', () => ({ EventForm: () => null }));

it('combines event navigation and publishing into one control row without duplicate links', () => {
  render(<EventDetailPage />);
  const row = screen.getByRole('navigation', { name: 'Event sections' });
  for (const name of ['Event details', 'Registrations', 'Messages', 'Staff']) {
    expect(screen.getAllByRole('link', { name })).toHaveLength(1);
    expect(within(row).getByRole('link', { name })).toBeTruthy();
  }
  expect(within(row).getByRole('button', { name: 'Unpublish' })).toBeTruthy();
});
