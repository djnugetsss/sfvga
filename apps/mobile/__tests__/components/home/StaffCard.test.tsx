import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StaffCard } from '@/components/home/StaffCard';
import { ThemeProvider } from '@/providers/ThemeProvider';

jest.mock('@/components/ui/AppIcon', () => ({ AppIcon: () => null }));

it('opens scanning from either part of a scanner assignment card', () => {
  const onScan = jest.fn();
  const onPress = jest.fn();
  const screen = render(
    <ThemeProvider>
      <StaffCard
        eventName="Test event"
        roleName="Ticket Scanner"
        canScan
        onScan={onScan}
        onPress={onPress}
      />
    </ThemeProvider>,
  );

  fireEvent.press(screen.getByRole('button', { name: 'Scan Tickets' }));
  fireEvent.press(screen.getByRole('button', { name: 'Scan tickets for Test event' }));
  expect(onScan).toHaveBeenCalledTimes(2);
  expect(onPress).not.toHaveBeenCalled();
});
