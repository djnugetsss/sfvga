import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RegistrationTable } from '@/components/registrations/RegistrationTable';

jest.mock('@/hooks/usePaymentDecisions', () => ({
  usePaymentDecisions: () => ({
    drafts: {},
    results: {},
    busy: false,
    count: 0,
    select: jest.fn(),
    confirm: jest.fn(),
    discard: jest.fn(),
  }),
}));

it('shows payment-note text in the registration list and reveals long notes on request', () => {
  const longNote = `Bank reference ${'ABCD '.repeat(40)}`;
  render(
    <RegistrationTable
      eventId="event-1"
      eventTitle="Community event"
      registrations={
        [
          {
            id: 'registration-1',
            eventId: 'event-1',
            userId: 'member-1',
            attendees: [{ familyMemberId: 'self', name: 'Test Member', ageGroup: 'adult' }],
            totalAmount: 25,
            paymentStatus: 'unpaid',
            payerName: 'Test Payer',
            paymentNote: longNote,
          },
        ] as any
      }
    />,
  );
  expect(screen.getByText('Payment note')).toBeTruthy();
  expect(screen.getAllByText(/Bank reference ABCD/).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByText('Read full note'));
  expect(screen.getByText(longNote.trimEnd())).toBeTruthy();
  expect(screen.getAllByText(/Bank reference ABCD/)).toHaveLength(1);
  fireEvent.click(screen.getByText('Show less'));
  expect(screen.queryByText(longNote.trimEnd())).toBeNull();
});
