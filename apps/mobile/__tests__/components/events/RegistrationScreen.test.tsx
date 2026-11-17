import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import RegistrationScreen from '@/screens/events/RegistrationScreen';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { functionsClient } from '@/services/functionsClient';

let mockRegistrations: any[] = [];
let mockEvent = {
  id: 'free-event',
  title: 'Free community event',
  status: 'published',
  pricing: { member: 0, guest: 0 },
  startAt: { seconds: 1800000000 },
  endAt: { seconds: 1800003600 },
};
const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { eventId: 'free-event' } }),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));
jest.mock('@/providers/AuthProvider', () => ({
  useAuthContext: () => ({ userProfile: { displayName: 'Test Member' } }),
}));
jest.mock('@/hooks/useEvent', () => ({
  useEvent: () => ({ isLoading: false, data: mockEvent }),
}));
jest.mock('@/hooks/useFamilyMembers', () => ({
  useFamilyMembers: () => ({ data: [], isLoading: false }),
}));
jest.mock('@/hooks/useMyRegistrations', () => ({
  useMyRegistrations: () => ({ data: mockRegistrations, isLoading: false }),
}));
jest.mock('@/hooks/useClock', () => ({ useClock: () => 1700000000000 }));
jest.mock('@/services/functionsClient', () => ({
  functionsClient: { registrations: { create: jest.fn() } },
}));
jest.mock('@/components/events/RegistrationStatus', () => ({
  RegistrationStatus: ({ onSubmitted }: { onSubmitted: () => void }) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable onPress={onSubmitted} accessibilityRole="button">
        <Text>Registration status screen</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/components/ui/AnimatedScreen', () => ({
  AnimatedScreen: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/ui/AppIcon', () => ({ AppIcon: () => null }));

it('keeps the free-registration confirmation visible when the registration listener updates', async () => {
  mockEvent = {
    id: 'free-event',
    title: 'Free community event',
    status: 'published',
    pricing: { member: 0, guest: 0 },
    startAt: { seconds: 1800000000 },
    endAt: { seconds: 1800003600 },
  };
  mockRegistrations = [];
  jest.mocked(functionsClient.registrations.create).mockResolvedValue({
    registrationId: 'member-1',
    paymentStatus: 'free',
    totalAmount: 0,
  });
  const screen = render(
    <ThemeProvider>
      <RegistrationScreen />
    </ThemeProvider>,
  );

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Complete registration' }));
  });
  expect(screen.getByText("You're registered!")).toBeTruthy();

  mockRegistrations = [
    {
      id: 'member-1',
      eventId: 'free-event',
      userId: 'member-1',
      paymentStatus: 'free',
      totalAmount: 0,
      attendees: [{ familyMemberId: 'self', name: 'Test Member', ageGroup: 'adult' }],
    },
  ];
  screen.rerender(
    <ThemeProvider>
      <RegistrationScreen />
    </ThemeProvider>,
  );
  expect(screen.getByText("You're registered!")).toBeTruthy();
  expect(screen.queryByText('Registration status screen')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'View registration status' }));
  expect(screen.getByText('Registration status screen')).toBeTruthy();
});

it('keeps the paid checkmark visible when the registration listener refreshes', () => {
  mockEvent = {
    id: 'free-event',
    title: 'Paid community event',
    status: 'published',
    pricing: { member: 25, guest: 25 },
    startAt: { seconds: 1800000000 },
    endAt: { seconds: 1800003600 },
  };
  mockRegistrations = [
    {
      id: 'member-1',
      eventId: 'free-event',
      userId: 'member-1',
      paymentStatus: 'unpaid',
      signupStatus: 'started',
      totalAmount: 25,
      attendees: [{ familyMemberId: 'self', name: 'Test Member', ageGroup: 'adult' }],
    },
  ];
  const screen = render(
    <ThemeProvider>
      <RegistrationScreen />
    </ThemeProvider>,
  );
  fireEvent.press(screen.getByRole('button', { name: 'Registration status screen' }));
  expect(screen.getByText('Registration submitted')).toBeTruthy();
  expect(screen.getByLabelText('Registration successful')).toBeTruthy();
  mockRegistrations = [{ ...mockRegistrations[0], signupStatus: 'submitted' }];
  screen.rerender(
    <ThemeProvider>
      <RegistrationScreen />
    </ThemeProvider>,
  );
  expect(screen.getByLabelText('Registration successful')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'View registration status' }));
  expect(screen.getByText('Registration status screen')).toBeTruthy();
});
