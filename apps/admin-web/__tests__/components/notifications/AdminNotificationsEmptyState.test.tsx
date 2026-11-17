import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AdminNotifications } from '@/components/notifications/AdminNotifications';

jest.mock('@/hooks/useAdminAuth', () => ({
  useAdminAuth: () => ({ access: { isSuperAdmin: true, organizationRole: null, eventAccess: [] } }),
}));
jest.mock('@/hooks/useAdminNotifications', () => ({
  useAdminNotifications: () => ({
    enabled: false,
    isLoading: false,
    isError: false,
    unreadCount: 0,
    items: [],
    markRead: jest.fn(),
    dismiss: jest.fn(),
    refetch: jest.fn(),
  }),
}));

it('explains the empty admin inbox without implying that an update was sent', () => {
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  render(<AdminNotifications />);
  fireEvent.click(screen.getByRole('button', { name: 'Admin notifications' }));
  expect(screen.getByText('No admin notifications yet')).toBeTruthy();
  expect(screen.getByText(/Registration and member-message updates/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Unread', exact: true }));
  expect(screen.getByText('No unread notifications')).toBeTruthy();
});
