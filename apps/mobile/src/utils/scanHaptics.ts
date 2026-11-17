import * as Haptics from 'expo-haptics';
import type { TicketValidateOutcome } from '@/services/functionsClient';

/** Distinct haptic patterns per scan outcome (UI/UX §8 accessibility). */
export function pulseForScanOutcome(outcome: TicketValidateOutcome): void {
  switch (outcome) {
    case 'checked_in':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'already_redeemed':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'invalid':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
  }
}
