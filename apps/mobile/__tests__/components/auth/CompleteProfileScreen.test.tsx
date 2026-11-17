import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import CompleteProfileScreen from '@/screens/auth/CompleteProfileScreen';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { completeMemberProfile } from '@/services/authService';

jest.mock('@/providers/AuthProvider', () => ({
  useAuthContext: () => ({ firebaseUser: { uid: 'new-member' }, signOut: jest.fn() }),
}));
jest.mock('@/services/authService', () => ({ completeMemberProfile: jest.fn() }));
jest.mock('@/components/ui/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('@/components/auth/AuthShell', () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

function setup() {
  return render(
    <ThemeProvider>
      <CompleteProfileScreen />
    </ThemeProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

it('requires an unchecked-by-default policy agreement before completing account setup', async () => {
  const screen = setup();
  fireEvent.changeText(screen.getByLabelText('First name'), 'Rahil');
  fireEvent.changeText(screen.getByLabelText('Last name'), 'Shah');
  expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(false);
  fireEvent.press(screen.getByText('Finish account setup'));
  expect(screen.getByText('Please agree before finishing account setup.')).toBeTruthy();
  expect(completeMemberProfile).not.toHaveBeenCalled();

  fireEvent.press(screen.getByRole('checkbox'));
  fireEvent.press(screen.getByText('Finish account setup'));
  await waitFor(() =>
    expect(completeMemberProfile).toHaveBeenCalledWith(
      { uid: 'new-member' },
      'Rahil',
      'Shah',
      true,
    ),
  );
});

it('opens both published policies from the setup screen', () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const screen = setup();
  fireEvent.press(screen.getByText('Read Terms of Use'));
  fireEvent.press(screen.getByText('Read Privacy Notice'));
  expect(open).toHaveBeenCalledWith('https://sfvga-cabe6.web.app/terms.html');
  expect(open).toHaveBeenCalledWith('https://sfvga-cabe6.web.app/privacy.html');
  open.mockRestore();
});
