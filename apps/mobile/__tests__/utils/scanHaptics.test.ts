import { pulseForScanOutcome } from '@/utils/scanHaptics';
import * as Haptics from 'expo-haptics';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

describe('pulseForScanOutcome', () => {
  it('uses distinct haptic feedback per outcome', () => {
    pulseForScanOutcome('checked_in');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');

    pulseForScanOutcome('already_redeemed');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');

    pulseForScanOutcome('invalid');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });
});
