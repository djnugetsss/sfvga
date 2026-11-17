import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegistrationTable } from '@/components/registrations/RegistrationTable';
jest.mock('@/hooks/usePaymentDecisions', () => ({
  usePaymentDecisions: () => ({ count: 0, drafts: {}, results: {} }),
}));
jest.mock('@/components/registrations/RegistrationTicketList', () => ({
  RegistrationTicketList: () => <div>Ticket details opened</div>,
}));
jest.mock('@/components/registrations/RegistrationConversation', () => ({
  RegistrationConversation: () => <div>Private conversation opened</div>,
}));

it('opens ticket details and links to the separate Messages page without embedding chat', () => {
  window.history.replaceState(null, '', '/events/e/registrations#registration-r');
  Element.prototype.scrollIntoView = jest.fn();
  const props = { eventId: 'e', eventTitle: 'Event', canManage: true, registrations: [] as any[] };
  const view = render(<RegistrationTable {...props} />);
  expect(screen.queryByText('Private conversation opened')).toBeNull();
  view.rerender(
    <RegistrationTable
      {...props}
      registrations={[
        {
          id: 'r',
          attendees: [{ name: 'Test' }],
          totalAmount: 10,
          paymentStatus: 'unpaid',
          createdAt: { seconds: 1 },
        } as any,
      ]}
    />,
  );
  expect(screen.getByText('Ticket details opened')).toBeTruthy();
  expect(screen.queryByText('Private conversation opened')).toBeNull();
  expect(screen.getByRole('link', { name: 'Open private messages' }).getAttribute('href')).toBe(
    '/events/e/messages#registration-r',
  );
  expect(screen.getByRole('columnheader', { name: 'Phone' })).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: 'Payer' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Collapse tickets' }));
  expect(screen.queryByText('Ticket details opened')).toBeNull();
});
