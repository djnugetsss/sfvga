import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { Event, Registration } from '@sfvga/shared-types';
import { RegistrationStatus } from '@/components/events/RegistrationStatus';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { functionsClient } from '@/services/functionsClient';

jest.mock('@/services/functionsClient', () => ({
  functionsClient: { call: jest.fn().mockResolvedValue({ data: { submitted: true } }) },
}));
jest.mock('@/components/events/RegistrationConversation', () => ({
  RegistrationConversation: () => null,
}));
jest.mock('@/components/ui/AppIcon', () => ({ AppIcon: () => null }));
const now = Date.parse('2026-09-15T18:00:00Z');
const stamp = (ms: number) => ({ seconds: ms / 1000, nanoseconds: 0 });
const event = {
  id: 'e',
  title: 'Community event',
  status: 'published',
  paymentUrl: 'https://example.com/pay',
  registrationDeadline: stamp(now + 60000),
  endAt: stamp(now + 7200000),
} as Event;
const reg: Registration = {
  id: 'r',
  userId: 'u',
  workflowVersion: 1,
  signupStatus: 'started',
  reviewStatus: 'pending',
  reviewRevision: 0,
  totalAmount: 25,
  paymentStatus: 'unpaid',
  createdAt: stamp(now),
  attendees: [{ familyMemberId: 'self', name: 'Test Member', ageGroup: 'adult' }],
};
const wrap = (registration: Registration, onTickets = jest.fn()) => (
  <ThemeProvider>
    <RegistrationStatus
      event={event}
      registration={registration}
      onTickets={onTickets}
      onMessages={jest.fn()}
    />
  </ThemeProvider>
);
describe('saved payment signup screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());
  it('resumes saved attendees, requires payer name, and provides the payment fallback', async () => {
    const screen = render(wrap(reg));
    expect(screen.getByText(/Test Member/)).toBeTruthy();
    expect(screen.getByText('One more step after payment')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open payment link' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'I’ve paid — finish registration' }));
    expect(functionsClient.call).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText('Payer’s name'), 'Test Payer');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'I’ve paid — finish registration' }));
    });
    expect(functionsClient.call).toHaveBeenCalledWith(
      'registrations_finish',
      expect.objectContaining({ registrationId: 'r', payerName: 'Test Payer' }),
    );
    expect(screen.getByText('Registration submitted')).toBeTruthy();
    expect(screen.getByLabelText('Registration successful')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View registration status' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'I’ve paid — finish registration' })).toBeNull();
    screen.rerender(wrap({ ...reg, signupStatus: 'submitted' }));
    expect(screen.getByText('Registration submitted')).toBeTruthy();
    expect(screen.getByLabelText('Registration successful')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'View registration status' }));
    expect(screen.getByText('Your saved signup')).toBeTruthy();
    expect(screen.queryByLabelText('Registration successful')).toBeNull();
  });
  it('notifies the parent screen after the paid registration finishes', async () => {
    const onSubmitted = jest.fn();
    const screen = render(
      <ThemeProvider>
        <RegistrationStatus
          event={event}
          registration={reg}
          onTickets={jest.fn()}
          onMessages={jest.fn()}
          onSubmitted={onSubmitted}
        />
      </ThemeProvider>,
    );
    fireEvent.changeText(screen.getByLabelText('Payer’s name'), 'Test Payer');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'I’ve paid — finish registration' }));
    });
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });
  it('keeps the submitted confirmation visible without navigating automatically', () => {
    const onTickets = jest.fn();
    const screen = render(wrap({ ...reg, signupStatus: 'submitted' }, onTickets));
    act(() => jest.advanceTimersByTime(10000));
    expect(screen.getByText('Registration submitted')).toBeTruthy();
    expect(screen.getByText(/Our team will verify your payment/)).toBeTruthy();
    expect(onTickets).not.toHaveBeenCalled();
  });
  it('does not show a checkmark when the server cannot finish the paid registration', async () => {
    jest.mocked(functionsClient.call).mockRejectedValueOnce(new Error('Please try again.'));
    const screen = render(wrap(reg));
    fireEvent.changeText(screen.getByLabelText('Payer’s name'), 'Test Payer');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'I’ve paid — finish registration' }));
    });
    expect(screen.getByText('Please try again.')).toBeTruthy();
    expect(screen.queryByLabelText('Registration successful')).toBeNull();
    expect(screen.getByRole('button', { name: 'I’ve paid — finish registration' })).toBeTruthy();
  });
  it('removes payment and completion actions when the deadline passes', () => {
    const screen = render(wrap(reg));
    act(() => jest.advanceTimersByTime(60000));
    expect(screen.getByText('Registration closed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open payment link' })).toBeNull();
    expect(screen.queryByLabelText('Payer’s name')).toBeNull();
  });
  it('does not invite a new payment after the event itself has ended', () => {
    const endedEvent = {
      ...event,
      registrationDeadline: stamp(now - 7200000),
      endAt: stamp(now - 1),
    };
    const screen = render(
      <ThemeProvider>
        <RegistrationStatus
          event={endedEvent}
          registration={{ ...reg, signupStatus: 'submitted', reviewStatus: 'rejected' }}
          onTickets={jest.fn()}
          onMessages={jest.fn()}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText(/please do not make a new payment/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open payment link' })).toBeNull();
  });
});
