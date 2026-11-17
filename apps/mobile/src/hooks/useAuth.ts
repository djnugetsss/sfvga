import { useAuthContext } from '@/providers/AuthProvider';
import {
  sendPhoneOtp,
  confirmPhoneOtp,
  isValidUsPhone,
  toE164UsPhone,
} from '@/services/authService';

/**
 * Auth hook — exposes the current auth state (from AuthProvider) plus the phone-OTP
 * convenience actions, so screens have a single import for everything auth-related.
 */
export function useAuth() {
  const context = useAuthContext();
  return {
    ...context,
    sendPhoneOtp,
    confirmPhoneOtp,
    isValidUsPhone,
    toE164UsPhone,
  };
}
