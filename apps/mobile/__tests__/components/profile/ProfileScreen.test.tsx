import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { functionsClient } from '@/services/functionsClient';
import { signOutUser } from '@/services/authService';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  serverTimestamp: jest.fn(),
  updateDoc: jest.fn(),
}));
jest.mock('@/services/firebase', () => ({ getFirestoreDb: jest.fn() }));
jest.mock('@/providers/AuthProvider', () => ({
  useAuthContext: () => ({
    firebaseUser: { uid: 'member-1' },
    userProfile: { displayName: 'Test Member', notificationPrefs: {} },
    signOut: jest.fn(),
  }),
}));
jest.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => ({ data: null }) }));
jest.mock('@/hooks/useNotificationPrefs', () => ({
  useNotificationPrefs: () => ({
    announcements: false,
    eventReminders: false,
    toggleAnnouncements: jest.fn(),
    toggleEventReminders: jest.fn(),
  }),
}));
jest.mock('@/services/notificationService', () => ({
  notificationService: { getPermissionStatus: jest.fn().mockResolvedValue('denied') },
}));
jest.mock('@/services/functionsClient', () => ({
  functionsClient: { call: jest.fn().mockResolvedValue({ status: 'completed' }) },
}));
jest.mock('@/services/authService', () => ({ signOutUser: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/components/ui/AppIcon', () => ({ AppIcon: () => null }));

it('requires review and exact typed confirmation before requesting deletion', async () => {
  const screen = render(
    <ThemeProvider>
      <ProfileScreen />
    </ThemeProvider>,
  );

  fireEvent.press(screen.getByRole('button', { name: 'Delete my account' }));
  expect(screen.getByText('Delete your SFVGA account?')).toBeTruthy();
  expect(screen.queryByLabelText('Type DELETE to confirm')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Continue to final confirmation' }));
  expect(screen.getByText('Final confirmation')).toBeTruthy();
  const finalButton = screen.getByRole('button', { name: 'Permanently delete my account' });
  expect(finalButton.props.accessibilityState.disabled).toBe(true);
  fireEvent.changeText(screen.getByLabelText('Type DELETE to confirm'), 'delete');
  expect(screen.getByRole('button', { name: 'Permanently delete my account' }).props.accessibilityState.disabled).toBe(true);
  expect(functionsClient.call).not.toHaveBeenCalled();

  fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
  expect(screen.getByText('Delete your SFVGA account?')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Continue to final confirmation' }));
  expect(screen.getByLabelText('Type DELETE to confirm').props.value).toBe('');

  fireEvent.changeText(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Permanently delete my account' }));
  });
  expect(functionsClient.call).toHaveBeenCalledWith('auth_deleteAccount', { confirm: 'DELETE' });
  expect(signOutUser).toHaveBeenCalled();
});
