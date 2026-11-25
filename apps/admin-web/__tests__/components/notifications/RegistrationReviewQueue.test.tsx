import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Event } from '@sfvga/shared-types';
import { RegistrationReviewQueue } from '@/components/registrations/RegistrationReviewQueue';

const mockAccess = { isSuperAdmin: true, organizationRole: null, eventAccess: [] };
jest.mock('@/hooks/useAdminAuth', () => ({
  useAdminAuth: () => ({ access: mockAccess }),
}));
jest.mock('@/services/firebase', () => ({ getFirestoreDb: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn((_ref, onNext) => {
    onNext({
      docs: [
        {
          id: 'registration-1',
          data: () => ({
            userId: 'member-1',
            attendees: [{ name: 'Test Member' }],
            workflowVersion: 1,
            signupStatus: 'submitted',
            reviewStatus: 'pending',
            adminUnread: true,
            totalAmount: 20,
            createdAt: { seconds: 1800000000 },
          }),
        },
      ],
    });
    return jest.fn();
  }),
}));

it('makes an actionable registration visible in the dashboard summary', async () => {
  const events = [
    {
      id: 'event-1',
      title: 'Community event',
      status: 'published',
      endAt: { seconds: 1900000000 },
    } as Event,
  ];
  render(<RegistrationReviewQueue events={events} />);
  expect(await screen.findByText('1 registration to check')).toBeTruthy();
  expect(screen.getByRole('link', { name: /Test Member/ }).getAttribute('href')).toBe(
    '/events/event-1/registrations#registration-registration-1',
  );
  expect(screen.getByRole('button', { name: /Payments 1 Payments to review/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Messages 1 Unread messages/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Messages 1 Unread messages/ }));
  expect(screen.getByRole('link', { name: /Test Member/ }).getAttribute('href')).toBe(
    '/events/event-1/messages#registration-registration-1',
  );
});
