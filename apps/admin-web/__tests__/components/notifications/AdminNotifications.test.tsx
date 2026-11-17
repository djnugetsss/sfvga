import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminNotifications } from '@/components/notifications/AdminNotifications';
const mockMarkRead = jest.fn().mockResolvedValue(undefined);
const mockDismiss = jest.fn().mockResolvedValue(undefined);
const mockAccess = { isSuperAdmin: true, organizationRole: null, eventAccess: [] };
jest.mock('@/hooks/useAdminAuth', () => ({ useAdminAuth: () => ({ access: mockAccess }) }));
jest.mock('@/hooks/useAdminNotifications', () => ({
  useAdminNotifications: () => ({
    enabled: true,
    isLoading: false,
    isError: false,
    unreadCount: 1,
    markRead: mockMarkRead,
    dismiss: mockDismiss,
    items: [
      {
        id: 'a',
        type: 'admin_registration_attention',
        title: 'Payment updated',
        body: 'Review payment.',
        eventTitle: 'Test event',
        eventId: 'e',
        registrationId: 'r',
        createdAt: { seconds: 100 },
      },
      {
        id: 'b',
        type: 'admin_registration_message',
        title: 'New registration message',
        body: 'Open conversation.',
        eventTitle: 'Test event',
        eventId: 'e',
        registrationId: 'r',
        readAt: { seconds: 200 },
        createdAt: { seconds: 90 },
      },
    ],
  }),
}));
describe('admin notification center', () => {
  beforeEach(() => {
    mockAccess.isSuperAdmin = true;
    mockMarkRead.mockClear();
    mockDismiss.mockClear();
  });
  it('opens from the bell and separates unread items', () => {
    HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    render(<AdminNotifications />);
    fireEvent.click(screen.getByRole('button', { name: 'Admin notifications, 1 unread' }));
    expect(screen.getByRole('dialog').getAttribute('open')).toBe('');
    expect(screen.getByText('Registration update')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Unread', exact: true }));
    expect(screen.queryByText('New registration message')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('marks only unread items and hides the bell from unauthorized roles', async () => {
    const view = render(<AdminNotifications />);
    fireEvent.click(screen.getByRole('button', { name: 'Admin notifications, 1 unread' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
    await waitFor(() => expect(mockMarkRead).toHaveBeenCalledWith(['a']));
    mockAccess.isSuperAdmin = false;
    view.rerender(<AdminNotifications />);
    expect(screen.queryByRole('button', { name: /Admin notifications/ })).toBeNull();
  });
  it('dismisses a notification without opening its event', async () => {
    render(<AdminNotifications />);
    fireEvent.click(screen.getByRole('button', { name: 'Admin notifications, 1 unread' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Payment updated notification' }));
    await waitFor(() => expect(mockDismiss).toHaveBeenCalledWith('a'));
    expect(mockMarkRead).not.toHaveBeenCalled();
  });
});
