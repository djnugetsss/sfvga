import React from 'react';
import { render, screen } from '@testing-library/react';
import { RegistrationTicketList } from '@/components/registrations/RegistrationTicketList';

jest.mock('@/components/registrations/TicketQr', () => ({
  TicketQr: () => <div>Current QR</div>,
}));

it('shows ticket status without offering individual revocation', () => {
  render(
    <RegistrationTicketList
      eligible
      currentGeneration={1}
      tickets={
        [
          {
            id: 'attendee-0-g1',
            attendeeName: 'Member',
            generation: 1,
            status: 'valid',
            qrPayloadEncrypted: 'current',
          },
          {
            id: 'attendee-0',
            attendeeName: 'Member',
            generation: 0,
            status: 'valid',
            qrPayloadEncrypted: 'previous',
          },
        ] as any
      }
    />,
  );

  expect(screen.getByText('Valid')).toBeTruthy();
  expect(screen.getByText('Previous tickets (1)')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /revoke/i })).toBeNull();
  expect(screen.queryByText('Confirm revoke')).toBeNull();
});
