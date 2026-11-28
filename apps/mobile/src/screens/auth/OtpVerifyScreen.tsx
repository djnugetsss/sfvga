import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OtpInput } from '@/components/auth/OtpInput';
import {
  RecaptchaVerifierModal,
  type RecaptchaVerifierHandle,
} from '@/components/auth/RecaptchaVerifierModal';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { clearPendingOtp } from '@/services/authService';
import { getPhoneAuthErrorMessage } from '@/utils/errors';
import type { AuthStackParamList } from '@/navigation/AuthStack';
import { AuthShell } from '@/components/auth/AuthShell';
import { AppIcon } from '@/components/ui/AppIcon';

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * OTP Verify (UI spec §2). The six-digit code submits when complete;
 * a successful confirmation swaps the RootNavigator to the main app.
 */
export default function OtpVerifyScreen() {
  const { colors, typography, spacing } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'OtpVerify'>>();
  const { confirmPhoneOtp, sendPhoneOtp } = useAuth();

  const recaptchaRef = useRef<RecaptchaVerifierHandle>(null);
  const verifyingRef = useRef(false);
  const resendingRef = useRef(false);
  const [resending, setResending] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | undefined>();
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  const { phoneNumber, e164 } = route.params;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleVerify = async (code: string) => {
    if (verifyingRef.current || resendingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    setError(undefined);
    try {
      await confirmPhoneOtp(code);
      // Success: AuthProvider's listener will route into the app automatically.
    } catch (err) {
      setError(getPhoneAuthErrorMessage(err, "That code doesn't match — try again"));
      setDigits(Array(6).fill(''));
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  };

  const handleChange = (next: string[]) => {
    setDigits(next);
    if (error) setError(undefined);
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || !recaptchaRef.current || verifyingRef.current || resendingRef.current) return;
    resendingRef.current = true;
    setResending(true);
    setError(undefined);
    try {
      await sendPhoneOtp(e164, recaptchaRef.current);
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setDigits(Array(6).fill(''));
    } catch (err) {
      setError(getPhoneAuthErrorMessage(err, "We couldn't resend the code — please try again"));
    } finally {
      resendingRef.current = false;
      setResending(false);
    }
  };

  const handleGoBack = () => {
    clearPendingOtp();
    navigation.goBack();
  };

  return (
    <>
      <AuthShell
        eyebrow="Phone verification"
        title="Enter the code"
        subtitle={`We sent a 6-digit verification code to ${phoneNumber}.`}
      >
        <OtpInput
          digits={digits}
          onChange={handleChange}
          onComplete={(code) => void handleVerify(code)}
          error={error}
          disabled={verifying || resending}
        />

        {verifying ? (
          <Text
            style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.md }]}
          >
            Verifying code…
          </Text>
        ) : null}

        <TouchableOpacity
          style={{ marginTop: spacing.md }}
          onPress={handleResend}
          disabled={secondsLeft > 0 || verifying || resending}
          accessibilityRole="button"
          accessibilityLabel={
            secondsLeft > 0
              ? `Resend code available in ${secondsLeft} seconds`
              : "Didn't get a code? Resend"
          }
          accessibilityState={{ disabled: secondsLeft > 0 || verifying || resending, busy: resending }}
        >
          <View style={styles.linkRow}>
            <AppIcon
              name="refresh-outline"
              size={17}
              color={secondsLeft > 0 ? colors.textSecondary : colors.deepBlue}
            />
            <Text
              style={[
                typography.bodyMedium,
                { color: secondsLeft > 0 ? colors.textSecondary : colors.deepBlue },
              ]}
            >
              {resending ? 'Sending a new code…' : secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Didn't get a code? Resend"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={verifying || resending}
          onPress={handleGoBack}
          style={{ marginTop: spacing.sm }}
          accessibilityRole="button"
          accessibilityLabel="Wrong number? Go back to phone entry"
        >
          <View style={styles.linkRow}>
            <AppIcon name="arrow-back" size={17} color={colors.deepBlue} />
            <Text style={[typography.bodyMedium, { color: colors.deepBlue, fontWeight: '600' }]}>
              Wrong number? Go back
            </Text>
          </View>
        </TouchableOpacity>
      </AuthShell>
      <RecaptchaVerifierModal ref={recaptchaRef} />
    </>
  );
}

const styles = StyleSheet.create({
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
});
