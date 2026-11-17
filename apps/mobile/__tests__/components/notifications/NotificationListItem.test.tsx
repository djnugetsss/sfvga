import React from 'react';
import { View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { NotificationListItem } from '@/components/notifications/NotificationListItem';

jest.mock('@/components/ui/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('@/components/ui/MotionPressable', () => ({
  MotionPressable: ({ children, onPress, ...props }: any) => {
    const Pressable = require('react-native').Pressable;
    return (
      <Pressable onPress={onPress} {...props}>
        {children}
      </Pressable>
    );
  },
}));

it('dismisses with a visible button without opening the notification', () => {
  const onPress = jest.fn();
  const onDismiss = jest.fn();
  const screen = render(
    <ThemeProvider>
      <NotificationListItem
        type="payment"
        title="Payment update"
        body="Tap to resolve"
        read={false}
        onPress={onPress}
        onDismiss={onDismiss}
      />
    </ThemeProvider>,
  );
  fireEvent.press(screen.getByRole('button', { name: 'Dismiss Payment update notification' }));
  expect(screen.getByText('Open registration →')).toBeTruthy();
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(onPress).not.toHaveBeenCalled();
});

it('dismisses on a left swipe but not a vertical scroll', () => {
  const onDismiss = jest.fn();
  const screen = render(
    <ThemeProvider>
      <NotificationListItem
        type="announcement"
        title="Event update"
        body="Details"
        read={true}
        onDismiss={onDismiss}
      />
    </ThemeProvider>,
  );
  const row = screen.UNSAFE_getAllByType(View)[0];
  fireEvent(row, 'touchStart', { nativeEvent: { touches: [{ pageX: 200, pageY: 50 }] } });
  fireEvent(row, 'touchEnd', { nativeEvent: { changedTouches: [{ pageX: 90, pageY: 55 }] } });
  expect(onDismiss).toHaveBeenCalledTimes(1);
  fireEvent(row, 'touchStart', { nativeEvent: { touches: [{ pageX: 200, pageY: 50 }] } });
  fireEvent(row, 'touchEnd', { nativeEvent: { changedTouches: [{ pageX: 190, pageY: 150 }] } });
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it('shows the event context and lets members mark an alert as read', () => {
  const onMarkRead = jest.fn();
  const screen = render(
    <ThemeProvider>
      <NotificationListItem
        type="event_published"
        title="New event: Diwali Celebration"
        eventTitle="Diwali Celebration"
        body="Registration is open."
        read={false}
        onMarkRead={onMarkRead}
        onPress={jest.fn()}
        onDismiss={jest.fn()}
      />
    </ThemeProvider>,
  );
  expect(screen.getByText('View event →')).toBeTruthy();
  fireEvent.press(
    screen.getByRole('button', { name: 'Mark New event: Diwali Celebration as read' }),
  );
  expect(onMarkRead).toHaveBeenCalledTimes(1);
});
